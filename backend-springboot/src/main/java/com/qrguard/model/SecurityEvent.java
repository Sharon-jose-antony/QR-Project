package com.qrguard.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "security_events")
public class SecurityEvent {

    @Id
    private String id = UUID.randomUUID().toString();

    @Column(nullable = false, length = 50)
    private String type; // SSRF_BLOCKED, CSRF_ATTEMPT, IDOR_ATTEMPT, RATE_LIMIT_EXCEEDED

    @Column(nullable = false, length = 20)
    private String severity = "MEDIUM"; // LOW | MEDIUM | HIGH | CRITICAL

    private String userId;
    private String sessionRef;
    private String endpoint;
    private String method;
    private String safeTarget;

    @Column(nullable = false, length = 20)
    private String action = "BLOCKED"; // BLOCKED | WARNED | ALLOWED | FLAGGED

    private int riskContrib = 0;

    @Column(columnDefinition = "TEXT")
    private String metadata;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public SecurityEvent() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getSessionRef() { return sessionRef; }
    public void setSessionRef(String sessionRef) { this.sessionRef = sessionRef; }

    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }

    public String getSafeTarget() { return safeTarget; }
    public void setSafeTarget(String safeTarget) { this.safeTarget = safeTarget; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public int getRiskContrib() { return riskContrib; }
    public void setRiskContrib(int riskContrib) { this.riskContrib = riskContrib; }

    public String getMetadata() { return metadata; }
    public void setMetadata(String metadata) { this.metadata = metadata; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
