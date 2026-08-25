/**
 * QRGuard Security Tests — URL Validator
 */

import { validateUrl } from '../../src/security/ssrf/urlValidator';

describe('URL Validator — Scheme allowlist', () => {
  it('should accept https://', () => {
    const result = validateUrl('https://example.com');
    expect(result.valid).toBe(true);
    expect(result.scheme).toBe('https');
  });

  it('should accept http://', () => {
    const result = validateUrl('http://example.com');
    expect(result.valid).toBe(true);
    expect(result.scheme).toBe('http');
  });

  it('should reject file://', () => {
    const result = validateUrl('file:///etc/passwd');
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('SSRF_UNSUPPORTED_SCHEME');
  });

  it('should reject gopher://', () => {
    const result = validateUrl('gopher://localhost');
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('SSRF_UNSUPPORTED_SCHEME');
  });

  it('should reject javascript:', () => {
    const result = validateUrl('javascript:alert(1)');
    expect(result.valid).toBe(false);
  });

  it('should reject data: URIs', () => {
    const result = validateUrl('data:text/html,<h1>test</h1>');
    expect(result.valid).toBe(false);
  });

  it('should reject ftp://', () => {
    const result = validateUrl('ftp://example.com');
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('SSRF_UNSUPPORTED_SCHEME');
  });

  it('should reject ldap://', () => {
    const result = validateUrl('ldap://localhost');
    expect(result.valid).toBe(false);
  });
});

describe('URL Validator — Input handling', () => {
  it('should reject empty URL', () => {
    const result = validateUrl('');
    expect(result.valid).toBe(false);
  });

  it('should reject URL exceeding max length', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(3000);
    const result = validateUrl(longUrl);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('URL_TOO_LONG');
  });

  it('should reject URLs with embedded credentials', () => {
    const result = validateUrl('https://user:pass@example.com');
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('URL_EMBEDDED_CREDENTIALS');
  });

  it('should normalize scheme to lowercase', () => {
    const result = validateUrl('HTTPS://example.com');
    expect(result.valid).toBe(true);
    expect(result.scheme).toBe('https');
  });

  it('should extract hostname correctly', () => {
    const result = validateUrl('https://www.example.com/path?q=1');
    expect(result.valid).toBe(true);
    expect(result.hostname).toBe('www.example.com');
  });
});

describe('URL Validator — Blocked hostnames', () => {
  it('should reject 169.254.169.254 (cloud metadata)', () => {
    const result = validateUrl('http://169.254.169.254/latest/meta-data/');
    // This passes URL parsing but IP should be caught by DNS/IP validator
    // The hostname IS in BLOCKED_HOSTNAMES
    expect(result.valid).toBe(false);
  });
});
