package com.qrguard.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "qr_submissions")
public class QrSubmission {

    @Id
    private String id = UUID.randomUUID().toString();

    private String userId;
    private String qrCodeId;
    private String fileUploadId;

    @Column(nullable = false, length = 20)
    private String payloadType = "URL";

    @Column(columnDefinition = "TEXT", nullable = false)
    private String payload;

    private String analysisId;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public QrSubmission() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getQrCodeId() { return qrCodeId; }
    public void setQrCodeId(String qrCodeId) { this.qrCodeId = qrCodeId; }

    public String getFileUploadId() { return fileUploadId; }
    public void setFileUploadId(String fileUploadId) { this.fileUploadId = fileUploadId; }

    public String getPayloadType() { return payloadType; }
    public void setPayloadType(String payloadType) { this.payloadType = payloadType; }

    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }

    public String getAnalysisId() { return analysisId; }
    public void setAnalysisId(String analysisId) { this.analysisId = analysisId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
