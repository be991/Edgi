# Phase 1: Foundation (repo, auth, DB, full UI shell on mock data)

## Goal
By the end you can log in privately, edit your profile and preferences, and click through every main screen of the product on realistic mock data. The API, worker, and DB skeletons are deployed and healthy. No external integrations yet.

## Keys / Accounts Needed
Supabase, Redis, hosting (web + worker), Sentry, GitHub. Nothing else.

## Step 0: Local Environment
Project name: Edgi. Railway is suspended, so no cloud is needed yet.
- `docker-compose.yml` with Postgres 16 and Redis 7 (persistent volumes). Alternative: Supabase CLI (`supabase start`) for local Postgres + Auth + Storage.
- Run web, API, and worker with `pnpm dev` through Turborepo.
- `.env.example` committed; `.env.local` ignored.
- Email in development: log to console or use a local mail catcher (e.g. Mailpit) until Phase 7.
- Production deployment (Vercel + Railway) is Step 6 and can be skipped until you reactivate Railway.

## Step 1: Repository and Tooling
```text
edgi/
  apps/
    web (Next.js)
    api (NestJS)
    worker (single worker app for now)
  packages/
    contracts
    database
    config
  docs/
```
- pnpm workspaces + Turborepo; TypeScript strict; ESLint + Prettier; Husky pre-commit (lint + typecheck).
- Start with one worker app. Split into discovery/processing/notifications later when load justifies it. Don't create empty packages for show.
- GitHub Actions: install, lint, typecheck, test, build on every PR.
- `packages/config`: validated env vars (Zod); app refuses to boot on missing/invalid config.

## Step 2: Contracts (do this before UI)
In `packages/contracts` define Zod schemas + inferred types for: Opportunity, Organization, Source (+ SourceCapabilities, SourceHealth), DiscoveredContent, EligibilityRequirement, EligibilityAssessment, Match, Application (+ ApplicationStatus), Notification, UserProfile, UserPreferences.
Enums:
- Opportunity category (extensible)
- Verification status (unverified | partially_verified | verified | expired | disputed)
- Eligibility (eligible | likely_eligible | possibly_eligible | ineligible | unknown)
- Connector status (active | active_limited | authorization_required | manual_capture_only | unavailable)

## Step 3: Database
Prisma schema + migrations from commit one. Phase 1 tables (create the full core now so later phases don't reshape it):
`users`, `user_profiles`, `user_preferences`, `organizations`, `sources`, `opportunities`, `opportunity_sources`, `discovered_content`, `content_evidence`, `eligibility_requirements`, `opportunity_locations`, `opportunity_benefits`, `opportunity_matches`, `opportunity_status_history`, `saved_opportunities`, `applications`, `application_documents`, `notifications`, `notification_preferences`, `processing_jobs`, `audit_logs`.
Rules: UUID PKs, UTC timestamps (+ store source deadline timezone separately), FKs with deliberate delete behavior, indexes on status/deadline/category/country/org/published date, unique constraints on canonical URL and external IDs, JSONB only for flexible provider metadata. Enable Row Level Security / ownership checks on every user-owned table.

## Step 3b: Auth
Supabase Auth, signups disabled except your account. NestJS guard verifies Supabase JWT; `/api/v1/auth/me`. Web uses secure cookies. Every query filters by `user_id`.

## Step 4: Frontend (the main work of this phase)
Stack: Next.js App Router, Tailwind, shadcn/ui, TanStack Query, React Hook Form + Zod. Data layer with `mock|live` switch.
Screens:
- App shell (Sidebar, bottom/drawer nav, dark/light, "Demo data" badge)
- Dashboard (New, Strongest matches, Closing soon, Org activity, Applications in progress, Source failures, Last discovery run)
- Discover (List + filters, search, cursor pagination)
- Recommended (Ranked list with relevance + eligibility shown separately and an explanation)
- Opportunity detail (All fields, evidence list, verification badge, unknown fields labeled "Unknown", save / start application)
- Saved (List + dismiss)
- Application tracker (Kanban or list by status: saved ... closed, notes, deadline, follow-up date)
- Organizations (List + detail)
- Sources & monitoring (Status badge, capabilities, last successful check, next check, last error)
- Source recommendations (Approve / ignore / block with reasoning)
- Notifications (History, read/unread)
- Profile & preferences (Real, working forms that persist to DB in this phase)
- Documents (Upload UI placeholder)
- Usage & system health (Budget bars, job health mock)
- Settings (Notification rules, timezone)

Mobile-first checks: every screen usable at 375px width; tables collapse to cards. Empty, loading, and error states for every list. Accessibility: keyboard nav, labels, contrast.

## Step 5: Backend Skeleton
- NestJS modules (empty but wired): Identity/Auth, Profile, Preferences, Opportunities, Sources, Applications, Notifications, Monitoring.
- Real endpoints in this phase: `/auth/me`, `/profile`, `/preferences`, `/system/health`. Others return mock-compatible empty lists so the frontend can switch to live per feature.
- Global validation, consistent error object `{ error: { code, message, requestId } }`, request IDs, structured logging, OpenAPI at `/api/docs`, rate limiting.
- Worker app: boots, connects to Redis, runs one demo job (heartbeat) with retry/backoff, writes to `processing_jobs`. Proves the queue + persistence loop.

## Step 6: Deploy Skeleton
Web (managed host), API + worker (persistent host), Postgres (Supabase), Redis. Local-first during dev. Seed script loads your real profile so Phase 5 has real input.
