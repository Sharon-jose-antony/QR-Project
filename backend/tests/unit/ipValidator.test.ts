/**
 * QRGuard Security Tests — IP Validator
 * Tests that all private/reserved IP ranges are correctly blocked.
 */

import { classifyIP, areAllIPsPublic } from '../../src/security/ssrf/ipValidator';

describe('IP Validator — IPv4', () => {
  it('should classify 127.0.0.1 as LOOPBACK (not public)', () => {
    const result = classifyIP('127.0.0.1');
    expect(result.isPublic).toBe(false);
    expect(result.classification).toBe('LOOPBACK');
  });

  it('should classify 127.255.255.255 as LOOPBACK', () => {
    const result = classifyIP('127.255.255.255');
    expect(result.isPublic).toBe(false);
    expect(result.classification).toBe('LOOPBACK');
  });

  it('should classify 10.0.0.1 as PRIVATE', () => {
    const result = classifyIP('10.0.0.1');
    expect(result.isPublic).toBe(false);
    expect(result.classification).toBe('PRIVATE');
  });

  it('should classify 10.255.255.255 as PRIVATE', () => {
    const result = classifyIP('10.255.255.255');
    expect(result.isPublic).toBe(false);
  });

  it('should classify 192.168.0.1 as PRIVATE', () => {
    const result = classifyIP('192.168.0.1');
    expect(result.isPublic).toBe(false);
    expect(result.classification).toBe('PRIVATE');
  });

  it('should classify 172.16.0.1 as PRIVATE', () => {
    const result = classifyIP('172.16.0.1');
    expect(result.isPublic).toBe(false);
    expect(result.classification).toBe('PRIVATE');
  });

  it('should classify 172.31.255.255 as PRIVATE', () => {
    const result = classifyIP('172.31.255.255');
    expect(result.isPublic).toBe(false);
  });

  it('should classify 169.254.169.254 (AWS metadata) as LINK_LOCAL', () => {
    const result = classifyIP('169.254.169.254');
    expect(result.isPublic).toBe(false);
    expect(result.classification).toBe('LINK_LOCAL');
  });

  it('should classify 0.0.0.0 as not public', () => {
    const result = classifyIP('0.0.0.0');
    expect(result.isPublic).toBe(false);
  });

  it('should classify 8.8.8.8 as PUBLIC', () => {
    const result = classifyIP('8.8.8.8');
    expect(result.isPublic).toBe(true);
    expect(result.classification).toBe('PUBLIC');
  });

  it('should classify 1.1.1.1 as PUBLIC', () => {
    const result = classifyIP('1.1.1.1');
    expect(result.isPublic).toBe(true);
  });

  it('should classify 93.184.216.34 as PUBLIC', () => {
    const result = classifyIP('93.184.216.34');
    expect(result.isPublic).toBe(true);
  });
});

describe('IP Validator — IPv6', () => {
  it('should classify ::1 (loopback) as not public', () => {
    const result = classifyIP('::1');
    expect(result.isPublic).toBe(false);
    expect(result.classification).toBe('LOOPBACK');
  });

  it('should classify :: (unspecified) as not public', () => {
    const result = classifyIP('::');
    expect(result.isPublic).toBe(false);
  });

  it('should classify fc00::1 (unique-local) as not public', () => {
    const result = classifyIP('fc00::1');
    expect(result.isPublic).toBe(false);
  });

  it('should classify fe80::1 (link-local) as not public', () => {
    const result = classifyIP('fe80::1');
    expect(result.isPublic).toBe(false);
    expect(result.classification).toBe('LINK_LOCAL');
  });
});

describe('areAllIPsPublic', () => {
  it('should return allPublic=true for a list of public IPs', () => {
    const result = areAllIPsPublic(['8.8.8.8', '1.1.1.1']);
    expect(result.allPublic).toBe(true);
    expect(result.firstBlocked).toBeUndefined();
  });

  it('should return allPublic=false if any IP is private', () => {
    const result = areAllIPsPublic(['8.8.8.8', '192.168.1.1']);
    expect(result.allPublic).toBe(false);
    expect(result.firstBlocked).toBeDefined();
    expect(result.firstBlocked?.classification).toBe('PRIVATE');
  });

  it('should block if mix includes loopback', () => {
    const result = areAllIPsPublic(['8.8.8.8', '127.0.0.1']);
    expect(result.allPublic).toBe(false);
  });
});
