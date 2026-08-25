/**
 * QRGuard URL Analysis Service
 * Orchestrates the full analysis pipeline:
 * INPUT → VALIDATE → RESOLVE → CLASSIFY → SAFE FETCH → ANALYZE → SCORE → STORE
 */

import { PrismaClient } from '@prisma/client';
import { validateUrl, extractDomain } from '../security/ssrf/urlValidator';
import { safeFetch } from '../security/ssrf/safeHttpClient';
import { calculateRisk } from '../security/risk/riskEngine';
import { logSecurityEvent } from '../security/logging/securityEventLogger';
import { audit, AUDIT_ACTIONS } from '../security/logging/auditLogger';
import { getRiskLevel } from '../config/security';
import { logger } from '../utils/logger';
import { getAIExplanation } from '../ai/claudeClient';

const prisma = new PrismaClient();

export interface AnalysisOptions {
  userId?: string;
  sessionRef?: string;
  requestIp?: string;
}

export interface AnalysisResult {
  id: string;
  url: string;
  domain: string;
  scheme: string;
  riskScore: number;
  riskLevel: string;
  redirectCount: number;
  indicators: string[];
  recommendation: string;
  riskFactors: Array<{ factor: string; score: number; description: string }>;
  redirectChain: Array<{ from: string; to: string; statusCode: number; blocked: boolean }>;
  blocked: boolean;
  aiSummary?: string;
  aiRiskExplanation?: string;
  aiRecommendation?: string;
  communityReports: number;
  status: string;
}

export async function analyzeUrl(rawUrl: string, options: AnalysisOptions = {}): Promise<AnalysisResult> {
  // ── Step 1: Validate URL ──────────────────────────────────────────────────
  const urlValidation = validateUrl(rawUrl);

  if (!urlValidation.valid) {
    // Log if it's an SSRF-related scheme
    const isDangerous = urlValidation.errorCode?.startsWith('SSRF_') || urlValidation.errorCode === 'URL_EMBEDDED_CREDENTIALS';
    if (isDangerous) {
      await logSecurityEvent({
        type: (urlValidation.errorCode as any) || 'SSRF_BLOCKED',
        userId: options.userId,
        sessionRef: options.sessionRef,
        endpoint: '/api/url/analyze',
        method: 'POST',
        safeTarget: rawUrl.substring(0, 50), // truncated for safety
        action: 'BLOCKED',
        riskContrib: 80,
        metadata: { errorCode: urlValidation.errorCode },
      });
    }

    const failScore = isDangerous ? 85 : 45;
    const failLevel: 'CRITICAL' | 'MEDIUM' = isDangerous ? 'CRITICAL' : 'MEDIUM';

    // Store failed analysis
    const analysis = await prisma.urlAnalysis.create({
      data: {
        userId: options.userId,
        sessionRef: options.sessionRef,
        url: rawUrl.substring(0, 2048),
        domain: 'INVALID',
        scheme: urlValidation.scheme || 'unknown',
        riskScore: failScore,
        riskLevel: failLevel,
        status: isDangerous ? 'BLOCKED' : 'FAILED',
        indicators: JSON.stringify([urlValidation.error || 'Invalid URL format']),
        ssrfBlocked: isDangerous,
      },
    });

    return {
      id: analysis.id,
      url: rawUrl,
      domain: 'INVALID',
      scheme: urlValidation.scheme || 'unknown',
      riskScore: failScore,
      riskLevel: failLevel,
      redirectCount: 0,
      indicators: [urlValidation.error || 'Invalid or unsupported URL format'],
      recommendation: 'This destination cannot be analyzed safely and has been blocked by QRGuard.',
      riskFactors: [],
      redirectChain: [],
      blocked: isDangerous,
      communityReports: 0,
      status: isDangerous ? 'BLOCKED' : 'FAILED',
    };
  }

  const { normalizedUrl, scheme, hostname, port } = urlValidation;
  const domain = extractDomain(hostname!);

  // ── Step 2: Get community report count for domain ─────────────────────────
  let domainRecord = await prisma.domain.findUnique({ where: { hostname: hostname! } });
  const communityReportCount = domainRecord?.communityReportCount || 0;

  // ── Step 3: Safe Fetch (validates DNS, IPs, follows redirects safely) ─────
  const fetchResult = await safeFetch(normalizedUrl!);

  // ── Step 4: Log security events if blocked ────────────────────────────────
  if (fetchResult.blocked && fetchResult.blockEventType) {
    await logSecurityEvent({
      type: fetchResult.blockEventType as any,
      userId: options.userId,
      sessionRef: options.sessionRef,
      endpoint: '/api/url/analyze',
      method: 'POST',
      safeTarget: hostname!.substring(0, 100),
      action: 'BLOCKED',
      riskContrib: 40,
      metadata: {
        blockReason: fetchResult.blockReason,
        scheme,
      },
    });
  }

  // ── Step 5: Calculate deterministic risk score ────────────────────────────
  const riskResult = calculateRisk({
    url: normalizedUrl!,
    hostname: hostname!,
    scheme: scheme!,
    port,
    fetchResult,
    communityReportCount,
  });

  // ── Step 6: Store analysis in database ───────────────────────────────────
  const analysis = await prisma.urlAnalysis.create({
    data: {
      userId: options.userId,
      sessionRef: options.sessionRef,
      url: normalizedUrl!,
      domain: hostname!,
      scheme: scheme!,
      port,
      riskScore: riskResult.finalScore,
      riskLevel: riskResult.riskLevel,
      redirectCount: fetchResult.redirectChain.length,
      indicators: JSON.stringify(riskResult.indicators),
      status: fetchResult.blocked ? 'BLOCKED' : fetchResult.success ? 'COMPLETED' : 'FAILED',
      ssrfBlocked: fetchResult.blocked,
    },
  });

  // ── Step 7: Store redirect observations ──────────────────────────────────
  if (fetchResult.redirectChain.length > 0) {
    await prisma.redirectObservation.createMany({
      data: fetchResult.redirectChain.map((step, idx) => ({
        analysisId: analysis.id,
        fromUrl: step.from.substring(0, 2048),
        toUrl: step.to.substring(0, 2048),
        toDomain: step.to ? extractDomain(new URL(step.to).hostname) : undefined,
        position: idx + 1,
        wasBlocked: step.blocked,
        blockReason: step.blockReason,
      })),
    });
  }

  // ── Step 8: Store risk assessment ─────────────────────────────────────────
  await prisma.riskAssessment.create({
    data: {
      analysisId: analysis.id,
      baseScore: 0,
      finalScore: riskResult.finalScore,
      factors: JSON.stringify(riskResult.factors),
    },
  });

  // ── Step 9: Update or create domain record ────────────────────────────────
  domainRecord = await prisma.domain.upsert({
    where: { hostname: hostname! },
    update: {
      lastSeen: new Date(),
      analysisCount: { increment: 1 },
      avgRiskScore: {
        // Running average approximation
        set: domainRecord
          ? (domainRecord.avgRiskScore * domainRecord.analysisCount + riskResult.finalScore) /
            (domainRecord.analysisCount + 1)
          : riskResult.finalScore,
      },
      riskLevel: riskResult.riskLevel,
    },
    create: {
      hostname: hostname!,
      analysisCount: 1,
      avgRiskScore: riskResult.finalScore,
      riskLevel: riskResult.riskLevel,
    },
  });

  // ── Step 10: Create threat relations ──────────────────────────────────────
  await prisma.threatRelation.create({
    data: {
      sourceType: 'URL_ANALYSIS',
      sourceId: analysis.id,
      targetType: 'DOMAIN',
      targetId: domainRecord.id,
      relationType: 'URL_TO_DOMAIN',
    },
  });

  // ── Step 11: Audit log ─────────────────────────────────────────────────────
  await audit({
    userId: options.userId,
    action: AUDIT_ACTIONS.URL_ANALYZED,
    resource: 'UrlAnalysis',
    resourceId: analysis.id,
    metadata: {
      domain: hostname!,
      riskLevel: riskResult.riskLevel,
      riskScore: riskResult.finalScore,
    },
  });

  // ── Step 12: Get AI explanation (non-blocking, optional) ──────────────────
  let aiSummary: string | undefined;
  let aiRiskExplanation: string | undefined;
  let aiRecommendation: string | undefined;

  try {
    const aiResult = await getAIExplanation({
      url: normalizedUrl!,
      domain: hostname!,
      scheme: scheme!,
      riskScore: riskResult.finalScore,
      riskLevel: riskResult.riskLevel,
      indicators: riskResult.indicators.slice(0, 10),
      redirectCount: fetchResult.redirectChain.length,
      blocked: fetchResult.blocked,
      communityReports: communityReportCount,
    });

    if (aiResult) {
      aiSummary = aiResult.summary;
      aiRiskExplanation = aiResult.riskExplanation;
      aiRecommendation = aiResult.recommendation;

      // Update analysis with AI explanation
      await prisma.urlAnalysis.update({
        where: { id: analysis.id },
        data: {
          aiSummary: aiResult.summary,
          aiRiskExplain: aiResult.riskExplanation,
          aiRecommend: aiResult.recommendation,
          aiConfidence: aiResult.confidence,
        },
      });
    }
  } catch (aiErr) {
    logger.warn('AI explanation unavailable', { error: (aiErr as Error).message });
    // Application continues without AI — deterministic analysis is complete
  }

  return {
    id: analysis.id,
    url: normalizedUrl!,
    domain: hostname!,
    scheme: scheme!,
    riskScore: riskResult.finalScore,
    riskLevel: riskResult.riskLevel,
    redirectCount: fetchResult.redirectChain.length,
    indicators: riskResult.indicators,
    recommendation: aiRecommendation || riskResult.recommendation,
    riskFactors: riskResult.factors,
    redirectChain: fetchResult.redirectChain,
    blocked: fetchResult.blocked,
    aiSummary,
    aiRiskExplanation,
    aiRecommendation,
    communityReports: communityReportCount,
    status: analysis.status,
  };
}
