/**
 * QRGuard Analysis History Route
 * GET /api/analyses        — Own analyses (IDOR protected)
 * GET /api/analyses/:id    — Single analysis (ownership checked)
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { sendSuccess, sendError, sendForbidden, sendNotFound } from '../utils/response';
import { checkAnalysisOwnership } from '../security/authorization/ownershipCheck';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// ── GET /api/analyses ──────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
  const skip = (page - 1) * limit;

  try {
    const [analyses, total] = await Promise.all([
      prisma.urlAnalysis.findMany({
        where: { userId: req.session.userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          url: true,
          domain: true,
          scheme: true,
          riskScore: true,
          riskLevel: true,
          status: true,
          redirectCount: true,
          ssrfBlocked: true,
          createdAt: true,
        },
      }),
      prisma.urlAnalysis.count({ where: { userId: req.session.userId } }),
    ]);

    sendSuccess(res, { analyses }, 200, {
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    logger.error('Analyses list error', { error: (err as Error).message });
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to load analysis history');
  }
});

// ── GET /api/analyses/:id ──────────────────────────────────────────────────────
// IDOR Protection: Server-side ownership check
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    sendNotFound(res, 'Analysis');
    return;
  }

  try {
    // Check ownership before returning data
    const ownership = await checkAnalysisOwnership(
      id,
      req.session.userId!,
      req.session.userId,
      req.path
    );

    if (!ownership.allowed) {
      // Return 404 rather than 403 to avoid confirming the resource exists
      sendNotFound(res, 'Analysis');
      return;
    }

    const analysis = await prisma.urlAnalysis.findUnique({
      where: { id },
      include: {
        redirects: {
          orderBy: { position: 'asc' },
          select: { fromUrl: true, toUrl: true, position: true, wasBlocked: true, blockReason: true },
        },
        riskAssessment: {
          select: { finalScore: true, factors: true },
        },
      },
    });

    if (!analysis) {
      sendNotFound(res, 'Analysis');
      return;
    }

    sendSuccess(res, { analysis });
  } catch (err) {
    logger.error('Analysis detail error', { error: (err as Error).message });
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to load analysis');
  }
});

export default router;
