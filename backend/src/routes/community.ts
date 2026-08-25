/**
 * QRGuard Community Routes
 * GET /api/community          — Public aggregated intelligence
 * POST /api/reports           — Submit community report
 * GET /api/domains/:hostname  — Domain detail
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { communityReportRateLimit } from '../middleware/rateLimit';
import { sendSuccess, sendError, sendNotFound } from '../utils/response';
import { audit, AUDIT_ACTIONS } from '../security/logging/auditLogger';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

const ReportSchema = z.object({
  targetUrl: z.string().url('Invalid URL').max(2048),
  category: z.enum([
    'SUSPICIOUS_URL', 'SUSPICIOUS_QR', 'PHISHING', 'FAKE_PAYMENT',
    'IMPERSONATION', 'SUSPICIOUS_ADVERTISEMENT', 'SCAM', 'FAKE_LOGIN',
    'FAKE_SCHOLARSHIP', 'MALWARE', 'OTHER'
  ]),
  description: z.string().max(1000).optional(),
});

// ── GET /api/community ─────────────────────────────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Most reported domains (public, no private reporter info)
    const topDomains = await prisma.domain.findMany({
      where: { communityReportCount: { gt: 0 } },
      orderBy: { communityReportCount: 'desc' },
      take: 20,
      select: {
        hostname: true,
        riskLevel: true,
        avgRiskScore: true,
        communityReportCount: true,
        analysisCount: true,
        lastSeen: true,
      },
    });

    // Recent reports (no userId, no description — aggregated only)
    const recentReports = await prisma.communityReport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        targetDomain: true,
        category: true,
        status: true,
        createdAt: true,
        // Do NOT include userId or description
      },
    });

    // Category breakdown
    const categoryStats = await prisma.communityReport.groupBy({
      by: ['category'],
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
    });

    // Total stats
    const totalReports = await prisma.communityReport.count();
    const totalAnalyses = await prisma.urlAnalysis.count();

    sendSuccess(res, {
      topDomains,
      recentReports,
      categoryStats,
      stats: { totalReports, totalAnalyses },
    });
  } catch (err) {
    logger.error('Community GET error', { error: (err as Error).message });
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to load community data');
  }
});

// ── POST /api/reports or POST /api/community/reports ─────────────────────────
const handleReportSubmission = async (req: Request, res: Response): Promise<void> => {
  const parsed = ReportSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, 'VALIDATION_ERROR', parsed.error.errors[0]?.message || 'Invalid input');
    return;
  }

  const { targetUrl, category, description } = parsed.data;

  try {
    const hostname = new URL(targetUrl).hostname.toLowerCase();

    // Find or create domain record
    const domainRecord = await prisma.domain.upsert({
      where: { hostname },
      update: {
        communityReportCount: { increment: 1 },
        lastSeen: new Date(),
      },
      create: {
        hostname,
        communityReportCount: 1,
      },
    });

    const report = await prisma.communityReport.create({
      data: {
        userId: req.session.userId!,
        domainId: domainRecord.id,
        targetUrl: targetUrl.substring(0, 2048),
        targetDomain: hostname,
        category,
        description: description?.substring(0, 1000),
        status: 'PENDING',
      },
    });

    await audit({
      userId: req.session.userId,
      action: AUDIT_ACTIONS.REPORT_CREATED,
      resource: 'CommunityReport',
      resourceId: report.id,
      metadata: { domain: hostname, category },
    });

    sendSuccess(res, {
      id: report.id,
      message: 'Report submitted successfully. Thank you for helping protect the community.',
    }, 201);
  } catch (err) {
    logger.error('Report creation error', { error: (err as Error).message });
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to submit report');
  }
};

router.post('/', requireAuth, communityReportRateLimit, handleReportSubmission);
router.post('/reports', requireAuth, communityReportRateLimit, handleReportSubmission);

// ── GET /api/domains/:hostname ─────────────────────────────────────────────────
router.get('/domains/:hostname', async (req: Request, res: Response) => {
  const { hostname } = req.params;

  // Validate hostname
  if (!hostname || hostname.length > 253 || !/^[a-z0-9.-]+$/i.test(hostname)) {
    sendError(res, 400, 'INVALID_HOSTNAME', 'Invalid hostname');
    return;
  }

  try {
    const domain = await prisma.domain.findUnique({
      where: { hostname: hostname.toLowerCase() },
    });

    if (!domain) {
      sendNotFound(res, 'Domain');
      return;
    }

    // Recent analyses for this domain (no userId exposed)
    const recentAnalyses = await prisma.urlAnalysis.findMany({
      where: { domain: domain.hostname },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        riskLevel: true,
        riskScore: true,
        redirectCount: true,
        status: true,
        createdAt: true,
        indicators: true,
        // No userId
      },
    });

    // Report categories for this domain
    const reportCategories = await prisma.communityReport.groupBy({
      where: { targetDomain: domain.hostname },
      by: ['category'],
      _count: { category: true },
    });

    // Recent redirect observations
    const redirects = await prisma.redirectObservation.findMany({
      where: { analysis: { domain: domain.hostname } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { fromUrl: true, toUrl: true, wasBlocked: true, position: true, createdAt: true },
    });

    sendSuccess(res, {
      hostname: domain.hostname,
      riskLevel: domain.riskLevel,
      avgRiskScore: Math.round(domain.avgRiskScore),
      analysisCount: domain.analysisCount,
      communityReportCount: domain.communityReportCount,
      firstSeen: domain.firstSeen,
      lastSeen: domain.lastSeen,
      recentAnalyses,
      reportCategories,
      redirectObservations: redirects,
    });
  } catch (err) {
    logger.error('Domain detail error', { error: (err as Error).message });
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to load domain information');
  }
});

export default router;
