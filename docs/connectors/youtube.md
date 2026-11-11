# Connector Validation Note: YouTube Data API v3

**Platform:** YouTube (Google)  
**Verification Date:** 2026-11-11  
**Default Connector Status:** `active` / `active_limited`  
**Authentication Type:** API Key (Read-only Public Data) or OAuth 2.0 (User Account)

---

## 1. Official API Capabilities & Access Rules

- **API Version:** YouTube Data API v3 (REST / JSON).
- **Primary Endpoints:**
  - `GET https://www.googleapis.com/youtube/v3/channels`: Lookup channel ID, metadata, uploads playlist ID.
  - `GET https://www.googleapis.com/youtube/v3/playlistItems`: Retrieve video IDs and publication dates from an upload playlist. Cost: 1 quota unit.
  - `GET https://www.googleapis.com/youtube/v3/videos`: Retrieve snippet, description, links, and tags. Cost: 1 quota unit.
  - `GET https://www.googleapis.com/youtube/v3/search`: Search by keyword. Cost: 100 quota units (expensive; should be avoided for routine monitoring in favor of `playlistItems.list`).
- **Developer Account:** Requires a Google Cloud Project with "YouTube Data API v3" enabled and an API key generated.

---

## 2. Pricing & Rate Limits

- **Free Tier Quota:** 10,000 units per project per day (resets at midnight Pacific Time).
- **Routine Monitoring Strategy:**
  - Checking a channel's `playlistItems.list` costs only **1 unit**.
  - Monitoring 20 security/fellowship channels 4 times a day = 80 units/day (<1% of daily free allowance).
- **Pricing:** Extra quota is subject to quota increase requests via Google Cloud Console (custom enterprise pricing).

---

## 3. Terms of Service & Invariant Constraints

- **No Scraping:** Automating browser sessions or scraping `youtube.com` violates Google Terms of Service and triggers IP bans/CAPTCHAs.
- **Data Retention:** Storing full videos or audio is out of scope. Edgi retains only: video URL, title, description excerpt, outbound application links, and publication timestamp.
- **Link Parsing:** Video descriptions frequently contain shortlinks (`bit.ly`, `forms.gle`, official portal URLs). The pipeline resolves outbound links to find the canonical opportunity.

---

## 4. Ingestion & Fallback Path

- **Best Path:** YouTube Data API v3 querying channel upload playlists on a daily schedule.
- **Fallback Path:** Independent web search discovery using query dimensions (`site:youtube.com/watch "fellowship" OR "hackathon"`).
