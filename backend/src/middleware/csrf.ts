/**
 * QRGuard CSRF / Origin Verification Middleware
 * Validates Origin and Referer headers on state-changing HTTP requests.
 * Complements SameSite=Strict cookies as defense-in-depth.
 */

import { Request, Response, NextFunction } from 'express';
import { sendForbidden } from '../utils/response';
import { logSecurityEvent } from '../security/logging/securityEventLogger';
import { logger } from '../utils/logger';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function csrfOriginProtection(req: Request, res: Response, next: NextFunction): void {
  // Safe read-only HTTP methods do not change state
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const origin = req.headers['origin'] as string | undefined;
  const referer = req.headers['referer'] as string | undefined;
  const allowedOrigin = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173';

  // If origin is provided, it must match allowed frontend origin
  if (origin) {
    const isVercel = origin.endsWith('.vercel.app');
    const isRender = origin.endsWith('.onrender.com');
    const isGitHub = origin.includes('github.io');
    if (origin === allowedOrigin || origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173' || isVercel || isRender || isGitHub) {
      return next();
    }

    logger.warn('CSRF Origin mismatch blocked', { origin, expected: allowedOrigin });
    logSecurityEvent({
      type: 'CSRF_ATTEMPT',
      userId: req.session?.userId,
      endpoint: req.originalUrl || req.path,
      method: req.method,
      safeTarget: origin,
      action: 'BLOCKED',
      metadata: { reason: 'Origin header mismatch', origin },
    });

    sendForbidden(res, 'Cross-site request blocked: Origin mismatch');
    return;
  }

  // If no Origin header (e.g. some browser POSTs or non-browser agents), check Referer if present
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      const isVercel = refererUrl.host.endsWith('.vercel.app');
      const isRender = refererUrl.host.endsWith('.onrender.com');
      const isGitHub = refererUrl.host.includes('github.io');
      if (refererOrigin === allowedOrigin || refererOrigin === 'http://localhost:5173' || refererOrigin === 'http://127.0.0.1:5173' || isVercel || isRender || isGitHub) {
        return next();
      }

      logger.warn('CSRF Referer mismatch blocked', { refererOrigin, expected: allowedOrigin });
      logSecurityEvent({
        type: 'CSRF_ATTEMPT',
        userId: req.session?.userId,
        endpoint: req.originalUrl || req.path,
        method: req.method,
        safeTarget: refererOrigin,
        action: 'BLOCKED',
        metadata: { reason: 'Referer header mismatch', referer },
      });

      sendForbidden(res, 'Cross-site request blocked: Referer mismatch');
      return;
    } catch {
      sendForbidden(res, 'Cross-site request blocked: Malformed Referer');
      return;
    }
  }

  // Allow same-origin / CLI / automated test requests where headers are absent, as SameSite=Strict cookies protect browser sessions
  next();
}
