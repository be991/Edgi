import {
  Opportunity,
  OpportunityFilter,
  Source,
  CandidateSource,
  Application,
  Notification,
  UserProfile,
  UserPreferences,
  UsageBudget,
  SystemHealth,
} from '@edgi/contracts';

import { mockOpportunities } from '../fixtures/opportunities';
import { mockSources, mockCandidateSources } from '../fixtures/sources';
import { mockApplications } from '../fixtures/applications';
import { mockUserProfile, mockUserPreferences } from '../fixtures/profile';
import { mockNotifications } from '../fixtures/notifications';
import { mockUsageBudget, mockSystemHealth } from '../fixtures/usage';

const API_MODE = process.env.NEXT_PUBLIC_API_MODE || 'mock';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// In-memory mock state for interactive demo persistence
let inMemoryOpportunities = [...mockOpportunities];
let inMemorySources = [...mockSources];
let inMemoryCandidateSources = [...mockCandidateSources];
let inMemoryApplications = [...mockApplications];
let inMemoryProfile = { ...mockUserProfile };
let inMemoryPreferences = { ...mockUserPreferences };
let inMemoryNotifications = [...mockNotifications];
let inMemoryBudget = { ...mockUsageBudget };

export const api = {
  isMockMode: () => API_MODE === 'mock',

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

  async getRecommendedOpportunities(): Promise<Opportunity[]> {
    if (API_MODE === 'mock') {
      return inMemoryOpportunities
        .filter((o) => (o.relevanceScore ?? 0) >= 80 && o.verificationStatus !== 'expired')
        .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
    }
    const res = await fetch(`${API_URL}/opportunities/recommended`);
    if (!res.ok) throw new Error('Failed to fetch recommended opportunities');
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
  async getUsageBudget(): Promise<UsageBudget> {
    if (API_MODE === 'mock') {
      return { ...inMemoryBudget };
    }
    const res = await fetch(`${API_URL}/usage`);
    if (!res.ok) throw new Error('Failed to fetch usage');
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
};
