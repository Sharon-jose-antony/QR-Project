/**
 * QRGuard QR Identity & Fingerprint Service
 *
 * Uniquely and deterministically identifies a physical QR code across time
 * independent of whatever URL/destination it redirects to at runtime.
 */

import crypto from 'crypto';
import { PrismaClient, QrCodeIdentity } from '@prisma/client';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

export interface QrIdentityResult {
  identity: QrCodeIdentity;
  isNewQr: boolean;
  fingerprint: string;
  payloadType: string;
  normalizedPayload: string;
}

/**
 * Normalizes a raw QR payload for canonical hashing while preserving semantic content.
 */
export function normalizeQrPayload(rawPayload: string): { normalized: string; payloadType: string } {
  const trimmed = rawPayload.trim();

  let payloadType = 'TEXT';
  let normalized = trimmed;

  if (/^https?:\/\//i.test(trimmed) || /^[a-z0-9-]+\.[a-z]{2,}/i.test(trimmed)) {
    payloadType = 'URL';
    try {
      const urlStr = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      const parsed = new URL(urlStr);
      // Canonical URL normalization (lowercase hostname, strip default ports, clean trailing slash on root)
      parsed.hostname = parsed.hostname.toLowerCase();
      if ((parsed.protocol === 'http:' && parsed.port === '80') || (parsed.protocol === 'https:' && parsed.port === '443')) {
        parsed.port = '';
      }
      normalized = parsed.toString();
    } catch {
      normalized = trimmed;
    }
  } else if (/^mailto:/i.test(trimmed)) {
    payloadType = 'EMAIL';
    normalized = trimmed.toLowerCase();
  } else if (/^tel:/i.test(trimmed)) {
    payloadType = 'TEL';
    normalized = trimmed.replace(/\s+/g, '');
  } else if (/^upi:\/\//i.test(trimmed)) {
    payloadType = 'UPI';
    normalized = trimmed;
  }

  return { normalized, payloadType };
}

/**
 * Computes deterministic SHA-256 fingerprint for a QR payload.
 */
export function generateQrFingerprint(rawPayload: string): string {
  const { normalized } = normalizeQrPayload(rawPayload);
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Looks up or registers a persistent QrCodeIdentity record in the database.
 */
export async function resolveQrIdentity(rawPayload: string): Promise<QrIdentityResult> {
  const { normalized, payloadType } = normalizeQrPayload(rawPayload);
  const fingerprint = generateQrFingerprint(rawPayload);

  let isNewQr = false;
  let identity = await prisma.qrCodeIdentity.findUnique({
    where: { fingerprint },
    include: {
      communityReports: {
        where: { status: { in: ['CONFIRMED', 'PENDING'] } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!identity) {
    isNewQr = true;
    identity = await prisma.qrCodeIdentity.create({
      data: {
        fingerprint,
        rawPayload: normalized.substring(0, 4096),
        payloadType,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        scanCount: 1,
        reputationLevel: 'UNKNOWN',
        reputationScore: 0,
        hasCriticalHistory: false,
        reportCount: 0,
      },
      include: {
        communityReports: true,
      },
    });
    logger.info('Registered new QR code identity', { fingerprint: fingerprint.substring(0, 12), payloadType });
  } else {
    // Existing QR code — update scan metrics
    identity = await prisma.qrCodeIdentity.update({
      where: { id: identity.id },
      data: {
        lastSeenAt: new Date(),
        scanCount: { increment: 1 },
      },
      include: {
        communityReports: {
          where: { status: { in: ['CONFIRMED', 'PENDING'] } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    logger.info('Recognized existing QR code identity', {
      fingerprint: fingerprint.substring(0, 12),
      scanCount: identity.scanCount,
      reportCount: identity.reportCount,
      hasCriticalHistory: identity.hasCriticalHistory,
    });
  }

  return {
    identity,
    isNewQr,
    fingerprint,
    payloadType,
    normalizedPayload: normalized,
  };
}
