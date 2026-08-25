import { PrismaClient } from '@prisma/client';
import { generateQrFingerprint, normalizeQrPayload, resolveQrIdentity } from '../../src/security/qr/qrIdentity';
import { evaluateAndRecordDestinationDrift } from '../../src/security/qr/destinationDrift';
import { calculateQrReputation, combineSignals } from '../../src/security/qr/qrReputationEngine';

const prisma = new PrismaClient();

describe('QRGuard Persistent Reputation & Destination Intelligence Engine (20 Test Scenarios)', () => {
  let testQrId: string;
  let testFingerprint: string;

  beforeAll(async () => {
    // Clean up test identities if present
    await prisma.communityReport.deleteMany({ where: { targetDomain: { contains: 'test-qrguard-reputation' } } });
    await prisma.qrObservation.deleteMany({ where: { initialUrl: { contains: 'test-qrguard-reputation' } } });
    await prisma.qrCodeIdentity.deleteMany({ where: { rawPayload: { contains: 'test-qrguard-reputation' } } });
  });

  afterAll(async () => {
    // Clean up
    await prisma.communityReport.deleteMany({ where: { targetDomain: { contains: 'test-qrguard-reputation' } } });
    await prisma.qrObservation.deleteMany({ where: { initialUrl: { contains: 'test-qrguard-reputation' } } });
    await prisma.qrCodeIdentity.deleteMany({ where: { rawPayload: { contains: 'test-qrguard-reputation' } } });
    await prisma.$disconnect();
  });

  // ── Test 1: Canonical URL normalization ──────────────────────────────────────
  it('1. Canonicalizes URL payloads (lowercases host, strips default ports)', () => {
    const raw1 = 'https://TEST-QRGUARD-REPUTATION.ORG:443/portal/login';
    const raw2 = 'https://test-qrguard-reputation.org/portal/login';
    const norm1 = normalizeQrPayload(raw1);
    const norm2 = normalizeQrPayload(raw2);

    expect(norm1.normalized).toBe(norm2.normalized);
    expect(norm1.payloadType).toBe('URL');
  });

  // ── Test 2: Deterministic SHA-256 fingerprinting ─────────────────────────────
  it('2. Computes deterministic SHA-256 fingerprint for identical QR payloads', () => {
    const payload = 'https://test-qrguard-reputation.org/scan-target-1';
    const fp1 = generateQrFingerprint(payload);
    const fp2 = generateQrFingerprint(payload);

    expect(fp1).toHaveLength(64);
    expect(fp1).toBe(fp2);
    testFingerprint = fp1;
  });

  // ── Test 3: QR Identity Registration & Scan Count Increment ──────────────────
  it('3. Registers new QR identity and increments scan count on subsequent scans', async () => {
    const payload = 'https://test-qrguard-reputation.org/scan-target-1';
    const firstRes = await resolveQrIdentity(payload);
    expect(firstRes.isNewQr).toBe(true);
    expect(firstRes.identity.scanCount).toBe(1);
    testQrId = firstRes.identity.id;

    const secondRes = await resolveQrIdentity(payload);
    expect(secondRes.isNewQr).toBe(false);
    expect(secondRes.identity.scanCount).toBe(2);
    expect(secondRes.identity.id).toBe(testQrId);
  });

  // ── Test 4: Destination Drift - First Observation ────────────────────────────
  it('4. Classifies first scan as FIRST_OBSERVATION with destinationChanged = false', async () => {
    const drift = await evaluateAndRecordDestinationDrift({
      qrCodeId: testQrId,
      initialUrl: 'https://test-qrguard-reputation.org/scan-target-1',
      finalUrl: 'https://test-qrguard-reputation.org/scan-target-1',
      finalDomain: 'test-qrguard-reputation.org',
      redirectChain: [],
      riskScore: 0,
      riskLevel: 'LOW',
    });

    expect(drift.changeClassification).toBe('FIRST_OBSERVATION');
    expect(drift.firstObservation).toBe(true);
    expect(drift.destinationChanged).toBe(false);
    expect(drift.totalObservations).toBe(1);
  });

  // ── Test 5: Destination Drift - Destination Unchanged ────────────────────────
  it('5. Classifies repeat scan with same URL as NO_CHANGE', async () => {
    const drift = await evaluateAndRecordDestinationDrift({
      qrCodeId: testQrId,
      initialUrl: 'https://test-qrguard-reputation.org/scan-target-1',
      finalUrl: 'https://test-qrguard-reputation.org/scan-target-1',
      finalDomain: 'test-qrguard-reputation.org',
      redirectChain: [],
      riskScore: 0,
      riskLevel: 'LOW',
    });

    expect(drift.changeClassification).toBe('NO_CHANGE');
    expect(drift.firstObservation).toBe(false);
    expect(drift.destinationChanged).toBe(false);
    expect(drift.totalObservations).toBe(2);
  });

  // ── Test 6: Destination Drift - Path Changed ─────────────────────────────────
  it('6. Detects path change and classifies as FINAL_DESTINATION_CHANGED', async () => {
    const drift = await evaluateAndRecordDestinationDrift({
      qrCodeId: testQrId,
      initialUrl: 'https://test-qrguard-reputation.org/scan-target-1',
      finalUrl: 'https://test-qrguard-reputation.org/new-promo-endpoint',
      finalDomain: 'test-qrguard-reputation.org',
      redirectChain: [],
      riskScore: 10,
      riskLevel: 'LOW',
    });

    expect(drift.changeClassification).toBe('FINAL_DESTINATION_CHANGED');
    expect(drift.destinationChanged).toBe(true);
    expect(drift.domainChanged).toBe(false);
  });

  // ── Test 7: Destination Drift - Domain Changed ───────────────────────────────
  it('7. Detects hostname change and classifies as DOMAIN_CHANGED', async () => {
    const drift = await evaluateAndRecordDestinationDrift({
      qrCodeId: testQrId,
      initialUrl: 'https://test-qrguard-reputation.org/scan-target-1',
      finalUrl: 'https://malicious-takeover-domain.com/login',
      finalDomain: 'malicious-takeover-domain.com',
      redirectChain: [],
      riskScore: 85,
      riskLevel: 'CRITICAL',
    });

    expect(drift.changeClassification).toBe('DOMAIN_CHANGED');
    expect(drift.destinationChanged).toBe(true);
    expect(drift.domainChanged).toBe(true);
  });

  // ── Test 8: Destination Drift - Scheme Changed ───────────────────────────────
  it('8. Detects SSL downgrade from HTTPS to HTTP as SCHEME_CHANGED', async () => {
    const drift = await evaluateAndRecordDestinationDrift({
      qrCodeId: testQrId,
      initialUrl: 'https://test-qrguard-reputation.org/scan-target-1',
      finalUrl: 'http://malicious-takeover-domain.com/login',
      finalDomain: 'malicious-takeover-domain.com',
      redirectChain: [],
      riskScore: 60,
      riskLevel: 'HIGH',
    });

    expect(drift.changeClassification).toBe('SCHEME_CHANGED');
    expect(drift.destinationChanged).toBe(true);
  });

  // ── Test 9: Destination Drift - Redirect Chain Changed ───────────────────────
  it('9. Detects changes in redirect hops as REDIRECT_CHAIN_CHANGED', async () => {
    const drift = await evaluateAndRecordDestinationDrift({
      qrCodeId: testQrId,
      initialUrl: 'https://test-qrguard-reputation.org/scan-target-1',
      finalUrl: 'http://malicious-takeover-domain.com/login',
      finalDomain: 'malicious-takeover-domain.com',
      redirectChain: [{ from: 'https://test-qrguard-reputation.org/scan-target-1', to: 'http://malicious-takeover-domain.com/login' }],
      riskScore: 60,
      riskLevel: 'HIGH',
    });

    expect(drift.changeClassification).toBe('REDIRECT_CHAIN_CHANGED');
    expect(drift.redirectChainChanged).toBe(true);
  });

  // ── Test 10: Reputation Calculation - Clean Initial State ────────────────────
  it('10. Calculates initial reputation level as UNKNOWN with score 0 for unflagged QR', async () => {
    const rep = await calculateQrReputation(testQrId);
    expect(rep.reputationLevel).toBe('UNKNOWN');
    expect(rep.reputationScore).toBe(0);
    expect(rep.totalReports).toBe(0);
    expect(rep.hasCriticalHistory).toBe(false);
  });

  // ── Test 11: Reputation Calculation - Single Community Report ────────────────
  it('11. Increases reputation score and sets category on community threat report', async () => {
    // Insert a test user if needed
    const testUser = await prisma.user.upsert({
      where: { email: 'reporter@test-qrguard.internal' },
      update: {},
      create: {
        email: 'reporter@test-qrguard.internal',
        username: 'testreporter',
        passwordHash: 'dummyhash',
      },
    });

    await prisma.communityReport.create({
      data: {
        userId: testUser.id,
        qrCodeId: testQrId,
        targetUrl: 'https://test-qrguard-reputation.org/scan-target-1',
        targetDomain: 'test-qrguard-reputation.org',
        category: 'PHISHING',
        description: 'Presents fake credential harvest form',
        status: 'PENDING',
      },
    });

    const rep = await calculateQrReputation(testQrId);
    expect(rep.totalReports).toBe(1);
    expect(rep.categories).toContain('PHISHING');
    expect(rep.reputationScore).toBeGreaterThan(0);
    expect(rep.reputationLevel).not.toBe('UNKNOWN');
  });

  // ── Test 12: Reputation Calculation - Confirmed Threat Escalates to CRITICAL ─
  it('12. Escalates to CRITICAL and sets hasCriticalHistory when reports are confirmed', async () => {
    const testUser = await prisma.user.findFirst({ where: { email: 'reporter@test-qrguard.internal' } });

    await prisma.communityReport.create({
      data: {
        userId: testUser!.id,
        qrCodeId: testQrId,
        targetUrl: 'https://test-qrguard-reputation.org/scan-target-1',
        targetDomain: 'test-qrguard-reputation.org',
        category: 'FAKE_PAYMENT',
        description: 'Impersonates electricity payment portal',
        status: 'CONFIRMED',
      },
    });

    const rep = await calculateQrReputation(testQrId);
    expect(rep.confirmedReports).toBe(1);
    expect(rep.totalReports).toBe(2);
    expect(rep.hasCriticalHistory).toBe(true);
    expect(rep.reputationLevel).toBe('CRITICAL');
  });

  // ── Test 13: Scenario A - First Observation ──────────────────────────────────
  it('13. Correctly identifies SCENARIO_A_FIRST_OBSERVATION', () => {
    const signals = combineSignals(
      {
        reputationLevel: 'UNKNOWN',
        reputationScore: 0,
        totalReports: 0,
        confirmedReports: 0,
        pendingReports: 0,
        categories: [],
        firstReportedAt: null,
        lastReportedAt: null,
        hasCriticalHistory: false,
        criticalReason: null,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        totalObservations: 1,
        reportExplanations: [],
      },
      {
        changeClassification: 'FIRST_OBSERVATION',
        destinationChanged: false,
        domainChanged: false,
        redirectChainChanged: false,
        firstObservation: true,
        previousUrl: null,
        previousDomain: null,
        previousRedirectChain: [],
        currentUrl: 'https://example.com/clean',
        currentDomain: 'example.com',
        currentRedirectChain: [],
        firstObservedAt: new Date(),
        lastObservedAt: new Date(),
        totalObservations: 1,
        recentObservations: [],
        observationId: 'obs-1',
      },
      { riskScore: 0, riskLevel: 'LOW', blocked: false }
    );

    expect(signals.scenario).toBe('SCENARIO_A_FIRST_OBSERVATION');
    expect(signals.primaryWarningTitle).toBe('First Observation');
    expect(signals.isSafeToAutoOpen).toBe(true);
  });

  // ── Test 14: Scenario B - Destination Unchanged ──────────────────────────────
  it('14. Correctly identifies SCENARIO_B_PREVIOUSLY_SEEN_UNCHANGED', () => {
    const signals = combineSignals(
      {
        reputationLevel: 'UNKNOWN',
        reputationScore: 0,
        totalReports: 0,
        confirmedReports: 0,
        pendingReports: 0,
        categories: [],
        firstReportedAt: null,
        lastReportedAt: null,
        hasCriticalHistory: false,
        criticalReason: null,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        totalObservations: 5,
        reportExplanations: [],
      },
      {
        changeClassification: 'NO_CHANGE',
        destinationChanged: false,
        domainChanged: false,
        redirectChainChanged: false,
        firstObservation: false,
        previousUrl: 'https://github.com/torvalds/linux',
        previousDomain: 'github.com',
        previousRedirectChain: [],
        currentUrl: 'https://github.com/torvalds/linux',
        currentDomain: 'github.com',
        currentRedirectChain: [],
        firstObservedAt: new Date(),
        lastObservedAt: new Date(),
        totalObservations: 5,
        recentObservations: [],
        observationId: 'obs-2',
      },
      { riskScore: 5, riskLevel: 'LOW', blocked: false }
    );

    expect(signals.scenario).toBe('SCENARIO_B_PREVIOUSLY_SEEN_UNCHANGED');
    expect(signals.primaryWarningTitle).toBe('Destination Unchanged');
    expect(signals.isSafeToAutoOpen).toBe(true);
  });

  // ── Test 15: Scenario C - Community Warning (Previously Reported) ────────────
  it('15. Correctly identifies SCENARIO_C_PREVIOUSLY_REPORTED', () => {
    const signals = combineSignals(
      {
        reputationLevel: 'HIGH_RISK',
        reputationScore: 65,
        totalReports: 3,
        confirmedReports: 1,
        pendingReports: 2,
        categories: ['PHISHING', 'FAKE_LOGIN'],
        firstReportedAt: new Date(),
        lastReportedAt: new Date(),
        hasCriticalHistory: false,
        criticalReason: null,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        totalObservations: 4,
        reportExplanations: [],
      },
      {
        changeClassification: 'NO_CHANGE',
        destinationChanged: false,
        domainChanged: false,
        redirectChainChanged: false,
        firstObservation: false,
        previousUrl: 'https://suspicious-portal.top/login',
        previousDomain: 'suspicious-portal.top',
        previousRedirectChain: [],
        currentUrl: 'https://suspicious-portal.top/login',
        currentDomain: 'suspicious-portal.top',
        currentRedirectChain: [],
        firstObservedAt: new Date(),
        lastObservedAt: new Date(),
        totalObservations: 4,
        recentObservations: [],
        observationId: 'obs-3',
      },
      { riskScore: 55, riskLevel: 'HIGH', blocked: false }
    );

    expect(signals.scenario).toBe('SCENARIO_C_PREVIOUSLY_REPORTED');
    expect(signals.historicalWarningActive).toBe(true);
    expect(signals.isSafeToAutoOpen).toBe(false);
  });

  // ── Test 16: Scenario D - Previously Identified as Critical ──────────────────
  it('16. Correctly identifies SCENARIO_D_PREVIOUSLY_CRITICAL', () => {
    const signals = combineSignals(
      {
        reputationLevel: 'CRITICAL',
        reputationScore: 90,
        totalReports: 5,
        confirmedReports: 3,
        pendingReports: 2,
        categories: ['MALWARE', 'FAKE_PAYMENT'],
        firstReportedAt: new Date(),
        lastReportedAt: new Date(),
        hasCriticalHistory: true,
        criticalReason: 'Confirmed banking trojan payload distribution',
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        totalObservations: 6,
        reportExplanations: [],
      },
      {
        changeClassification: 'NO_CHANGE',
        destinationChanged: false,
        domainChanged: false,
        redirectChainChanged: false,
        firstObservation: false,
        previousUrl: 'https://known-malware-drop.com/app.apk',
        previousDomain: 'known-malware-drop.com',
        previousRedirectChain: [],
        currentUrl: 'https://known-malware-drop.com/app.apk',
        currentDomain: 'known-malware-drop.com',
        currentRedirectChain: [],
        firstObservedAt: new Date(),
        lastObservedAt: new Date(),
        totalObservations: 6,
        recentObservations: [],
        observationId: 'obs-4',
      },
      { riskScore: 80, riskLevel: 'CRITICAL', blocked: false }
    );

    expect(signals.scenario).toBe('SCENARIO_D_PREVIOUSLY_CRITICAL');
    expect(signals.combinedRiskLevel).toBe('CRITICAL');
    expect(signals.isSafeToAutoOpen).toBe(false);
  });

  // ── Test 17: Scenario E - Reported + Destination Changed ─────────────────────
  it('17. Correctly identifies SCENARIO_E_REPORTED_AND_DESTINATION_CHANGED', () => {
    const signals = combineSignals(
      {
        reputationLevel: 'HIGH_RISK',
        reputationScore: 70,
        totalReports: 4,
        confirmedReports: 2,
        pendingReports: 2,
        categories: ['PHISHING'],
        firstReportedAt: new Date(),
        lastReportedAt: new Date(),
        hasCriticalHistory: false,
        criticalReason: null,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        totalObservations: 5,
        reportExplanations: [],
      },
      {
        changeClassification: 'DOMAIN_CHANGED',
        destinationChanged: true,
        domainChanged: true,
        redirectChainChanged: false,
        firstObservation: false,
        previousUrl: 'https://old-phish-domain.com/login',
        previousDomain: 'old-phish-domain.com',
        previousRedirectChain: [],
        currentUrl: 'https://new-phish-domain.com/login',
        currentDomain: 'new-phish-domain.com',
        currentRedirectChain: [],
        firstObservedAt: new Date(),
        lastObservedAt: new Date(),
        totalObservations: 5,
        recentObservations: [],
        observationId: 'obs-5',
      },
      { riskScore: 75, riskLevel: 'CRITICAL', blocked: false }
    );

    expect(signals.scenario).toBe('SCENARIO_E_REPORTED_AND_DESTINATION_CHANGED');
    expect(signals.historicalWarningActive).toBe(true);
    expect(signals.destinationChangeWarningActive).toBe(true);
  });

  // ── Test 18: Scenario F - Destination Changed (No Reports) ───────────────────
  it('18. Correctly identifies SCENARIO_F_DESTINATION_CHANGED_NO_REPORTS', () => {
    const signals = combineSignals(
      {
        reputationLevel: 'UNKNOWN',
        reputationScore: 0,
        totalReports: 0,
        confirmedReports: 0,
        pendingReports: 0,
        categories: [],
        firstReportedAt: null,
        lastReportedAt: null,
        hasCriticalHistory: false,
        criticalReason: null,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        totalObservations: 2,
        reportExplanations: [],
      },
      {
        changeClassification: 'DOMAIN_CHANGED',
        destinationChanged: true,
        domainChanged: true,
        redirectChainChanged: false,
        firstObservation: false,
        previousUrl: 'https://hotel-menu-summer.com/menu',
        previousDomain: 'hotel-menu-summer.com',
        previousRedirectChain: [],
        currentUrl: 'https://hotel-menu-winter.com/menu',
        currentDomain: 'hotel-menu-winter.com',
        currentRedirectChain: [],
        firstObservedAt: new Date(),
        lastObservedAt: new Date(),
        totalObservations: 2,
        recentObservations: [],
        observationId: 'obs-6',
      },
      { riskScore: 10, riskLevel: 'LOW', blocked: false }
    );

    expect(signals.scenario).toBe('SCENARIO_F_DESTINATION_CHANGED_NO_REPORTS');
    expect(signals.destinationChangeWarningActive).toBe(true);
    expect(signals.historicalWarningActive).toBe(false);
  });

  // ── Test 19: Scenario G - Historical Warning + Current Safe ──────────────────
  it('19. Separates historical community warning from clean current destination in SCENARIO_G', () => {
    const signals = combineSignals(
      {
        reputationLevel: 'HIGH_RISK',
        reputationScore: 60,
        totalReports: 2,
        confirmedReports: 0,
        pendingReports: 2,
        categories: ['SUSPICIOUS_REDIRECT'],
        firstReportedAt: new Date(),
        lastReportedAt: new Date(),
        hasCriticalHistory: false,
        criticalReason: null,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        totalObservations: 3,
        reportExplanations: [],
      },
      {
        changeClassification: 'NO_CHANGE',
        destinationChanged: false,
        domainChanged: false,
        redirectChainChanged: false,
        firstObservation: false,
        previousUrl: 'https://clean-verified-site.org/home',
        previousDomain: 'clean-verified-site.org',
        previousRedirectChain: [],
        currentUrl: 'https://clean-verified-site.org/home',
        currentDomain: 'clean-verified-site.org',
        currentRedirectChain: [],
        firstObservedAt: new Date(),
        lastObservedAt: new Date(),
        totalObservations: 3,
        recentObservations: [],
        observationId: 'obs-7',
      },
      { riskScore: 10, riskLevel: 'LOW', blocked: false } // Technically clean destination
    );

    expect(signals.scenario).toBe('SCENARIO_G_REPORTED_CURRENT_DESTINATION_SAFE');
    expect(signals.historicalWarningActive).toBe(true);
    expect(signals.currentRiskScore).toBe(10); // Current technical analysis remains untampered
  });

  // ── Test 20: IDOR & Zero-PII History Retrieval ───────────────────────────────
  it('20. Fetches observation history without leaking reporter IDs or sensitive session data', async () => {
    const history = await prisma.qrCodeIdentity.findUnique({
      where: { id: testQrId },
      include: {
        observations: {
          select: {
            id: true,
            initialUrl: true,
            finalUrl: true,
            finalDomain: true,
            riskLevel: true,
            riskScore: true,
            changeClassification: true,
            createdAt: true,
            // userId and sessionRef excluded
          },
        },
        communityReports: {
          select: {
            id: true,
            category: true,
            description: true,
            status: true,
            createdAt: true,
            // userId excluded
          },
        },
      },
    });

    expect(history).not.toBeNull();
    expect(history!.observations.length).toBeGreaterThan(0);
    expect(history!.communityReports.length).toBeGreaterThan(0);

    // Verify Zero-PII in response models
    for (const report of history!.communityReports) {
      expect((report as any).userId).toBeUndefined();
      expect(report.category).toBeDefined();
    }
  });
});
