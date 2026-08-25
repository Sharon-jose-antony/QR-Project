/**
 * QRGuard Audit Logger
 * Records security-relevant events without logging sensitive data.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

export interface AuditEntry {
  userId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  ipRef?: string;   // anonymized/hashed IP
  metadata?: Record<string, unknown>;
}

// Actions to audit
export const AUDIT_ACTIONS = {
  USER_REGISTER: 'USER_REGISTER',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGIN_FAILED: 'USER_LOGIN_FAILED',
  USER_LOGOUT: 'USER_LOGOUT',
  QR_ANALYZED: 'QR_ANALYZED',
  URL_ANALYZED: 'URL_ANALYZED',
  REPORT_CREATED: 'REPORT_CREATED',
  REPORT_REVIEWED: 'REPORT_REVIEWED',
  ADMIN_VIEWED_USERS: 'ADMIN_VIEWED_USERS',
  ADMIN_VIEWED_EVENTS: 'ADMIN_VIEWED_EVENTS',
  ADMIN_SECURITY_LAB: 'ADMIN_SECURITY_LAB',
  SECURITY_EVENT: 'SECURITY_EVENT',
  IDOR_ATTEMPT: 'IDOR_ATTEMPT',
  CONFIG_CHANGED: 'CONFIG_CHANGED',
} as const;

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        ipRef: entry.ipRef,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : undefined,
      },
    });
  } catch (err) {
    // Audit failure should not crash the application
    logger.error('Audit log write failed', { error: (err as Error).message });
  }
}
