# Operational Runbook: Bad Deployment Rollback

> **Applies to:** Nest API, Next.js Web App, Background Workers, Database Schema  
> **Severity:** High to Critical  
> **Goal:** Safely revert to a known good release in under 5 minutes without data loss.

---

## 1. Quick Rollback Sequence

### Step 1: Git Revert to Last Verified Commit
```powershell
# Identify last known good release tag or commit
git log --oneline -n 5

# Checkout the previous stable commit (e.g., Phase 7 tag or hash)
git checkout <last-good-commit>
```

### Step 2: Rebuild Core Packages & Apps
```powershell
pnpm build
```

### Step 3: Database Schema Migration Rollback (If Applicable)
If the failed deployment included breaking Prisma migrations:
1. Restore database from the most recent pre-deployment backup:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/restore-db.ps1 -TargetDb edgi
   ```
2. Re-generate Prisma Client:
   ```powershell
   pnpm --filter @edgi/database db:generate
   ```

### Step 4: Restart Running Services
```powershell
# Restart API and Web apps
pnpm --filter @edgi/api build
pnpm --filter @edgi/web build
```

### Step 5: Verification Check
Query system health:
```powershell
curl http://localhost:3001/api/v1/system/health
```
Ensure `status: "healthy"` and database/redis status are `connected`.
