package com.qrguard.service;

import com.qrguard.dto.QrDtos;
import com.qrguard.dto.UrlDtos;
import com.qrguard.model.QrCodeIdentity;
import com.qrguard.model.QrObservation;
import com.qrguard.model.QrSubmission;
import com.qrguard.repository.QrCodeIdentityRepository;
import com.qrguard.repository.QrObservationRepository;
import com.qrguard.repository.QrSubmissionRepository;
import com.qrguard.security.qr.QrDecoderService;
import com.qrguard.security.qr.QrIdentityService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class QrProcessingService {

    @Autowired
    private QrDecoderService qrDecoderService;

    @Autowired
    private QrIdentityService qrIdentityService;

    @Autowired
    private UrlAnalysisService urlAnalysisService;

    @Autowired
    private QrCodeIdentityRepository identityRepository;

    @Autowired
    private QrObservationRepository observationRepository;

    @Autowired
    private QrSubmissionRepository submissionRepository;

    public UrlDtos.AnalysisResultDto processQrImage(MultipartFile file, HttpSession session) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("No file provided");
        }

        byte[] bytes = file.getBytes();
        String decodedText = qrDecoderService.decodeQrImage(bytes);

        QrCodeIdentity identity = qrIdentityService.getOrCreateIdentity(decodedText);

        // Record submission
        String userId = session != null ? (String) session.getAttribute("userId") : null;
        QrSubmission sub = new QrSubmission();
        sub.setUserId(userId);
        sub.setQrCodeId(identity.getId());
        sub.setPayload(decodedText);
        sub.setPayloadType(identity.getPayloadType());
        submissionRepository.save(sub);

        if ("URL".equals(identity.getPayloadType())) {
            return urlAnalysisService.analyzeUrl(decodedText, identity.getId(), session);
        }

        // Non-URL QR Payload (e.g. WiFi, plain text)
        UrlDtos.AnalysisResultDto nonUrlRes = new UrlDtos.AnalysisResultDto();
        nonUrlRes.setUrl(decodedText);
        nonUrlRes.setFinalUrl(decodedText);
        nonUrlRes.setDomain("non-url");
        nonUrlRes.setScheme("text");
        nonUrlRes.setRiskScore(0);
        nonUrlRes.setRiskLevel("LOW");
        nonUrlRes.setIndicators(List.of("NON_URL_PAYLOAD_FORMAT (" + identity.getPayloadType() + ")"));
        nonUrlRes.setQrCodeId(identity.getId());
        nonUrlRes.setQrFingerprint(identity.getFingerprint());
        nonUrlRes.setCommunityWarning(new UrlDtos.CommunityWarningDto(
                "SCENARIO_F_NON_URL_PAYLOAD",
                null,
                identity.getReputationScore(),
                identity.getReputationLevel(),
                identity.getReportCount(),
                0,
                identity.isHasCriticalHistory(),
                identity.getCriticalReason(),
                List.of()
        ));
        return nonUrlRes;
    }

    public QrDtos.QrHistoryResponseData getQrHistory(String qrCodeId) {
        QrCodeIdentity identity = identityRepository.findById(qrCodeId)
                .orElseThrow(() -> new IllegalArgumentException("QR Code identity not found"));

        List<QrObservation> observations = observationRepository.findByQrCodeIdOrderByCreatedAtDesc(qrCodeId);
        List<QrDtos.QrObservationHistoryItem> historyItems = new ArrayList<>();

        for (QrObservation obs : observations) {
            historyItems.add(new QrDtos.QrObservationHistoryItem(
                    obs.getId(),
                    obs.getCreatedAt().toString(),
                    obs.getInitialUrl(),
                    obs.getFinalUrl(),
                    obs.getFinalDomain(),
                    obs.getChangeClassification(),
                    obs.getRiskScore(),
                    obs.getRiskLevel()
            ));
        }

        return new QrDtos.QrHistoryResponseData(
                identity.getId(),
                identity.getFingerprint(),
                identity.getPayloadType(),
                identity.getFirstSeenAt().toString(),
                identity.getLastSeenAt().toString(),
                identity.getScanCount(),
                identity.getReputationScore(),
                identity.getReputationLevel(),
                identity.isHasCriticalHistory(),
                identity.getCriticalReason(),
                observations.size(),
                historyItems
        );
    }
}
