/**
 * QRGuard Security Event Logger
 * Records SSRF, IDOR, XSS, CSRF and other security events.
 */

import { PrismaClient } from '@prisma/client';
import { SecurityEventType, SECURITY_CONFIG } from '../../config/security';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

export interface SecurityEventEntry {
  type: SecurityEventType;
  userId?: string;
  sessionRef?: string;
  endpoint?: string;
  method?: string;
  safeTarget?: string;
  action: string;
  riskContrib?: number;
  prevRiskScore?: number;
  newRiskScore?: number;
  analysisId?: string;
  metadata?: Record<string, unknown>;
}

export async function logSecurityEvent(entry: SecurityEventEntry): Promise<void> {
  try {
    const severityStr = SECURITY_CONFIG.EVENT_SEVERITY[entry.type] || 'MEDIUM';
    const severity = severityStr;

    await prisma.securityEvent.create({
      data: {
        type: entry.type,
        severity,
        userId: entry.userId,
        sessionRef: entry.sessionRef,
        endpoint: entry.endpoint,
        method: entry.method,
        safeTarget: entry.safeTarget,
        action: entry.action,
        riskContrib: entry.riskContrib || 0,
        prevRiskScore: entry.prevRiskScore,
        newRiskScore: entry.newRiskScore,
        analysisId: entry.analysisId,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : undefined,
      },
    });

    logger.warn('Security event', {
      type: entry.type,
      severity,
      safeTarget: entry.safeTarget,
      action: entry.action,
    });
  } catch (err) {
    logger.error('Security event log failed', { error: (err as Error).message });
  }
}
