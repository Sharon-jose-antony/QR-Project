package com.qrguard.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;

public class CommunityDtos {

    public static class CreateReportRequest {
        @NotBlank(message = "Target URL is required")
        private String targetUrl;

        @NotBlank(message = "Category is required")
        private String category; // PHISHING, QUISHING, MALWARE, SCAM, INAPPROPRIATE

        private String description;
        private String qrCodeId;

        public String getTargetUrl() { return targetUrl; }
        public void setTargetUrl(String targetUrl) { this.targetUrl = targetUrl; }
        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getQrCodeId() { return qrCodeId; }
        public void setQrCodeId(String qrCodeId) { this.qrCodeId = qrCodeId; }
    }

    public static class CommunityFeedItem {
        private String id;
        private String targetUrl;
        private String targetDomain;
        private String category;
        private String description;
        private String status;
        private String reporterUsername;
        private String createdAt;

        public CommunityFeedItem(String id, String targetUrl, String targetDomain, String category,
                                 String description, String status, String reporterUsername, String createdAt) {
            this.id = id;
            this.targetUrl = targetUrl;
            this.targetDomain = targetDomain;
            this.category = category;
            this.description = description;
            this.status = status;
            this.reporterUsername = reporterUsername;
            this.createdAt = createdAt;
        }

        public String getId() { return id; }
        public String getTargetUrl() { return targetUrl; }
        public String getTargetDomain() { return targetDomain; }
        public String getCategory() { return category; }
        public String getDescription() { return description; }
        public String getStatus() { return status; }
        public String getReporterUsername() { return reporterUsername; }
        public String getCreatedAt() { return createdAt; }
    }

    public static class CommunityIntelResponseData {
        private long totalReports;
        private long activeThreatDomains;
        private Map<String, Long> categoryBreakdown;
        private List<CommunityFeedItem> recentReports;

        public CommunityIntelResponseData(long totalReports, long activeThreatDomains,
                                          Map<String, Long> categoryBreakdown, List<CommunityFeedItem> recentReports) {
            this.totalReports = totalReports;
            this.activeThreatDomains = activeThreatDomains;
            this.categoryBreakdown = categoryBreakdown;
            this.recentReports = recentReports;
        }

        public long getTotalReports() { return totalReports; }
        public long getActiveThreatDomains() { return activeThreatDomains; }
        public Map<String, Long> getCategoryBreakdown() { return categoryBreakdown; }
        public List<CommunityFeedItem> getRecentReports() { return recentReports; }
    }
}
