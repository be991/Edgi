# Connector Validation Note: Telegram Bot API

**Platform:** Telegram  
**Verification Date:** 2026-11-11  
**Default Connector Status:** `active`  
**Authentication Type:** Telegram Bot Token (issued by `@BotFather`)

---

## 1. Official API Capabilities & Access Rules

- **API Version:** Telegram Bot API (HTTPS REST via `https://api.telegram.org/bot<TOKEN>/`).
- **Primary Endpoints:**
  - `POST /getUpdates`: Long-polling to retrieve new messages, channel posts, and forwarded items.
  - `POST /setWebhook`: Set up real-time webhook delivery (optional for server deployments).
  - `GET /getChat`: Retrieve metadata for monitored public channels and discussion groups.
- **Bot Setup:** 100% free; generated via `@BotFather` within seconds.
- **Channel Access Rules:**
  - For **Channels**: The bot must be added as an administrator (or member if public) to read broadcast announcements.
  - For **User Direct Intake**: The user can forward announcements directly to their Edgi bot; the bot ingests the forwarded post into the processing queue.

---

## 2. Pricing & Rate Limits

- **Pricing:** 100% Free. No subscription fees or quota tier costs.
- **Rate Limits:** Up to 30 messages/second broadcast; `getUpdates` polling has no cost when using standard long-polling intervals (e.g. 5–30 seconds timeout).

---

## 3. Terms of Service & Invariant Constraints

- **Zero Scraping:** Edgi does not use unofficial MTProto clients (TDLib/Pyrogram user-accounts) that risk phone number termination. All automated collection uses the sanctioned Bot API.
- **Prompt Injection Defense:** Forwarded messages and channel announcements must be sanitized: text is treated strictly as evidence metadata, never as model instructions.
- **Link Extraction:** Telegram messages almost always include external hyperlinks (`t.me/apply`, Google Docs, organization websites). Outbound links are parsed and fed to canonical discovery.

---

## 4. Ingestion & Fallback Path

- **Best Path:** Long-polling `getUpdates` loop or forward-to-bot manual intake.
- **Fallback Path:** Direct copy-paste into Edgi's `/capture` page.
