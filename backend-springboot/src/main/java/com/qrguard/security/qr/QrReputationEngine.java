package com.qrguard.security.qr;

import com.qrguard.model.CommunityReport;
import com.qrguard.model.QrCodeIdentity;
import com.qrguard.repository.CommunityReportRepository;
import com.qrguard.repository.QrCodeIdentityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class QrReputationEngine {

    @Autowired
    private QrCodeIdentityRepository identityRepository;

    @Autowired
    private CommunityReportRepository reportRepository;

    public static class ReputationEvaluation {
        private final int reputationScore;
        private final String reputationLevel; // CLEAN | SUSPICIOUS | HIGH_RISK | MALICIOUS | UNKNOWN
        private final int totalReports;
        private final int confirmedReports;
        private final int pendingReports;
        private final boolean hasCriticalHistory;
        private final String criticalReason;
        private final List<String> topReportReasons;
        private final String scenario;
        private final String warningMessage;

        public ReputationEvaluation(int reputationScore, String reputationLevel, int totalReports,
                                    int confirmedReports, int pendingReports, boolean hasCriticalHistory,
                                    String criticalReason, List<String> topReportReasons, String scenario, String warningMessage) {
            this.reputationScore = reputationScore;
            this.reputationLevel = reputationLevel;
            this.totalReports = totalReports;
            this.confirmedReports = confirmedReports;
            this.pendingReports = pendingReports;
            this.hasCriticalHistory = hasCriticalHistory;
            this.criticalReason = criticalReason;
            this.topReportReasons = topReportReasons;
            this.scenario = scenario;
            this.warningMessage = warningMessage;
        }

        public int getReputationScore() { return reputationScore; }
        public String getReputationLevel() { return reputationLevel; }
        public int getTotalReports() { return totalReports; }
        public int getConfirmedReports() { return confirmedReports; }
        public int getPendingReports() { return pendingReports; }
        public boolean isHasCriticalHistory() { return hasCriticalHistory; }
        public String getCriticalReason() { return criticalReason; }
        public List<String> getTopReportReasons() { return topReportReasons; }
        public String getScenario() { return scenario; }
        public String getWarningMessage() { return warningMessage; }
    }

    public ReputationEvaluation evaluateReputation(QrCodeIdentity identity, int currentScanRiskScore, DestinationDriftService.DriftResult drift) {
        List<CommunityReport> reports = reportRepository.findByQrCodeIdOrderByCreatedAtDesc(identity.getId());

        int confirmed = 0;
        int pending = 0;
        Map<String, Integer> categoryCounts = new HashMap<>();

        for (CommunityReport r : reports) {
            if ("CONFIRMED".equalsIgnoreCase(r.getStatus())) {
                confirmed++;
            } else if ("PENDING".equalsIgnoreCase(r.getStatus())) {
                pending++;
            }
            categoryCounts.put(r.getCategory(), categoryCounts.getOrDefault(r.getCategory(), 0) + 1);
        }

        // Weighted Community Threat Score: CONFIRMED = 25 pts, PENDING = 10 pts
        int repScore = Math.min(100, (confirmed * 25) + (pending * 10));

        // Preserve Permanent Critical History
        boolean hasCritical = identity.isHasCriticalHistory() || confirmed >= 3 || repScore >= 80;
        String criticalReason = identity.getCriticalReason();
        if (hasCritical && criticalReason == null) {
            criticalReason = "Multiple confirmed community abuse reports (" + confirmed + " confirmed)";
        }

        String repLevel;
        if (hasCritical || repScore >= 80) repLevel = "MALICIOUS";
        else if (repScore >= 50) repLevel = "HIGH_RISK";
        else if (repScore >= 20) repLevel = "SUSPICIOUS";
        else if (identity.getScanCount() > 5) repLevel = "CLEAN";
        else repLevel = "UNKNOWN";

        // Update Identity Record with current reputation telemetry
        identity.setReputationScore(repScore);
        identity.setReputationLevel(repLevel);
        identity.setReportCount(reports.size());
        identity.setHasCriticalHistory(hasCritical);
        if (identity.getId() != null && identityRepository.existsById(identity.getId())) {
            identityRepository.save(identity);
        }

        // Extract top report reasons
        List<String> topReasons = new ArrayList<>(categoryCounts.keySet());
        topReasons.sort((a, b) -> categoryCounts.get(b).compareTo(categoryCounts.get(a)));

        // Combine Signals into Scenarios A through G
        String scenario;
        String warningMsg = null;

        if (currentScanRiskScore >= 80) {
            scenario = "SCENARIO_E_CURRENT_SCAN_CRITICAL";
            warningMsg = "Critical security threat detected in current scan target.";
        } else if (hasCritical) {
            scenario = "SCENARIO_C_PREVIOUSLY_CRITICAL";
            warningMsg = "WARNING: This QR code has a history of confirmed malicious activity: " + criticalReason;
        } else if (drift != null && drift.isDomainChanged()) {
            scenario = "SCENARIO_D_DESTINATION_DRIFT_DETECTED";
            warningMsg = "ALERT: This QR code previously led to '" + drift.getPreviousFinalDomain() + "', but now redirects to a different domain.";
        } else if (repScore >= 50) {
            scenario = "SCENARIO_B_COMMUNITY_FLAGGED_THREAT";
            warningMsg = "Caution: This QR code has been reported by " + reports.size() + " community users.";
        } else if (currentScanRiskScore >= 40) {
            scenario = "SCENARIO_G_HEURISTIC_RISK_DETECTED";
            warningMsg = "Suspicious characteristics detected during structural inspection.";
        } else if (identity.getScanCount() <= 1 && reports.isEmpty()) {
            scenario = "SCENARIO_A_FIRST_SEEN_CLEAN";
            warningMsg = null;
        } else {
            scenario = "SCENARIO_F_VERIFIED_CLEAN";
            warningMsg = null;
        }

        return new ReputationEvaluation(
                repScore,
                repLevel,
                reports.size(),
                confirmed,
                pending,
                hasCritical,
                criticalReason,
                topReasons,
                scenario,
                warningMsg
        );
    }
}
