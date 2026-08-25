package com.qrguard.security.ssrf;

import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.UnknownHostException;

@Component
public class IpValidator {

    public static class IpValidationResult {
        private final boolean safe;
        private final String ip;
        private final String blockReason;

        public IpValidationResult(boolean safe, String ip, String blockReason) {
            this.safe = safe;
            this.ip = ip;
            this.blockReason = blockReason;
        }

        public boolean isSafe() { return safe; }
        public String getIp() { return ip; }
        public String getBlockReason() { return blockReason; }
    }

    public IpValidationResult validateIp(InetAddress address) {
        String ipStr = address.getHostAddress();

        // 1. Loopback
        if (address.isLoopbackAddress() || ipStr.startsWith("127.")) {
            return new IpValidationResult(false, ipStr, "SSRF_LOOPBACK_BLOCKED");
        }

        // 2. Link-Local / AWS Metadata / GCP Metadata
        if (address.isLinkLocalAddress() || ipStr.equals("169.254.169.254") || ipStr.startsWith("169.254.")) {
            return new IpValidationResult(false, ipStr, "SSRF_LINK_LOCAL_BLOCKED");
        }

        // 3. Site-Local / Private RFC1918
        if (address.isSiteLocalAddress() ||
            ipStr.startsWith("10.") ||
            ipStr.startsWith("192.168.") ||
            is172Private(ipStr)) {
            return new IpValidationResult(false, ipStr, "SSRF_PRIVATE_NETWORK_BLOCKED");
        }

        // 4. Multicast / AnyLocal / Broadcast
        if (address.isMulticastAddress() || address.isAnyLocalAddress() || ipStr.startsWith("0.")) {
            return new IpValidationResult(false, ipStr, "SSRF_INVALID_NETWORK_BLOCKED");
        }

        // 5. Carrier-Grade NAT (100.64.0.0/10)
        if (isCarrierGradeNat(ipStr)) {
            return new IpValidationResult(false, ipStr, "SSRF_CARRIER_NAT_BLOCKED");
        }

        return new IpValidationResult(true, ipStr, null);
    }

    public IpValidationResult validateHostnameOrIp(String hostname) {
        if (hostname == null || hostname.trim().isEmpty()) {
            return new IpValidationResult(false, "", "INVALID_HOSTNAME");
        }

        String lowerHost = hostname.toLowerCase().trim();

        // Known metadata and loopback hostnames
        if (lowerHost.equals("localhost") ||
            lowerHost.endsWith(".localhost") ||
            lowerHost.equals("metadata.google.internal") ||
            lowerHost.equals("instance-data") ||
            lowerHost.endsWith(".local") ||
            lowerHost.endsWith(".internal")) {
            return new IpValidationResult(false, lowerHost, "SSRF_LOOPBACK_BLOCKED");
        }

        try {
            InetAddress[] addresses = InetAddress.getAllByName(hostname);
            if (addresses == null || addresses.length == 0) {
                return new IpValidationResult(false, "", "DNS_RESOLUTION_FAILED");
            }

            // Every resolved IP must be public and safe
            for (InetAddress addr : addresses) {
                IpValidationResult check = validateIp(addr);
                if (!check.isSafe()) {
                    return check;
                }
            }

            return new IpValidationResult(true, addresses[0].getHostAddress(), null);
        } catch (UnknownHostException e) {
            return new IpValidationResult(false, "", "DNS_RESOLUTION_FAILED");
        }
    }

    private boolean is172Private(String ip) {
        if (ip.startsWith("172.")) {
            String[] parts = ip.split("\\.");
            if (parts.length >= 2) {
                try {
                    int second = Integer.parseInt(parts[1]);
                    return second >= 16 && second <= 31;
                } catch (NumberFormatException ignored) {}
            }
        }
        return false;
    }

    private boolean isCarrierGradeNat(String ip) {
        if (ip.startsWith("100.")) {
            String[] parts = ip.split("\\.");
            if (parts.length >= 2) {
                try {
                    int second = Integer.parseInt(parts[1]);
                    return second >= 64 && second <= 127;
                } catch (NumberFormatException ignored) {}
            }
        }
        return false;
    }
}
