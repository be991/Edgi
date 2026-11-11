# Operational Runbook: External Provider Outage

> **Applies to:** Gemini API, Resend, Brave Search / Serper, Supabase Storage  
> **Severity:** Medium to High  
> **Goal:** Ensure uninterrupted user experience and automated degradation during upstream third-party service outages.

---

## 1. Google Gemini API Outage

### Symptoms:
- Opportunity extraction jobs in BullMQ fail with `503 Service Unavailable` or `RESOURCE_EXHAUSTED`.
- Grounded AI draft assistant returns `AI Assistant Service Temporarily Unavailable`.

### Immediate Actions:
1. **Verify Outage**: Check [Google Cloud Status Dashboard](https://status.cloud.google.com/) and Google AI Studio status.
2. **Switch to Secondary Provider**:
   - Update `.env.local` or production environment to configure OpenAI fallback:
     ```bash
     OPENAI_API_KEY=sk-...
     PRIMARY_LLM_PROVIDER=openai
     ```
   - Restart API: `pnpm --filter @edgi/api restart`.
3. **Queue Behavior**: BullMQ automatically catches failures and pushes jobs into exponential retry with a backoff of 5m, 15m, 1h. No jobs are dropped.

---

## 2. Resend Email Outage

### Symptoms:
- Immediate alerts and daily digests fail delivery; `notification_deliveries` records `status = 'failed'`.
- Operations Dashboard shows alert badge on Email Delivery Rate.

### Immediate Actions:
1. **Fallback to In-App Alerts**:
   - In-app notifications are strictly decoupled from email and will continue to appear in `/notifications` and the top navigation bell.
2. **Retry Failed Deliveries**:
   - Once Resend recovers, run the worker retry sweep or click **"Retry Failed Deliveries"** in `/notifications?tab=deliveries`.
   - Idempotency keys (`user:event:entity:channel:offset`) guarantee zero duplicate emails upon reconnection.

---

## 3. Web Search Provider Outage (Brave / Serper)

### Symptoms:
- Discovery pipeline runs show status `failed` or `0 leads found`.

### Immediate Actions:
1. **Switch Search Provider**:
   - Edit `.env.local`:
     ```bash
     SEARCH_PROVIDER=serper # or brave
     ```
2. **Manual Opportunity Capture**:
   - Use `/capture` to paste URLs, text summaries, or screenshots directly into the processing pipeline without relying on search engine crawlers.
