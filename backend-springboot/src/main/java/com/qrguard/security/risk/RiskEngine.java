package com.qrguard.security.risk;

import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.*;

@Component
public class RiskEngine {

    private static final Set<String> HIGH_RISK_TLDS = Set.of(
            "zip", "mov", "top", "xyz", "work", "click", "gq", "cf", "tk", "ml", "ga", "buzz", "fit", "country", "kim", "science"
    );

    private static final Set<String> TARGETED_BRANDS = Set.of(
            "paypal", "google", "microsoft", "apple", "netflix", "amazon", "chase", "bankofamerica",
            "wellsfargo", "binance", "coinbase", "metamask", "whatsapp", "instagram", "facebook", "twitter"
    );

    private static final Set<String> SUSPICIOUS_KEYWORDS = Set.of(
            "secure", "verify", "login", "signin", "account", "update", "support", "billing", "authenticate",
            "recover", "wallet", "kyc", "alert", "suspended", "free", "gift", "crypto", "reward"
    );

    public static class RiskEvaluation {
        private final int score;
        private final String level; // LOW | MEDIUM | HIGH | CRITICAL
        private final List<String> indicators;
        private final boolean containsBrandImpersonation;
        private final String targetedBrand;

        public RiskEvaluation(int score, String level, List<String> indicators, boolean containsBrandImpersonation, String targetedBrand) {
            this.score = score;
            this.level = level;
            this.indicators = indicators;
            this.containsBrandImpersonation = containsBrandImpersonation;
            this.targetedBrand = targetedBrand;
        }

        public int getScore() { return score; }
        public String getLevel() { return level; }
        public List<String> getIndicators() { return indicators; }
        public boolean isContainsBrandImpersonation() { return containsBrandImpersonation; }
        public String getTargetedBrand() { return targetedBrand; }
    }

    public RiskEvaluation evaluate(String urlStr, int redirectCount, boolean ssrfBlocked, String ssrfReason) {
        int score = 0;
        List<String> indicators = new ArrayList<>();
        boolean brandImpersonation = false;
        String targetedBrandName = null;

        if (ssrfBlocked) {
            score = 100;
            indicators.add("CRITICAL_SSRF_ATTEMPT: " + (ssrfReason != null ? ssrfReason : "Blocked internal network access"));
            return new RiskEvaluation(score, "CRITICAL", indicators, false, null);
        }

        URI uri;
        try {
            uri = new URI(urlStr);
        } catch (Exception e) {
            score = 75;
            indicators.add("MALFORMED_URL_SYNTAX");
            return new RiskEvaluation(score, "HIGH", indicators, false, null);
        }

        String scheme = uri.getScheme() != null ? uri.getScheme().toLowerCase() : "";
        String host = uri.getHost() != null ? uri.getHost().toLowerCase() : "";
        String path = uri.getPath() != null ? uri.getPath().toLowerCase() : "";
        String rawUserInfo = uri.getRawUserInfo();

        // 1. Unencrypted HTTP Scheme
        if ("http".equals(scheme)) {
            score += 15;
            indicators.add("UNENCRYPTED_HTTP_TRANSPORT");
        }

        // 2. Embedded Credentials in URL (RFC3986 userinfo trick)
        if (rawUserInfo != null && !rawUserInfo.isEmpty()) {
            score += 35;
            indicators.add("EMBEDDED_CREDENTIALS_IN_AUTHORITY");
        }

        // 3. Excessive Redirects
        if (redirectCount >= 3) {
            score += 20;
            indicators.add("EXCESSIVE_REDIRECT_CHAIN (" + redirectCount + " hops)");
        } else if (redirectCount > 0) {
            score += 5 * redirectCount;
            indicators.add("REDIRECT_HOP_DETECTED (" + redirectCount + " hops)");
        }

        // 4. High Risk TLD Detection
        String[] hostParts = host.split("\\.");
        if (hostParts.length > 0) {
            String tld = hostParts[hostParts.length - 1];
            if (HIGH_RISK_TLDS.contains(tld)) {
                score += 25;
                indicators.add("HIGH_RISK_ABUSED_TLD (." + tld + ")");
            }
        }

        // 5. Brand Impersonation & Subdomain Spoofing
        for (String brand : TARGETED_BRANDS) {
            if (host.contains(brand)) {
                // If the host is not the legitimate root domain
                if (!host.equals(brand + ".com") && !host.endsWith("." + brand + ".com") &&
                    !host.equals(brand + ".org") && !host.endsWith("." + brand + ".org")) {
                    score += 40;
                    brandImpersonation = true;
                    targetedBrandName = brand;
                    indicators.add("BRAND_IMPERSONATION_TARGET: " + brand.toUpperCase());
                }
            }
        }

        // 6. Suspicious Phishing & Quishing Keywords
        int matchedKeywords = 0;
        for (String kw : SUSPICIOUS_KEYWORDS) {
            if (host.contains(kw) || path.contains(kw)) {
                matchedKeywords++;
            }
        }
        if (matchedKeywords >= 2) {
            score += 25;
            indicators.add("MULTIPLE_DECEPTIVE_PHISHING_KEYWORDS_FOUND");
        } else if (matchedKeywords == 1) {
            score += 10;
            indicators.add("DECEPTIVE_KEYWORD_IN_URL");
        }

        // 7. Non-standard Port
        int port = uri.getPort();
        if (port != -1 && port != 80 && port != 443 && port != 8080) {
            score += 20;
            indicators.add("NON_STANDARD_PORT (" + port + ")");
        }

        // 8. Excessive URL length
        if (urlStr.length() > 255) {
            score += 15;
            indicators.add("EXCESSIVE_URL_LENGTH (" + urlStr.length() + " chars)");
        }

        // Calculate final score bounded between 0 and 100
        int finalScore = Math.min(100, Math.max(0, score));

        String level;
        if (finalScore >= 80) level = "CRITICAL";
        else if (finalScore >= 60) level = "HIGH";
        else if (finalScore >= 30) level = "MEDIUM";
        else level = "LOW";

        return new RiskEvaluation(finalScore, level, indicators, brandImpersonation, targetedBrandName);
    }
}
