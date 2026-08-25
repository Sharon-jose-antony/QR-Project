package com.qrguard.dto;

import java.util.List;

public class QrDtos {

    public static class QrObservationHistoryItem {
        private String id;
        private String observedAt;
        private String initialUrl;
        private String finalUrl;
        private String finalDomain;
        private String changeClassification;
        private int riskScore;
        private String riskLevel;

        public QrObservationHistoryItem(String id, String observedAt, String initialUrl, String finalUrl,
                                      String finalDomain, String changeClassification, int riskScore, String riskLevel) {
            this.id = id;
            this.observedAt = observedAt;
            this.initialUrl = initialUrl;
            this.finalUrl = finalUrl;
            this.finalDomain = finalDomain;
            this.changeClassification = changeClassification;
            this.riskScore = riskScore;
            this.riskLevel = riskLevel;
        }

        public String getId() { return id; }
        public String getObservedAt() { return observedAt; }
        public String getInitialUrl() { return initialUrl; }
        public String getFinalUrl() { return finalUrl; }
        public String getFinalDomain() { return finalDomain; }
        public String getChangeClassification() { return changeClassification; }
        public int getRiskScore() { return riskScore; }
        public String getRiskLevel() { return riskLevel; }
    }

    public static class QrHistoryResponseData {
        private String qrCodeId;
        private String fingerprint;
        private String payloadType;
        private String firstSeenAt;
        private String lastSeenAt;
        private int scanCount;
        private int reputationScore;
        private String reputationLevel;
        private boolean hasCriticalHistory;
        private String criticalReason;
        private int totalObservations;
        private List<QrObservationHistoryItem> observations;

        public QrHistoryResponseData(String qrCodeId, String fingerprint, String payloadType, String firstSeenAt,
                                     String lastSeenAt, int scanCount, int reputationScore, String reputationLevel,
                                     boolean hasCriticalHistory, String criticalReason, int totalObservations,
                                     List<QrObservationHistoryItem> observations) {
            this.qrCodeId = qrCodeId;
            this.fingerprint = fingerprint;
            this.payloadType = payloadType;
            this.firstSeenAt = firstSeenAt;
            this.lastSeenAt = lastSeenAt;
            this.scanCount = scanCount;
            this.reputationScore = reputationScore;
            this.reputationLevel = reputationLevel;
            this.hasCriticalHistory = hasCriticalHistory;
            this.criticalReason = criticalReason;
            this.totalObservations = totalObservations;
            this.observations = observations;
        }

        public String getQrCodeId() { return qrCodeId; }
        public String getFingerprint() { return fingerprint; }
        public String getPayloadType() { return payloadType; }
        public String getFirstSeenAt() { return firstSeenAt; }
        public String getLastSeenAt() { return lastSeenAt; }
        public int getScanCount() { return scanCount; }
        public int getReputationScore() { return reputationScore; }
        public String getReputationLevel() { return reputationLevel; }
        public boolean isHasCriticalHistory() { return hasCriticalHistory; }
        public String getCriticalReason() { return criticalReason; }
        public int getTotalObservations() { return totalObservations; }
        public List<QrObservationHistoryItem> getObservations() { return observations; }
    }
}
