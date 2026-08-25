/**
 * QRGuard Security Tests — SSRF & Network Gateway
 * Comprehensive test coverage for SSRF protection layers.
 */

import { validateUrl } from '../../src/security/ssrf/urlValidator';
import { classifyIP, areAllIPsPublic } from '../../src/security/ssrf/ipValidator';
import { validateHostnameDNS } from '../../src/security/ssrf/dnsValidator';
import { safeFetch } from '../../src/security/ssrf/safeHttpClient';
import { checkPortPolicy, checkSchemePolicy } from '../../src/security/ssrf/networkPolicy';

describe('SSRF Protection — Scheme Validation', () => {
  const allowedSchemes = ['http://example.com', 'https://example.com', 'HTTP://EXAMPLE.COM', 'HTTPS://EXAMPLE.COM'];
  const blockedSchemes = [
    'file:///etc/passwd',
    'file:///C:/Windows/system32/cmd.exe',
    'gopher://127.0.0.1:70/',
    'ftp://attacker.com/file',
    'tftp://attacker.com/file',
    'dict://127.0.0.1:11211/stat',
    'ldap://127.0.0.1:389/o=example',
    'ssh://user@host',
    'tel:1234567890',
    'data:text/html,<script>alert(1)</script>',
    'javascript:alert(document.cookie)',
    'php://filter/read=convert.base64-encode/resource=index.php',
  ];

  it.each(allowedSchemes)('should allow standard scheme: %s', (url) => {
    const result = validateUrl(url);
    expect(result.valid).toBe(true);
    expect(['http', 'https']).toContain(result.scheme);
  });

  it.each(blockedSchemes)('should block dangerous/unsupported scheme: %s', (url) => {
    const result = validateUrl(url);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('SSRF_UNSUPPORTED_SCHEME');
  });

  it('should reject URLs with embedded credentials', () => {
    const result = validateUrl('http://admin:supersecret@example.com/dashboard');
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('URL_EMBEDDED_CREDENTIALS');
  });

  it('should reject URLs exceeding maximum length', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2100);
    const result = validateUrl(longUrl);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('URL_TOO_LONG');
  });
});

describe('SSRF Protection — IP & CIDR Classification', () => {
  const loopbackTargets = ['127.0.0.1', '127.0.0.2', '127.255.255.255', '::1', '0.0.0.0'];
  const privateIpv4Targets = [
    '10.0.0.1', '10.255.255.255',
    '172.16.0.1', '172.31.255.255',
    '192.168.0.1', '192.168.1.254',
  ];
  const linkLocalTargets = ['169.254.169.254', '169.254.1.1', 'fe80::1'];
  const cloudMetadataTargets = ['metadata.google.internal', 'metadata.azure.internal', '169.254.169.254'];
  const publicTargets = ['8.8.8.8', '1.1.1.1', '93.184.216.34', '2606:4700:4700::1111'];

  it.each(loopbackTargets)('should block loopback destination: %s', (ip) => {
    const result = classifyIP(ip);
    expect(result.isPublic).toBe(false);
  });

  it.each(privateIpv4Targets)('should block RFC1918 private destination: %s', (ip) => {
    const result = classifyIP(ip);
    expect(result.isPublic).toBe(false);
    expect(result.classification).toBe('PRIVATE');
  });

  it.each(linkLocalTargets)('should block link-local destination: %s', (ip) => {
    const result = classifyIP(ip);
    expect(result.isPublic).toBe(false);
    expect(result.classification).toBe('LINK_LOCAL');
  });

  it.each(cloudMetadataTargets)('should block cloud metadata endpoint: %s', (target) => {
    const result = classifyIP(target);
    expect(result.isPublic).toBe(false);
  });

  it.each(publicTargets)('should allow public IP: %s', (ip) => {
    const result = classifyIP(ip);
    expect(result.isPublic).toBe(true);
    expect(result.classification).toBe('PUBLIC');
  });

  it('should block IPv4-mapped IPv6 loopback [::ffff:127.0.0.1]', () => {
    const result = classifyIP('::ffff:127.0.0.1');
    expect(result.isPublic).toBe(false);
  });
});

describe('SSRF Protection — Network Policy & Ports', () => {
  it('should allow standard HTTP port 80 and HTTPS port 443', () => {
    expect(checkPortPolicy(80, 'http').allowed).toBe(true);
    expect(checkPortPolicy(443, 'https').allowed).toBe(true);
    expect(checkPortPolicy(null, 'http').allowed).toBe(true);
  });

  it('should block internal database and remote management ports', () => {
    const dangerousPorts = [21, 22, 23, 25, 3306, 5432, 6379, 27017, 8080, 8443, 8888];
    for (const port of dangerousPorts) {
      const check = checkPortPolicy(port, 'http');
      expect(check.allowed).toBe(false);
      expect(check.violationType).toBe('SSRF_NETWORK_POLICY_VIOLATION');
    }
  });
});

describe('SSRF Protection — SafeFetch End-to-End Gateway', () => {
  it('should block direct loopback URL submission via safeFetch', async () => {
    const result = await safeFetch('http://127.0.0.1:3001/api/admin/users');
    expect(result.success).toBe(false);
    expect(result.blocked).toBe(true);
    expect(result.blockEventType).toBe('SSRF_LOOPBACK_BLOCKED');
  });

  it('should block direct private IP submission via safeFetch', async () => {
    const result = await safeFetch('http://192.168.1.1/admin');
    expect(result.success).toBe(false);
    expect(result.blocked).toBe(true);
  });

  it('should block direct cloud metadata IP submission via safeFetch', async () => {
    const result = await safeFetch('http://169.254.169.254/latest/meta-data/');
    expect(result.success).toBe(false);
    expect(result.blocked).toBe(true);
  });

  it('should block unsupported schemes before making network connections', async () => {
    const result = await safeFetch('file:///etc/shadow');
    expect(result.success).toBe(false);
    expect(result.blocked).toBe(true);
    expect(result.blockEventType).toBe('SSRF_UNSUPPORTED_SCHEME');
  });
});
