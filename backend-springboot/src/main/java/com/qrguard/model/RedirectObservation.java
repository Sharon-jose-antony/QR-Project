package com.qrguard.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "redirect_observations")
public class RedirectObservation {

    @Id
    private String id = UUID.randomUUID().toString();

    @Column(nullable = false)
    private String analysisId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String fromUrl;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String toUrl;

    private String toDomain;
    private int position;
    private boolean wasBlocked = false;
    private String blockReason;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public RedirectObservation() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getAnalysisId() { return analysisId; }
    public void setAnalysisId(String analysisId) { this.analysisId = analysisId; }

    public String getFromUrl() { return fromUrl; }
    public void setFromUrl(String fromUrl) { this.fromUrl = fromUrl; }

    public String getToUrl() { return toUrl; }
    public void setToUrl(String toUrl) { this.toUrl = toUrl; }

    public String getToDomain() { return toDomain; }
    public void setToDomain(String toDomain) { this.toDomain = toDomain; }

    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }

    public boolean isWasBlocked() { return wasBlocked; }
    public void setWasBlocked(boolean wasBlocked) { this.wasBlocked = wasBlocked; }

    public String getBlockReason() { return blockReason; }
    public void setBlockReason(String blockReason) { this.blockReason = blockReason; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
