package com.qrguard.security.qr;

import com.qrguard.model.QrCodeIdentity;
import com.qrguard.repository.QrCodeIdentityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class QrIdentityService {

    @Autowired
    private QrCodeIdentityRepository identityRepository;

    public static class FingerprintResult {
        private final String fingerprint;
        private final String canonicalPayload;
        private final String payloadType;

        public FingerprintResult(String fingerprint, String canonicalPayload, String payloadType) {
            this.fingerprint = fingerprint;
            this.canonicalPayload = canonicalPayload;
            this.payloadType = payloadType;
        }

        public String getFingerprint() { return fingerprint; }
        public String getCanonicalPayload() { return canonicalPayload; }
        public String getPayloadType() { return payloadType; }
    }

    public FingerprintResult generateFingerprint(String rawPayload) {
        if (rawPayload == null || rawPayload.trim().isEmpty()) {
            throw new IllegalArgumentException("QR payload cannot be empty");
        }

        String trimmed = rawPayload.trim();
        String payloadType = detectPayloadType(trimmed);
        String canonicalPayload = canonicalizePayload(trimmed, payloadType);
        String fingerprint = sha256Hex(canonicalPayload);

        return new FingerprintResult(fingerprint, canonicalPayload, payloadType);
    }

    public QrCodeIdentity getOrCreateIdentity(String rawPayload) {
        FingerprintResult fpResult = generateFingerprint(rawPayload);

        Optional<QrCodeIdentity> existingOpt = identityRepository.findByFingerprint(fpResult.getFingerprint());
        if (existingOpt.isPresent()) {
            QrCodeIdentity identity = existingOpt.get();
            identity.setScanCount(identity.getScanCount() + 1);
            identity.setLastSeenAt(LocalDateTime.now());
            return identityRepository.save(identity);
        }

        QrCodeIdentity newIdentity = new QrCodeIdentity(
                fpResult.getFingerprint(),
                rawPayload,
                fpResult.getPayloadType()
        );
        newIdentity.setFirstSeenAt(LocalDateTime.now());
        newIdentity.setLastSeenAt(LocalDateTime.now());
        newIdentity.setScanCount(1);
        newIdentity.setReputationScore(0);
        newIdentity.setReputationLevel("UNKNOWN");

        return identityRepository.save(newIdentity);
    }

    public String canonicalizePayload(String raw, String payloadType) {
        if (!"URL".equals(payloadType)) {
            return raw.trim();
        }

        try {
            URI uri = new URI(raw.trim());
            String scheme = uri.getScheme() != null ? uri.getScheme().toLowerCase() : "http";
            String host = uri.getHost() != null ? uri.getHost().toLowerCase() : "";
            int port = uri.getPort();
            String path = uri.getPath() != null ? uri.getPath() : "";

            // Normalize path: strip trailing slash if not root
            if (path.length() > 1 && path.endsWith("/")) {
                path = path.substring(0, path.length() - 1);
            }
            if (path.isEmpty()) {
                path = "/";
            }

            // Normalize and sort query parameters
            String query = uri.getRawQuery();
            String canonicalQuery = "";
            if (query != null && !query.isEmpty()) {
                String[] pairs = query.split("&");
                Map<String, String> paramMap = new TreeMap<>();
                for (String pair : pairs) {
                    String[] kv = pair.split("=", 2);
                    String key = URLDecoder.decode(kv[0], StandardCharsets.UTF_8);
                    String val = kv.length > 1 ? URLDecoder.decode(kv[1], StandardCharsets.UTF_8) : "";
                    paramMap.put(key, val);
                }

                StringBuilder sb = new StringBuilder();
                for (Map.Entry<String, String> entry : paramMap.entrySet()) {
                    if (sb.length() > 0) sb.append("&");
                    sb.append(URLEncoder.encode(entry.getKey(), StandardCharsets.UTF_8))
                      .append("=")
                      .append(URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8));
                }
                canonicalQuery = "?" + sb.toString();
            }

            String portStr = (port != -1 && port != 80 && port != 443) ? (":" + port) : "";
            return scheme + "://" + host + portStr + path + canonicalQuery;
        } catch (Exception e) {
            return raw.trim();
        }
    }

    private String detectPayloadType(String raw) {
        String lower = raw.toLowerCase();
        if (lower.startsWith("http://") || lower.startsWith("https://")) return "URL";
        if (lower.startsWith("wifi:")) return "WIFI";
        if (lower.startsWith("mailto:")) return "EMAIL";
        if (lower.startsWith("tel:")) return "PHONE";
        if (lower.startsWith("smsto:")) return "SMS";
        if (lower.startsWith("upi://")) return "PAYMENT";
        return "TEXT";
    }

    private String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not supported", e);
        }
    }
}
