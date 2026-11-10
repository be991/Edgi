# Phase 3: Independent Discovery

## Goal
The system finds opportunities and publishers you never registered, within a monthly budget you control, and feeds the leads into the same pipeline as registered sources.

## Keys needed
One or two search API accounts (evaluate before committing; e.g. Brave Search, Google Custom Search). Set billing caps in the provider dashboard too.

## Frontend first
- **Discover runs page**: history of discovery runs (when, queries executed, leads found, cost).
- **Run now button** with a "dry run: show queries without executing" option.
- **Query preview**: list of generated queries, why each exists (`category × skill × region`), execute/skip toggles.
- **Search profile settings**: categories, keywords to include/exclude, regions, priority organizations.
- **Usage and budget page**: monthly budget, per-provider and per-operation limits, warning/hard-stop thresholds, emergency pause, what's paused and when it last ran.
- **Leads inbox**: search results as unverified leads (title, snippet, domain, provider) with actions: send to processing, dismiss, add as source.

## Backend
### Search abstraction (`packages/search-providers`)
```typescript
interface SearchProvider {
  search(input: SearchInput): Promise<SearchResult[]>;
  getUsage(): Promise<ProviderUsage>;
  checkAvailability(): Promise<ProviderHealth>;
}
```
- **Provider registry**: priority, cost per call, quotas, availability, failover. Implement two providers early to prove the abstraction. The engine imports `SearchProvider`, never a specific vendor.

### Query generation
- Generates queries along dimensions from your profile: `category × role × location × eligibility × publisher-type`.
- Builds query sets for targeted publishers (e.g. `site:ethereum.org/grants`) and open queries (e.g. `"fintech" "fellowship" "Nigeria" 2026`).
- Deduplicates queries, avoids re-running low-yield queries frequently, caps queries per run.
- Preserves why each query was generated (debuggable rationale).

### Leads pipeline
- Search results are **leads**, not yet opportunities.
- Ingest raw result -> fetch target page via `SafeHttpClient` -> save as `discovered_content` with SHA-256 deduplication.
- If publisher is not a registered source, create a `CandidateSource` for review in the Phase 2 approval queue.

### Spend gatekeeper
- Every search API call checks remaining budget first.
- Thresholds:
  - `< 70%`: normal schedule
  - `70–89%`: warning notification, reduce low-priority queries
  - `90–99%`: high-priority queries only
  - `100%`: hard stop, alert user, pause all search jobs
- Track spend per run, per provider, per query type in `provider_usage`.
- Monthly budget reset job.
