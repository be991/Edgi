import { Source, CandidateSource } from '@edgi/contracts';

export const mockSources: Source[] = [
  // 1. Healthy RSS Feed
  {
    id: 'src-001',
    organizationId: 'org-openssf-001',
    organizationName: 'Open Source Security Foundation',
    name: 'OpenSSF Announcements RSS',
    slug: 'openssf-announcements-rss',
    connectorType: 'rss_feed',
    url: 'https://openssf.org/feed',
    status: 'active',
    capabilities: {
      canSearch: false,
      canPaginate: true,
      rateLimitPerMin: 30,
      requiresAuth: false,
      isRealTime: false,
      notes: 'Standard XML RSS 2.0 feed parsed every 4 hours.',
    },
    health: {
      lastSuccessfulCheck: '2026-11-09T22:30:00.000Z',
      nextCheck: '2026-11-10T02:30:00.000Z',
      lastError: null,
      consecutiveFailures: 0,
      latencyMs: 245,
      totalItemsDiscovered: 68,
    },
    config: { feedUrl: 'https://openssf.org/feed' },
    createdAt: '2026-01-01T00:00:00.000Z',
  },

  // 2. NASTY FIXTURE: Manual Capture Only (LinkedIn / Instagram)
  {
    id: 'src-linkedin-002',
    name: 'LinkedIn AppSec Jobs & Posts',
    slug: 'linkedin-appsec-capture',
    connectorType: 'linkedin',
    url: 'https://linkedin.com/jobs/search/?keywords=appsec',
    status: 'manual_capture_only', // NASTY FIXTURE: manual_capture_only
    capabilities: {
      canSearch: false,
      canPaginate: false,
      rateLimitPerMin: 0,
      requiresAuth: true,
      isRealTime: false,
      notes: 'No automated scraping. Uses manual share/bookmark extension.',
    },
    health: {
      lastSuccessfulCheck: '2026-11-08T18:00:00.000Z',
      nextCheck: null,
      lastError: 'Direct API access restricted. Manual intake queue operational.',
      consecutiveFailures: 0,
      latencyMs: null,
      totalItemsDiscovered: 14,
    },
    config: { ingestionMode: 'browser_extension_share' },
    createdAt: '2026-02-01T00:00:00.000Z',
  },

  // 3. NASTY FIXTURE: Failing Source (Consecutive HTTP 502 errors, last successful check 48h ago)
  {
    id: 'src-failing-003',
    organizationName: 'Global DefSec Network',
    name: 'DefSec Security Bounties Feed',
    slug: 'defsec-bounties-feed',
    connectorType: 'rss_feed',
    url: 'https://defsec-bounties.network/feed.xml',
    status: 'unavailable', // NASTY FIXTURE: failing source
    capabilities: {
      canSearch: false,
      canPaginate: false,
      rateLimitPerMin: 20,
      requiresAuth: false,
      isRealTime: false,
      notes: 'Remote host experiencing DNS/Cloudflare 502 outages.',
    },
    health: {
      lastSuccessfulCheck: '2026-11-07T21:15:00.000Z',
      nextCheck: '2026-11-10T00:00:00.000Z',
      lastError: 'HTTP 502 Bad Gateway: Host origin unreachable for 48 hours.',
      consecutiveFailures: 7,
      latencyMs: 12400,
      totalItemsDiscovered: 29,
    },
    config: {},
    createdAt: '2026-03-01T00:00:00.000Z',
  },

  // 4. GitHub Connector (Active)
  {
    id: 'src-github-004',
    organizationName: 'Major League Hacking',
    name: 'MLH Fellowships Repo Dispatches',
    slug: 'mlh-fellowship-github',
    connectorType: 'github',
    url: 'https://github.com/MLH/fellowship',
    status: 'active',
    capabilities: {
      canSearch: true,
      canPaginate: true,
      rateLimitPerMin: 60,
      requiresAuth: true,
      isRealTime: true,
      notes: 'GitHub Releases & Webhook intake via Fine-Grained Token.',
    },
    health: {
      lastSuccessfulCheck: '2026-11-09T23:00:00.000Z',
      nextCheck: '2026-11-10T01:00:00.000Z',
      lastError: null,
      consecutiveFailures: 0,
      latencyMs: 180,
      totalItemsDiscovered: 112,
    },
    config: { repo: 'MLH/fellowship' },
    createdAt: '2026-02-15T00:00:00.000Z',
  },
];

export const mockCandidateSources: CandidateSource[] = [
  {
    id: 'cand-001',
    name: 'African Cyber Defense Student Forum',
    url: 'https://africacyberstudents.org/feed',
    connectorType: 'rss_feed',
    reasoning: 'Discovered via web search mention on 3 recent student CTF writeups.',
    status: 'pending',
    discoveredAt: '2026-11-09T14:20:00.000Z',
    confidence: 0.89,
  },
  {
    id: 'cand-002',
    name: 'Fintech SecGov Opportunities Board',
    url: 'https://fintechsecgov.io/programs',
    connectorType: 'website',
    reasoning: 'Matches keywords: "fintech security fellowship", "undergraduate stipend".',
    status: 'pending',
    discoveredAt: '2026-11-09T08:10:00.000Z',
    confidence: 0.92,
  },
];
