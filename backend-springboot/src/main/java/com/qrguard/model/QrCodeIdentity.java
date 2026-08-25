package com.qrguard.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "qr_code_identities")
public class QrCodeIdentity {

    @Id
    private String id = UUID.randomUUID().toString();

    @Column(unique = true, nullable = false, length = 64)
    private String fingerprint;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String rawPayload;

    @Column(nullable = false, length = 20)
    private String payloadType = "URL";

    @Column(nullable = false)
    private LocalDateTime firstSeenAt = LocalDateTime.now();

    @Column(nullable = false)
    private LocalDateTime lastSeenAt = LocalDateTime.now();

    @Column(nullable = false)
    private int scanCount = 1;

    @Column(nullable = false)
    private int reputationScore = 0;

    @Column(nullable = false, length = 30)
    private String reputationLevel = "UNKNOWN";

    @Column(nullable = false)
    private boolean hasCriticalHistory = false;

    @Column(columnDefinition = "TEXT")
    private String criticalReason;

    private LocalDateTime firstReportedAt;
    private LocalDateTime lastReportedAt;

    @Column(nullable = false)
    private int reportCount = 0;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public QrCodeIdentity() {}

    public QrCodeIdentity(String fingerprint, String rawPayload, String payloadType) {
        this.fingerprint = fingerprint;
        this.rawPayload = rawPayload;
        this.payloadType = payloadType;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getFingerprint() { return fingerprint; }
    public void setFingerprint(String fingerprint) { this.fingerprint = fingerprint; }

    public String getRawPayload() { return rawPayload; }
    public void setRawPayload(String rawPayload) { this.rawPayload = rawPayload; }

    public String getPayloadType() { return payloadType; }
    public void setPayloadType(String payloadType) { this.payloadType = payloadType; }

    public LocalDateTime getFirstSeenAt() { return firstSeenAt; }
    public void setFirstSeenAt(LocalDateTime firstSeenAt) { this.firstSeenAt = firstSeenAt; }

    public LocalDateTime getLastSeenAt() { return lastSeenAt; }
    public void setLastSeenAt(LocalDateTime lastSeenAt) { this.lastSeenAt = lastSeenAt; }

    public int getScanCount() { return scanCount; }
    public void setScanCount(int scanCount) { this.scanCount = scanCount; }

    public int getReputationScore() { return reputationScore; }
    public void setReputationScore(int reputationScore) { this.reputationScore = reputationScore; }

    public String getReputationLevel() { return reputationLevel; }
    public void setReputationLevel(String reputationLevel) { this.reputationLevel = reputationLevel; }

    public boolean isHasCriticalHistory() { return hasCriticalHistory; }
    public void setHasCriticalHistory(boolean hasCriticalHistory) { this.hasCriticalHistory = hasCriticalHistory; }

    public String getCriticalReason() { return criticalReason; }
    public void setCriticalReason(String criticalReason) { this.criticalReason = criticalReason; }

    public LocalDateTime getFirstReportedAt() { return firstReportedAt; }
    public void setFirstReportedAt(LocalDateTime firstReportedAt) { this.firstReportedAt = firstReportedAt; }

    public LocalDateTime getLastReportedAt() { return lastReportedAt; }
    public void setLastReportedAt(LocalDateTime lastReportedAt) { this.lastReportedAt = lastReportedAt; }

    public int getReportCount() { return reportCount; }
    public void setReportCount(int reportCount) { this.reportCount = reportCount; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
