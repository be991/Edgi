# Connector Validation Note: X (Twitter) API v2

**Platform:** X (formerly Twitter)  
**Verification Date:** 2026-11-11  
**Default Connector Status:** `active_limited` (if bearer token present) / `manual_capture_only` (default)  
**Authentication Type:** OAuth 2.0 Bearer Token (App-Only)

---

## 1. Official API Capabilities & Access Rules

- **API Version:** X API v2 (`https://api.twitter.com/2/`).
- **Primary Endpoints:**
  - `GET /2/tweets/search/recent`: Keyword search across recent 7 days of tweets.
  - `GET /2/users/{id}/tweets`: Retrieve recent tweets from target organizations (e.g. `@OpenSSF`, `@defcon`).
- **Developer Tiers:**
  - **Free Tier:** Write-only (500 posts/month); read endpoints return HTTP 403 Forbidden.
  - **Basic Tier:** \$100/month (10,000 read tweets/month). Beyond Edgi's $10/month personal budget.
  - **Pro Tier:** \$5,000/month.

---

## 2. Invariant & Budget Enforcement

- **Strict Budget Invariant:** Edgi has a locked **\$10/month total infrastructure spend cap** (\$4 search, \$5 LLM, \$1 buffer). Spending \$100/month on X Basic API is prohibited.
- **No Scraping:** Using headless browsers, guest tokens, or cookie-hijacking to scrape `x.com` triggers Cloudflare/anti-bot gates and violates platform terms.

---

## 3. Truthful Connector Status & Operational Strategy

- **If User Supplies Bearer Token:** The connector runs in `active_limited` mode, checking specific priority accounts once daily.
- **Default Baseline:** Connector truthfully reports `manual_capture_only`.
- **Primary Channels for X Content:**
  1. **Share-to-App Quick Capture:** User pastes tweet URL and text into `/capture`.
  2. **Search Discovery:** Brave / Serper search queries with `site:x.com` targeting announced grants or fellowships.
