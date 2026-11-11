# Connector Validation Note: LinkedIn Community API

**Platform:** LinkedIn (Microsoft)  
**Verification Date:** 2026-11-11  
**Default Connector Status:** `manual_capture_only`  
**Authentication Type:** OAuth 2.0 (Restricted Partner Scopes)

---

## 1. Official API Capabilities & Access Rules

- **API Version:** LinkedIn Community Management / Share API (`https://api.linkedin.com/v2/`).
- **Access Restrictions:**
  - Public search and post monitoring endpoints are **gated behind LinkedIn Enterprise Partner Programs**.
  - Standard developer accounts can only publish to or read analytics from pages they explicitly administer.
  - Arbitrary user profile or job search scraping is strictly prohibited.
- **Developer Review:** Requires organizational partnership agreement and corporate vetting.

---

## 2. Invariant & Scraping Realities

- **No Scraping:** LinkedIn employs sophisticated bot-detection mechanisms (imperva, behavioral heuristics, login walls). Scraping violates LinkedIn User Agreement and leads to immediate account restriction.
- **Truthful Status:** Connector truthfully reports `manual_capture_only`.

---

## 3. High-Value Intake Strategy

LinkedIn job and fellowship announcements frequently contain direct external links (e.g. greenhouse.io, lever.co, workday, company portals).

Edgi captures LinkedIn opportunities via:
1. **Share-to-App Quick Capture:** User copies the post URL and caption into `/capture`.
2. **Canonical Outbound Link Following:** The pipeline extracts external application URLs from the post and fetches the canonical job page with SafeFetch.
3. **Inbound Email Alert Forwarding:** User forwards LinkedIn job alerts to the dedicated intake inbox.
