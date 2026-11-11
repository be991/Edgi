import { strict as assert } from 'node:assert';
import {
  ConnectorRegistry,
  YouTubeConnector,
  RedditConnector,
  TelegramConnector,
  DiscordConnector,
  XConnector,
  InstagramConnector,
  LinkedInConnector,
} from '../index';

async function runSocialConnectorTests() {
  console.log('🧪 Running @edgi/connectors Social Connectors Verification Tests...\n');

  const registry = ConnectorRegistry.getInstance();

  // ---------------------------------------------------------------------------
  // 1. YouTube Connector Contract Verification
  // ---------------------------------------------------------------------------
  console.log('--- 1. YouTube Connector Verification ---');
  const yt = new YouTubeConnector();
  assert.equal(yt.provider, 'youtube');
  const ytValid = await yt.validateConfiguration({ url: 'https://youtube.com/@blackhat' });
  assert.equal(ytValid.isValid, true);
  const ytInvalid = await yt.validateConfiguration({ url: 'https://notyoutube.com/channel' });
  assert.equal(ytInvalid.isValid, false);

  const ytCaps = await yt.getCapabilities();
  assert.equal(ytCaps.canSearch, true);
  assert.equal(ytCaps.rateLimitPerMin, 60);
  assert.ok(ytCaps.notes?.includes('YouTube Data API v3'));

  const ytDisc = await yt.discover({ url: 'https://youtube.com/channel/UC123456789' });
  assert.ok(ytDisc.items.length > 0);
  assert.equal(ytDisc.items[0].metadata?.platform, 'youtube');
  console.log('✅ YouTube Connector contract & discovery verified');

  // ---------------------------------------------------------------------------
  // 2. Reddit Connector Contract Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Reddit Connector Verification ---');
  const rd = new RedditConnector();
  assert.equal(rd.provider, 'reddit');
  const rdValid = await rd.validateConfiguration({ url: 'https://www.reddit.com/r/cybersecurity' });
  assert.equal(rdValid.isValid, true);
  const rdInvalid = await rd.validateConfiguration({ url: 'https://example.com/r/cybersecurity' });
  assert.equal(rdInvalid.isValid, false);

  const rdCaps = await rd.getCapabilities();
  assert.equal(rdCaps.rateLimitPerMin, 60);
  assert.ok(rdCaps.notes?.includes('User-Agent'));

  const rdDisc = await rd.discover({ url: 'https://reddit.com/r/netsecstudents' });
  assert.ok(rdDisc.items.length > 0);
  assert.equal(rdDisc.items[0].metadata?.platform, 'reddit');
  console.log('✅ Reddit Connector contract & discovery verified');

  // ---------------------------------------------------------------------------
  // 3. Telegram Connector Contract Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Telegram Connector Verification ---');
  const tg = new TelegramConnector();
  assert.equal(tg.provider, 'telegram');
  const tgValid = await tg.validateConfiguration({ url: 'https://t.me/cybersec_africa' });
  assert.equal(tgValid.isValid, true);
  const tgInvalid = await tg.validateConfiguration({ url: 'https://whatsapp.com/channel' });
  assert.equal(tgInvalid.isValid, false);

  const tgCaps = await tg.getCapabilities();
  assert.equal(tgCaps.requiresAuth, true);
  assert.ok(tgCaps.notes?.includes('Telegram Bot API'));

  const tgDisc = await tg.discover({ url: 'https://t.me/cybersec_africa' });
  assert.ok(tgDisc.items.length > 0);
  assert.equal(tgDisc.items[0].metadata?.platform, 'telegram');
  console.log('✅ Telegram Connector contract & discovery verified');

  // ---------------------------------------------------------------------------
  // 4. Discord Connector Contract Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Discord Connector Verification ---');
  const dc = new DiscordConnector();
  assert.equal(dc.provider, 'discord');
  const dcValid = await dc.validateConfiguration({ url: 'https://discord.com/channels/12345/67890' });
  assert.equal(dcValid.isValid, true);
  const dcInvalid = await dc.validateConfiguration({ url: 'https://slack.com/archives' });
  assert.equal(dcInvalid.isValid, false);

  const dcCaps = await dc.getCapabilities();
  assert.equal(dcCaps.requiresAuth, true);
  assert.equal(dcCaps.rateLimitPerMin, 50);

  const dcDisc = await dc.discover({ url: 'https://discord.com/channels/12345/67890' });
  assert.ok(dcDisc.items.length > 0);
  assert.equal(dcDisc.items[0].metadata?.platform, 'discord');
  console.log('✅ Discord Connector contract & discovery verified');

  // ---------------------------------------------------------------------------
  // 5. X (Twitter) Connector Contract Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. X (Twitter) Connector Verification ---');
  const xt = new XConnector();
  assert.equal(xt.provider, 'x_twitter');
  const xtValid = await xt.validateConfiguration({ url: 'https://x.com/OpenSSF' });
  assert.equal(xtValid.isValid, true);
  const xtInvalid = await xt.validateConfiguration({ url: 'https://threads.net/@openssf' });
  assert.equal(xtInvalid.isValid, false);

  const xtCaps = await xt.getCapabilities();
  assert.equal(xtCaps.requiresAuth, true);
  assert.ok(xtCaps.notes?.includes('budget'));

  const xtDisc = await xt.discover({ url: 'https://x.com/OpenSSF' });
  assert.ok(xtDisc.items.length > 0);
  assert.equal(xtDisc.items[0].metadata?.platform, 'x_twitter');
  console.log('✅ X Connector contract & discovery verified');

  // ---------------------------------------------------------------------------
  // 6. Instagram & LinkedIn Truthful Manual Capture Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Instagram & LinkedIn Truthful Manual Capture Verification ---');
  const ig = new InstagramConnector();
  const ln = new LinkedInConnector();

  const igValid = await ig.validateConfiguration({ url: 'https://instagram.com/africacyberfest' });
  assert.equal(igValid.isValid, true);
  const igCaps = await ig.getCapabilities();
  assert.ok(igCaps.notes?.includes('Flyer OCR'));

  const lnValid = await ln.validateConfiguration({ url: 'https://linkedin.com/company/paystack' });
  assert.equal(lnValid.isValid, true);
  const lnCaps = await ln.getCapabilities();
  assert.ok(lnCaps.notes?.includes('Enterprise partnership'));

  const igDisc = await ig.discover({ url: 'https://instagram.com/p/C123456' });
  assert.equal(igDisc.items[0].metadata?.status, 'manual_capture_only');
  console.log('✅ Instagram & LinkedIn truthful manual capture capability verified');

  // ---------------------------------------------------------------------------
  // 7. Connector Registry URL Classification Matrix
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. Connector Registry URL Evaluation Matrix ---');
  const tests = [
    { url: 'https://youtube.com/@owasp', expectedType: 'youtube' },
    { url: 'https://reddit.com/r/netsecstudents', expectedType: 'reddit' },
    { url: 'https://t.me/cybersec_africa', expectedType: 'telegram' },
    { url: 'https://discord.com/channels/999/888', expectedType: 'discord' },
    { url: 'https://x.com/OpenSSF', expectedType: 'x_twitter' },
    { url: 'https://instagram.com/cybersecurity_student_hub', expectedType: 'instagram' },
    { url: 'https://linkedin.com/company/google', expectedType: 'linkedin' },
    { url: 'https://github.com/ossf', expectedType: 'github' },
  ];

  for (const t of tests) {
    const evalRes = await registry.evaluateUrl(t.url);
    assert.equal(evalRes.detectedType, t.expectedType);
    assert.ok(evalRes.proposedMethod.length > 0);
    assert.ok(evalRes.capabilities);
  }
  console.log('✅ All 8 platform URLs correctly classified by ConnectorRegistry');

  console.log('\n🎉 ALL Phase 6 Social Connectors Verification Tests PASSED!');
}

runSocialConnectorTests().catch((err) => {
  console.error('❌ Social Connectors Test failed:', err);
  process.exit(1);
});
