/**
 * QRGuard Risk Engine
 * Deterministic risk scoring based on analysis findings.
 *
 * IMPORTANT: Claude AI does NOT make security decisions.
 * This engine is the authoritative source of risk scores.
 */

import { SECURITY_CONFIG, getRiskLevel, RiskLevel } from '../../config/security';
import { SafeFetchResult } from '../ssrf/safeHttpClient';

export interface RiskFactor {
  factor: string;
  score: number;
  description: string;
}

export interface RiskEngineResult {
  finalScore: number;
  riskLevel: RiskLevel;
  factors: RiskFactor[];
  indicators: string[];
  recommendation: string;
}

export interface RiskInput {
  url: string;
  hostname: string;
  scheme: string;
  port?: number | null;
  fetchResult: SafeFetchResult;
  communityReportCount?: number;
  domainAnalysisCount?: number;
}

/**
 * Calculates a deterministic risk score from analysis findings.
 */
export function calculateRisk(input: RiskInput): RiskEngineResult {
  const factors: RiskFactor[] = [];
  const indicators: string[] = [];
  const S = SECURITY_CONFIG.RISK_SCORES;

  // ── SSRF / Blocking events ─────────────────────────────────────────────────
  if (input.fetchResult.blocked) {
    const eventType = input.fetchResult.blockEventType || '';
    if (eventType.includes('LOOPBACK')) {
      factors.push({
        factor: 'SSRF_LOOPBACK_BLOCKED',
        score: S.BLOCKED_SSRF_ATTEMPT,
        description: 'Destination resolves to loopback address',
      });
      indicators.push('🚨 Blocked: Loopback address destination');
    } else if (eventType.includes('PRIVATE_IP')) {
      factors.push({
        factor: 'SSRF_PRIVATE_IP_BLOCKED',
        score: S.PRIVATE_IP_RESOLUTION,
        description: 'Destination resolves to a private IP address',
      });
      indicators.push('🚨 Blocked: Private network destination');
    } else if (eventType.includes('LINK_LOCAL')) {
      factors.push({
        factor: 'SSRF_LINK_LOCAL_BLOCKED',
        score: S.PRIVATE_IP_RESOLUTION,
        description: 'Destination resolves to a link-local address',
      });
      indicators.push('🚨 Blocked: Link-local address destination');
    } else if (eventType.includes('SCHEME')) {
      factors.push({
        factor: 'SSRF_UNSUPPORTED_SCHEME',
        score: S.BLOCKED_SSRF_ATTEMPT,
        description: 'Unsupported URL scheme attempted',
      });
      indicators.push('🚨 Blocked: Unsupported protocol scheme');
    } else if (eventType.includes('REDIRECT')) {
      factors.push({
        factor: 'SSRF_REDIRECT_BLOCKED',
        score: S.SUSPICIOUS_REDIRECT,
        description: 'Redirect chain contained unsafe destination',
      });
      indicators.push('⚠️ Suspicious redirect chain detected');
    }
  }

  // ── Scheme ──────────────────────────────────────────────────────────────────
  if (input.scheme === 'http') {
    factors.push({
      factor: 'HTTP_NOT_HTTPS',
      score: S.HTTP_NOT_HTTPS,
      description: 'Connection is not encrypted (HTTP, not HTTPS)',
    });
    indicators.push('⚠️ Not encrypted: Uses HTTP instead of HTTPS');
  }

  // ── Unusual port ────────────────────────────────────────────────────────────
  if (input.port && input.port !== 80 && input.port !== 443) {
    factors.push({
      factor: 'UNUSUAL_PORT',
      score: S.UNUSUAL_PORT,
      description: `Unusual port: ${input.port}`,
    });
    indicators.push(`⚠️ Unusual port: ${input.port}`);
  }

  // ── Domain analysis ─────────────────────────────────────────────────────────
  const hostname = input.hostname.toLowerCase();
  const domainParts = hostname.split('.');
  const mainDomain = domainParts.slice(-2).join('.');

  // Excessive subdomains
  if (domainParts.length > 4) {
    factors.push({
      factor: 'EXCESSIVE_SUBDOMAINS',
      score: S.EXCESSIVE_SUBDOMAINS,
      description: `Hostname has ${domainParts.length - 2} subdomains`,
    });
    indicators.push('⚠️ Suspicious: Excessive subdomain nesting');
  }

  // Long domain name
  if (mainDomain.length > 30) {
    factors.push({
      factor: 'SUSPICIOUS_DOMAIN_LENGTH',
      score: S.SUSPICIOUS_DOMAIN_LENGTH,
      description: `Unusually long domain name (${mainDomain.length} chars)`,
    });
    indicators.push('⚠️ Suspicious: Unusually long domain name');
  }

  // Punycode / IDN
  if (hostname.includes('xn--')) {
    factors.push({
      factor: 'PUNYCODE_IDN',
      score: S.PUNYCODE_IDN,
      description: 'Domain uses internationalized (Punycode) encoding',
    });
    indicators.push('⚠️ Internationalized domain (possible homoglyph attack)');
  }

  // Misleading brand in domain (checking both exact and normalized without hyphens)
  const normalizedHostname = hostname.replace(/[-_.]/g, '');
  const brandMatches = SECURITY_CONFIG.BRAND_KEYWORDS.filter((brand) => {
    const normBrand = brand.replace(/[-_.]/g, '');
    return hostname.includes(brand) || normalizedHostname.includes(normBrand);
  });
  if (brandMatches.length > 0) {
    factors.push({
      factor: 'MISLEADING_BRAND',
      score: S.MISLEADING_BRAND,
      description: `Domain contains brand keyword: ${brandMatches[0]}`,
    });
    indicators.push(`🚨 Suspicious: Domain resembles "${brandMatches[0]}" brand`);
  }

  // Suspicious TLD
  const suspiciousTldMatch = SECURITY_CONFIG.SUSPICIOUS_TLDS.find((tld) =>
    hostname.endsWith(tld)
  );
  if (suspiciousTldMatch) {
    factors.push({
      factor: 'SUSPICIOUS_TLD',
      score: S.SUSPICIOUS_TLD,
      description: `Domain uses high-risk TLD: ${suspiciousTldMatch}`,
    });
    indicators.push(`⚠️ High-risk TLD (${suspiciousTldMatch}) frequently associated with phishing`);
  }

  // Suspicious characters (hyphens, numbers in suspicious patterns)
  const suspiciousPattern = /(\d{4,}|[-]{2,}|(secure|login|verify|account|update|payment|bill)[-\d]|[-](account|verify|update|login|service))/i;
  if (suspiciousPattern.test(hostname)) {
    factors.push({
      factor: 'SUSPICIOUS_DOMAIN_CHARS',
      score: S.SUSPICIOUS_DOMAIN_CHARS,
      description: 'Domain has deceptive character patterns',
    });
    indicators.push('⚠️ Deceptive domain naming pattern');
  }

  // ── URL path / credential keywords ─────────────────────────────────────────
  const urlLower = input.url.toLowerCase();
  const credMatches = SECURITY_CONFIG.CREDENTIAL_KEYWORDS.filter((kw) =>
    urlLower.includes(kw)
  );
  if (credMatches.length > 0) {
    factors.push({
      factor: 'CREDENTIAL_PATH_KEYWORD',
      score: S.CREDENTIAL_PATH_KEYWORD,
      description: `URL contains credential-related keywords: ${credMatches.slice(0, 3).join(', ')}`,
    });
    indicators.push('⚠️ URL contains credential-related keywords');
  }

  // ── Redirects ──────────────────────────────────────────────────────────────
  const redirectCount = input.fetchResult.redirectChain.length;
  if (redirectCount > 2) {
    factors.push({
      factor: 'MULTIPLE_REDIRECTS',
      score: S.MULTIPLE_REDIRECTS,
      description: `${redirectCount} redirect hops detected`,
    });
    indicators.push(`⚠️ Multiple redirects: ${redirectCount} hops`);
  }

  // ── Community reports ──────────────────────────────────────────────────────
  const reportCount = input.communityReportCount || 0;
  if (reportCount >= 15) {
    factors.push({
      factor: 'COMMUNITY_REPORTS_HIGH',
      score: S.COMMUNITY_REPORTS_HIGH,
      description: `${reportCount} community reports for this domain`,
    });
    indicators.push(`🚨 High community report count: ${reportCount} reports`);
  } else if (reportCount >= 5) {
    factors.push({
      factor: 'COMMUNITY_REPORTS_MED',
      score: S.COMMUNITY_REPORTS_MED,
      description: `${reportCount} community reports for this domain`,
    });
    indicators.push(`⚠️ Community reports: ${reportCount} reports`);
  } else if (reportCount >= 1) {
    factors.push({
      factor: 'COMMUNITY_REPORTS_LOW',
      score: S.COMMUNITY_REPORTS_LOW,
      description: `${reportCount} community report(s) for this domain`,
    });
    indicators.push(`ℹ️ Community reports: ${reportCount} report(s)`);
  }

  // ── Calculate total score ──────────────────────────────────────────────────
  const totalScore = Math.min(
    factors.reduce((sum, f) => sum + f.score, 0),
    S.MAX_SCORE
  );
  const riskLevel = getRiskLevel(totalScore);

  // ── Generate recommendation ────────────────────────────────────────────────
  const recommendation = generateRecommendation(riskLevel, input.fetchResult.blocked);

  return {
    finalScore: totalScore,
    riskLevel,
    factors,
    indicators,
    recommendation,
  };
}

function generateRecommendation(riskLevel: RiskLevel, wasBlocked: boolean): string {
  if (wasBlocked) {
    return 'This destination was blocked by QRGuard security controls. Do NOT visit this URL.';
  }
  switch (riskLevel) {
    case 'CRITICAL':
      return 'DO NOT visit this URL. Do not enter any passwords, payment details, or personal information. This destination exhibits multiple high-risk indicators.';
    case 'HIGH':
      return 'Exercise extreme caution. This destination has significant risk indicators. Do not enter sensitive information.';
    case 'MEDIUM':
      return 'Proceed with caution. This destination has some risk indicators. Verify the source before entering any information.';
    case 'LOW':
    default:
      return 'This destination appears relatively safe based on available indicators. Standard internet precautions apply.';
  }
}
