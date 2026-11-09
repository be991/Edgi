import { api } from '../client';

export async function runMockApiVerification() {
  console.log('🧪 Running Mock API & Data Layer Tests...');

  // 1. Verify getOpportunities and nasty fixtures
  const { opportunities, total } = await api.getOpportunities();
  console.log(`Found ${total} opportunities in mock index.`);

  const nullDeadlineOpp = opportunities.find((o) => o.deadline === null);
  if (!nullDeadlineOpp) {
    throw new Error('Nasty fixture missing: Null deadline opportunity not found.');
  }
  console.log(`✅ Nasty fixture present: Null deadline ("${nullDeadlineOpp.title}")`);

  const expiredOpp = opportunities.find((o) => o.verificationStatus === 'expired');
  if (!expiredOpp) {
    throw new Error('Nasty fixture missing: Expired opportunity not found.');
  }
  console.log(`✅ Nasty fixture present: Expired listing ("${expiredOpp.title}")`);

  const unverifiedOpp = opportunities.find((o) => o.verificationStatus === 'unverified');
  if (!unverifiedOpp || unverifiedOpp.confidence >= 0.5) {
    throw new Error('Nasty fixture missing: Unverified low-confidence opportunity not found.');
  }
  console.log(`✅ Nasty fixture present: Unverified opportunity ("${unverifiedOpp.title}", confidence: ${unverifiedOpp.confidence})`);

  const mergedOpp = opportunities.find((o) => o.evidence && o.evidence.length >= 3);
  if (!mergedOpp) {
    throw new Error('Nasty fixture missing: Duplicate-merged opportunity with >= 3 evidence items not found.');
  }
  console.log(`✅ Nasty fixture present: Consolidated multi-source duplicate ("${mergedOpp.title}", ${mergedOpp.evidence.length} evidence trails)`);

  // 2. Verify sources and failing/restricted connectors
  const sources = await api.getSources();
  const manualCaptureSrc = sources.find((s) => s.status === 'manual_capture_only');
  if (!manualCaptureSrc) {
    throw new Error('Nasty fixture missing: Source with manual_capture_only status not found.');
  }
  console.log(`✅ Nasty fixture present: Restricted connector ("${manualCaptureSrc.name}", status: ${manualCaptureSrc.status})`);

  const failingSrc = sources.find((s) => s.status === 'unavailable' && s.health.consecutiveFailures > 0);
  if (!failingSrc || !failingSrc.health.lastError) {
    throw new Error('Nasty fixture missing: Failing source with lastError not found.');
  }
  console.log(`✅ Nasty fixture present: Outage source ("${failingSrc.name}", error: "${failingSrc.health.lastError}")`);

  // 3. Verify interactive profile mutation
  const updatedProfile = await api.updateUserProfile({
    headline: 'Updated AppSec Research Fellow',
  });
  if (updatedProfile.headline !== 'Updated AppSec Research Fellow') {
    throw new Error('Mock API mutation failed: Profile headline was not updated.');
  }
  console.log('✅ Interactive state mutation verified: Profile updated successfully.');

  // 4. Verify application creation from opportunity
  const newApp = await api.createApplicationFromOpportunity(nullDeadlineOpp.id);
  if (newApp.opportunityId !== nullDeadlineOpp.id || newApp.status !== 'preparing') {
    throw new Error('Mock API application creation failed.');
  }
  console.log(`✅ Application pipeline verified: Created application "${newApp.opportunityTitle}" with ${newApp.checklist.length} checklist tasks.`);

  console.log('🎉 All Mock Data Layer & Nasty Fixture verification tests passed!');
}

if (require.main === module) {
  runMockApiVerification().catch((e) => {
    console.error('❌ Test failed:', e);
    process.exit(1);
  });
}
