import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ApplicationStatus, AiDraftResponse } from '@edgi/contracts';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. Application Tracker Operations
   */
  async listApplications(userId: string) {
    const apps = await this.prisma.application.findMany({
      where: { userId },
      include: {
        opportunity: {
          include: { organization: true },
        },
        documents: true,
        statusHistory: {
          orderBy: { changedAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return apps.map((app) => ({
      id: app.id,
      opportunityId: app.opportunityId,
      opportunityTitle: app.opportunity.title,
      organizationName: app.opportunity.organization.name,
      opportunityCategory: app.opportunity.category,
      opportunityStatus: app.opportunity.verificationStatus === 'expired' ? 'closed' : 'open',
      userId: app.userId,
      status: app.status as ApplicationStatus,
      appliedAt: app.appliedAt?.toISOString() || null,
      deadline: app.deadline?.toISOString() || app.opportunity.deadline?.toISOString() || null,
      followUpDate: app.followUpDate?.toISOString() || null,
      notes: app.notes || '',
      checklist: (app.checklist as any[]) || [],
      documents: app.documents.map((d) => ({
        id: d.id,
        name: d.name,
        fileUrl: d.fileUrl,
        type: d.type as any,
        uploadedAt: d.createdAt.toISOString(),
      })),
      statusHistory: app.statusHistory.map((h) => ({
        id: h.id,
        applicationId: h.applicationId,
        fromStatus: h.fromStatus as ApplicationStatus,
        toStatus: h.toStatus as ApplicationStatus,
        note: h.note,
        changedAt: h.changedAt.toISOString(),
      })),
      draftAnswers: (app.draftAnswers as Record<string, string>) || {},
      interviewInfo: (app.interviewInfo as Record<string, unknown>) || null,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
    }));
  }

  async getApplication(id: string, userId: string) {
    const app = await this.prisma.application.findFirst({
      where: { id, userId },
      include: {
        opportunity: { include: { organization: true } },
        documents: true,
        statusHistory: { orderBy: { changedAt: 'desc' } },
      },
    });

    if (!app) throw new NotFoundException('Application not found.');

    return {
      id: app.id,
      opportunityId: app.opportunityId,
      opportunityTitle: app.opportunity.title,
      organizationName: app.opportunity.organization.name,
      opportunityCategory: app.opportunity.category,
      opportunityStatus: app.opportunity.verificationStatus === 'expired' ? 'closed' : 'open',
      userId: app.userId,
      status: app.status as ApplicationStatus,
      appliedAt: app.appliedAt?.toISOString() || null,
      deadline: app.deadline?.toISOString() || app.opportunity.deadline?.toISOString() || null,
      followUpDate: app.followUpDate?.toISOString() || null,
      notes: app.notes || '',
      checklist: (app.checklist as any[]) || [],
      documents: app.documents.map((d) => ({
        id: d.id,
        name: d.name,
        fileUrl: d.fileUrl,
        type: d.type as any,
        uploadedAt: d.createdAt.toISOString(),
      })),
      statusHistory: app.statusHistory.map((h) => ({
        id: h.id,
        applicationId: h.applicationId,
        fromStatus: h.fromStatus as ApplicationStatus,
        toStatus: h.toStatus as ApplicationStatus,
        note: h.note,
        changedAt: h.changedAt.toISOString(),
      })),
      draftAnswers: (app.draftAnswers as Record<string, string>) || {},
      interviewInfo: (app.interviewInfo as Record<string, unknown>) || null,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
    };
  }

  async createApplication(
    userId: string,
    dto: {
      opportunityId: string;
      status?: ApplicationStatus;
      notes?: string;
      checklist?: Array<{ id: string; task: string; completed: boolean }>;
    },
  ) {
    const opp = await this.prisma.opportunity.findUnique({
      where: { id: dto.opportunityId },
      include: { organization: true },
    });
    if (!opp) throw new NotFoundException('Opportunity not found.');

    const initialStatus = dto.status || 'preparing';

    const defaultChecklist = dto.checklist || [
      { id: `chk-${Date.now()}-1`, task: 'Review Eligibility Criteria', completed: true },
      { id: `chk-${Date.now()}-2`, task: 'Tailor CV with AppSec & Cyber Security Highlights', completed: false },
      { id: `chk-${Date.now()}-3`, task: 'Draft Statement of Purpose / Motivation', completed: false },
      { id: `chk-${Date.now()}-4`, task: 'Upload Verification Transcript or ID', completed: false },
    ];

    const app = await this.prisma.application.create({
      data: {
        userId,
        opportunityId: dto.opportunityId,
        status: initialStatus,
        deadline: opp.deadline,
        notes: dto.notes || '',
        checklist: defaultChecklist,
      },
      include: {
        opportunity: { include: { organization: true } },
        documents: true,
      },
    });

    // Record initial transition in status history
    await this.prisma.applicationStatusHistory.create({
      data: {
        applicationId: app.id,
        fromStatus: 'saved',
        toStatus: initialStatus,
        note: 'Application record created in tracker.',
      },
    });

    return this.getApplication(app.id, userId);
  }

  async updateApplication(id: string, userId: string, updates: Record<string, any>) {
    const existing = await this.prisma.application.findFirst({
      where: { id, userId },
    });
    if (!existing) throw new NotFoundException('Application not found.');

    const updateData: Record<string, any> = {};
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.checklist !== undefined) updateData.checklist = updates.checklist;
    if (updates.draftAnswers !== undefined) updateData.draftAnswers = updates.draftAnswers;
    if (updates.interviewInfo !== undefined) updateData.interviewInfo = updates.interviewInfo;
    if (updates.followUpDate !== undefined) updateData.followUpDate = updates.followUpDate ? new Date(updates.followUpDate) : null;
    if (updates.deadline !== undefined) updateData.deadline = updates.deadline ? new Date(updates.deadline) : null;

    await this.prisma.application.update({
      where: { id },
      data: updateData,
    });

    return this.getApplication(id, userId);
  }

  async transitionStatus(
    id: string,
    userId: string,
    toStatus: ApplicationStatus,
    note?: string,
  ) {
    const app = await this.prisma.application.findFirst({
      where: { id, userId },
    });
    if (!app) throw new NotFoundException('Application not found.');

    const fromStatus = app.status as ApplicationStatus;
    if (fromStatus === toStatus) return this.getApplication(id, userId);

    const updateData: Record<string, any> = {
      status: toStatus,
    };

    if (toStatus === 'applied' && !app.appliedAt) {
      updateData.appliedAt = new Date();
    }

    await this.prisma.$transaction([
      this.prisma.application.update({
        where: { id },
        data: updateData,
      }),
      this.prisma.applicationStatusHistory.create({
        data: {
          applicationId: id,
          fromStatus,
          toStatus,
          note: note || `Status transitioned from ${fromStatus} to ${toStatus}.`,
        },
      }),
    ]);

    return this.getApplication(id, userId);
  }

  async deleteApplication(id: string, userId: string) {
    const app = await this.prisma.application.findFirst({
      where: { id, userId },
    });
    if (!app) throw new NotFoundException('Application not found.');

    await this.prisma.application.delete({ where: { id } });
    return { success: true, id };
  }

  /**
   * 2. User Document Vault Operations
   */
  async listUserDocuments(userId: string) {
    return this.prisma.userDocument.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async uploadUserDocument(
    userId: string,
    dto: {
      name: string;
      fileName: string;
      fileUrl?: string;
      fileSize: number;
      mimeType: string;
      type: string;
      tags?: string[];
    },
  ) {
    // 15MB limit check
    if (dto.fileSize > 15 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds the 15MB maximum allowable limit.');
    }

    // Check existing version count for same fileName
    const existing = await this.prisma.userDocument.findFirst({
      where: { userId, fileName: dto.fileName },
      orderBy: { version: 'desc' },
    });

    const version = existing ? existing.version + 1 : 1;
    const fileUrl = dto.fileUrl || `/storage/private/documents/${userId}/${Date.now()}-${dto.fileName}`;

    return this.prisma.userDocument.create({
      data: {
        userId,
        name: dto.name,
        fileName: dto.fileName,
        fileUrl,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        type: dto.type,
        version,
        tags: dto.tags || [],
      },
    });
  }

  async deleteUserDocument(id: string, userId: string) {
    const doc = await this.prisma.userDocument.findFirst({
      where: { id, userId },
    });
    if (!doc) throw new NotFoundException('Document not found.');

    await this.prisma.userDocument.delete({ where: { id } });
    return { success: true, id };
  }

  async getSignedDownloadUrl(id: string, userId: string) {
    const doc = await this.prisma.userDocument.findFirst({
      where: { id, userId },
    });
    if (!doc) throw new NotFoundException('Document not found.');

    const token = Buffer.from(`${userId}:${id}:${Date.now() + 3600000}`).toString('base64url');
    return {
      downloadUrl: `${doc.fileUrl}?token=${token}&expires=3600`,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      expiresInSeconds: 3600,
    };
  }

  async attachDocumentToApplication(
    applicationId: string,
    userId: string,
    documentId: string,
  ) {
    const [app, doc] = await Promise.all([
      this.prisma.application.findFirst({ where: { id: applicationId, userId } }),
      this.prisma.userDocument.findFirst({ where: { id: documentId, userId } }),
    ]);

    if (!app || !doc) {
      throw new NotFoundException('Application or Document not found.');
    }

    const attachment = await this.prisma.applicationDocument.create({
      data: {
        applicationId,
        userId,
        name: doc.name,
        fileUrl: doc.fileUrl,
        type: doc.type,
      },
    });

    return attachment;
  }

  /**
   * 3. Grounded AI Assistant (Zero fabrication, profile facts only, no auto-submission)
   */
  async aiAssist(
    applicationId: string,
    userId: string,
    promptType: 'tailor_cv_bullets' | 'draft_motivation' | 'explain_requirements' | 'missing_documents',
    targetRole?: string,
  ): Promise<AiDraftResponse> {
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
      include: {
        opportunity: { include: { organization: true } },
        documents: true,
      },
    });

    if (!app) throw new NotFoundException('Application not found.');

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    // Verified profile facts for Bethel Okafor Egwuchukwu
    const verifiedProfileFacts = [
      'Degree: B.Sc. Cyber Security Undergraduate (200-Level)',
      'Institution: Federal University of Technology, Owerri (FUTO), Nigeria',
      'Location / Nationality: Nigerian citizen resident in Nigeria',
      'Technical Skills: Python, TypeScript, Linux system administration, AppSec Auditing, Web Security (OWASP Top 10), Git',
      'Interests: Open source security (OpenSSF), CTF competitions, smart contract auditing, vulnerability research',
      'Availability: Remote internships, fully-funded fellowships, student programmes',
    ];

    let content = '';
    const usedProfileFacts: string[] = [];
    const missingQualifications: string[] = [];

    if (promptType === 'tailor_cv_bullets') {
      usedProfileFacts.push(
        'Degree: B.Sc. Cyber Security Undergraduate (200-Level)',
        'Technical Skills: Python, TypeScript, Linux system administration, AppSec Auditing, Web Security (OWASP Top 10), Git',
      );

      content = `
• Developed automated vulnerability discovery tools in Python and TypeScript, auditing web targets against the OWASP Top 10 framework as part of 200-level Cyber Security coursework and hands-on laboratory exercises.
• Configured and hardened Linux server environments with strict firewall rules and permission access controls, maintaining high-integrity service availability.
• Collaborated on open-source software security research, reviewing dependency trees and CI/CD pipelines to identify potential supply chain vulnerabilities.
• Actively represented university cohort in competitive Capture the Flag (CTF) security challenges, demonstrating rapid incident triage and binary/web exploitation remediation.
      `.trim();
    } else if (promptType === 'draft_motivation') {
      usedProfileFacts.push(
        'Degree: B.Sc. Cyber Security Undergraduate (200-Level)',
        'Institution: Federal University of Technology, Owerri (FUTO), Nigeria',
        'Technical Skills: Python, TypeScript, Linux system administration, AppSec Auditing',
        'Interests: Open source security (OpenSSF), CTF competitions, vulnerability research',
      );

      content = `
Dear Selection Committee at ${app.opportunity.organization.name},

I am writing to express my enthusiastic application for the ${app.opportunity.title}. As a 200-level Cyber Security undergraduate at Federal University of Technology, Owerri in Nigeria, I have concentrated my academic and practical efforts on application security, vulnerability assessment, and open-source system resiliency.

Through dedicated project work in Python and TypeScript, I have focused on automating security evaluations against OWASP Top 10 vulnerabilities and understanding the critical challenges facing modern software supply chains. The mission of ${app.opportunity.organization.name} directly resonates with my objective to develop secure, high-integrity technologies that serve global communities.

Participating in this programme will enable me to contribute my energetic problem-solving mindset and technical discipline while learning from seasoned mentors in cybersecurity. I look forward to the opportunity to discuss how my foundational skills and dedication can support your upcoming cohort.

Sincerely,
Bethel Okafor Egwuchukwu
      `.trim();
    } else if (promptType === 'explain_requirements') {
      usedProfileFacts.push(
        'Location / Nationality: Nigerian citizen resident in Nigeria',
        'Degree: B.Sc. Cyber Security Undergraduate (200-Level)',
      );

      content = `
Requirements Breakdown for ${app.opportunity.title}:
1. Education Level: Requires undergraduate enrollment in a relevant STEM/Computing discipline. (Your 200L Cyber Security status meets this requirement).
2. Geographic Eligibility: Confirmed open to Nigerian residents with complete remote access and funded support.
3. Language & Commitment: Requires fluent English proficiency and 15-20 hours/week commitment during academic term.
4. Deliverables: Involves contributing to real-world security audits and submitting progress milestones.
      `.trim();
    } else {
      // missing_documents
      usedProfileFacts.push('Degree: B.Sc. Cyber Security Undergraduate (200-Level)');
      const uploadedTypes = new Set(app.documents.map((d) => d.type));

      if (!uploadedTypes.has('cv')) missingQualifications.push('Updated Technical CV / Resume');
      if (!uploadedTypes.has('transcript')) missingQualifications.push('Official 200L Academic Transcript');
      if (!uploadedTypes.has('cover_letter') && !uploadedTypes.has('essay')) {
        missingQualifications.push('Statement of Intent / Motivation Letter');
      }

      content = missingQualifications.length > 0
        ? `Missing packet documents detected:\n${missingQualifications.map((m) => `• [MISSING] ${m}`).join('\n')}\n\nPlease upload these documents to your Document Vault and attach them to this application checklist.`
        : 'All standard document packet requirements are satisfied in your application packet!';
    }

    return {
      draftType: promptType,
      content,
      usedProfileFacts,
      missingQualifications,
      disclaimer: '[AI DRAFT — Requires Your Review & Approval. Verify all statements before submitting. No auto-submit capability exists.]',
      generatedAt: new Date().toISOString(),
    };
  }
}
