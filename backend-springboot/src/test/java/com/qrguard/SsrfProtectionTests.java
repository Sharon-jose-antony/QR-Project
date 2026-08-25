package com.qrguard;

import com.qrguard.security.ssrf.IpValidator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class SsrfProtectionTests {

    @Autowired
    private IpValidator ipValidator;

    @Test
    @DisplayName("Should block loopback IPv4 addresses (127.0.0.1, 127.8.9.1)")
    void testBlockLoopback() {
        IpValidator.IpValidationResult res1 = ipValidator.validateHostnameOrIp("127.0.0.1");
        assertFalse(res1.isSafe());
        assertEquals("SSRF_LOOPBACK_BLOCKED", res1.getBlockReason());

        IpValidator.IpValidationResult res2 = ipValidator.validateHostnameOrIp("localhost");
        assertFalse(res2.isSafe());
    }

    @Test
    @DisplayName("Should block AWS/GCP Cloud Metadata addresses (169.254.169.254, metadata.google.internal)")
    void testBlockCloudMetadata() {
        IpValidator.IpValidationResult res1 = ipValidator.validateHostnameOrIp("169.254.169.254");
        assertFalse(res1.isSafe());
        assertEquals("SSRF_LINK_LOCAL_BLOCKED", res1.getBlockReason());

        IpValidator.IpValidationResult res2 = ipValidator.validateHostnameOrIp("metadata.google.internal");
        assertFalse(res2.isSafe());
    }

    @Test
    @DisplayName("Should block RFC1918 private subnets (10.0.0.1, 192.168.1.1, 172.16.0.1)")
    void testBlockPrivateSubnets() {
        assertFalse(ipValidator.validateHostnameOrIp("10.0.0.1").isSafe());
        assertFalse(ipValidator.validateHostnameOrIp("192.168.1.1").isSafe());
        assertFalse(ipValidator.validateHostnameOrIp("172.16.0.1").isSafe());
        assertFalse(ipValidator.validateHostnameOrIp("172.31.255.255").isSafe());
    }

    @Test
    @DisplayName("Should allow public safe domains (e.g. google.com, github.com)")
    void testAllowPublicDomains() {
        assertTrue(ipValidator.validateHostnameOrIp("github.com").isSafe());
        assertTrue(ipValidator.validateHostnameOrIp("google.com").isSafe());
    }
}
