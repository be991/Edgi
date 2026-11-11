/**
 * Edgi Responsive HTML Email Templates
 * Designed for cross-client compatibility (Gmail, Apple Mail, Outlook).
 */

export interface PriorityAlertData {
  opportunityTitle: string;
  organizationName: string;
  category: string;
  relevanceScore: number;
  deadline: string | null;
  matchReasons: string[];
  ctaUrl: string;
  unsubscribeUrl: string;
}

export interface DailyDigestData {
  digestDate: string;
  opportunities: Array<{
    title: string;
    organization: string;
    category: string;
    score: number;
    deadline: string | null;
    slug: string;
  }>;
  closingSoon: Array<{
    title: string;
    organization: string;
    daysRemaining: number;
    deadline: string;
    slug: string;
  }>;
  sourceUpdatesCount: number;
  digestUrl: string;
  unsubscribeUrl: string;
}

export interface DeadlineReminderData {
  opportunityTitle: string;
  organizationName: string;
  daysRemaining: number;
  deadline: string;
  checklistCompleted: number;
  checklistTotal: number;
  ctaUrl: string;
  unsubscribeUrl: string;
}

export function renderPriorityAlertEmail(data: PriorityAlertData): { subject: string; html: string } {
  const subject = `🔥 [${data.relevanceScore}% Match] ${data.opportunityTitle} — ${data.organizationName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px 12px; }
    .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; }
    .header { background: #0f172a; padding: 20px 24px; border-bottom: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; }
    .brand { font-size: 16px; font-weight: 800; color: #38bdf8; letter-spacing: -0.5px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: #0284c7; color: #ffffff; }
    .content { padding: 28px 24px; }
    .score-badge { display: inline-block; padding: 6px 14px; border-radius: 10px; font-size: 14px; font-weight: 800; background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); margin-bottom: 16px; }
    .title { font-size: 22px; font-weight: 800; color: #ffffff; line-height: 1.3; margin: 0 0 8px 0; }
    .org { font-size: 14px; color: #94a3b8; font-weight: 600; margin-bottom: 20px; }
    .card-meta { background: #0f172a; border-radius: 12px; padding: 14px 18px; margin-bottom: 24px; border: 1px solid #334155; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
    .meta-label { color: #94a3b8; }
    .meta-value { color: #f8fafc; font-weight: 600; }
    .reasons-title { font-size: 13px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
    .reason-item { font-size: 13px; color: #e2e8f0; line-height: 1.5; margin-bottom: 8px; padding-left: 14px; position: relative; }
    .btn { display: block; text-align: center; background: #0284c7; color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 24px; border-radius: 12px; margin-top: 28px; }
    .footer { padding: 20px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #334155; background: #0f172a; }
    .footer a { color: #94a3b8; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="brand">Edgi — Opportunity Intelligence</span>
      <span class="badge">Immediate Priority Alert</span>
    </div>
    <div class="content">
      <div class="score-badge">🎯 ${data.relevanceScore}% Match for Bethel</div>
      <h1 class="title">${escapeHtml(data.opportunityTitle)}</h1>
      <div class="org">${escapeHtml(data.organizationName)} &bull; ${escapeHtml(data.category.toUpperCase())}</div>

      <div class="card-meta">
        <div class="meta-row">
          <span class="meta-label">Verified Deadline:</span>
          <span class="meta-value">${data.deadline ? escapeHtml(data.deadline) : 'Rolling / Not Specified'}</span>
        </div>
        <div class="meta-row" style="margin-bottom: 0;">
          <span class="meta-label">Geographic Eligibility:</span>
          <span class="meta-value" style="color: #38bdf8;">🇳🇬 Verified Open to Nigeria</span>
        </div>
      </div>

      <div class="reasons-title">Why This Opportunity Matches:</div>
      ${data.matchReasons.map(r => `<div class="reason-item">&bull; ${escapeHtml(r)}</div>`).join('')}

      <a href="${escapeHtml(data.ctaUrl)}" class="btn">View Full Opportunity & Eligibility Matrix &rarr;</a>
    </div>
    <div class="footer">
      This private alert was triggered by your high-priority notification rule (&ge; 85% match).<br>
      <a href="${escapeHtml(data.unsubscribeUrl)}">Manage Notification Preferences</a> &bull; Edgi Personal Platform
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, html };
}

export function renderDailyDigestEmail(data: DailyDigestData): { subject: string; html: string } | null {
  if (data.opportunities.length === 0 && data.closingSoon.length === 0) {
    return null; // Empty digest suppression
  }

  const subject = `📬 Daily Opportunity Digest — ${data.digestDate} (${data.opportunities.length} new matches)`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px 12px; }
    .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; }
    .header { background: #0f172a; padding: 20px 24px; border-bottom: 1px solid #334155; }
    .brand { font-size: 16px; font-weight: 800; color: #38bdf8; }
    .subtitle { font-size: 12px; color: #94a3b8; margin-top: 4px; }
    .content { padding: 24px; }
    .section-title { font-size: 14px; font-weight: 800; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 12px 0; }
    .opp-card { background: #0f172a; border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; border: 1px solid #334155; }
    .opp-title { font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; }
    .opp-meta { font-size: 12px; color: #94a3b8; margin-top: 4px; }
    .score { font-weight: 700; color: #34d399; }
    .urgent-card { background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 12px 16px; margin-bottom: 8px; }
    .urgent-title { font-size: 14px; font-weight: 700; color: #fca5a5; }
    .btn { display: block; text-align: center; background: #0284c7; color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 20px; border-radius: 10px; margin-top: 24px; }
    .footer { padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #334155; background: #0f172a; }
    .footer a { color: #94a3b8; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">Edgi — Daily Opportunity Digest</div>
      <div class="subtitle">${escapeHtml(data.digestDate)} &bull; Africa/Lagos (GMT+1)</div>
    </div>
    <div class="content">
      ${data.closingSoon.length > 0 ? `
        <div class="section-title" style="color: #f87171;">⚠️ Deadlines Closing Soon</div>
        ${data.closingSoon.map(c => `
          <div class="urgent-card">
            <div class="urgent-title">${escapeHtml(c.title)}</div>
            <div class="opp-meta">
              ${escapeHtml(c.organization)} &bull; <strong style="color: #ef4444;">${c.daysRemaining} days left</strong> (Deadline: ${escapeHtml(c.deadline)})
            </div>
          </div>
        `).join('')}
      ` : ''}

      <div class="section-title">✨ Top New Opportunities</div>
      ${data.opportunities.map(o => `
        <div class="opp-card">
          <div class="opp-title">${escapeHtml(o.title)}</div>
          <div class="opp-meta">
            ${escapeHtml(o.organization)} &bull; ${escapeHtml(o.category)} &bull; <span class="score">${o.score}% Match</span>
          </div>
        </div>
      `).join('')}

      <a href="${escapeHtml(data.digestUrl)}" class="btn">Open Full Opportunity Feed &rarr;</a>
    </div>
    <div class="footer">
      Scheduled at your local time: 08:00 Africa/Lagos.<br>
      <a href="${escapeHtml(data.unsubscribeUrl)}">Notification Preferences</a>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, html };
}

export function renderDeadlineReminderEmail(data: DeadlineReminderData): { subject: string; html: string } {
  const subject = `⏰ [${data.daysRemaining} Days Left] Deadline Reminder: ${data.opportunityTitle}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px 12px; }
    .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; }
    .header { background: #0f172a; padding: 20px 24px; border-bottom: 1px solid #334155; }
    .brand { font-size: 16px; font-weight: 800; color: #38bdf8; }
    .content { padding: 28px 24px; }
    .countdown-badge { display: inline-block; padding: 6px 14px; border-radius: 10px; font-size: 14px; font-weight: 800; background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); margin-bottom: 16px; }
    .title { font-size: 20px; font-weight: 800; color: #ffffff; line-height: 1.3; margin: 0 0 6px 0; }
    .org { font-size: 14px; color: #94a3b8; font-weight: 600; margin-bottom: 20px; }
    .progress-box { background: #0f172a; border-radius: 12px; padding: 14px 18px; margin-bottom: 24px; border: 1px solid #334155; }
    .progress-bar-bg { background: #334155; border-radius: 9999px; height: 8px; overflow: hidden; margin-top: 8px; }
    .progress-bar-fill { background: #38bdf8; height: 100%; border-radius: 9999px; }
    .btn { display: block; text-align: center; background: #0284c7; color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 24px; border-radius: 12px; }
    .footer { padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #334155; background: #0f172a; }
    .footer a { color: #94a3b8; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">Edgi — Verified Deadline Reminder</div>
    </div>
    <div class="content">
      <div class="countdown-badge">⏰ ${data.daysRemaining} Days Remaining</div>
      <h1 class="title">${escapeHtml(data.opportunityTitle)}</h1>
      <div class="org">${escapeHtml(data.organizationName)} &bull; Deadline: <strong>${escapeHtml(data.deadline)}</strong></div>

      <div class="progress-box">
        <div style="display: flex; justify-content: space-between; font-size: 13px;">
          <span style="color: #94a3b8;">Application Packet Progress:</span>
          <span style="color: #f8fafc; font-weight: 700;">${data.checklistCompleted} of ${data.checklistTotal} items ready</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${data.checklistTotal > 0 ? Math.round((data.checklistCompleted / data.checklistTotal) * 100) : 0}%;"></div>
        </div>
      </div>

      <a href="${escapeHtml(data.ctaUrl)}" class="btn">Complete Packet & AI Assist in Applications &rarr;</a>
    </div>
    <div class="footer">
      Verified deadline reminder configured at 14/7/3/1 days.<br>
      Reminders automatically stop when application status changes to Applied or Withdrawn.<br>
      <a href="${escapeHtml(data.unsubscribeUrl)}">Notification Preferences</a>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, html };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
