# Connector Validation Note: Discord Bot API

**Platform:** Discord  
**Verification Date:** 2026-11-11  
**Default Connector Status:** `active`  
**Authentication Type:** Discord Bot Token (Application Developer Portal)

---

## 1. Official API Capabilities & Access Rules

- **API Version:** Discord REST API v10 (`https://discord.com/api/v10`).
- **Primary Endpoints:**
  - `GET /channels/{channel.id}/messages`: Fetch recent messages (up to 100) from designated channels (e.g. `#opportunities`, `#hackathons`, `#job-board`).
  - `GET /guilds/{guild.id}`: Verify server presence and channel permissions.
- **Bot Setup:** Registered under [discord.com/developers/applications](https://discord.com/developers/applications) with "Message Content Intent" enabled.
- **Server Permissions:** Requires bot invite with `View Channels` and `Read Message History` permissions in target security and student servers.

---

## 2. Pricing & Rate Limits

- **Pricing:** 100% Free.
- **Rate Limits:** 50 requests per second per bot account globally; per-channel route buckets (5 requests per 5 seconds). Scheduled hourly polling consumes negligible quota.

---

## 3. Terms of Service & Invariant Constraints

- **No Self-Bots / User Automation:** Using user-tokens (self-bots) violates Discord Terms of Service and results in account bans. Edgi exclusively uses official Bot applications.
- **Data Minimization:** Only messages containing hyperlinks or opportunity keywords (`fellowship`, `internship`, `grant`, `hackathon`) are processed; raw conversation chatter is discarded.
- **Prompt Injection Defense:** Discord channel messages are user-generated text and must never be fed as system instructions to the LLM.

---

## 4. Ingestion & Fallback Path

- **Best Path:** Official Bot REST API reading message history of designated opportunity channels.
- **Fallback Path:** Manual capture paste into `/capture`.
