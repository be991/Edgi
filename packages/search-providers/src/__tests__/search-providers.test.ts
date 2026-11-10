import { MockSearchProvider } from '../providers/mock-provider';
import { SearchProviderRegistry } from '../registry';
import { QueryGenerator } from '../query-generator';
import { BudgetGatekeeper, BudgetExceededException } from '../budget-gatekeeper';
import { SearchProvider, SearchInput, SearchResult, ProviderUsage, ProviderHealth } from '../types';

async function runSearchProviderTests() {
  console.log('🔍 Running @edgi/search-providers Verification Tests...\n');

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

  // 1. Mock Search Provider & Contract Invariants
  console.log('--- 1. Search Provider Invariants ---');
  const mockProvider = new MockSearchProvider();
  assert(mockProvider.name === 'mock_search', 'Provider name is mock_search');
  assert(mockProvider.costPerCallUsd === 0.0, 'Mock search cost is $0.00');

  const leads = await mockProvider.search({ query: 'AppSec fellowship undergraduate 2027', limit: 3 });
  assert(leads.length > 0, 'Returns search leads from mock index');
  assert(leads[0]!.url.startsWith('https://'), 'Lead URL is valid https');
  assert(leads[0]!.domain.length > 0, 'Lead extracts clean publisher domain');

  const health = await mockProvider.checkAvailability();
  assert(health.isAvailable === true, 'Mock provider reports healthy availability');

  // 2. Provider Registry & Automatic Failover
  console.log('\n--- 2. Registry & Automatic Failover ---');
  const registry = SearchProviderRegistry.getInstance();
  assert(registry.get('mock_search') instanceof MockSearchProvider, 'Registry retrieves MockSearchProvider');

  // Create a failing mock provider to verify failover mechanism
  class FailingProvider implements SearchProvider {
    readonly name = 'failing_external';
    readonly costPerCallUsd = 0.005;
    async search(_input: SearchInput): Promise<SearchResult[]> {
      throw new Error('Simulated external HTTP 429 rate limit exceeded');
    }
    async getUsage(): Promise<ProviderUsage> {
      return { requestsToday: 0, requestsThisMonth: 0, totalCostUsd: 0 };
    }
    async checkAvailability(): Promise<ProviderHealth> {
      return { isAvailable: false, errorMessage: 'Unavailable' };
    }
  }

  registry.register(new FailingProvider());
  registry.setPrimaryProvider('failing_external');

  const failoverResult = await registry.searchWithFailover({ query: 'cybersecurity hackathon' });
  assert(failoverResult.failedPrimary === 'failing_external', 'Correctly identified failing primary provider');
  assert(failoverResult.usedProvider === 'mock_search', 'Successfully failed over to mock_search fallback');
  assert(failoverResult.results.length > 0, 'Failover returned valid results without crashing pipeline');

  // Reset primary
  registry.setPrimaryProvider('mock_search');

  // 3. Multi-Dimensional Query Generator
  console.log('\n--- 3. Dimension-Driven Query Generator ---');
  const generator = new QueryGenerator();
  const profile = {
    degreeLevel: 'undergraduate',
    fieldOfStudy: 'Cyber Security',
    skills: ['AppSec', 'fintech security', 'AI agent defense'],
    country: 'Nigeria',
    targetYear: 2026,
    priorityOrganizations: [
      { name: 'Ethereum Foundation', domain: 'ethereum.org' },
      { name: 'OWASP', domain: 'owasp.org' },
    ],
  };

  const queries = generator.generateQueries(profile, { maxQueries: 10 });
  assert(queries.length === 10, 'Generates bounded query set (exactly 10 queries)');

  // Verify dimensions
  const hasAppSec = queries.some((q) => q.query.includes('appsec') || q.query.includes('application security'));
  assert(hasAppSec, 'Generates queries incorporating AppSec technical skill dimension');

  const hasTargetSite = queries.some((q) => q.query.includes('site:ethereum.org') || q.query.includes('site:owasp.org'));
  assert(hasTargetSite, 'Generates targeted site: queries for priority organizations');

  // Verify deduplication
  const queryHashes = new Set(queries.map((q) => q.hash));
  assert(queryHashes.size === queries.length, 'All generated queries have unique SHA-256 hashes (zero duplicates)');

  // 4. Budget Enforcement Gatekeeper
  console.log('\n--- 4. Budget Gatekeeper Pre-Flight Policy ---');
  
  // Case A: < 70% ($1.00 of $4.00) -> NORMAL
  const normalStatus = BudgetGatekeeper.evaluateBudget({ monthlyLimitUsd: 4.0, currentSpendUsd: 1.0 });
  assert(normalStatus.thresholdStatus === 'normal', 'Spend at 25% is classified as NORMAL');
  assert(normalStatus.canExecuteHighPriority && normalStatus.canExecuteLowPriority, 'Normal allows all priorities');
  BudgetGatekeeper.assertCanExecute(normalStatus, 'low'); // Should not throw

  // Case B: 75% ($3.00 of $4.00) -> WARNING
  const warnStatus = BudgetGatekeeper.evaluateBudget({ monthlyLimitUsd: 4.0, currentSpendUsd: 3.0 });
  assert(warnStatus.thresholdStatus === 'warning', 'Spend at 75% is classified as WARNING');
  assert(!warnStatus.isPaused, 'Warning threshold does not pause execution');

  // Case C: 92% ($3.68 of $4.00) -> DEGRADED (Drops low priority)
  const degradedStatus = BudgetGatekeeper.evaluateBudget({ monthlyLimitUsd: 4.0, currentSpendUsd: 3.68 });
  assert(degradedStatus.thresholdStatus === 'degraded', 'Spend at 92% is classified as DEGRADED');
  assert(degradedStatus.canExecuteHighPriority === true, 'Degraded permits high-priority queries');
  assert(degradedStatus.canExecuteLowPriority === false, 'Degraded drops low-priority queries');
  try {
    BudgetGatekeeper.assertCanExecute(degradedStatus, 'low');
    assert(false, 'Should block low-priority query in degraded mode');
  } catch (err) {
    assert(err instanceof BudgetExceededException, 'Blocks low-priority query with BudgetExceededException');
  }

  // Case D: 100% ($4.00 of $4.00) -> HARD STOP
  const hardStopStatus = BudgetGatekeeper.evaluateBudget({ monthlyLimitUsd: 4.0, currentSpendUsd: 4.05 });
  assert(hardStopStatus.thresholdStatus === 'hard_stop', 'Spend at 100%+ is classified as HARD_STOP');
  assert(hardStopStatus.isPaused === true, '100% spend pauses all discovery execution');
  try {
    BudgetGatekeeper.assertCanExecute(hardStopStatus, 'high');
    assert(false, 'Should block paid calls at 100% limit');
  } catch (err) {
    assert(err instanceof BudgetExceededException, 'Hard-stop blocks queries with BudgetExceededException');
  }

  // Case E: Emergency Pause
  const pausedStatus = BudgetGatekeeper.evaluateBudget({ monthlyLimitUsd: 4.0, currentSpendUsd: 0.5, isEmergencyPaused: true });
  assert(pausedStatus.isPaused === true, 'Emergency pause immediately halts discovery');

  console.log(`\n🎉 All ${passed}/${total} @edgi/search-providers verification tests PASSED!\n`);
}

runSearchProviderTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
