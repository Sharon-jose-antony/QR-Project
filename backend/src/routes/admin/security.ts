/**
 * QRGuard Admin Security Routes
 * GET /api/admin/security/events    — Security events
 * GET /api/admin/security/ssrf      — SSRF stats
 * GET /api/admin/threat-graph       — Threat graph data
 * GET /api/admin/audit-logs         — Audit logs
 * GET /api/admin/users              — All users
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../../middleware/auth';
import { adminApiRateLimit } from '../../middleware/rateLimit';
import { sendSuccess, sendError } from '../../utils/response';
import { audit, AUDIT_ACTIONS } from '../../security/logging/auditLogger';
import { logger } from '../../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Apply admin + rate limit to all routes
router.use(requireAdmin);
router.use(adminApiRateLimit);

// ── GET /api/admin/security/events ────────────────────────────────────────────
router.get('/security/events', async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
  const skip = (page - 1) * limit;
  const severity = req.query.severity as string;
  const type = req.query.type as string;

  try {
    const where: any = {};
    if (severity) where.severity = severity;
    if (type) where.type = type;

    const [events, total] = await Promise.all([
      prisma.securityEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          severity: true,
          userId: true,
          sessionRef: true,
          endpoint: true,
          method: true,
          safeTarget: true,
          action: true,
          riskContrib: true,
          prevRiskScore: true,
          newRiskScore: true,
          createdAt: true,
          // No raw request bodies or secrets
        },
      }),
      prisma.securityEvent.count({ where }),
    ]);

    // Summary stats
    const stats = await prisma.securityEvent.groupBy({
      by: ['type'],
      _count: { type: true },
      orderBy: { _count: { type: 'desc' } },
    });

    await audit({
      userId: req.session.userId,
      action: AUDIT_ACTIONS.ADMIN_VIEWED_EVENTS,
      metadata: { page, severity, type },
    });

    sendSuccess(res, { events, stats }, 200, { total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error('Admin events error', { error: (err as Error).message });
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to load security events');
  }
});

// ── GET /api/admin/security/ssrf ──────────────────────────────────────────────
router.get('/security/ssrf', async (_req: Request, res: Response) => {
  try {
    const ssrfTypes = [
      'SSRF_PRIVATE_IP_BLOCKED',
      'SSRF_LOOPBACK_BLOCKED',
      'SSRF_LINK_LOCAL_BLOCKED',
      'SSRF_UNSUPPORTED_SCHEME',
      'SSRF_REDIRECT_BLOCKED',
      'SSRF_DNS_VALIDATION_FAILURE',
      'SSRF_TIMEOUT',
      'SSRF_NETWORK_POLICY_VIOLATION',
    ];

    const totalAnalyses = await prisma.urlAnalysis.count();
    const ssrfBlocked = await prisma.urlAnalysis.count({ where: { ssrfBlocked: true } });

    const ssrfBreakdown = await Promise.all(
      ssrfTypes.map(async (type) => ({
        type,
        count: await prisma.securityEvent.count({ where: { type } }),
      }))
    );

    // SSRF events over time (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ssrfTimeline = await prisma.securityEvent.findMany({
      where: {
        type: { in: ssrfTypes },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { type: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    sendSuccess(res, {
      totalAnalyses,
      ssrfBlocked,
      breakdown: ssrfBreakdown,
      timeline: ssrfTimeline,
    });
  } catch (err) {
    logger.error('SSRF stats error', { error: (err as Error).message });
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to load SSRF statistics');
  }
});

// ── GET /api/admin/threat-graph ───────────────────────────────────────────────
router.get('/threat-graph', async (req: Request, res: Response) => {
  const domain = req.query.domain as string;
  const riskLevel = req.query.riskLevel as string;
  const limit = Math.min(100, parseInt(req.query.limit as string) || 50);

  try {
    // Get top reported domains
    const domains = await prisma.domain.findMany({
      where: {
        ...(domain ? { hostname: { contains: domain.toLowerCase() } } : {}),
        ...(riskLevel ? { riskLevel: riskLevel as any } : {}),
        OR: [
          { communityReportCount: { gt: 0 } },
          { analysisCount: { gt: 1 } },
        ],
      },
      orderBy: [{ communityReportCount: 'desc' }, { analysisCount: 'desc' }],
      take: limit,
      select: {
        id: true,
        hostname: true,
        riskLevel: true,
        avgRiskScore: true,
        analysisCount: true,
        communityReportCount: true,
      },
    });

    // Get threat relations for these domains
    const domainIds = domains.map((d) => d.id);
    const relations = await prisma.threatRelation.findMany({
      where: { targetId: { in: domainIds } },
      take: 200,
      select: {
        id: true,
        sourceType: true,
        sourceId: true,
        targetType: true,
        targetId: true,
        relationType: true,
        createdAt: true,
      },
    });

    sendSuccess(res, { nodes: domains, edges: relations });
  } catch (err) {
    logger.error('Threat graph error', { error: (err as Error).message });
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to load threat graph');
  }
});

// ── GET /api/admin/audit-logs ─────────────────────────────────────────────────
router.get('/audit-logs', async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
  const skip = (page - 1) * limit;

  try {
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          userId: true,
          action: true,
          resource: true,
          resourceId: true,
          createdAt: true,
          metadata: true,
          // No passwords, tokens, secrets
        },
      }),
      prisma.auditLog.count(),
    ]);

    sendSuccess(res, { logs }, 200, { total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error('Audit logs error', { error: (err as Error).message });
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to load audit logs');
  }
});

// ── GET /api/admin/users ───────────────────────────────────────────────────────
router.get('/users', async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
  const skip = (page - 1) * limit;

  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: { select: { urlAnalyses: true, communityReports: true } },
          // NEVER return passwordHash
        },
      }),
      prisma.user.count(),
    ]);

    await audit({
      userId: req.session.userId,
      action: AUDIT_ACTIONS.ADMIN_VIEWED_USERS,
      metadata: { page },
    });

    sendSuccess(res, { users }, 200, { total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error('Admin users error', { error: (err as Error).message });
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to load users');
  }
});

// ── GET /api/admin/security/overview ──────────────────────────────────────────
router.get('/security/overview', async (_req: Request, res: Response) => {
  try {
    const [
      totalEvents, criticalEvents, highEvents,
      ssrfBlocked, rateLimitEvents, idrAttempts,
      totalAnalyses, riskDistribution,
    ] = await Promise.all([
      prisma.securityEvent.count(),
      prisma.securityEvent.count({ where: { severity: 'CRITICAL' } }),
      prisma.securityEvent.count({ where: { severity: 'HIGH' } }),
      prisma.securityEvent.count({ where: { type: { startsWith: 'SSRF_' } } }),
      prisma.securityEvent.count({ where: { type: 'RATE_LIMIT_EXCEEDED' } }),
      prisma.securityEvent.count({ where: { type: 'IDOR_ATTEMPT' } }),
      prisma.urlAnalysis.count(),
      prisma.urlAnalysis.groupBy({
        by: ['riskLevel'],
        _count: { riskLevel: true },
      }),
    ]);

    // Recent events
    const recentEvents = await prisma.securityEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true, type: true, severity: true,
        safeTarget: true, action: true, createdAt: true,
      },
    });

    sendSuccess(res, {
      summary: {
        totalEvents, criticalEvents, highEvents,
        ssrfBlocked, rateLimitEvents, idrAttempts, totalAnalyses,
      },
      riskDistribution,
      recentEvents,
    });
  } catch (err) {
    logger.error('Security overview error', { error: (err as Error).message });
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to load security overview');
  }
});

// ── GET /api/admin/reports ─────────────────────────────────────────────────────
router.get('/reports', async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
  const skip = (page - 1) * limit;
  const status = req.query.status as string;

  try {
    const where: any = status ? { status } : {};

    const [reports, total] = await Promise.all([
      prisma.communityReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          targetDomain: true,
          category: true,
          description: true,
          status: true,
          createdAt: true,
          userId: true, // Admin can see reporter ID but not name/email
        },
      }),
      prisma.communityReport.count({ where }),
    ]);

    sendSuccess(res, { reports }, 200, { total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error('Admin reports error', { error: (err as Error).message });
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to load reports');
  }
});

export default router;
