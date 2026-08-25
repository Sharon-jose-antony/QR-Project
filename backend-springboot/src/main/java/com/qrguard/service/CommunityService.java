package com.qrguard.service;

import com.qrguard.dto.CommunityDtos;
import com.qrguard.model.CommunityReport;
import com.qrguard.model.Domain;
import com.qrguard.model.QrCodeIdentity;
import com.qrguard.model.User;
import com.qrguard.repository.CommunityReportRepository;
import com.qrguard.repository.DomainRepository;
import com.qrguard.repository.QrCodeIdentityRepository;
import com.qrguard.repository.UserRepository;
import com.qrguard.security.qr.QrIdentityService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class CommunityService {

    @Autowired
    private CommunityReportRepository reportRepository;

    @Autowired
    private DomainRepository domainRepository;

    @Autowired
    private QrCodeIdentityRepository identityRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private QrIdentityService qrIdentityService;

    public CommunityDtos.CommunityFeedItem createReport(CommunityDtos.CreateReportRequest req, HttpSession session) {
        String userId = session != null ? (String) session.getAttribute("userId") : null;
        if (userId == null) {
            userId = "anonymous";
        }

        String targetUrl = req.getTargetUrl().trim();
        String domainStr = extractDomain(targetUrl);

        // Deduplication: prevent duplicate reports from the same user for the same URL within 24h
        LocalDateTime yesterday = LocalDateTime.now().minusHours(24);
        Optional<CommunityReport> recentDup = reportRepository.findFirstByUserIdAndTargetUrlAndCreatedAtGreaterThan(userId, targetUrl, yesterday);
        if (recentDup.isPresent()) {
            throw new IllegalArgumentException("You have already submitted a report for this target in the last 24 hours");
        }

        // Link Domain
        Optional<Domain> domOpt = domainRepository.findByHostname(domainStr);
        Domain domain;
        if (domOpt.isPresent()) {
            domain = domOpt.get();
            domain.setCommunityReportCount(domain.getCommunityReportCount() + 1);
            domainRepository.save(domain);
        } else {
            domain = new Domain(domainStr);
            domain.setCommunityReportCount(1);
            domain = domainRepository.save(domain);
        }

        // Link QR Identity
        QrCodeIdentity qrIdentity = null;
        if (req.getQrCodeId() != null && !req.getQrCodeId().isEmpty()) {
            qrIdentity = identityRepository.findById(req.getQrCodeId()).orElse(null);
        }
        if (qrIdentity == null) {
            qrIdentity = qrIdentityService.getOrCreateIdentity(targetUrl);
        }

        CommunityReport report = new CommunityReport();
        report.setUserId(userId);
        report.setDomainId(domain.getId());
        report.setQrCodeId(qrIdentity.getId());
        report.setTargetUrl(targetUrl);
        report.setTargetDomain(domainStr);
        report.setCategory(req.getCategory().toUpperCase());
        report.setDescription(req.getDescription());
        report.setStatus("PENDING");
        report = reportRepository.save(report);

        // Update QR identity report counters
        qrIdentity.setReportCount(qrIdentity.getReportCount() + 1);
        if (qrIdentity.getFirstReportedAt() == null) {
            qrIdentity.setFirstReportedAt(LocalDateTime.now());
        }
        qrIdentity.setLastReportedAt(LocalDateTime.now());
        identityRepository.save(qrIdentity);

        String username = "Anonymous";
        if (!"anonymous".equals(userId)) {
            Optional<User> u = userRepository.findById(userId);
            if (u.isPresent()) username = u.get().getUsername();
        }

        return new CommunityDtos.CommunityFeedItem(
                report.getId(),
                report.getTargetUrl(),
                report.getTargetDomain(),
                report.getCategory(),
                report.getDescription(),
                report.getStatus(),
                username,
                report.getCreatedAt().toString()
        );
    }

    public CommunityDtos.CommunityIntelResponseData getCommunityIntel() {
        long totalReports = reportRepository.count();
        long activeThreatDomains = domainRepository.findByCommunityReportCountGreaterThanOrderByCommunityReportCountDesc(0).size();

        Map<String, Long> categoryMap = new HashMap<>();
        List<Object[]> rows = reportRepository.getCategoryCounts();
        for (Object[] row : rows) {
            categoryMap.put((String) row[0], (Long) row[1]);
        }

        List<CommunityReport> recents = reportRepository.findTop10ByOrderByCreatedAtDesc();
        List<CommunityDtos.CommunityFeedItem> items = new ArrayList<>();

        for (CommunityReport r : recents) {
            String username = "Community Member";
            if (r.getUserId() != null && !r.getUserId().equals("anonymous")) {
                userRepository.findById(r.getUserId()).ifPresent(u -> {});
            }
            items.add(new CommunityDtos.CommunityFeedItem(
                    r.getId(),
                    r.getTargetUrl(),
                    r.getTargetDomain(),
                    r.getCategory(),
                    r.getDescription(),
                    r.getStatus(),
                    username,
                    r.getCreatedAt().toString()
            ));
        }

        return new CommunityDtos.CommunityIntelResponseData(totalReports, activeThreatDomains, categoryMap, items);
    }

    private String extractDomain(String urlStr) {
        try {
            URI uri = new URI(urlStr);
            return uri.getHost() != null ? uri.getHost().toLowerCase() : "unknown";
        } catch (Exception e) {
            return "unknown";
        }
    }
}
