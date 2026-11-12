import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

export interface SendEmailOptions {
  userId: string;
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
  notificationId?: string;
  from?: string;
}

export interface EmailDeliveryResult {
  success: boolean;
  deliveryId: string;
  providerId: string | null;
  status: 'sent' | 'queued' | 'failed' | 'delivered';
  attempts: number;
  isDuplicate: boolean;
  error?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotent email dispatcher.
   * If an email for the given (userId, idempotencyKey) was already successfully sent,
   * it returns the existing record immediately and skips sending.
   */
  async sendEmail(options: SendEmailOptions): Promise<EmailDeliveryResult> {
    const { userId, to, subject, html, idempotencyKey, notificationId } = options;

    // 1. Idempotency Check
    const existing = await this.prisma.notificationDelivery.findUnique({
      where: {
        userId_idempotencyKey: {
          userId,
          idempotencyKey,
        },
      },
    });

    if (existing && (existing.status === 'sent' || existing.status === 'delivered')) {
      this.logger.log(`Idempotency hit: email already sent for key "${idempotencyKey}". Suppressing duplicate dispatch.`);
      return {
        success: true,
        deliveryId: existing.id,
        providerId: existing.providerId,
        status: existing.status as 'sent' | 'delivered',
        attempts: existing.attempts,
        isDuplicate: true,
      };
    }

    // 2. Create or reuse delivery ledger entry
    let delivery = existing;
    if (!delivery) {
      delivery = await this.prisma.notificationDelivery.create({
        data: {
          userId,
          notificationId: notificationId || null,
          channel: 'email',
          idempotencyKey,
          status: 'queued',
          attempts: 1,
        },
      });
    } else {
      delivery = await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          attempts: { increment: 1 },
          updatedAt: new Date(),
        },
      });
    }

    // 3. Dispatch to Resend (or Mock Transport in Development/Test)
    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress = options.from || process.env.RESEND_FROM_EMAIL || 'Edgi Alerts <onboarding@resend.dev>';

    try {
      let providerId: string;

      if (apiKey && apiKey.startsWith('re_')) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to,
            subject,
            html,
            headers: {
              'List-Unsubscribe': `<${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/notifications>`,
              'X-Entity-Ref-ID': idempotencyKey,
            },
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(`Resend API returned HTTP ${response.status}: ${JSON.stringify(errData)}`);
        }

        const data = (await response.json()) as { id?: string };
        providerId = data.id || `re_${Date.now()}`;
      } else {
        // Resilient development simulation mode
        providerId = `re_mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        this.logger.log(`[Email Mock Transport] Dispatched to ${to}: "${subject}" (Provider ID: ${providerId})`);
      }

      // 4. Mark Delivery as Sent in Ledger
      const updated = await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'sent',
          providerId,
          sentAt: new Date(),
          lastError: null,
        },
      });

      return {
        success: true,
        deliveryId: updated.id,
        providerId: updated.providerId,
        status: 'sent',
        attempts: updated.attempts,
        isDuplicate: false,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Email dispatch failed for key "${idempotencyKey}" (attempt #${delivery.attempts}): ${errMsg}`);

      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'failed',
          lastError: errMsg,
        },
      });

      return {
        success: false,
        deliveryId: delivery.id,
        providerId: null,
        status: 'failed',
        attempts: delivery.attempts,
        isDuplicate: false,
        error: errMsg,
      };
    }
  }

  /**
   * Inspect deliveries for failure diagnostics.
   */
  async getDeliveryLedger(userId: string, limit = 20) {
    return this.prisma.notificationDelivery.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { notification: true },
    });
  }
}
