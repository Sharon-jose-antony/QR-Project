package com.qrguard.dto;

import com.qrguard.security.ssrf.SafeHttpFetcher;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

public class UrlDtos {

    public static class AnalyzeUrlRequest {
        @NotBlank(message = "URL is required")
        private String url;

        private String qrCodeId;

        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }
        public String getQrCodeId() { return qrCodeId; }
        public void setQrCodeId(String qrCodeId) { this.qrCodeId = qrCodeId; }
    }

    public static class CommunityWarningDto {
        private String scenario;
        private String warningMessage;
        private int reputationScore;
        private String reputationLevel;
        private int totalReports;
        private int confirmedReports;
        private boolean hasCriticalHistory;
        private String criticalReason;
        private List<String> topReportReasons;

        public CommunityWarningDto(String scenario, String warningMessage, int reputationScore, String reputationLevel,
                                   int totalReports, int confirmedReports, boolean hasCriticalHistory, String criticalReason,
                                   List<String> topReportReasons) {
            this.scenario = scenario;
            this.warningMessage = warningMessage;
            this.reputationScore = reputationScore;
            this.reputationLevel = reputationLevel;
            this.totalReports = totalReports;
            this.confirmedReports = confirmedReports;
            this.hasCriticalHistory = hasCriticalHistory;
            this.criticalReason = criticalReason;
            this.topReportReasons = topReportReasons;
        }

        public String getScenario() { return scenario; }
        public String getWarningMessage() { return warningMessage; }
        public int getReputationScore() { return reputationScore; }
        public String getReputationLevel() { return reputationLevel; }
        public int getTotalReports() { return totalReports; }
        public int getConfirmedReports() { return confirmedReports; }
        public boolean isHasCriticalHistory() { return hasCriticalHistory; }
        public String getCriticalReason() { return criticalReason; }
        public List<String> getTopReportReasons() { return topReportReasons; }
    }

    public static class DestinationDriftDto {
        private String changeClassification;
        private boolean destinationChanged;
        private boolean domainChanged;
        private boolean redirectChainChanged;
        private String previousFinalUrl;
        private String previousFinalDomain;
        private int observationCount;

        public DestinationDriftDto(String changeClassification, boolean destinationChanged, boolean domainChanged,
                                   boolean redirectChainChanged, String previousFinalUrl, String previousFinalDomain, int observationCount) {
            this.changeClassification = changeClassification;
            this.destinationChanged = destinationChanged;
            this.domainChanged = domainChanged;
            this.redirectChainChanged = redirectChainChanged;
            this.previousFinalUrl = previousFinalUrl;
            this.previousFinalDomain = previousFinalDomain;
            this.observationCount = observationCount;
        }

        public String getChangeClassification() { return changeClassification; }
        public boolean isDestinationChanged() { return destinationChanged; }
        public boolean isDomainChanged() { return domainChanged; }
        public boolean isRedirectChainChanged() { return redirectChainChanged; }
        public String getPreviousFinalUrl() { return previousFinalUrl; }
        public String getPreviousFinalDomain() { return previousFinalDomain; }
        public int getObservationCount() { return observationCount; }
    }

    public static class AnalysisResultDto {
        private String analysisId;
        private String url;
        private String finalUrl;
        private String domain;
        private String scheme;
        private Integer port;
        private int riskScore;
        private String riskLevel;
        private List<String> indicators;
        private int redirectCount;
        private List<SafeHttpFetcher.RedirectStepDto> redirectChain;
        private boolean ssrfBlocked;
        private String qrCodeId;
        private String qrFingerprint;
        private CommunityWarningDto communityWarning;
        private DestinationDriftDto destinationDrift;
        private String createdAt;

        public AnalysisResultDto() {}

        public String getAnalysisId() { return analysisId; }
        public void setAnalysisId(String analysisId) { this.analysisId = analysisId; }
        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }
        public String getFinalUrl() { return finalUrl; }
        public void setFinalUrl(String finalUrl) { this.finalUrl = finalUrl; }
        public String getDomain() { return domain; }
        public void setDomain(String domain) { this.domain = domain; }
        public String getScheme() { return scheme; }
        public void setScheme(String scheme) { this.scheme = scheme; }
        public Integer getPort() { return port; }
        public void setPort(Integer port) { this.port = port; }
        public int getRiskScore() { return riskScore; }
        public void setRiskScore(int riskScore) { this.riskScore = riskScore; }
        public String getRiskLevel() { return riskLevel; }
        public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }
        public List<String> getIndicators() { return indicators; }
        public void setIndicators(List<String> indicators) { this.indicators = indicators; }
        public int getRedirectCount() { return redirectCount; }
        public void setRedirectCount(int redirectCount) { this.redirectCount = redirectCount; }
        public List<SafeHttpFetcher.RedirectStepDto> getRedirectChain() { return redirectChain; }
        public void setRedirectChain(List<SafeHttpFetcher.RedirectStepDto> redirectChain) { this.redirectChain = redirectChain; }
        public boolean isSsrfBlocked() { return ssrfBlocked; }
        public void setSsrfBlocked(boolean ssrfBlocked) { this.ssrfBlocked = ssrfBlocked; }
        public String getQrCodeId() { return qrCodeId; }
        public void setQrCodeId(String qrCodeId) { this.qrCodeId = qrCodeId; }
        public String getQrFingerprint() { return qrFingerprint; }
        public void setQrFingerprint(String qrFingerprint) { this.qrFingerprint = qrFingerprint; }
        public CommunityWarningDto getCommunityWarning() { return communityWarning; }
        public void setCommunityWarning(CommunityWarningDto communityWarning) { this.communityWarning = communityWarning; }
        public DestinationDriftDto getDestinationDrift() { return destinationDrift; }
        public void setDestinationDrift(DestinationDriftDto destinationDrift) { this.destinationDrift = destinationDrift; }
        public String getCreatedAt() { return createdAt; }
        public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
    }
}
