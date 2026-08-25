package com.qrguard;

import com.qrguard.model.QrCodeIdentity;
import com.qrguard.security.qr.DestinationDriftService;
import com.qrguard.security.qr.QrIdentityService;
import com.qrguard.security.qr.QrReputationEngine;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class QrReputationTests {

    @Autowired
    private QrIdentityService qrIdentityService;

    @Autowired
    private QrReputationEngine qrReputationEngine;

    @Test
    @DisplayName("Should generate deterministic SHA-256 fingerprint for canonical URL")
    void testDeterministicFingerprint() {
        QrIdentityService.FingerprintResult fp1 = qrIdentityService.generateFingerprint("https://EXAMPLE.COM/path/?b=2&a=1");
        QrIdentityService.FingerprintResult fp2 = qrIdentityService.generateFingerprint("https://example.com/path?a=1&b=2");

        assertEquals(fp1.getFingerprint(), fp2.getFingerprint(), "Sorted params and normalized URL should yield identical fingerprint");
        assertEquals(64, fp1.getFingerprint().length(), "SHA-256 hex string should be exactly 64 characters");
    }

    @Test
    @DisplayName("Scenario A: First seen clean QR should have UNKNOWN reputation and no warnings")
    void testScenarioAFirstSeenClean() {
        QrCodeIdentity identity = new QrCodeIdentity("dummy-fp-a", "https://example.com/clean", "URL");
        identity.setScanCount(1);

        QrReputationEngine.ReputationEvaluation eval = qrReputationEngine.evaluateReputation(identity, 0, null);

        assertEquals("SCENARIO_A_FIRST_SEEN_CLEAN", eval.getScenario());
        assertNull(eval.getWarningMessage());
        assertEquals(0, eval.getTotalReports());
    }

    @Test
    @DisplayName("Scenario C: Previously critical QR should permanently trigger warning")
    void testScenarioCPreviouslyCritical() {
        QrCodeIdentity identity = new QrCodeIdentity("dummy-fp-c", "https://malicious-qr.xyz", "URL");
        identity.setHasCriticalHistory(true);
        identity.setCriticalReason("Known quishing campaign targeting bank credentials");

        QrReputationEngine.ReputationEvaluation eval = qrReputationEngine.evaluateReputation(identity, 0, null);

        assertEquals("SCENARIO_C_PREVIOUSLY_CRITICAL", eval.getScenario());
        assertNotNull(eval.getWarningMessage());
        assertTrue(eval.getWarningMessage().contains("Known quishing campaign"));
    }

    @Test
    @DisplayName("Scenario D: Destination drift to different domain should trigger drift alert")
    void testScenarioDDestinationDrift() {
        QrCodeIdentity identity = new QrCodeIdentity("dummy-fp-d", "https://redirector.com/link", "URL");
        identity.setScanCount(5);

        DestinationDriftService.DriftResult drift = new DestinationDriftService.DriftResult(
                "DOMAIN_CHANGED",
                true,
                true,
                false,
                "https://legit-store.com",
                "legit-store.com",
                2
        );

        QrReputationEngine.ReputationEvaluation eval = qrReputationEngine.evaluateReputation(identity, 10, drift);

        assertEquals("SCENARIO_D_DESTINATION_DRIFT_DETECTED", eval.getScenario());
        assertNotNull(eval.getWarningMessage());
        assertTrue(eval.getWarningMessage().contains("legit-store.com"));
    }

    @Test
    @DisplayName("Scenario E: Current technical scan is critical -> triggers current scan critical alert")
    void testScenarioECurrentScanCritical() {
        QrCodeIdentity identity = new QrCodeIdentity("dummy-fp-e", "http://127.0.0.1:8080", "URL");

        QrReputationEngine.ReputationEvaluation eval = qrReputationEngine.evaluateReputation(identity, 100, null);

        assertEquals("SCENARIO_E_CURRENT_SCAN_CRITICAL", eval.getScenario());
        assertNotNull(eval.getWarningMessage());
    }
}
