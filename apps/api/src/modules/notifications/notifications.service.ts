import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { EmailService } from './email.service';
import {
  renderPriorityAlertEmail,
  renderDailyDigestEmail,
  renderDeadlineReminderEmail,
} from './email-templates';
import { NotificationPreferences } from '@edgi/contracts';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * List notifications with type filters and pagination
   */
  async listNotifications(userId: string, filters?: { type?: string; unreadOnly?: boolean; limit?: number }) {
    const where: Record<string, unknown> = { userId };
    if (filters?.type && filters.type !== 'all') {
      where.type = filters.type;
    }
    if (filters?.unreadOnly) {
      where.read = false;
    }

    const [items, unreadCount, totalCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 50,
      }),
      this.prisma.notification.count({
        where: { userId, read: false },
      }),
      this.prisma.notification.count({
        where: { userId },
      }),
    ]);

    return {
      items,
      unreadCount,
      totalCount,
    };
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found.');

    return this.prisma.notification.update({
      where: { id },
      data: { read: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
  }

  /**
   * Get user notification preferences or initialize defaults
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const pref = await this.prisma.notificationPreference.findFirst({
      where: { userId },
    });

    if (!pref) {
      return {
        highPriorityThreshold: 85,
        digestTime: '08:00',
        timezone: 'Africa/Lagos',
        reminderOffsets: [14, 7, 3, 1],
        categoryPreferences: {
          fellowship: true,
          internship: true,
          hackathon_ctf: true,
          dev_programme: true,
          scholarship: true,
          research: true,
        },
        emailEnabled: true,
        quietHoursStart: '23:00',
        quietHoursEnd: '06:00',
      };
    }

    return {
      highPriorityThreshold: pref.highPriorityThreshold,
      digestTime: pref.digestTime,
      timezone: pref.timezone,
      reminderOffsets: pref.reminderOffsets,
      categoryPreferences: (pref.categoryPreferences as Record<string, boolean>) || {},
      emailEnabled: pref.emailEnabled,
      quietHoursStart: pref.quietHoursStart,
      quietHoursEnd: pref.quietHoursEnd,
    };
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(userId: string, updates: Partial<NotificationPreferences>) {
    const existing = await this.prisma.notificationPreference.findFirst({
      where: { userId },
    });

    if (existing) {
      return this.prisma.notificationPreference.update({
        where: { id: existing.id },
        data: {
          highPriorityThreshold: updates.highPriorityThreshold ?? existing.highPriorityThreshold,
          digestTime: updates.digestTime ?? existing.digestTime,
          timezone: updates.timezone ?? existing.timezone,
          reminderOffsets: updates.reminderOffsets ?? existing.reminderOffsets,
          categoryPreferences: updates.categoryPreferences ? JSON.parse(JSON.stringify(updates.categoryPreferences)) : existing.categoryPreferences,
          emailEnabled: updates.emailEnabled ?? existing.emailEnabled,
          quietHoursStart: updates.quietHoursStart ?? existing.quietHoursStart,
          quietHoursEnd: updates.quietHoursEnd ?? existing.quietHoursEnd,
        },
      });
    }

    return this.prisma.notificationPreference.create({
      data: {
        userId,
        channel: 'email',
        eventType: 'global',
        enabled: updates.emailEnabled ?? true,
        highPriorityThreshold: updates.highPriorityThreshold ?? 85,
        digestTime: updates.digestTime ?? '08:00',
        timezone: updates.timezone ?? 'Africa/Lagos',
        reminderOffsets: updates.reminderOffsets ?? [14, 7, 3, 1],
        categoryPreferences: updates.categoryPreferences ? JSON.parse(JSON.stringify(updates.categoryPreferences)) : {
          fellowship: true,
          internship: true,
          hackathon_ctf: true,
          dev_programme: true,
        },
        emailEnabled: updates.emailEnabled ?? true,
        quietHoursStart: updates.quietHoursStart ?? '23:00',
        quietHoursEnd: updates.quietHoursEnd ?? '06:00',
      },
    });
  }

  /**
   * In-App notification creation
   */
  async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    priority?: string;
    idempotencyKey?: string;
    entityType?: 'opportunity' | 'application' | 'source' | 'system';
    entityId?: string;
  }) {
    if (data.idempotencyKey) {
      const existing = await this.prisma.notification.findFirst({
        where: { userId: data.userId, idempotencyKey: data.idempotencyKey },
      });
      if (existing) return existing;
    }

    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        priority: data.priority || 'immediate',
        idempotencyKey: data.idempotencyKey || null,
        entityType: data.entityType || null,
        entityId: data.entityId || null,
        title: data.title,
        message: data.message,
        link: data.link || null,
        read: false,
      },
    });
  }

  /**
   * Dispatches High-Priority Immediate Alert
   * Triggers in-app alert always; if match score >= threshold & email enabled, sends email with idempotency.
   */
  async dispatchPriorityAlert(userId: string, opportunityId: string) {
    const [user, opp, prefs] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.opportunity.findUnique({
        where: { id: opportunityId },
        include: { organization: true },
      }),
      this.getPreferences(userId),
    ]);

    if (!user || !opp) {
      throw new NotFoundException('User or Opportunity not found.');
    }

    const match = await this.prisma.opportunityMatch.findUnique({
      where: {
        opportunityId_userId: { opportunityId: opp.id, userId: user.id },
      },
    });

    const score = match ? Math.round(match.relevanceScore * 100) : 92;
    const isHighPriority = score >= prefs.highPriorityThreshold;

    const notifKey = `idemp:${user.id}:priority_alert:${opp.id}:inapp`;
    const inAppNotif = await this.createNotification({
      userId: user.id,
      type: 'priority_alert',
      priority: 'immediate',
      idempotencyKey: notifKey,
      entityType: 'opportunity',
      entityId: opp.id,
      title: `🔥 [${score}% Match] ${opp.title}`,
      message: `${opp.organization.name} announced an opportunity matching your Cyber Security profile.`,
      link: `/opportunities/${opp.slug}`,
    });

    let emailResult: any = null;
    if (isHighPriority && prefs.emailEnabled) {
      const emailIdempKey = `idemp:${user.id}:priority_alert:${opp.id}:email:instant`;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      const emailData = renderPriorityAlertEmail({
        opportunityTitle: opp.title,
        organizationName: opp.organization.name,
        category: opp.category,
        relevanceScore: score,
        deadline: opp.deadline ? opp.deadline.toLocaleDateString() : null,
        matchReasons: [
          'Direct alignment with your Cyber Security undergraduate track.',
          'Open to verified applicants from Nigeria with remote/funded scope.',
          'Skills profile matches required AppSec & Software engineering competencies.',
        ],
        ctaUrl: `${appUrl}/opportunities/${opp.slug}`,
        unsubscribeUrl: `${appUrl}/settings/notifications`,
      });

      emailResult = await this.emailService.sendEmail({
        userId: user.id,
        to: user.email,
        subject: emailData.subject,
        html: emailData.html,
        idempotencyKey: emailIdempKey,
        notificationId: inAppNotif.id,
      });
    }

    return {
      notification: inAppNotif,
      emailDispatched: !!emailResult,
      emailResult,
    };
  }

  /**
   * Generates and dispatches the Daily Digest
   * Automatically suppressed if empty.
   */
  async dispatchDailyDigest(userId: string) {
    const [user, prefs] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.getPreferences(userId),
    ]);
    if (!user) throw new NotFoundException('User not found.');

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 1. Gather new opportunities discovered in last 24h
    const newOpps = await this.prisma.opportunity.findMany({
      where: {
        createdAt: { gte: oneDayAgo },
        verificationStatus: { in: ['verified', 'partially_verified'] },
      },
      include: { organization: true },
      take: 5,
    });

    // 2. Gather verified deadlines closing in the next 7 days
    const closingOpps = await this.prisma.opportunity.findMany({
      where: {
        verificationStatus: 'verified',
        deadline: {
          gte: new Date(),
          lte: sevenDaysFromNow,
        },
      },
      include: { organization: true },
      take: 5,
    });

    const todayStr = new Date().toISOString().split('T')[0]!;
    const digestIdempKey = `idemp:${user.id}:daily_digest:${todayStr}:email`;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const emailData = renderDailyDigestEmail({
      digestDate: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }),
      opportunities: newOpps.map(o => ({
        title: o.title,
        organization: o.organization.name,
        category: o.category,
        score: 88,
        deadline: o.deadline ? o.deadline.toLocaleDateString() : null,
        slug: o.slug,
      })),
      closingSoon: closingOpps.map(c => ({
        title: c.title,
        organization: c.organization.name,
        daysRemaining: Math.max(1, Math.ceil(((c.deadline?.getTime() || 0) - Date.now()) / (1000 * 60 * 60 * 24))),
        deadline: c.deadline?.toLocaleDateString() || '',
        slug: c.slug,
      })),
      sourceUpdatesCount: 4,
      digestUrl: `${appUrl}/discover`,
      unsubscribeUrl: `${appUrl}/settings/notifications`,
    });

    // Empty Digest Suppression Invariant
    if (!emailData) {
      this.logger.log(`Daily digest empty for user ${user.id} on ${todayStr}. Skipping email delivery.`);
      return { sent: false, reason: 'empty_digest_suppressed' };
    }

    if (!prefs.emailEnabled) {
      return { sent: false, reason: 'email_notifications_disabled' };
    }

    const emailResult = await this.emailService.sendEmail({
      userId: user.id,
      to: user.email,
      subject: emailData.subject,
      html: emailData.html,
      idempotencyKey: digestIdempKey,
    });

    return {
      sent: true,
      emailResult,
    };
  }

  /**
   * Generates HTML Previews for in-app template testing
   */
  async renderTemplatePreview(template: 'priority_alert' | 'daily_digest' | 'deadline_reminder') {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (template === 'priority_alert') {
      return renderPriorityAlertEmail({
        opportunityTitle: 'OpenSSF Global Cybersecurity Fellowship 2027',
        organizationName: 'Open Source Security Foundation (Linux Foundation)',
        category: 'fellowship',
        relevanceScore: 96,
        deadline: 'Nov 30, 2026',
        matchReasons: [
          'High Category Priority: Fellowship aligned with your cybersecurity goals.',
          'Skills match: Python, AppSec Auditing, Linux kernel security fundamentals.',
          'Nigeria Eligible: Fully supported remote stipend with travel grant included.',
        ],
        ctaUrl: `${appUrl}/opportunities/openssf-global-appsec-fellowship-2027`,
        unsubscribeUrl: `${appUrl}/settings/notifications`,
      });
    }

    if (template === 'daily_digest') {
      const digest = renderDailyDigestEmail({
        digestDate: 'Monday, Nov 11, 2026',
        opportunities: [
          {
            title: 'Google Cloud Security Summer Internship',
            organization: 'Google',
            category: 'internship',
            score: 94,
            deadline: 'Dec 15, 2026',
            slug: 'google-cloud-security-summer-2027',
          },
          {
            title: 'DEF CON 35 CTF Student Grant',
            organization: 'DEF CON Communications',
            category: 'hackathon_ctf',
            score: 89,
            deadline: 'Jan 10, 2027',
            slug: 'defcon-35-student-grant',
          },
        ],
        closingSoon: [
          {
            title: 'African Cyber Defense Fellowship',
            organization: 'AfriSec Alliance',
            daysRemaining: 3,
            deadline: 'Nov 14, 2026',
            slug: 'afrisec-defense-fellowship',
          },
        ],
        sourceUpdatesCount: 7,
        digestUrl: `${appUrl}/discover`,
        unsubscribeUrl: `${appUrl}/settings/notifications`,
      });

      return digest || { subject: 'Empty Digest', html: '<p>No opportunities</p>' };
    }

    // deadline_reminder
    return renderDeadlineReminderEmail({
      opportunityTitle: 'OpenSSF Global Cybersecurity Fellowship 2027',
      organizationName: 'OpenSSF',
      daysRemaining: 7,
      deadline: 'November 23, 2026',
      checklistCompleted: 3,
      checklistTotal: 4,
      ctaUrl: `${appUrl}/applications`,
      unsubscribeUrl: `${appUrl}/settings/notifications`,
    });
  }
}
