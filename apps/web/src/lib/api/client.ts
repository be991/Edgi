import {
  Opportunity,
  OpportunityFilter,
  Source,
  CandidateSource,
  Application,
  ApplicationStatus,
  UserDocument,
  Notification,
  NotificationPreferences,
  NotificationDelivery,
  EmailTemplatePreview,
  AiDraftResponse,
  UserProfile,
  UserPreferences,
  UsageBudget,
  SystemHealth,
  SocialPlatformSummary,
  CaptureSubmission,
  CaptureResult,
} from '@edgi/contracts';

import { mockOpportunities } from '../fixtures/opportunities';
import { mockSources, mockCandidateSources } from '../fixtures/sources';
import { mockApplications, mockUserDocuments } from '../fixtures/applications';
import { mockUserProfile, mockUserPreferences } from '../fixtures/profile';
import {
  mockNotifications,
  mockNotificationPreferences,
  mockNotificationDeliveries,
} from '../fixtures/notifications';
import { mockUsageBudget, mockSystemHealth } from '../fixtures/usage';
import { mockProcessingReviewItems, ProcessingReviewItemMock } from '../fixtures/processing';
import { mockSocialConnectors } from '../fixtures/connectors';

const API_MODE = process.env.NEXT_PUBLIC_API_MODE || 'mock';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// In-memory mock state for interactive demo persistence
let inMemoryOpportunities = [...mockOpportunities];
let inMemoryReviewItems = [...mockProcessingReviewItems];
let inMemorySources = [...mockSources];
let inMemoryCandidateSources = [...mockCandidateSources];
let inMemoryApplications = [...mockApplications];
let inMemoryDocuments = [...mockUserDocuments];
let inMemoryProfile = { ...mockUserProfile };
let inMemoryPreferences = { ...mockUserPreferences };
let inMemoryNotifications = [...mockNotifications];
let inMemoryNotificationPreferences = { ...mockNotificationPreferences };
let inMemoryDeliveries = [...mockNotificationDeliveries];
let inMemoryBudget: any = { ...mockUsageBudget, isEmergencyPaused: false };
let inMemoryConnectors = [...mockSocialConnectors];

let inMemoryWeights = {
  category: 0.25,
  skills: 0.20,
  education: 0.15,
  geography: 0.15,
  benefits: 0.10,
  organization: 0.10,
  timing: 0.05,
};
let inMemoryDeltas: Record<string, number> = {
  category: 0,
  skills: 0,
  education: 0,
  geography: 0,
  benefits: 0,
  organization: 0,
  timing: 0,
};

export async function getRecommendedOpportunities(): Promise<Opportunity[]> {
  const res = await getRecommended();
  return res.opportunities;
}

export async function getRecommended(params?: {
  tab?: string;
  openToNigeria?: boolean;
  category?: string;
}): Promise<{
  opportunities: Opportunity[];
  total: number;
  tabCounts: { all: number; top: number; verify_first: number; ineligible: number };
}> {
  if (API_MODE === 'mock') {
    // Apply scope filters (Nigeria and category) first so tabCounts accurately reflect the active filter state
    let scopeFiltered = [...inMemoryOpportunities];
    if (params?.openToNigeria) {
      scopeFiltered = scopeFiltered.filter((o) => o.isOpenToNigeria);
    }
    if (params?.category && params.category !== 'all') {
      scopeFiltered = scopeFiltered.filter((o) => o.category === params.category);
    }

    const tabCounts = {
      all: scopeFiltered.length,
      top: scopeFiltered.filter((o) =>
        ['eligible', 'likely_eligible', 'possibly_eligible'].includes(o.eligibilityStatus || '')
      ).length,
      verify_first: scopeFiltered.filter((o) => o.eligibilityStatus === 'unknown').length,
      ineligible: scopeFiltered.filter((o) => o.eligibilityStatus === 'ineligible').length,
    };

    let filtered = scopeFiltered;
    if (params?.tab === 'top') {
      filtered = scopeFiltered.filter((o) =>
        ['eligible', 'likely_eligible', 'possibly_eligible'].includes(o.eligibilityStatus || '')
      );
    } else if (params?.tab === 'verify_first') {
      filtered = scopeFiltered.filter((o) => o.eligibilityStatus === 'unknown');
    } else if (params?.tab === 'ineligible') {
      filtered = scopeFiltered.filter((o) => o.eligibilityStatus === 'ineligible');
    } else {
      // 'all' or default
      filtered = scopeFiltered;
    }

    filtered.sort((a, b) => (b.priority ?? b.relevanceScore ?? 0) - (a.priority ?? a.relevanceScore ?? 0));

    return {
      opportunities: filtered,
      total: filtered.length,
      tabCounts,
    };
  }

  const query = new URLSearchParams();
  if (params?.tab) query.set('tab', params.tab);
  if (params?.openToNigeria) query.set('openToNigeria', 'true');
  if (params?.category) query.set('category', params.category);

  const res = await fetch(`${API_URL}/opportunities/recommended?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch recommended opportunities');
  return res.json();
}

export async function getEligibilityAssessment(opportunityId: string): Promise<any> {
  if (API_MODE === 'mock') {
    const opp = inMemoryOpportunities.find((o) => o.id === opportunityId || o.slug === opportunityId);
    return opp?.eligibilityAssessment || null;
  }
  const res = await fetch(`${API_URL}/opportunities/${opportunityId}/eligibility`);
  if (!res.ok) return null;
  return res.json();
}

export async function submitFeedback(
  opportunityId: string,
  action: 'save' | 'apply' | 'thumbs_up' | 'thumbs_down' | 'dismiss',
  reason?: string,
  notes?: string
): Promise<{ success: boolean; deltas: Record<string, number>; currentWeights: any }> {
  if (API_MODE === 'mock') {
    // Bounded learning logic in mock
    if (action === 'save' || action === 'apply') {
      inMemoryDeltas.category = Math.min(0.05, (inMemoryDeltas.category || 0) + 0.01);
      inMemoryDeltas.skills = Math.min(0.05, (inMemoryDeltas.skills || 0) + 0.01);
    } else if (action === 'thumbs_up') {
      inMemoryDeltas.skills = Math.min(0.05, (inMemoryDeltas.skills || 0) + 0.02);
      inMemoryDeltas.organization = Math.min(0.05, (inMemoryDeltas.organization || 0) + 0.01);
    } else if (action === 'dismiss' || action === 'thumbs_down') {
      if (reason === 'unpaid') {
        inMemoryDeltas.benefits = Math.min(0.05, (inMemoryDeltas.benefits || 0) + 0.02);
      } else if (reason === 'too_senior') {
        inMemoryDeltas.education = Math.min(0.05, (inMemoryDeltas.education || 0) + 0.02);
      } else {
        inMemoryDeltas.category = Math.max(-0.05, (inMemoryDeltas.category || 0) - 0.01);
      }
    }

    // Recompute normalized weights
    const raw = {
      category: 0.25 + (inMemoryDeltas.category || 0),
      skills: 0.20 + (inMemoryDeltas.skills || 0),
      education: 0.15 + (inMemoryDeltas.education || 0),
      geography: 0.15 + (inMemoryDeltas.geography || 0),
      benefits: 0.10 + (inMemoryDeltas.benefits || 0),
      organization: 0.10 + (inMemoryDeltas.organization || 0),
      timing: 0.05 + (inMemoryDeltas.timing || 0),
    };
    const sum = Object.values(raw).reduce((a, b) => a + b, 0);
    inMemoryWeights = {
      category: Number((raw.category / sum).toFixed(4)),
      skills: Number((raw.skills / sum).toFixed(4)),
      education: Number((raw.education / sum).toFixed(4)),
      geography: Number((raw.geography / sum).toFixed(4)),
      benefits: Number((raw.benefits / sum).toFixed(4)),
      organization: Number((raw.organization / sum).toFixed(4)),
      timing: Number((raw.timing / sum).toFixed(4)),
    };

    if (action === 'dismiss') {
      inMemoryOpportunities = inMemoryOpportunities.filter((o) => o.id !== opportunityId);
    }

    return {
      success: true,
      deltas: { ...inMemoryDeltas },
      currentWeights: { ...inMemoryWeights },
    };
  }

  const res = await fetch(`${API_URL}/opportunities/${opportunityId}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, reason, notes }),
  });
  if (!res.ok) throw new Error('Failed to submit feedback');
  return res.json();
}

export async function getScoringWeights(): Promise<{
  weights: Record<string, number>;
  defaults: Record<string, number>;
  deltas: Record<string, number>;
  bounds: Record<string, [number, number]>;
}> {
  if (API_MODE === 'mock') {
    return {
      weights: { ...inMemoryWeights },
      defaults: {
        category: 0.25,
        skills: 0.20,
        education: 0.15,
        geography: 0.15,
        benefits: 0.10,
        organization: 0.10,
        timing: 0.05,
      },
      deltas: { ...inMemoryDeltas },
      bounds: {
        category: [0.20, 0.30],
        skills: [0.15, 0.25],
        education: [0.10, 0.20],
        geography: [0.10, 0.20],
        benefits: [0.05, 0.15],
        organization: [0.05, 0.15],
        timing: [0.00, 0.10],
      },
    };
  }

  const res = await fetch(`${API_URL}/opportunities/weights`);
  if (!res.ok) throw new Error('Failed to fetch weights');
  return res.json();
}

export async function resetScoringWeights(): Promise<{ success: boolean; weights: Record<string, number> }> {
  if (API_MODE === 'mock') {
    inMemoryDeltas = {
      category: 0,
      skills: 0,
      education: 0,
      geography: 0,
      benefits: 0,
      organization: 0,
      timing: 0,
    };
    inMemoryWeights = {
      category: 0.25,
      skills: 0.20,
      education: 0.15,
      geography: 0.15,
      benefits: 0.10,
      organization: 0.10,
      timing: 0.05,
    };
    return { success: true, weights: { ...inMemoryWeights } };
  }

  const res = await fetch(`${API_URL}/opportunities/weights/reset`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset weights');
  return res.json();
}

export async function getProfileCompleteness(): Promise<{
  score: number;
  percentage: number;
  completedFields: string[];
  missingFields: string[];
  missingImpactNotes: string[];
}> {
  if (API_MODE === 'mock') {
    return {
      score: 90,
      percentage: 90,
      completedFields: [
        'fullName',
        'degree',
        'major',
        'yearOfStudy',
        'university',
        'country',
        'nationality',
        'skills',
        'targetRoles',
      ],
      missingFields: ['graduationYear'],
      missingImpactNotes: [
        'Missing explicit graduation year (e.g. 2028). Opportunities with strict cohort graduation criteria will evaluate to "unknown".',
      ],
    };
  }

  const res = await fetch(`${API_URL}/opportunities/profile/completeness`);
  if (!res.ok) throw new Error('Failed to fetch profile completeness');
  return res.json();
}

// Phase 6: Social Connectors & Quick Capture
export async function getSocialConnectors(): Promise<SocialPlatformSummary[]> {
  if (API_MODE === 'mock') {
    return inMemoryConnectors;
  }
  const res = await fetch(`${API_URL}/connectors`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch connectors');
  return res.json();
}

export async function updateConnectorCredential(platform: string, credentialValue: string): Promise<any> {
  if (API_MODE === 'mock') {
    inMemoryConnectors = inMemoryConnectors.map((c) => {
      if (c.platform === platform) {
        return {
          ...c,
          credentialConfigured: true,
          status: c.status === 'authorization_required' ? 'active' : c.status,
          lastCheck: new Date().toISOString(),
        };
      }
      return c;
    });
    return { success: true, platform };
  }
  const res = await fetch(`${API_URL}/connectors/${platform}/credential`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credentialValue }),
  });
  if (!res.ok) throw new Error(`Failed to configure credential for ${platform}`);
  return res.json();
}

export async function testConnectorHealth(
  platform: string
): Promise<{ isHealthy: boolean; statusCode: number; responseTimeMs: number; message: string }> {
  if (API_MODE === 'mock') {
    const conn = inMemoryConnectors.find((c) => c.platform === platform);
    return {
      isHealthy: true,
      statusCode: 200,
      responseTimeMs: Math.floor(Math.random() * 80) + 40,
      message: `${conn?.name || platform} connector ping succeeded. Status is healthy.`,
    };
  }
  const res = await fetch(`${API_URL}/connectors/${platform}/health`, { method: 'POST' });
  if (!res.ok) throw new Error(`Health check failed for ${platform}`);
  return res.json();
}

export async function revokeConnector(platform: string): Promise<any> {
  if (API_MODE === 'mock') {
    inMemoryConnectors = inMemoryConnectors.map((c) => {
      if (c.platform === platform) {
        return {
          ...c,
          credentialConfigured: false,
          status:
            c.status === 'active' || c.status === 'active_limited' ? 'authorization_required' : c.status,
        };
      }
      return c;
    });
    return { success: true, platform };
  }
  const res = await fetch(`${API_URL}/connectors/${platform}/revoke`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to revoke connector ${platform}`);
  return res.json();
}

export async function submitCapture(data: CaptureSubmission): Promise<CaptureResult> {
  if (API_MODE === 'mock') {
    const url = data.url?.toLowerCase() || '';
    const caption = data.caption?.toLowerCase() || '';

    // Check if this matches OpenSSF or existing URL
    const isMatchOpenSSF = url.includes('openssf') || caption.includes('openssf');
    if (isMatchOpenSSF) {
      const opp = inMemoryOpportunities.find((o) => o.id === '11111111-1111-1111-1111-111111111111');
      if (opp) {
        opp.evidence = [
          ...(opp.evidence || []),
          {
            id: `ev-captured-${Date.now()}`,
            opportunityId: opp.id,
            sourceId: `src-${data.platform}`,
            sourceName: `${data.platform.toUpperCase()} Quick Capture`,
            sourceUrl: data.url || 'https://x.com/OpenSSF/status/1900000',
            fieldName: 'announcement',
            extractedValue: data.caption.slice(0, 100),
            confidence: 0.95,
            snippet: data.caption,
            extractedAt: new Date().toISOString(),
          },
        ];
        return {
          id: `cap-${Date.now()}`,
          status: 'duplicate',
          isDuplicate: true,
          opportunityId: opp.id,
          canonicalUrl: opp.canonicalUrl,
          title: opp.title,
          organization: opp.organization.name,
          deadline: opp.deadline,
          evidenceCount: opp.evidence.length,
          message: `Consolidated with existing canonical opportunity "${opp.title}". Appended supporting evidence trail from ${data.platform}.`,
        };
      }
    }

    // New opportunity extracted from capture
    const title =
      data.caption.split('\n')[0]?.slice(0, 80) || `${data.platform.toUpperCase()} Opportunity Lead`;
    const newId = `cap-opp-${Date.now()}`;
    const newOpp: Opportunity = {
      id: newId,
      canonicalUrl: data.url || `https://${data.platform}.com/lead/${Date.now()}`,
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      summary: data.caption || 'Captured via Edgi Share-to-App intake.',
      organization: {
        id: `org-cap-${Date.now()}`,
        name: 'Captured Organization',
        slug: 'captured-org',
        website: data.url || 'https://captured.org',
        country: 'Nigeria',
        verified: false,
        createdAt: new Date().toISOString(),
      },
      category: data.caption.toLowerCase().includes('fellowship')
        ? 'fellowship'
        : data.caption.toLowerCase().includes('hackathon')
          ? 'hackathon_ctf'
          : 'internship',
      verificationStatus: 'unverified',
      confidence: data.mediaBase64 ? 0.7 : 0.85,
      publishedAt: new Date().toISOString(),
      deadline: '2026-12-31T23:59:59.000Z',
      deadlineTz: 'Africa/Lagos',
      isDeadlineEstimated: true,
      stipend: {
        min: 1500,
        max: 2000,
        currency: 'USD',
        period: 'total',
        isUnpaid: false,
        description: 'Captured stipend / prize allowance',
      },
      locations: [{ country: 'Nigeria', isRemote: true }],
      benefits: ['Stipend allowance', 'Mentorship', 'Direct certificate'],
      tags: ['Cyber Security', 'Quick Capture', 'Nigeria'],
      applyUrl: data.url || 'https://forms.gle/captured-opportunity',
      isSaved: false,
      isOpenToNigeria: true,
      relevanceScore: 92,
      eligibilityStatus: 'eligible',
      priority: 88,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      evidence: [],
    };

    inMemoryOpportunities.unshift(newOpp);

    return {
      id: `cap-${Date.now()}`,
      status: 'extracted',
      isDuplicate: false,
      opportunityId: newId,
      canonicalUrl: newOpp.canonicalUrl,
      title: newOpp.title,
      organization: newOpp.organization.name,
      deadline: newOpp.deadline,
      evidenceCount: 1,
      message: `Successfully captured and extracted into canonical index with ${Math.round(
        newOpp.confidence * 100
      )}% confidence.`,
    };
  }

  const res = await fetch(`${API_URL}/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to submit capture');
  return res.json();
}

export const api = {
  isMockMode: () => API_MODE === 'mock',

  // Phase 6 Social Connectors & Capture
  getSocialConnectors,
  updateConnectorCredential,
  testConnectorHealth,
  revokeConnector,
  submitCapture,

  // Phase 5 Intelligence
  getRecommendedOpportunities,
  getRecommended,
  getEligibilityAssessment,
  submitFeedback,
  getScoringWeights,
  resetScoringWeights,
  getProfileCompleteness,

  // 1. Opportunities
  async getOpportunities(filter?: OpportunityFilter): Promise<{ opportunities: Opportunity[]; total: number }> {
    if (API_MODE === 'mock') {
      let filtered = [...inMemoryOpportunities];

      if (filter?.search) {
        const query = filter.search.toLowerCase();
        filtered = filtered.filter(
          (o) =>
            o.title.toLowerCase().includes(query) ||
            o.summary.toLowerCase().includes(query) ||
            o.organization.name.toLowerCase().includes(query) ||
            o.tags.some((t) => t.toLowerCase().includes(query)),
        );
      }

      if (filter?.categories && filter.categories.length > 0) {
        filtered = filtered.filter((o) => filter.categories?.includes(o.category));
      }

      if (filter?.verificationStatuses && filter.verificationStatuses.length > 0) {
        filtered = filtered.filter((o) => filter.verificationStatuses?.includes(o.verificationStatus));
      }

      if (filter?.eligibilityStatuses && filter.eligibilityStatuses.length > 0) {
        filtered = filtered.filter(
          (o) => o.eligibilityStatus && filter.eligibilityStatuses?.includes(o.eligibilityStatus),
        );
      }

      if (filter?.isRemoteOnly) {
        filtered = filtered.filter((o) => o.locations.some((l) => l.isRemote));
      }

      if (filter?.minRelevanceScore !== undefined) {
        filtered = filtered.filter((o) => (o.relevanceScore ?? 0) >= (filter.minRelevanceScore ?? 0));
      }

      return { opportunities: filtered, total: filtered.length };
    }

    const res = await fetch(`${API_URL}/opportunities`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch opportunities from live API');
    return res.json();
  },

  async getOpportunityBySlug(slug: string): Promise<Opportunity | null> {
    if (API_MODE === 'mock') {
      const found = inMemoryOpportunities.find((o) => o.slug === slug || o.id === slug);
      return found || null;
    }
    const res = await fetch(`${API_URL}/opportunities/${slug}`);
    if (!res.ok) return null;
    return res.json();
  },

  async toggleSaveOpportunity(id: string): Promise<boolean> {
    if (API_MODE === 'mock') {
      const idx = inMemoryOpportunities.findIndex((o) => o.id === id);
      if (idx !== -1) {
        const item = inMemoryOpportunities[idx]!;
        item.isSaved = !item.isSaved;
        return item.isSaved;
      }
      return false;
    }
    const res = await fetch(`${API_URL}/opportunities/${id}/save`, { method: 'POST' });
    return res.ok;
  },

  // 2. Applications Tracker
  async getApplications(): Promise<Application[]> {
    if (API_MODE === 'mock') {
      return [...inMemoryApplications];
    }
    const res = await fetch(`${API_URL}/applications`);
    if (!res.ok) throw new Error('Failed to fetch applications');
    return res.json();
  },

  async updateApplication(id: string, updates: Partial<Application>): Promise<Application> {
    if (API_MODE === 'mock') {
      const idx = inMemoryApplications.findIndex((a) => a.id === id);
      if (idx !== -1) {
        inMemoryApplications[idx] = {
          ...inMemoryApplications[idx]!,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        return inMemoryApplications[idx]!;
      }
      throw new Error('Application not found');
    }
    const res = await fetch(`${API_URL}/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update application');
    return res.json();
  },

  async createApplicationFromOpportunity(opportunityId: string): Promise<Application> {
    if (API_MODE === 'mock') {
      const opp = inMemoryOpportunities.find((o) => o.id === opportunityId);
      if (!opp) throw new Error('Opportunity not found');

      const newApp: Application = {
        id: `app-${Date.now()}`,
        opportunityId: opp.id,
        opportunityTitle: opp.title,
        organizationName: opp.organization.name,
        opportunityCategory: opp.category,
        opportunityStatus: 'open',
        userId: inMemoryProfile.userId,
        status: 'preparing',
        appliedAt: null,
        deadline: opp.deadline,
        followUpDate: null,
        notes: `Started from discovery. Apply URL: ${opp.applyUrl}`,
        checklist: [
          { id: `chk-${Date.now()}-1`, task: 'Review application requirements', completed: false },
          { id: `chk-${Date.now()}-2`, task: 'Submit application packet', completed: false },
        ],
        documents: [],
        statusHistory: [
          {
            id: `hist-${Date.now()}`,
            applicationId: `app-${Date.now()}`,
            fromStatus: 'saved',
            toStatus: 'preparing',
            note: 'Application record started from discovery.',
            changedAt: new Date().toISOString(),
          },
        ],
        draftAnswers: {},
        interviewInfo: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      inMemoryApplications.unshift(newApp);
      opp.applicationStatus = 'preparing';
      return newApp;
    }
    const res = await fetch(`${API_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opportunityId }),
    });
    return res.json();
  },

  async transitionApplicationStatus(id: string, status: ApplicationStatus, note?: string): Promise<Application> {
    if (API_MODE === 'mock') {
      const idx = inMemoryApplications.findIndex((a) => a.id === id);
      if (idx !== -1) {
        const prev = inMemoryApplications[idx]!;
        const fromStatus = prev.status;
        const newHistoryItem = {
          id: `hist-${Date.now()}`,
          applicationId: id,
          fromStatus,
          toStatus: status,
          note: note || `Status transitioned from ${fromStatus} to ${status}.`,
          changedAt: new Date().toISOString(),
        };

        inMemoryApplications[idx] = {
          ...prev,
          status,
          appliedAt: status === 'applied' && !prev.appliedAt ? new Date().toISOString() : prev.appliedAt,
          statusHistory: [newHistoryItem, ...(prev.statusHistory || [])],
          updatedAt: new Date().toISOString(),
        };
        return inMemoryApplications[idx]!;
      }
      throw new Error('Application not found');
    }
    const res = await fetch(`${API_URL}/applications/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note }),
    });
    if (!res.ok) throw new Error('Failed to transition application status');
    return res.json();
  },

  async runAiAssist(
    applicationId: string,
    promptType: 'tailor_cv_bullets' | 'draft_motivation' | 'explain_requirements' | 'missing_documents',
    targetRole?: string,
  ): Promise<AiDraftResponse> {
    if (API_MODE === 'mock') {
      const app = inMemoryApplications.find((a) => a.id === applicationId);
      if (!app) throw new Error('Application not found');

      if (promptType === 'tailor_cv_bullets') {
        return {
          draftType: 'tailor_cv_bullets',
          content: [
            '• Developed automated vulnerability discovery tools in Python and TypeScript, auditing web targets against the OWASP Top 10 framework as part of 200-level Cyber Security coursework and hands-on laboratory exercises.',
            '• Configured and hardened Linux server environments with strict firewall rules and permission access controls, maintaining high-integrity service availability.',
            '• Collaborated on open-source software security research, reviewing dependency trees and CI/CD pipelines to identify potential supply chain vulnerabilities.',
            '• Actively represented university cohort in competitive Capture the Flag (CTF) security challenges, demonstrating rapid incident triage and binary/web exploitation remediation.',
          ].join('\n'),
          usedProfileFacts: [
            'Degree: B.Sc. Cyber Security Undergraduate (200-Level)',
            'Technical Skills: Python, TypeScript, Linux system administration, AppSec Auditing, Web Security (OWASP Top 10), Git',
          ],
          missingQualifications: [],
          disclaimer: '[AI DRAFT — Requires Your Review & Approval. Verify all statements before submitting. No auto-submit capability exists.]',
          generatedAt: new Date().toISOString(),
        };
      }

      if (promptType === 'draft_motivation') {
        return {
          draftType: 'draft_motivation',
          content: [
            `Dear Selection Committee at ${app.organizationName},`,
            '',
            `I am writing to express my enthusiastic application for the ${app.opportunityTitle}. As a 200-level Cyber Security undergraduate at Federal University of Technology, Owerri in Nigeria, I have concentrated my academic and practical efforts on application security, vulnerability assessment, and open-source system resiliency.`,
            '',
            `Through dedicated project work in Python and TypeScript, I have focused on automating security evaluations against OWASP Top 10 vulnerabilities and understanding the critical challenges facing modern software supply chains. The mission of ${app.organizationName} directly resonates with my objective to develop secure, high-integrity technologies that serve global communities.`,
            '',
            'Participating in this programme will enable me to contribute my energetic problem-solving mindset and technical discipline while learning from seasoned mentors in cybersecurity.',
            '',
            'Sincerely,',
            'Bethel Okafor Egwuchukwu',
          ].join('\n'),
          usedProfileFacts: [
            'Degree: B.Sc. Cyber Security Undergraduate (200-Level)',
            'Institution: Federal University of Technology, Owerri (FUTO), Nigeria',
            'Technical Skills: Python, TypeScript, Linux system administration, AppSec Auditing',
            'Interests: Open source security (OpenSSF), CTF competitions, vulnerability research',
          ],
          missingQualifications: [],
          disclaimer: '[AI DRAFT — Requires Your Review & Approval. Verify all statements before submitting. No auto-submit capability exists.]',
          generatedAt: new Date().toISOString(),
        };
      }

      if (promptType === 'explain_requirements') {
        return {
          draftType: 'explain_requirements',
          content: [
            `Requirements Breakdown for ${app.opportunityTitle}:`,
            '1. Education Level: Requires undergraduate enrollment in a relevant STEM/Computing discipline. (Your 200L Cyber Security status meets this requirement).',
            '2. Geographic Eligibility: Confirmed open to Nigerian residents with complete remote access and funded support.',
            '3. Language & Commitment: Requires fluent English proficiency and 15-20 hours/week commitment during academic term.',
            '4. Deliverables: Involves contributing to real-world security audits and submitting progress milestones.',
          ].join('\n'),
          usedProfileFacts: [
            'Location / Nationality: Nigerian citizen resident in Nigeria',
            'Degree: B.Sc. Cyber Security Undergraduate (200-Level)',
          ],
          missingQualifications: [],
          disclaimer: '[AI DRAFT — Requires Your Review & Approval. Verify all statements before submitting. No auto-submit capability exists.]',
          generatedAt: new Date().toISOString(),
        };
      }

      // missing_documents
      const uploadedTypes = new Set(app.documents.map((d) => d.type));
      const missing: string[] = [];
      if (!uploadedTypes.has('cv')) missing.push('Updated Technical CV / Resume');
      if (!uploadedTypes.has('transcript')) missing.push('Official 200L Academic Transcript');
      if (!uploadedTypes.has('cover_letter') && !uploadedTypes.has('essay')) {
        missing.push('Statement of Intent / Motivation Letter');
      }

      return {
        draftType: 'missing_documents',
        content: missing.length > 0
          ? `Missing packet documents detected:\n${missing.map((m) => `• [MISSING] ${m}`).join('\n')}\n\nPlease upload these documents to your Document Vault and attach them to this application checklist.`
          : 'All standard document packet requirements are satisfied in your application packet!',
        usedProfileFacts: ['Degree: B.Sc. Cyber Security Undergraduate (200-Level)'],
        missingQualifications: missing,
        disclaimer: '[AI DRAFT — Requires Your Review & Approval. Verify all statements before submitting. No auto-submit capability exists.]',
        generatedAt: new Date().toISOString(),
      };
    }

    const res = await fetch(`${API_URL}/applications/${applicationId}/ai-assist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptType, targetRole }),
    });
    if (!res.ok) throw new Error('Failed to run AI Assistant');
    return res.json();
  },

  async getUserDocuments(): Promise<UserDocument[]> {
    if (API_MODE === 'mock') {
      return [...inMemoryDocuments];
    }
    const res = await fetch(`${API_URL}/documents`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async uploadUserDocument(doc: {
    name: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    type: string;
    tags?: string[];
  }): Promise<UserDocument> {
    if (API_MODE === 'mock') {
      const existing = inMemoryDocuments.find((d) => d.fileName === doc.fileName);
      const version = existing ? existing.version + 1 : 1;
      const newDoc: UserDocument = {
        id: `doc-user-${Date.now()}`,
        userId: inMemoryProfile.userId,
        name: doc.name,
        fileName: doc.fileName,
        fileUrl: `/storage/private/documents/user/${Date.now()}-${doc.fileName}`,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        type: doc.type as any,
        version,
        checksum: `sha256-${Math.random().toString(36).substring(2, 10)}`,
        tags: doc.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      inMemoryDocuments.unshift(newDoc);
      return newDoc;
    }
    const res = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    if (!res.ok) throw new Error('Failed to upload document');
    return res.json();
  },

  async deleteUserDocument(id: string): Promise<void> {
    if (API_MODE === 'mock') {
      inMemoryDocuments = inMemoryDocuments.filter((d) => d.id !== id);
      return;
    }
    await fetch(`${API_URL}/documents/${id}`, { method: 'DELETE' });
  },

  async attachDocumentToApplication(applicationId: string, documentId: string): Promise<void> {
    if (API_MODE === 'mock') {
      const app = inMemoryApplications.find((a) => a.id === applicationId);
      const doc = inMemoryDocuments.find((d) => d.id === documentId);
      if (app && doc) {
        app.documents.push({
          id: `doc-${Date.now()}`,
          name: doc.name,
          fileUrl: doc.fileUrl,
          type: doc.type as any,
          uploadedAt: new Date().toISOString(),
        });
      }
      return;
    }
    await fetch(`${API_URL}/applications/${applicationId}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId }),
    });
  },

  // 3. Sources & Health
  async getSources(): Promise<Source[]> {
    if (API_MODE === 'mock') {
      return [...inMemorySources];
    }
    const res = await fetch(`${API_URL}/sources`);
    if (!res.ok) throw new Error('Failed to fetch sources');
    return res.json();
  },

  async evaluateSource(url: string) {
    if (API_MODE === 'mock') {
      const lower = url.toLowerCase();
      if (lower.includes('linkedin.com') || lower.includes('instagram.com') || lower.includes('t.me') || lower.includes('x.com')) {
        return {
          url,
          detectedType: 'manual_capture',
          name: 'Social Bookmark',
          proposedMethod: 'Manual Capture Bookmark (Browser Extension / Paste)',
          capabilities: { canSearch: false, canPaginate: false, rateLimitPerMin: 0, requiresAuth: false, isRealTime: false },
          restrictions: ['Platform ToS strictly restricts automated scraping.', 'Requires share-to-app or manual text paste.'],
          suggestedSchedule: 'weekly',
        };
      }
      if (lower.includes('github.com')) {
        return {
          url,
          detectedType: 'github',
          name: 'GitHub Source',
          proposedMethod: 'Official GitHub REST API (v3) - Repos & Releases',
          capabilities: { canSearch: true, canPaginate: true, rateLimitPerMin: 60, requiresAuth: false, isRealTime: false },
          restrictions: ['Unauthenticated calls rate-limited to 60 req/hr.'],
          suggestedSchedule: 'normal',
        };
      }
      if (lower.endsWith('.xml') || lower.includes('feed') || lower.includes('rss')) {
        return {
          url,
          detectedType: 'rss_feed',
          name: 'Syndicated Feed',
          proposedMethod: 'Syndicated XML Feed Polling (RSS 2.0 / Atom 1.0)',
          capabilities: { canSearch: false, canPaginate: false, rateLimitPerMin: 60, requiresAuth: false, isRealTime: false },
          suggestedSchedule: 'high_value',
        };
      }
      return {
        url,
        detectedType: 'website',
        name: 'Target Website',
        proposedMethod: 'Focused Website Crawler (Cheerio + robots.txt compliance)',
        capabilities: { canSearch: false, canPaginate: true, rateLimitPerMin: 20, requiresAuth: false, isRealTime: false },
        restrictions: ['Limited to same-domain paths (/careers, /grants, etc.)'],
        suggestedSchedule: 'normal',
      };
    }

    const res = await fetch(`${API_URL}/sources/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to evaluate URL');
    }
    return res.json();
  },

  async createSource(dto: { name: string; url: string; connectorType?: string; checkInterval?: string }): Promise<Source> {
    if (API_MODE === 'mock') {
      const evalResult = await this.evaluateSource(dto.url);
      const newSource: Source = {
        id: `src-${Date.now()}`,
        name: dto.name,
        slug: dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        url: dto.url,
        connectorType: (dto.connectorType || evalResult.detectedType) as any,
        status: evalResult.detectedType === 'manual_capture' ? 'manual_capture_only' : 'active',
        capabilities: evalResult.capabilities as any,
        health: {
          lastSuccessfulCheck: null,
          nextCheck: new Date(Date.now() + 3600000).toISOString(),
          lastError: null,
          consecutiveFailures: 0,
          latencyMs: null,
          totalItemsDiscovered: 0,
        },
        config: {},
        createdAt: new Date().toISOString(),
      };
      inMemorySources.unshift(newSource);
      return newSource;
    }

    const res = await fetch(`${API_URL}/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error('Failed to create source');
    return res.json();
  },

  async checkSourceNow(id: string): Promise<{ success: boolean; itemsFound: number; itemsNew: number; errorMessage?: string }> {
    if (API_MODE === 'mock') {
      const idx = inMemorySources.findIndex((s) => s.id === id);
      if (idx !== -1) {
        const source = inMemorySources[idx]!;
        // Force failure behavior if url contains 'fail' or is defsec
        if (source.url.includes('fail') || source.name.includes('DefSec')) {
          source.status = 'unavailable';
          source.health.consecutiveFailures += 1;
          source.health.lastError = 'HTTP 502 Bad Gateway: Host unreachable';
          return {
            success: false,
            itemsFound: 0,
            itemsNew: 0,
            errorMessage: 'HTTP 502 Bad Gateway: Host unreachable',
          };
        }

        source.status = 'active';
        source.health.lastSuccessfulCheck = new Date().toISOString();
        source.health.consecutiveFailures = 0;
        source.health.lastError = null;
        source.health.totalItemsDiscovered += 2;
        return { success: true, itemsFound: 4, itemsNew: 2 };
      }
      throw new Error('Source not found');
    }

    const res = await fetch(`${API_URL}/sources/${id}/check`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to trigger source check');
    return res.json();
  },

  async getCandidateSources(): Promise<CandidateSource[]> {
    if (API_MODE === 'mock') {
      return [...inMemoryCandidateSources];
    }
    const res = await fetch(`${API_URL}/source-candidates`);
    if (!res.ok) throw new Error('Failed to fetch candidate sources');
    return res.json();
  },

  async approveCandidate(id: string): Promise<void> {
    if (API_MODE === 'mock') {
      const candidate = inMemoryCandidateSources.find((c) => c.id === id);
      if (candidate) {
        candidate.status = 'approved';
        await this.createSource({
          name: candidate.name,
          url: candidate.url,
          connectorType: candidate.connectorType,
        });
      }
      return;
    }
    await fetch(`${API_URL}/source-candidates/${id}/approve`, { method: 'POST' });
  },

  async ignoreCandidate(id: string): Promise<void> {
    if (API_MODE === 'mock') {
      inMemoryCandidateSources = inMemoryCandidateSources.map((c) => (c.id === id ? { ...c, status: 'ignored' } : c));
      return;
    }
    await fetch(`${API_URL}/source-candidates/${id}/ignore`, { method: 'POST' });
  },

  async blockCandidate(id: string): Promise<void> {
    if (API_MODE === 'mock') {
      inMemoryCandidateSources = inMemoryCandidateSources.map((c) => (c.id === id ? { ...c, status: 'blocked' } : c));
      return;
    }
    await fetch(`${API_URL}/source-candidates/${id}/block`, { method: 'POST' });
  },

  async updateCandidateStatus(id: string, status: 'approved' | 'ignored' | 'blocked'): Promise<void> {
    if (status === 'approved') return this.approveCandidate(id);
    if (status === 'ignored') return this.ignoreCandidate(id);
    if (status === 'blocked') return this.blockCandidate(id);
  },

  // 4. Notifications
  async getNotifications(): Promise<Notification[]> {
    if (API_MODE === 'mock') {
      return [...inMemoryNotifications];
    }
    const res = await fetch(`${API_URL}/notifications`);
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  async markNotificationAsRead(id: string): Promise<void> {
    if (API_MODE === 'mock') {
      inMemoryNotifications = inMemoryNotifications.map((n) =>
        n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n,
      );
      return;
    }
    await fetch(`${API_URL}/notifications/${id}/read`, { method: 'POST' });
  },

  async markAllNotificationsAsRead(): Promise<void> {
    if (API_MODE === 'mock') {
      inMemoryNotifications = inMemoryNotifications.map((n) => ({
        ...n,
        read: true,
        readAt: new Date().toISOString(),
      }));
      return;
    }
    await fetch(`${API_URL}/notifications/read-all`, { method: 'POST' });
  },

  async getNotificationPreferences(): Promise<NotificationPreferences> {
    if (API_MODE === 'mock') {
      return { ...inMemoryNotificationPreferences };
    }
    const res = await fetch(`${API_URL}/notifications/preferences`);
    if (!res.ok) throw new Error('Failed to fetch notification preferences');
    return res.json();
  },

  async updateNotificationPreferences(updates: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    if (API_MODE === 'mock') {
      inMemoryNotificationPreferences = {
        ...inMemoryNotificationPreferences,
        ...updates,
      };
      return { ...inMemoryNotificationPreferences };
    }
    const res = await fetch(`${API_URL}/notifications/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update notification preferences');
    return res.json();
  },

  async getNotificationDeliveries(): Promise<NotificationDelivery[]> {
    if (API_MODE === 'mock') {
      return [...inMemoryDeliveries];
    }
    const res = await fetch(`${API_URL}/notifications/deliveries`);
    if (!res.ok) throw new Error('Failed to fetch deliveries');
    return res.json();
  },

  async previewEmailTemplate(template: 'priority_alert' | 'daily_digest' | 'deadline_reminder'): Promise<EmailTemplatePreview> {
    if (API_MODE === 'mock') {
      if (template === 'priority_alert') {
        return {
          template: 'priority_alert',
          subject: '🔥 [96% Match] OpenSSF Global Cybersecurity Fellowship 2027 — OpenSSF',
          html: `<div style="font-family: -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #334155; max-width: 600px; margin: 0 auto;">
            <div style="font-size: 11px; font-weight: bold; color: #38bdf8; text-transform: uppercase;">Edgi Priority Alert</div>
            <h2 style="margin: 8px 0; color: #ffffff; font-size: 20px;">OpenSSF Global Cybersecurity Fellowship 2027</h2>
            <p style="color: #94a3b8; font-size: 13px;">Open Source Security Foundation &bull; Fellowship &bull; <strong style="color: #34d399;">96% Match</strong></p>
            <div style="background: #1e293b; padding: 12px; border-radius: 8px; margin: 16px 0; font-size: 13px;">
              <div>Verified Deadline: <strong>November 23, 2026</strong></div>
              <div style="color: #38bdf8; margin-top: 4px;">🇳🇬 Verified Open to Nigeria (Fully Funded + Remote)</div>
            </div>
            <p style="font-size: 13px; color: #cbd5e1; line-height: 1.5;">Direct alignment with your Cyber Security undergraduate track and AppSec auditing coursework.</p>
          </div>`,
          recipient: inMemoryProfile.email,
          generatedAt: new Date().toISOString(),
        };
      }
      if (template === 'daily_digest') {
        return {
          template: 'daily_digest',
          subject: '📬 Daily Opportunity Digest — Monday, Nov 11 (2 new matches)',
          html: `<div style="font-family: -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #334155; max-width: 600px; margin: 0 auto;">
            <div style="font-size: 11px; font-weight: bold; color: #38bdf8; text-transform: uppercase;">Edgi Daily Digest</div>
            <h2 style="margin: 8px 0; color: #ffffff; font-size: 20px;">Daily Opportunity Digest</h2>
            <p style="color: #94a3b8; font-size: 13px;">Africa/Lagos (GMT+1) &bull; 08:00 Scheduled Delivery</p>
            <div style="background: #1e293b; padding: 12px; border-radius: 8px; margin: 16px 0; font-size: 13px;">
              <div style="color: #f87171; font-weight: bold;">⚠️ 1 Deadline Closing This Week:</div>
              <div style="margin-top: 4px;">African Cyber Defense Fellowship (3 days left)</div>
            </div>
            <p style="font-size: 13px; color: #cbd5e1;">2 new high-relevance opportunities indexed in cybersecurity and open source.</p>
          </div>`,
          recipient: inMemoryProfile.email,
          generatedAt: new Date().toISOString(),
        };
      }
      return {
        template: 'deadline_reminder',
        subject: '⏰ [7 Days Left] Deadline Reminder: OpenSSF Global Cybersecurity Fellowship 2027',
        html: `<div style="font-family: -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #334155; max-width: 600px; margin: 0 auto;">
          <div style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; background: rgba(239, 68, 68, 0.2); color: #f87171;">⏰ 7 Days Remaining</div>
          <h2 style="margin: 12px 0 6px 0; color: #ffffff; font-size: 20px;">OpenSSF Global Cybersecurity Fellowship 2027</h2>
          <p style="color: #94a3b8; font-size: 13px;">OpenSSF &bull; Verified Deadline: November 23, 2026</p>
          <div style="background: #1e293b; padding: 12px; border-radius: 8px; margin: 16px 0; font-size: 13px;">
            <div>Packet Progress: <strong>3 of 4 checklist items complete</strong></div>
          </div>
          <p style="font-size: 13px; color: #cbd5e1;">Open your application packet to finalize statement and review AI-tailored bullets.</p>
        </div>`,
        recipient: inMemoryProfile.email,
        generatedAt: new Date().toISOString(),
      };
    }
    const res = await fetch(`${API_URL}/notifications/preview/${template}`);
    if (!res.ok) throw new Error('Failed to render template preview');
    return res.json();
  },

  async triggerTestAlert(opportunityId: string): Promise<any> {
    if (API_MODE === 'mock') {
      const newDelivery: NotificationDelivery = {
        id: `del-test-${Date.now()}`,
        userId: inMemoryProfile.userId,
        channel: 'email',
        idempotencyKey: `idemp:user:alert:${opportunityId}:instant`,
        providerId: `re_mock_test_${Date.now()}`,
        status: 'sent',
        attempts: 1,
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      inMemoryDeliveries.unshift(newDelivery);
      return { success: true, emailDispatched: true, emailResult: newDelivery };
    }
    const res = await fetch(`${API_URL}/notifications/test-alert/${opportunityId}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to trigger test alert');
    return res.json();
  },

  async triggerTestDigest(): Promise<any> {
    if (API_MODE === 'mock') {
      const newDelivery: NotificationDelivery = {
        id: `del-test-${Date.now()}`,
        userId: inMemoryProfile.userId,
        channel: 'email',
        idempotencyKey: `idemp:user:digest:${Date.now()}:email`,
        providerId: `re_mock_test_${Date.now()}`,
        status: 'sent',
        attempts: 1,
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      inMemoryDeliveries.unshift(newDelivery);
      return { sent: true, emailResult: newDelivery };
    }
    const res = await fetch(`${API_URL}/notifications/test-digest`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to trigger test digest');
    return res.json();
  },

  // 5. Profile & Preferences (Live DB capable)
  async getUserProfile(): Promise<UserProfile> {
    if (API_MODE === 'mock') {
      return { ...inMemoryProfile };
    }
    const res = await fetch(`${API_URL}/profile`);
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  },

  async updateUserProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    if (API_MODE === 'mock') {
      inMemoryProfile = {
        ...inMemoryProfile,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      return { ...inMemoryProfile };
    }
    const res = await fetch(`${API_URL}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  },

  async getUserPreferences(): Promise<UserPreferences> {
    if (API_MODE === 'mock') {
      return { ...inMemoryPreferences };
    }
    const res = await fetch(`${API_URL}/preferences`);
    if (!res.ok) throw new Error('Failed to fetch preferences');
    return res.json();
  },

  async updateUserPreferences(data: Partial<UserPreferences>): Promise<UserPreferences> {
    if (API_MODE === 'mock') {
      inMemoryPreferences = {
        ...inMemoryPreferences,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      return { ...inMemoryPreferences };
    }
    const res = await fetch(`${API_URL}/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update preferences');
    return res.json();
  },

  // 6. Usage & Health
  async getUsageBudget(): Promise<UsageBudget & { isEmergencyPaused?: boolean; searchSpentUsd?: number; llmSpentUsd?: number; bufferRemainingUsd?: number; status?: string }> {
    if (API_MODE === 'mock') {
      return { ...inMemoryBudget };
    }
    const res = await fetch(`${API_URL}/usage`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch usage');
    return res.json();
  },

  async updateBudgetSettings(data: { monthlyTotalBudget?: number; searchBudget?: number; llmBudget?: number; bufferBudget?: number; isEmergencyPaused?: boolean }): Promise<any> {
    if (API_MODE === 'mock') {
      inMemoryBudget = { ...inMemoryBudget, ...data };
      return inMemoryBudget;
    }
    const res = await fetch(`${API_URL}/usage/budget`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update budget settings');
    return res.json();
  },

  // 7. Phase 3: Independent Discovery & Leads Inbox
  async runDiscovery(input: { dryRun?: boolean; maxQueries?: number; provider?: string } = {}): Promise<any> {
    if (API_MODE === 'mock') {
      return {
        runId: 'mock-run-' + Date.now(),
        dryRun: Boolean(input.dryRun),
        queriesExecuted: input.dryRun ? 0 : 5,
        leadsFound: input.dryRun ? 0 : 4,
        totalCostUsd: 0.0,
        status: 'completed',
      };
    }
    const res = await fetch(`${API_URL}/discovery/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Discovery run failed');
    }
    return res.json();
  },

  async getQueriesPreview(limit = 10): Promise<{ queries: any[]; total: number; dimensions: any }> {
    if (API_MODE === 'mock') {
      return {
        queries: [
          { query: 'site:paystack.com/careers (AppSec OR "security engineer")', dimension: 'priority_org', priority: 1, reason: 'Targeted search for priority org Paystack' },
          { query: 'site:flutterwave.com/careers (AppSec OR "security engineer")', dimension: 'priority_org', priority: 1, reason: 'Targeted search for priority org Flutterwave' },
          { query: '"cybersecurity" "internship" "Nigeria" 2025 OR 2026', dimension: 'category_skill_region', priority: 2, reason: 'Category internship x Skill cybersecurity x Region Nigeria' },
          { query: '"fintech security" "fellowship" "Nigeria" 2025 OR 2026', dimension: 'category_skill_region', priority: 2, reason: 'Category fellowship x Skill fintech security x Region Nigeria' },
          { query: '"AppSec" "hackathon" fully funded 2025 OR 2026', dimension: 'category_skill_funding', priority: 2, reason: 'Category hackathon_ctf x Skill AppSec x Funding fully funded' },
        ],
        total: 5,
        dimensions: { categories: ['fellowship', 'internship', 'hackathon_ctf'], skills: ['AppSec', 'fintech security'], regions: ['Nigeria'] },
      };
    }
    const res = await fetch(`${API_URL}/discovery/queries?limit=${limit}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch query preview');
    return res.json();
  },

  async getDiscoveryHistory(limit = 20): Promise<any[]> {
    if (API_MODE === 'mock') {
      return [
        {
          id: 'run-mock-1',
          provider: 'mock_search',
          queriesExecuted: 4,
          leadsFound: 4,
          costUsd: 0.0,
          status: 'completed',
          createdAt: new Date().toISOString(),
        },
      ];
    }
    const res = await fetch(`${API_URL}/discovery/history?limit=${limit}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch discovery history');
    return res.json();
  },

  async getLeads(status?: string): Promise<{ leads: any[]; total: number }> {
    if (API_MODE === 'mock') {
      return {
        leads: [
          {
            id: 'lead-mock-1',
            url: 'https://paystack.com/careers/appsec-intern',
            title: 'Paystack Application Security Intern (Lagos / Remote)',
            snippet: 'Paystack is hiring an Application Security Intern to assist in vulnerability management and secure code reviews.',
            publisherDomain: 'paystack.com',
            searchProvider: 'mock_search',
            status: 'pending',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'lead-mock-2',
            url: 'https://flutterwave.com/careers/cyber-fellow',
            title: 'Flutterwave Graduate Cybersecurity Fellowship 2025',
            snippet: 'Join Flutterwave infosec defense team for an intensive 6-month hands-on fellowship in payment security.',
            publisherDomain: 'flutterwave.com',
            searchProvider: 'mock_search',
            status: 'pending',
            createdAt: new Date().toISOString(),
          },
        ],
        total: 2,
      };
    }
    const query = status ? `?status=${status}` : '';
    const res = await fetch(`${API_URL}/leads${query}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch leads');
    return res.json();
  },

  async processLead(id: string): Promise<any> {
    if (API_MODE === 'mock') return { success: true };
    const res = await fetch(`${API_URL}/leads/${id}/process`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to send lead to processing');
    return res.json();
  },

  async dismissLead(id: string): Promise<any> {
    if (API_MODE === 'mock') return { success: true };
    const res = await fetch(`${API_URL}/leads/${id}/dismiss`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to dismiss lead');
    return res.json();
  },

  async addLeadAsSource(id: string): Promise<any> {
    if (API_MODE === 'mock') return { success: true };
    const res = await fetch(`${API_URL}/leads/${id}/add-source`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to add lead as candidate source');
    return res.json();
  },

  async getSystemHealth(): Promise<SystemHealth> {
    if (API_MODE === 'mock') {
      return { ...mockSystemHealth };
    }
    const res = await fetch(`${API_URL}/system/health`);
    if (!res.ok) throw new Error('Failed to fetch health');
    return res.json();
  },

  // 8. Phase 4: Opportunity Processing & Review Queue
  async captureOpportunity(data: { url?: string; text?: string; saveImmediately?: boolean }): Promise<any> {
    if (API_MODE === 'mock') {
      const isUrl = Boolean(data.url);
      const isFeeScam = (data.url?.includes('fake-host') || data.text?.includes('application fee') || data.text?.includes('$45'));
      const isExpired = data.text?.includes('expired') || data.text?.includes('closed on');
      
      return {
        mode: isUrl ? 'url' : 'text',
        sourceUrl: data.url || 'Manual Paste',
        isOpportunity: true,
        confidence: 0.95,
        opportunity: {
          title: data.url ? 'Captured: ' + data.url.replace(/https?:\/\//, '').split('/')[0] + ' Opportunity' : 'Captured Manual Announcement',
          organization: 'Detected Organization',
          category: 'fellowship',
          deadline: isExpired ? '2025-01-01T00:00:00.000Z' : '2026-12-15T23:59:59.000Z',
          applyUrl: data.url || 'https://example.com/apply',
          summary: data.text ? data.text.slice(0, 160) + '...' : 'Extracted from ' + data.url,
          stipend: '$3,000 USD stipend',
          locations: [{ country: 'Global', isRemote: true }],
          benefits: ['Mentorship', 'Remote stipend'],
          unknownFields: ['eligibilityMinGpa', 'exactSelectionDate'],
        },
        deduplication: {
          decision: 'create_canonical',
          confidence: 0.98,
          layer: 'new_entry',
        },
        verification: {
          isLegitimate: !isFeeScam,
          isExpired: isExpired,
          reasons: isFeeScam ? ['Contains $45 upfront application fee'] : ['Verified primary announcement'],
        },
      };
    }

    const res = await fetch(`${API_URL}/opportunities/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to capture opportunity');
    }
    return res.json();
  },

  async getReviewItems(status?: string): Promise<{ items: ProcessingReviewItemMock[]; total: number }> {
    if (API_MODE === 'mock') {
      let filtered = [...inMemoryReviewItems];
      if (status) {
        filtered = filtered.filter((i) => i.status === status);
      }
      return { items: filtered, total: filtered.length };
    }
    const query = status ? `?status=${status}` : '';
    const res = await fetch(`${API_URL}/processing/review${query}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch processing review items');
    return res.json();
  },

  async resolveReviewItem(id: string, action: 'accept' | 'merge' | 'reject', notes?: string): Promise<any> {
    if (API_MODE === 'mock') {
      inMemoryReviewItems = inMemoryReviewItems.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            status: action === 'reject' ? 'rejected' : 'resolved',
            resolution: `Resolved via ${action}${notes ? ': ' + notes : ''}`,
          };
        }
        return item;
      });
      return { success: true, action, id };
    }

    const res = await fetch(`${API_URL}/processing/review/${id}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    if (!res.ok) throw new Error(`Failed to ${action} review item`);
    return res.json();
  },

  async getOpportunityEvidence(id: string): Promise<any[]> {
    if (API_MODE === 'mock') {
      const opp = inMemoryOpportunities.find((o) => o.id === id || o.slug === id);
      return opp?.evidence || [];
    }
    const res = await fetch(`${API_URL}/opportunities/${id}/evidence`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  },

  async getOpportunityHistory(id: string): Promise<any[]> {
    if (API_MODE === 'mock') {
      return [
        {
          id: 'hist-1',
          changeType: 'deadline_extended',
          oldValue: '2026-11-20T00:00:00.000Z',
          newValue: '2026-11-23T23:59:59.000Z',
          reason: 'Source updated application timeline on official portal',
          sourceUrl: 'https://openssf.org/blog/2026/11/fellowship-applications-open',
          changedAt: '2026-11-02T12:00:00.000Z',
        },
      ];
    }
    const res = await fetch(`${API_URL}/opportunities/${id}/history`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  },

  // 9. Phase 8: Hardening, Operations, Audit & Privacy
  async getOperationsSummary(): Promise<any> {
    if (API_MODE === 'mock') {
      return {
        queues: {
          discoveryQueue: { waiting: 0, active: 1, failed: 1, delayed: 0 },
          processingQueue: { waiting: 0, active: 0, failed: 0, delayed: 0 },
          notificationQueue: { waiting: 0, active: 0, failed: 0, delayed: 0 },
        },
        deadLetterJobs: [
          {
            id: 'job-dlq-101',
            queueName: 'discovery-queue',
            name: 'poll-source-rss',
            failedReason: 'Upstream HTTP 504 Gateway Timeout while parsing https://threatpost.com/feed',
            timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            attemptsMade: 3,
            data: { sourceId: 'src-threatpost', url: 'https://threatpost.com/feed' },
          },
        ],
        discoveryHeartbeat: [
          {
            pipeline: 'rss_feed',
            sourceName: 'OpenSSF Announcements & Bounties',
            lastSuccessfulRun: new Date().toISOString(),
            status: 'healthy',
            itemsDiscovered: 42,
            latencyMs: 310,
          },
          {
            pipeline: 'youtube_channel',
            sourceName: 'LiveOverflow AppSec & CTF',
            lastSuccessfulRun: new Date(Date.now() - 2 * 3600000).toISOString(),
            status: 'healthy',
            itemsDiscovered: 15,
            latencyMs: 420,
          },
          {
            pipeline: 'reddit_community',
            sourceName: 'r/netsec Announcements',
            lastSuccessfulRun: new Date(Date.now() - 12 * 3600000).toISOString(),
            status: 'healthy',
            itemsDiscovered: 28,
            latencyMs: 380,
          },
        ],
        emailDeliveryStats: {
          totalSent: 12,
          delivered: 12,
          failed: 0,
          pending: 0,
          successRatePercent: 100.0,
          averageRetries: 1.0,
        },
        errorRatePercent: 0.0,
        budget: { ...inMemoryBudget },
        retentionPolicies: {
          rawContentDays: 30,
          logsDays: 90,
          auditDays: 180,
        },
      };
    }
    const res = await fetch(`${API_URL}/system/operations`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch operations summary');
    return res.json();
  },

  async retryDeadLetterJob(jobId: string): Promise<any> {
    if (API_MODE === 'mock') {
      return { success: true, message: `Job ${jobId} successfully resubmitted to queue.` };
    }
    const res = await fetch(`${API_URL}/system/operations/retry-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId }),
    });
    if (!res.ok) throw new Error('Failed to retry dead-letter job');
    return res.json();
  },

  async discardDeadLetterJob(jobId: string): Promise<any> {
    if (API_MODE === 'mock') {
      return { success: true, message: `Job ${jobId} permanently purged.` };
    }
    const res = await fetch(`${API_URL}/system/operations/discard-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId }),
    });
    if (!res.ok) throw new Error('Failed to discard dead-letter job');
    return res.json();
  },

  async getAuditLogs(params?: { limit?: number; offset?: number; entityType?: string; action?: string }): Promise<any> {
    if (API_MODE === 'mock') {
      return {
        logs: [
          {
            id: 'audit-1',
            action: 'APPLICATION_STATUS_UPDATED',
            entityType: 'Application',
            entityId: 'app-africa-fellowship-2026',
            diff: { from: 'saved', to: 'applied' },
            ipAddress: '127.0.0.1',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'audit-2',
            action: 'NOTIFICATION_PREFERENCES_SAVED',
            entityType: 'NotificationPreference',
            entityId: 'global',
            diff: { highPriorityThreshold: 85 },
            ipAddress: '127.0.0.1',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
        ],
        total: 2,
      };
    }
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    if (params?.entityType) query.set('entityType', params.entityType);
    if (params?.action) query.set('action', params.action);

    const res = await fetch(`${API_URL}/system/audit-logs?${query.toString()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  async getQualityReport(): Promise<any> {
    if (API_MODE === 'mock') {
      return {
        period: {
          start: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
        metrics: {
          opportunitiesFound: 24,
          verifiedCount: 22,
          verifiedRatePercent: 91.7,
          duplicatesCaught: 6,
          brokenLinkRatePercent: 0.0,
          deadlineAccuracyPercent: 87.5,
          eligibilityEvaluatedPercent: 100.0,
          savedAppliedConversionPercent: 33.3,
        },
        sourceRoi: [
          {
            sourceName: 'OpenSSF Announcements & Bounties',
            connectorType: 'rss_feed',
            totalDiscovered: 42,
            verifiedCount: 38,
            conversionPercent: 90.5,
            healthStatus: 'healthy',
          },
          {
            sourceName: 'LiveOverflow AppSec & CTF',
            connectorType: 'youtube_channel',
            totalDiscovered: 15,
            verifiedCount: 12,
            conversionPercent: 80.0,
            healthStatus: 'healthy',
          },
        ],
        categoryDistribution: {
          fellowship: 8,
          hackathon_ctf: 6,
          dev_programme: 5,
          internship: 3,
          oss_bounty: 2,
        },
      };
    }
    const res = await fetch(`${API_URL}/system/quality-report`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch quality report');
    return res.json();
  },

  async toggleEmergencyPause(isPaused: boolean): Promise<any> {
    if (API_MODE === 'mock') {
      inMemoryBudget = { ...inMemoryBudget, isEmergencyPaused: isPaused };
      return { success: true, isEmergencyPaused: isPaused };
    }
    const res = await fetch(`${API_URL}/system/emergency-pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPaused }),
    });
    if (!res.ok) throw new Error('Failed to update emergency pause state');
    return res.json();
  },

  async exportUserData(): Promise<any> {
    if (API_MODE === 'mock') {
      return {
        exportedAt: new Date().toISOString(),
        platform: 'Edgi Opportunity Intelligence Platform',
        profile: inMemoryProfile,
        preferences: inMemoryPreferences,
        applications: inMemoryApplications,
        documents: inMemoryDocuments,
      };
    }
    const res = await fetch(`${API_URL}/users/me/export`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to export user data');
    return res.json();
  },

  async deleteUserData(): Promise<any> {
    if (API_MODE === 'mock') {
      return { success: true, message: 'All personal data has been permanently purged.' };
    }
    const res = await fetch(`${API_URL}/users/me/data`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete user data');
    return res.json();
  },

  async updateRetentionPolicies(policies: { rawContentDays?: number; logsDays?: number; auditDays?: number }): Promise<any> {
    if (API_MODE === 'mock') {
      return { success: true, retentionPolicies: policies };
    }
    const res = await fetch(`${API_URL}/system/retention`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(policies),
    });
    if (!res.ok) throw new Error('Failed to update retention policies');
    return res.json();
  },
};

export default api;
