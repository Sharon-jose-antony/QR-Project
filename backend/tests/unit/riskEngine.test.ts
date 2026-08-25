/**
 * QRGuard Security Tests — Risk Engine
 */

import { calculateRisk } from '../../src/security/risk/riskEngine';
import { SafeFetchResult } from '../../src/security/ssrf/safeHttpClient';

const mockFetchSuccess: SafeFetchResult = {
  success: true,
  finalUrl: 'https://example.com',
  statusCode: 200,
  redirectChain: [],
  blocked: false,
  responseTimeMs: 100,
  resolvedIPs: ['93.184.216.34'],
};

const mockFetchBlocked: SafeFetchResult = {
  success: false,
  blocked: true,
  blockReason: 'Loopback address',
  blockEventType: 'SSRF_LOOPBACK_BLOCKED',
  redirectChain: [],
  responseTimeMs: 50,
};

describe('Risk Engine — Scoring', () => {
  it('should give LOW score for clean HTTPS URL', () => {
    const result = calculateRisk({
      url: 'https://example.com',
      hostname: 'example.com',
      scheme: 'https',
      fetchResult: mockFetchSuccess,
    });
    expect(result.finalScore).toBeLessThanOrEqual(20);
    expect(result.riskLevel).toBe('LOW');
  });

  it('should penalize HTTP URLs', () => {
    const result = calculateRisk({
      url: 'http://example.com',
      hostname: 'example.com',
      scheme: 'http',
      fetchResult: { ...mockFetchSuccess, finalUrl: 'http://example.com' },
    });
    expect(result.finalScore).toBeGreaterThan(0);
    expect(result.indicators.some((i) => i.includes('HTTP'))).toBe(true);
  });

  it('should give CRITICAL score for blocked SSRF attempt', () => {
    const result = calculateRisk({
      url: 'http://127.0.0.1',
      hostname: '127.0.0.1',
      scheme: 'http',
      fetchResult: mockFetchBlocked,
    });
    expect(result.finalScore).toBeGreaterThanOrEqual(50);
    expect(['HIGH', 'CRITICAL']).toContain(result.riskLevel);
  });

  it('should add score for multiple redirects', () => {
    const result = calculateRisk({
      url: 'https://example.com',
      hostname: 'example.com',
      scheme: 'https',
      fetchResult: {
        ...mockFetchSuccess,
        redirectChain: [
          { from: 'https://a.com', to: 'https://b.com', statusCode: 302, blocked: false },
          { from: 'https://b.com', to: 'https://c.com', statusCode: 302, blocked: false },
          { from: 'https://c.com', to: 'https://example.com', statusCode: 302, blocked: false },
        ],
      },
    });
    expect(result.indicators.some((i) => i.includes('redirect'))).toBe(true);
  });

  it('should score community reports correctly', () => {
    const result = calculateRisk({
      url: 'https://example.com',
      hostname: 'example.com',
      scheme: 'https',
      fetchResult: mockFetchSuccess,
      communityReportCount: 20,
    });
    expect(result.finalScore).toBeGreaterThanOrEqual(15);
    expect(result.indicators.some((i) => i.includes('community'))).toBe(true);
  });

  it('should not exceed MAX_SCORE of 100', () => {
    const result = calculateRisk({
      url: 'http://127.0.0.1',
      hostname: '127.0.0.1',
      scheme: 'http',
      fetchResult: mockFetchBlocked,
      communityReportCount: 100,
    });
    expect(result.finalScore).toBeLessThanOrEqual(100);
  });

  it('should detect credential keywords in URL', () => {
    const result = calculateRisk({
      url: 'https://example.com/login/verify',
      hostname: 'example.com',
      scheme: 'https',
      fetchResult: mockFetchSuccess,
    });
    expect(result.indicators.some((i) => i.includes('credential'))).toBe(true);
  });

  it('should detect punycode/IDN in hostname', () => {
    const result = calculateRisk({
      url: 'https://xn--pypal-4ve.com',
      hostname: 'xn--pypal-4ve.com',
      scheme: 'https',
      fetchResult: mockFetchSuccess,
    });
    expect(result.indicators.some((i) => i.toLowerCase().includes('punycode') || i.includes('International'))).toBe(true);
  });

  it('should provide a recommendation', () => {
    const result = calculateRisk({
      url: 'https://example.com',
      hostname: 'example.com',
      scheme: 'https',
      fetchResult: mockFetchSuccess,
    });
    expect(result.recommendation).toBeTruthy();
    expect(result.recommendation.length).toBeGreaterThan(10);
  });
});
