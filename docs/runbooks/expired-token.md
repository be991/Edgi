# Operational Runbook: Expired Credentials & Connector Tokens

> **Applies to:** Social Connectors (YouTube, Reddit, Telegram, Discord, X), Storage & Service Tokens  
> **Severity:** Low to Medium  
> **Goal:** Detect expired credentials gracefully, surface clear in-app indicators, and guide re-authorization without breaking background ingestion.

---

## 1. Detection & Surfacing

When a source connector returns `401 Unauthorized`, `403 Forbidden`, or `token_expired`:
1. The connector catches the error and marks the source status as `authorization_required`.
2. The connector records `lastError: "OAuth token expired or revoked by platform"`.
3. In-App Alert: A system notification is created:
   - `type: 'source_failure'`
   - `title: 'Source Authorization Required'`
   - `body: 'Connector [Platform Name] needs re-authorization.'`
4. Background crawling for that specific source is paused to prevent quota thrashing and account lockouts.

---

## 2. Re-Authorization Procedure

1. **Navigate to Connectors Hub**:
   - Open `http://localhost:3000/connectors`.
2. **Identify Impacted Platform**:
   - The card will show a yellow `Authorization Required` badge.
3. **Re-Authenticate**:
   - Click **"Reconnect / Authorize"**.
   - Sign in with your account credentials.
4. **Verify Health**:
   - Click **"Test Connection"**; upon success, the status badge will return to `Active`.
   - The background queue will resume scheduled polling automatically.
