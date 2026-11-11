# Operational Runbook: Queue Backlog & Dead-Letter Mitigation

> **Applies to:** BullMQ (`discovery-queue`, `processing-queue`, `notification-queue`)  
> **Severity:** Medium  
> **Goal:** Identify processing bottlenecks, scale worker concurrency safely, and clear dead-letter queues.

---

## 1. Symptoms & Thresholds

- **Queue Depth > 50 jobs waiting**
- **Job Age > 30 minutes**
- **Dead Letter Queue (Failed Jobs) > 5**

---

## 2. Diagnostics via Operations Dashboard

1. Open `http://localhost:3000/operations`.
2. Inspect the **Queue Telemetry** cards:
   - Identify which queue is backlogged (`discovery`, `processing`, or `notifications`).
3. Inspect **Failed & Dead-Letter Jobs**:
   - Check error messages (e.g. rate limit, connection timeout, invalid schema).

---

## 3. Mitigation Steps

### A. Increase Worker Concurrency
If background processing is lagging behind discovery volume:
1. Update `WORKER_CONCURRENCY` in `.env.local`:
   ```bash
   WORKER_CONCURRENCY=10 # increase from 5
   ```
2. Restart worker:
   ```powershell
   pnpm --filter @edgi/worker build
   pnpm --filter @edgi/worker start
   ```

### B. Flush or Retry Dead-Letter Jobs
1. From `/operations`, click **"Retry Job"** for transient network failures.
2. If a malformed payload is causing persistent crashes, click **"Discard Job"** to clean the queue and unblock workers.
