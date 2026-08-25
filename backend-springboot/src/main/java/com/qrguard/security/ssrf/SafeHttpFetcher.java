package com.qrguard.security.ssrf;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

@Component
public class SafeHttpFetcher {

    @Autowired
    private IpValidator ipValidator;

    private static final int MAX_HOPS = 5;
    private static final int TIMEOUT_MS = 10000;
    private static final int MAX_BODY_BYTES = 1024 * 1024; // 1MB

    public static class RedirectStepDto {
        private String from;
        private String to;
        private int statusCode;
        private boolean blocked;
        private String blockReason;

        public RedirectStepDto(String from, String to, int statusCode, boolean blocked, String blockReason) {
            this.from = from;
            this.to = to;
            this.statusCode = statusCode;
            this.blocked = blocked;
            this.blockReason = blockReason;
        }

        public String getFrom() { return from; }
        public String getTo() { return to; }
        public int getStatusCode() { return statusCode; }
        public boolean isBlocked() { return blocked; }
        public String getBlockReason() { return blockReason; }
    }

    public static class FetchResult {
        private final String initialUrl;
        private final String finalUrl;
        private final int statusCode;
        private final List<RedirectStepDto> redirectChain;
        private final boolean blocked;
        private final String blockReason;
        private final List<String> resolvedIps;
        private final String contentType;
        private final long contentLength;

        public FetchResult(String initialUrl, String finalUrl, int statusCode, List<RedirectStepDto> redirectChain,
                           boolean blocked, String blockReason, List<String> resolvedIps, String contentType, long contentLength) {
            this.initialUrl = initialUrl;
            this.finalUrl = finalUrl;
            this.statusCode = statusCode;
            this.redirectChain = redirectChain;
            this.blocked = blocked;
            this.blockReason = blockReason;
            this.resolvedIps = resolvedIps;
            this.contentType = contentType;
            this.contentLength = contentLength;
        }

        public String getInitialUrl() { return initialUrl; }
        public String getFinalUrl() { return finalUrl; }
        public int getStatusCode() { return statusCode; }
        public List<RedirectStepDto> getRedirectChain() { return redirectChain; }
        public boolean isBlocked() { return blocked; }
        public String getBlockReason() { return blockReason; }
        public List<String> getResolvedIps() { return resolvedIps; }
        public String getContentType() { return contentType; }
        public long getContentLength() { return contentLength; }
    }

    public FetchResult safeFetch(String initialUrl) {
        String currentUrl = initialUrl;
        List<RedirectStepDto> chain = new ArrayList<>();
        List<String> resolvedIps = new ArrayList<>();

        for (int hop = 0; hop < MAX_HOPS; hop++) {
            URI uri;
            try {
                uri = new URI(currentUrl);
            } catch (Exception e) {
                return new FetchResult(initialUrl, currentUrl, 400, chain, true, "MALFORMED_URL", resolvedIps, null, 0);
            }

            String scheme = uri.getScheme();
            if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))) {
                return new FetchResult(initialUrl, currentUrl, 400, chain, true, "DISALLOWED_SCHEME", resolvedIps, null, 0);
            }

            String host = uri.getHost();
            if (host == null) {
                return new FetchResult(initialUrl, currentUrl, 400, chain, true, "MISSING_HOSTNAME", resolvedIps, null, 0);
            }

            // Pre-socket DNS Validation & SSRF Check
            IpValidator.IpValidationResult ipCheck = ipValidator.validateHostnameOrIp(host);
            if (!ipCheck.isSafe()) {
                chain.add(new RedirectStepDto(currentUrl, currentUrl, 0, true, ipCheck.getBlockReason()));
                return new FetchResult(initialUrl, currentUrl, 403, chain, true, ipCheck.getBlockReason(), resolvedIps, null, 0);
            }
            resolvedIps.add(ipCheck.getIp());

            HttpURLConnection conn = null;
            try {
                URL url = uri.toURL();
                conn = (HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(TIMEOUT_MS);
                conn.setReadTimeout(TIMEOUT_MS);
                conn.setInstanceFollowRedirects(false); // Manual hop tracing
                conn.setRequestMethod("GET");
                conn.setRequestProperty("User-Agent", "QRGuard-Security-Gateway/1.0 (+https://qrguard-eta.vercel.app)");
                conn.setRequestProperty("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");

                int statusCode = conn.getResponseCode();

                // Check for HTTP redirects (301, 302, 303, 307, 308)
                if (statusCode >= 300 && statusCode < 400) {
                    String location = conn.getHeaderField("Location");
                    if (location == null || location.isEmpty()) {
                        return new FetchResult(initialUrl, currentUrl, statusCode, chain, false, null, resolvedIps, conn.getContentType(), 0);
                    }

                    // Resolve relative redirect locations
                    URI targetUri = uri.resolve(location);
                    String nextUrl = targetUri.toString();

                    chain.add(new RedirectStepDto(currentUrl, nextUrl, statusCode, false, null));
                    currentUrl = nextUrl;
                    continue;
                }

                // Final destination reached
                long bytesRead = 0;
                try (InputStream in = conn.getInputStream()) {
                    byte[] buffer = new byte[8192];
                    int read;
                    while ((read = in.read(buffer)) != -1) {
                        bytesRead += read;
                        if (bytesRead > MAX_BODY_BYTES) {
                            break; // Enforce bounded memory quota
                        }
                    }
                } catch (Exception ignored) {}

                return new FetchResult(
                        initialUrl,
                        currentUrl,
                        statusCode,
                        chain,
                        false,
                        null,
                        resolvedIps,
                        conn.getContentType(),
                        bytesRead
                );
            } catch (Exception e) {
                return new FetchResult(initialUrl, currentUrl, 502, chain, false, "FETCH_ERROR: " + e.getMessage(), resolvedIps, null, 0);
            } finally {
                if (conn != null) {
                    try { conn.disconnect(); } catch (Exception ignored) {}
                }
            }
        }

        return new FetchResult(initialUrl, currentUrl, 310, chain, true, "TOO_MANY_REDIRECTS", resolvedIps, null, 0);
    }
}
