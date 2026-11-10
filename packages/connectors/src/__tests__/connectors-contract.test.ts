import { ConnectorRegistry } from '../registry';
import { RssFeedConnector } from '../connectors/rss-connector';
import { WebsiteConnector } from '../connectors/website-connector';
import { GitHubConnector } from '../connectors/github-connector';
import { ManualCaptureConnector } from '../connectors/manual-capture-connector';
import { SourceConnector } from '../types';

async function runConnectorContractTests() {
  console.log('🔌 Running @edgi/connectors Contract & Provider Verification Tests...\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (!condition) {
      console.error(`❌ FAILED: ${testName}`);
      process.exit(1);
    }
    console.log(`✅ PASSED: ${testName}`);
    passed++;
  }

  const registry = ConnectorRegistry.getInstance();
  const allConnectors: SourceConnector[] = [
    new RssFeedConnector(),
    new WebsiteConnector(),
    new GitHubConnector(),
    new ManualCaptureConnector(),
  ];

  // 1. Generic Contract Invariants
  console.log('--- 1. Connector Contract Invariants ---');
  for (const connector of allConnectors) {
    assert(typeof connector.provider === 'string' && connector.provider.length > 0, `${connector.provider}: provider is valid`);
    const caps = await connector.getCapabilities();
    assert(typeof caps.canSearch === 'boolean', `${connector.provider}: capabilities.canSearch is boolean`);
    assert(typeof caps.canPaginate === 'boolean', `${connector.provider}: capabilities.canPaginate is boolean`);
    assert(typeof caps.rateLimitPerMin === 'number', `${connector.provider}: capabilities.rateLimitPerMin is number`);
    assert(typeof caps.requiresAuth === 'boolean', `${connector.provider}: capabilities.requiresAuth is boolean`);
  }

  // 2. Registry Registration Check
  console.log('\n--- 2. Connector Registry Lookup ---');
  assert(registry.get('rss_feed') instanceof RssFeedConnector, 'Registry returns RssFeedConnector for "rss_feed"');
  assert(registry.get('website') instanceof WebsiteConnector, 'Registry returns WebsiteConnector for "website"');
  assert(registry.get('github') instanceof GitHubConnector, 'Registry returns GitHubConnector for "github"');
  assert(registry.get('manual_capture') instanceof ManualCaptureConnector, 'Registry returns ManualCaptureConnector for "manual_capture"');
  assert(registry.get('unsupported_unknown') instanceof ManualCaptureConnector, 'Unknown provider falls back to ManualCaptureConnector');

  // 3. URL Evaluation Tests (Frontend Add Source Flow)
  console.log('\n--- 3. URL Evaluation & Classification ---');
  
  // LinkedIn -> Manual Capture Only
  const linkedInEval = await registry.evaluateUrl('https://www.linkedin.com/jobs/view/39281729');
  assert(linkedInEval.detectedType === 'manual_capture', 'Classifies LinkedIn URL as manual_capture');
  assert(linkedInEval.restrictions !== undefined && linkedInEval.restrictions.length > 0, 'LinkedIn evaluation provides honest restrictions');

  // Instagram -> Manual Capture Only
  const instaEval = await registry.evaluateUrl('https://instagram.com/tech_fellowships');
  assert(instaEval.detectedType === 'manual_capture', 'Classifies Instagram URL as manual_capture');

  // GitHub -> GitHub REST API
  const ghEval = await registry.evaluateUrl('https://github.com/OWASP');
  assert(ghEval.detectedType === 'github', 'Classifies GitHub organization URL as github connector');
  assert(ghEval.capabilities.canSearch === true, 'GitHub connector capabilities indicate search support');

  // RSS Feed by extension
  const rssEval = await registry.evaluateUrl('https://cybersecurity.news/feed.xml');
  assert(rssEval.detectedType === 'rss_feed', 'Classifies .xml feed URL as rss_feed connector');

  // General Website
  const webEval = await registry.evaluateUrl('https://careers.google.com/students');
  assert(webEval.detectedType === 'website', 'Classifies general domain as website crawler');

  // 4. Manual Capture Behavior
  console.log('\n--- 4. Manual Capture Provider Behavior ---');
  const manual = new ManualCaptureConnector();
  const manualDiscover = await manual.discover({
    url: 'https://linkedin.com/jobs/123',
    config: {
      pastedContent: 'Junior Cloud Security Engineer job details pasted here',
      title: 'Junior Cloud Security Engineer',
    },
  });
  assert(manualDiscover.items.length === 1, 'Manual capture ingests pasted content successfully');
  assert(manualDiscover.items[0]!.title === 'Junior Cloud Security Engineer', 'Preserves manual opportunity title');

  // 5. Configuration Validation
  console.log('\n--- 5. Configuration Validation ---');
  const rss = new RssFeedConnector();
  assert((await rss.validateConfiguration({ url: 'https://valid-rss.org/feed' })).isValid, 'Accepts valid RSS URL');
  assert(!(await rss.validateConfiguration({ url: 'not-a-valid-url' })).isValid, 'Rejects invalid RSS URL');

  const gh = new GitHubConnector();
  assert((await gh.validateConfiguration({ url: 'https://github.com/ethereum' })).isValid, 'Accepts valid GitHub URL');
  assert(!(await gh.validateConfiguration({ url: 'https://gitlab.com/other' })).isValid, 'Rejects non-GitHub URL');

  console.log(`\n🎉 All ${passed}/${total} @edgi/connectors contract verification tests PASSED!\n`);
}

runConnectorContractTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
