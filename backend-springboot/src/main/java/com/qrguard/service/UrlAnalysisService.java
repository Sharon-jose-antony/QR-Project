package com.qrguard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qrguard.dto.UrlDtos;
import com.qrguard.model.*;
import com.qrguard.repository.*;
import com.qrguard.security.qr.DestinationDriftService;
import com.qrguard.security.qr.QrIdentityService;
import com.qrguard.security.qr.QrReputationEngine;
import com.qrguard.security.risk.RiskEngine;
import com.qrguard.security.ssrf.SafeHttpFetcher;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class UrlAnalysisService {

    @Autowired
    private SafeHttpFetcher httpFetcher;

    @Autowired
    private RiskEngine riskEngine;

    @Autowired
    private QrIdentityService qrIdentityService;

    @Autowired
    private DestinationDriftService destinationDriftService;

    @Autowired
    private QrReputationEngine qrReputationEngine;

    @Autowired
    private UrlAnalysisRepository analysisRepository;

    @Autowired
    private DomainRepository domainRepository;

    @Autowired
    private QrObservationRepository observationRepository;

    @Autowired
    private RedirectObservationRepository redirectRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public UrlDtos.AnalysisResultDto analyzeUrl(String inputUrl, String explicitQrCodeId, HttpSession session) {
        if (inputUrl == null || inputUrl.trim().isEmpty()) {
            throw new IllegalArgumentException("URL cannot be empty");
        }

        String targetUrl = inputUrl.trim();
        if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
            targetUrl = "https://" + targetUrl;
        }

        String userId = session != null ? (String) session.getAttribute("userId") : null;

        // 1. Fetch & Trace Redirects with pre-socket SSRF protection
        SafeHttpFetcher.FetchResult fetch = httpFetcher.safeFetch(targetUrl);

        // 2. Evaluate Technical Risk Score
        RiskEngine.RiskEvaluation risk = riskEngine.evaluate(
                fetch.getFinalUrl(),
                fetch.getRedirectChain().size(),
                fetch.isBlocked(),
                fetch.getBlockReason()
        );

        // 3. Resolve / Create QR Code Identity if applicable
        QrCodeIdentity qrIdentity = qrIdentityService.getOrCreateIdentity(targetUrl);

        // 4. Evaluate Destination Drift
        DestinationDriftService.DriftResult drift = destinationDriftService.evaluateDrift(
                qrIdentity.getId(),
                fetch.getFinalUrl(),
                toJsonSafe(fetch.getRedirectChain())
        );

        // 5. Evaluate Community Reputation & Scenarios A through G
        QrReputationEngine.ReputationEvaluation rep = qrReputationEngine.evaluateReputation(
                qrIdentity,
                risk.getScore(),
                drift
        );

        // 6. Persist Domain Record
        String domainStr = extractHostname(fetch.getFinalUrl());
        upsertDomain(domainStr, risk.getScore(), risk.getLevel());

        // 7. Persist URL Analysis Record
        UrlAnalysis analysis = new UrlAnalysis();
        analysis.setUserId(userId);
        analysis.setUrl(targetUrl);
        analysis.setDomain(domainStr);
        analysis.setScheme(extractScheme(fetch.getFinalUrl()));
        analysis.setRiskScore(risk.getScore());
        analysis.setRiskLevel(risk.getLevel());
        analysis.setRedirectCount(fetch.getRedirectChain().size());
        analysis.setIndicators(toJsonSafe(risk.getIndicators()));
        analysis.setSsrfBlocked(fetch.isBlocked());
        analysis = analysisRepository.save(analysis);

        // 8. Persist QR Observation Record
        QrObservation observation = new QrObservation();
        observation.setQrCodeId(qrIdentity.getId());
        observation.setUserId(userId);
        observation.setInitialUrl(targetUrl);
        observation.setFinalUrl(fetch.getFinalUrl());
        observation.setFinalDomain(domainStr);
        observation.setRedirectChain(toJsonSafe(fetch.getRedirectChain()));
        observation.setRiskScore(risk.getScore());
        observation.setRiskLevel(risk.getLevel());
        observation.setChangeClassification(drift.getChangeClassification());
        observation.setDestinationChanged(drift.isDestinationChanged());
        observation.setDomainChanged(drift.isDomainChanged());
        observation.setRedirectChainChanged(drift.isRedirectChainChanged());
        observation.setAnalysisId(analysis.getId());
        observationRepository.save(observation);

        // 9. Persist Redirect Steps
        for (int i = 0; i < fetch.getRedirectChain().size(); i++) {
            SafeHttpFetcher.RedirectStepDto step = fetch.getRedirectChain().get(i);
            RedirectObservation red = new RedirectObservation();
            red.setAnalysisId(analysis.getId());
            red.setFromUrl(step.getFrom());
            red.setToUrl(step.getTo());
            red.setToDomain(extractHostname(step.getTo()));
            red.setPosition(i + 1);
            red.setWasBlocked(step.isBlocked());
            red.setBlockReason(step.getBlockReason());
            redirectRepository.save(red);
        }

        // Build Full Output DTO
        UrlDtos.AnalysisResultDto result = new UrlDtos.AnalysisResultDto();
        result.setAnalysisId(analysis.getId());
        result.setUrl(targetUrl);
        result.setFinalUrl(fetch.getFinalUrl());
        result.setDomain(domainStr);
        result.setScheme(analysis.getScheme());
        result.setRiskScore(risk.getScore());
        result.setRiskLevel(risk.getLevel());
        result.setIndicators(risk.getIndicators());
        result.setRedirectCount(fetch.getRedirectChain().size());
        result.setRedirectChain(fetch.getRedirectChain());
        result.setSsrfBlocked(fetch.isBlocked());
        result.setQrCodeId(qrIdentity.getId());
        result.setQrFingerprint(qrIdentity.getFingerprint());
        result.setCreatedAt(analysis.getCreatedAt().toString());

        result.setCommunityWarning(new UrlDtos.CommunityWarningDto(
                rep.getScenario(),
                rep.getWarningMessage(),
                rep.getReputationScore(),
                rep.getReputationLevel(),
                rep.getTotalReports(),
                rep.getConfirmedReports(),
                rep.isHasCriticalHistory(),
                rep.getCriticalReason(),
                rep.getTopReportReasons()
        ));

        result.setDestinationDrift(new UrlDtos.DestinationDriftDto(
                drift.getChangeClassification(),
                drift.isDestinationChanged(),
                drift.isDomainChanged(),
                drift.isRedirectChainChanged(),
                drift.getPreviousFinalUrl(),
                drift.getPreviousFinalDomain(),
                drift.getObservationCount()
        ));

        return result;
    }

    private void upsertDomain(String hostname, int riskScore, String riskLevel) {
        if (hostname == null || hostname.isEmpty()) return;
        Optional<Domain> domOpt = domainRepository.findByHostname(hostname);
        if (domOpt.isPresent()) {
            Domain dom = domOpt.get();
            dom.setAnalysisCount(dom.getAnalysisCount() + 1);
            dom.setLastSeen(LocalDateTime.now());
            dom.setRiskLevel(riskLevel);
            domainRepository.save(dom);
        } else {
            Domain dom = new Domain(hostname);
            dom.setAnalysisCount(1);
            dom.setRiskLevel(riskLevel);
            dom.setAvgRiskScore(riskScore);
            domainRepository.save(dom);
        }
    }

    private String extractHostname(String urlStr) {
        try {
            URI uri = new URI(urlStr);
            return uri.getHost() != null ? uri.getHost().toLowerCase() : "unknown";
        } catch (Exception e) {
            return "unknown";
        }
    }

    private String extractScheme(String urlStr) {
        try {
            URI uri = new URI(urlStr);
            return uri.getScheme() != null ? uri.getScheme().toLowerCase() : "https";
        } catch (Exception e) {
            return "https";
        }
    }

    private String toJsonSafe(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "[]";
        }
    }
}
