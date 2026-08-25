package com.qrguard.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "url_analyses")
public class UrlAnalysis {

    @Id
    private String id = UUID.randomUUID().toString();

    private String userId;
    private String sessionRef;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String url;

    @Column(nullable = false, length = 255)
    private String domain;

    @Column(nullable = false, length = 20)
    private String scheme = "https";

    private Integer port;

    @Column(nullable = false)
    private int riskScore = 0;

    @Column(nullable = false, length = 20)
    private String riskLevel = "LOW";

    @Column(nullable = false)
    private int redirectCount = 0;

    @Column(columnDefinition = "TEXT")
    private String indicators = "[]";

    @Column(nullable = false, length = 20)
    private String status = "COMPLETED";

    @Column(columnDefinition = "TEXT")
    private String aiSummary;

    @Column(columnDefinition = "TEXT")
    private String aiRiskExplain;

    @Column(columnDefinition = "TEXT")
    private String aiRecommend;

    @Column(nullable = false)
    private boolean ssrfBlocked = false;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public UrlAnalysis() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getSessionRef() { return sessionRef; }
    public void setSessionRef(String sessionRef) { this.sessionRef = sessionRef; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

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

    public int getRedirectCount() { return redirectCount; }
    public void setRedirectCount(int redirectCount) { this.redirectCount = redirectCount; }

    public String getIndicators() { return indicators; }
    public void setIndicators(String indicators) { this.indicators = indicators; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAiSummary() { return aiSummary; }
    public void setAiSummary(String aiSummary) { this.aiSummary = aiSummary; }

    public String getAiRiskExplain() { return aiRiskExplain; }
    public void setAiRiskExplain(String aiRiskExplain) { this.aiRiskExplain = aiRiskExplain; }

    public String getAiRecommend() { return aiRecommend; }
    public void setAiRecommend(String aiRecommend) { this.aiRecommend = aiRecommend; }

    public boolean isSsrfBlocked() { return ssrfBlocked; }
    public void setSsrfBlocked(boolean ssrfBlocked) { this.ssrfBlocked = ssrfBlocked; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
