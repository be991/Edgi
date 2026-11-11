# Connector Validation Note: Instagram (Meta Graph API)

**Platform:** Instagram / Meta  
**Verification Date:** 2026-11-11  
**Default Connector Status:** `manual_capture_only`  
**Authentication Type:** Meta User Token / Page Access Token (Business / Creator accounts only)

---

## 1. Official API Capabilities & Access Rules

- **API Version:** Instagram Graph API (`https://graph.facebook.com/v19.0/`).
- **Access Restrictions:**
  - The API **only allows access to accounts owned or managed by the authenticated developer** (Business or Creator accounts).
  - There is **no public API endpoint** to monitor arbitrary third-party Instagram profiles, hashtags, or reels without business verification and Meta App Review.
- **Developer Review:** Full access requires Meta App Review, Business Verification, and explicit user-level OAuth permissions.

---

## 2. Invariant & Legal Constraints

- **No Scraping:** Meta aggressively litigates automated unauthenticated scraping. Headless session cookies or reverse-engineered private mobile APIs are forbidden under Edgi non-negotiable rules.
- **Truthful Status:** Instagram must be truthfully displayed as `manual_capture_only`. Pretending it is automated polling is strictly prohibited.

---

## 3. High-Fidelity Capture & Flyer OCR Strategy

Many cybersecurity student events, campus workshops, and regional African hackathons are promoted primarily as **image flyers on Instagram stories or posts**.

Edgi solves this through the **Share-to-App Flyer Pipeline**:
1. User uploads a screenshot or image flyer to `/capture`.
2. The `@edgi/processing` OCR engine extracts text, dates, contact emails, and registration links.
3. Extracted fields are populated into the canonical staging review with a visual evidence confidence score (`0.70`).
