# Connector Validation Note: Reddit Data API

**Platform:** Reddit  
**Verification Date:** 2026-11-11  
**Default Connector Status:** `active`  
**Authentication Type:** OAuth2 `script` type (Client ID + Client Secret + Username/Password) or public JSON/RSS

---

## 1. Official API Capabilities & Access Rules

- **API Version:** Reddit API (OAuth2 via `https://oauth.reddit.com`).
- **Primary Endpoints:**
  - `GET /r/{subreddit}/new`: Ingest latest submissions from targeted subreddits (e.g. `r/cybersecurity`, `r/netsecstudents`, `r/bugbounty`, `r/csmajors`).
  - `GET /r/{subreddit}/search`: Search for specific opportunity flairs (e.g. `flair:"Internship"` or `"Fellowship"`).
- **Developer Account:** Free developer app registration under [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) choosing `script` type.

---

## 2. Pricing & Rate Limits

- **Free Tier:** 100 queries per minute for personal script OAuth clients. This is more than sufficient for Edgi's periodic scheduled polling (e.g. 5 subreddits checked every 2 hours = ~2.5 requests/hr).
- **Commercial API Tier:** Commercial high-volume enterprise API pricing starts at \$0.24 per 1,000 calls (Edgi is personal non-commercial, within free script quota).
- **User-Agent Header:** Reddit strictly requires a descriptive `User-Agent` format: `Platform:AppID:vVersion (by /u/Username)`. Requests without this header are HTTP 429 rate-limited.

---

## 3. Terms of Service & Invariant Constraints

- **No Scraping:** Automated unauthenticated HTML scraping without API credentials triggers Cloudflare blocks and violates Reddit Developer Terms.
- **Data Minimization:** Only post titles, permalinks, submission text excerpts, and outbound target URLs are retained.
- **Prompt Injection Defense:** Reddit post bodies and comments are raw user-submitted text; they must be quarantined and marked untrusted.

---

## 4. Ingestion & Fallback Path

- **Best Path:** Official OAuth2 API polling subreddits for new self-posts and link submissions.
- **Fallback Path:** Public Subreddit RSS feeds (`https://www.reddit.com/r/{subreddit}/new.rss`) via safe fetch.
