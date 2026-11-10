# Phase 2: Source Management

## Goal
You can register organizations and sources, see exactly what the system can and cannot monitor for each, approve or reject recommended sources, and have website/feed sources actually checked on a schedule, with honest health reporting.

## Keys needed
GitHub token (optional, for GitHub connector). Dedicated inbox/Gmail only if you do newsletters now (can defer to Phase 7).

## Frontend first
Upgrade the Phase 1 mock screens with real behavior against mock data:
- **Add source flow**: paste a URL -> system "evaluates" -> shows detected type (website / RSS / GitHub / unsupported) and the proposed collection method.
- **Add organization**: name + website; shows its discovered channels as a tree (careers, programmes, events, newsroom, socials).
- **Source detail**: capabilities, restrictions, schedule, run history, error log, enable/disable, manual "check now".
- **Source recommendations queue**: each candidate shows why recommended, credibility signals, available access methods; actions: approve / ignore / block / "trust automatically" (opt-in rule).
- Status badges use only: `active`, `active_limited`, `authorization_required`, `manual_capture_only`, `unavailable`.

## Backend
### Connector framework (packages/connectors)
```typescript
interface SourceConnector {
  readonly provider: string;
  validateConfiguration(): Promise<ValidationResult>;
  getCapabilities(): Promise<SourceCapabilities>;
  discover(input: DiscoveryInput): Promise<DiscoveryResult[]>;
  fetchContent(reference: string): Promise<SourceContent>;
  checkHealth(): Promise<SourceHealth>;
}
```
- Unsupported operations return an explicit capability error, never a fake success.
- Connector registry: provider name -> implementation. Adding a connector must not touch the pipeline.
- Contract test suite that every connector must pass.

### Initial connectors
- RSS/Atom feed
- Website (Crawlee + Cheerio): conservative rate, identifying User-Agent, robots.txt respected, change detection via content hash, link following limited to same-site paths you allow.
- GitHub (releases, discussions, org activity) via official API.
- Manual capture (paste URL/text): this is also the universal fallback for unsupported platforms.

### Safe fetching (packages/security)
`packages/security` fetch client: only http/https, block localhost/private/link-local/metadata IPs, DNS resolve + re-check after every redirect, redirect cap, timeout, max response size, content-type allowlist. Add SSRF tests immediately.

### Scheduler and monitoring
- Scheduler enqueues check-source jobs by per-source frequency (high-value 30-60 min, normal 6-24 h, low-value weekly).
- Each run writes collection_runs + source_health_checks; consecutive failures flip status and create an in-app notification.
- A failed check never marks the source "up to date".
- Source reliability fields: last new opportunity, publication frequency, failure rate. These drive frequency later.

### Source candidate lifecycle
`discovered` -> `evaluated` -> `recommended` -> `approved` | `ignored` | `blocked` -> `monitored`.
Unfamiliar sources need your approval. "Trusted" sources may auto-approve only under rules you configure.

### API (/api/v1)
`/organizations`, `/sources`, `/sources/:id`, `/sources/:id/health`, `/sources/:id/check`, `/source-candidates`, `/source-candidates/:id/approve|ignore|block`, `/system/sources`.

### Data
Uses: `organizations`, `sources`, `source_capabilities`, `source_credentials` (encrypted), `source_health_checks`, `source_discovery_candidates`, `collection_runs`, `discovered_content`, `processing_jobs`.

### Acceptance criteria
- [x] Add a website, an RSS feed, and a GitHub org; each gets scheduled checks.
- [x] New content from them is stored as discovered_content (not yet opportunities).
- [x] Source page shows true capability, last success, next check, last error.
- [x] Force a failing source: status flips, notification appears, other sources unaffected.
- [x] Unsupported platform URL shows manual_capture_only instead of silently doing nothing.
- [x] SSRF test suite passes (localhost, 169.254.169.254, redirect to private IP, huge file, wrong content-type).
- [x] Running the same check twice creates no duplicate content.
- [x] Contract tests pass for all connectors.

### Out of scope
Search-based discovery (Phase 3), AI extraction (Phase 4), social connectors (Phase 6).
