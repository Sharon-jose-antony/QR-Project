/**
 * QRGuard Authorization Helper
 * Server-side ownership checks to prevent IDOR.
 */

import { PrismaClient } from '@prisma/client';
import { logSecurityEvent } from '../logging/securityEventLogger';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

/**
 * Checks that the requesting user owns the given UrlAnalysis record.
 * Records an IDOR security event on failure.
 */
export async function checkAnalysisOwnership(
  analysisId: string,
  requestingUserId: string,
  sessionRef?: string,
  endpoint?: string
): Promise<{ allowed: boolean; reason?: string }> {
  const analysis = await prisma.urlAnalysis.findUnique({
    where: { id: analysisId },
    select: { userId: true },
  });

  if (!analysis) {
    return { allowed: false, reason: 'Analysis not found' };
  }

  if (analysis.userId !== requestingUserId) {
    // Log IDOR attempt
    await logSecurityEvent({
      type: 'IDOR_ATTEMPT',
      userId: requestingUserId,
      sessionRef,
      endpoint: endpoint || `/api/analyses/${analysisId}`,
      method: 'GET',
      safeTarget: `analysis:${analysisId}`,
      action: 'ACCESS_DENIED',
      riskContrib: 0,
      metadata: {
        requestedResource: 'UrlAnalysis',
        resourceId: analysisId,
      },
    });

    logger.warn('IDOR attempt blocked', {
      requestingUser: requestingUserId,
      resourceId: analysisId,
    });

    return { allowed: false, reason: 'Access denied' };
  }

  return { allowed: true };
}
