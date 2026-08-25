package com.qrguard.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "domains")
public class Domain {

    @Id
    private String id = UUID.randomUUID().toString();

    @Column(unique = true, nullable = false, length = 255)
    private String hostname;

    @Column(nullable = false)
    private LocalDateTime firstSeen = LocalDateTime.now();

    @Column(nullable = false)
    private LocalDateTime lastSeen = LocalDateTime.now();

    @Column(nullable = false)
    private int analysisCount = 0;

    @Column(nullable = false)
    private double avgRiskScore = 0.0;

    @Column(nullable = false)
    private int communityReportCount = 0;

    @Column(nullable = false, length = 20)
    private String riskLevel = "LOW";

    @Column(nullable = false)
    private boolean isKnownSuspicious = false;

    public Domain() {}

    public Domain(String hostname) {
        this.hostname = hostname;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getHostname() { return hostname; }
    public void setHostname(String hostname) { this.hostname = hostname; }

    public LocalDateTime getFirstSeen() { return firstSeen; }
    public void setFirstSeen(LocalDateTime firstSeen) { this.firstSeen = firstSeen; }

    public LocalDateTime getLastSeen() { return lastSeen; }
    public void setLastSeen(LocalDateTime lastSeen) { this.lastSeen = lastSeen; }

    public int getAnalysisCount() { return analysisCount; }
    public void setAnalysisCount(int analysisCount) { this.analysisCount = analysisCount; }

    public double getAvgRiskScore() { return avgRiskScore; }
    public void setAvgRiskScore(double avgRiskScore) { this.avgRiskScore = avgRiskScore; }

    public int getCommunityReportCount() { return communityReportCount; }
    public void setCommunityReportCount(int communityReportCount) { this.communityReportCount = communityReportCount; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

    public boolean isKnownSuspicious() { return isKnownSuspicious; }
    public void setKnownSuspicious(boolean knownSuspicious) { isKnownSuspicious = knownSuspicious; }
}
