package com.qrguard.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "qr_observations")
public class QrObservation {

    @Id
    private String id = UUID.randomUUID().toString();

    @Column(nullable = false)
    private String qrCodeId;

    private String userId;
    private String sessionRef;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String initialUrl;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String finalUrl;

    @Column(nullable = false, length = 255)
    private String finalDomain;

    @Column(columnDefinition = "TEXT")
    private String redirectChain = "[]";

    @Column(nullable = false)
    private int riskScore = 0;

    @Column(nullable = false, length = 20)
    private String riskLevel = "LOW";

    @Column(nullable = false, length = 50)
    private String changeClassification = "FIRST_OBSERVATION";

    @Column(nullable = false)
    private boolean destinationChanged = false;

    @Column(nullable = false)
    private boolean domainChanged = false;

    @Column(nullable = false)
    private boolean redirectChainChanged = false;

    private String analysisId;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public QrObservation() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getQrCodeId() { return qrCodeId; }
    public void setQrCodeId(String qrCodeId) { this.qrCodeId = qrCodeId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getSessionRef() { return sessionRef; }
    public void setSessionRef(String sessionRef) { this.sessionRef = sessionRef; }

    public String getInitialUrl() { return initialUrl; }
    public void setInitialUrl(String initialUrl) { this.initialUrl = initialUrl; }

    public String getFinalUrl() { return finalUrl; }
    public void setFinalUrl(String finalUrl) { this.finalUrl = finalUrl; }

    public String getFinalDomain() { return finalDomain; }
    public void setFinalDomain(String finalDomain) { this.finalDomain = finalDomain; }

    public String getRedirectChain() { return redirectChain; }
    public void setRedirectChain(String redirectChain) { this.redirectChain = redirectChain; }

    public int getRiskScore() { return riskScore; }
    public void setRiskScore(int riskScore) { this.riskScore = riskScore; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

    public String getChangeClassification() { return changeClassification; }
    public void setChangeClassification(String changeClassification) { this.changeClassification = changeClassification; }

    public boolean isDestinationChanged() { return destinationChanged; }
    public void setDestinationChanged(boolean destinationChanged) { this.destinationChanged = destinationChanged; }

    public boolean isDomainChanged() { return domainChanged; }
    public void setDomainChanged(boolean domainChanged) { this.domainChanged = domainChanged; }

    public boolean isRedirectChainChanged() { return redirectChainChanged; }
    public void setRedirectChainChanged(boolean redirectChainChanged) { this.redirectChainChanged = redirectChainChanged; }

    public String getAnalysisId() { return analysisId; }
    public void setAnalysisId(String analysisId) { this.analysisId = analysisId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
