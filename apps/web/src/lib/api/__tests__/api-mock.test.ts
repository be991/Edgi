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

  // 5. Verify Phase 6 Social Connectors & Quick Capture
  console.log('\n--- 5. Phase 6 Social Connectors & Capture Tests ---');
  const socialConnectors = await api.getSocialConnectors();
  if (socialConnectors.length !== 7) {
    throw new Error(`Expected 7 social connectors, found ${socialConnectors.length}`);
  }
  console.log(`✅ Social Connectors: Retrieved all ${socialConnectors.length} platform adapters.`);

  // Verify cross-platform deduplication via Quick Capture
  const dedupResult = await api.submitCapture({
    platform: 'x_twitter',
    url: 'https://x.com/OpenSSF/status/1928374650',
    caption: 'Check out our OpenSSF AppSec fellowship! Applications open at https://openssf.org/fellowships/appsec-2027',
    tags: ['appsec', 'x_twitter'],
  });
  if (!dedupResult.isDuplicate || dedupResult.status !== 'duplicate') {
    throw new Error('Quick Capture deduplication failed: Identical OpenSSF announcement was not merged.');
  }
  console.log(`✅ Cross-Platform Deduplication: Merged X announcement into canonical opportunity "${dedupResult.title}".`);

  // Verify new opportunity capture
  const newCapture = await api.submitCapture({
    platform: 'instagram',
    caption: 'Cyber Security Hackathon Lagos 2027. All undergraduates welcome. Prizes: $2000.',
    mediaBase64: 'data:image/png;base64,mockImageBase64',
    tags: ['hackathon', 'instagram'],
  });
  if (newCapture.isDuplicate || newCapture.status !== 'extracted') {
    throw new Error('Quick Capture failed to extract new candidate.');
  }
  console.log(`✅ Quick Capture Staging: Extracted new opportunity "${newCapture.title}".`);

  // Verify credential configuration and revocation
  await api.updateConnectorCredential('x_twitter', 'mock-bearer-token-123');
  let xConn = (await api.getSocialConnectors()).find((c) => c.platform === 'x_twitter');
  if (!xConn?.credentialConfigured) {
    throw new Error('Failed to update connector credential.');
  }
  console.log('✅ Connector Credential: Configured token for X (Twitter).');

  await api.revokeConnector('x_twitter');
  xConn = (await api.getSocialConnectors()).find((c) => c.platform === 'x_twitter');
  if (xConn?.credentialConfigured || xConn?.status !== 'authorization_required') {
    throw new Error('Failed to revoke connector credential.');
  }
  console.log('✅ Connector Revocation: Successfully revoked X token and set status to authorization_required.');

  // 6. Verify Phase 7 Notifications & Application Pipeline
  console.log('\n--- 6. Phase 7 Notifications & Application Pipeline Tests ---');
  // 6A. Transition application status and verify audit history
  const transitioned = await api.transitionApplicationStatus(newApp.id, 'applied', 'Submitted packet via official portal');
  if (transitioned.status !== 'applied' || !transitioned.appliedAt || transitioned.statusHistory.length === 0) {
    throw new Error('Application status transition failed to record applied date or history.');
  }
  console.log(`✅ Application Lifecycle: Transitioned "${transitioned.opportunityTitle}" to "applied" with ${transitioned.statusHistory.length} status history entries.`);

  // 6B. Test Grounded AI Assistant (zero fabrication)
  const aiBullets = await api.runAiAssist(newApp.id, 'tailor_cv_bullets');
  if (!aiBullets.content.includes('OWASP Top 10') || aiBullets.usedProfileFacts.length === 0) {
    throw new Error('AI Assistant failed to tailor CV bullets from real profile facts.');
  }
  console.log(`✅ Grounded AI Assistant: Tailored CV bullets citing ${aiBullets.usedProfileFacts.length} profile facts.`);

  // 6C. Test Documents Vault
  const initialDocs = await api.getUserDocuments();
  const uploadedDoc = await api.uploadUserDocument({
    name: 'FUTO Verification Letter 2026',
    fileName: 'FUTO_Enrollment_Letter.pdf',
    fileSize: 85000,
    mimeType: 'application/pdf',
    type: 'certificate',
    tags: ['academic', 'futo'],
  });
  if (uploadedDoc.fileName !== 'FUTO_Enrollment_Letter.pdf' || uploadedDoc.version !== 1) {
    throw new Error('Document vault upload failed.');
  }
  console.log(`✅ Documents Vault: Uploaded versioned document "${uploadedDoc.name}" (v${uploadedDoc.version}).`);

  // 6D. Test Notification Preferences & Email Previews
  const initialPrefs = await api.getNotificationPreferences();
  if (initialPrefs.highPriorityThreshold !== 85) {
    throw new Error('Default notification preferences threshold mismatch.');
  }
  const preview = await api.previewEmailTemplate('priority_alert');
  if (!preview.html.includes('Edgi Priority Alert') && !preview.html.includes('OpenSSF')) {
    throw new Error('Email template preview failed.');
  }
  console.log(`✅ Email Templates Preview: Rendered responsive HTML for "${preview.template}".`);

  // 6E. Test Alert Dispatch
  const testAlert = await api.triggerTestAlert(newApp.opportunityId);
  if (!testAlert.emailDispatched || !testAlert.emailResult) {
    throw new Error('Test priority alert dispatch failed.');
  }
  console.log(`✅ Immediate Priority Alert: Dispatched email with provider ID ${testAlert.emailResult.providerId}.`);

  console.log('\n🎉 All Mock Data Layer, Nasty Fixtures & Phase 7 Notifications/Applications Tests PASSED!');
}

if (require.main === module) {
  runMockApiVerification().catch((e) => {
    console.error('❌ Test failed:', e);
    process.exit(1);
  });
}
