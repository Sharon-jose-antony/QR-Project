/**
 * QRGuard Rate Limiter Middleware
 * Per-route rate limiting using express-rate-limit.
 */

import rateLimit from 'express-rate-limit';
import { SECURITY_CONFIG } from '../config/security';
import { sendTooManyRequests } from '../utils/response';
import { Request, Response } from 'express';

function makeRateLimiter(config: { windowMs: number; max: number }) {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req: Request, res: Response) => {
      sendTooManyRequests(res);
    },
    skip: (req: Request) => {
      // Never skip — rate limiting applies to all users
      return false;
    },
  });
}

export const loginRateLimit = makeRateLimiter(SECURITY_CONFIG.RATE_LIMITS.LOGIN);
export const registerRateLimit = makeRateLimiter(SECURITY_CONFIG.RATE_LIMITS.REGISTER);
export const qrAnalyzeRateLimit = makeRateLimiter(SECURITY_CONFIG.RATE_LIMITS.QR_ANALYZE);
export const urlAnalyzeRateLimit = makeRateLimiter(SECURITY_CONFIG.RATE_LIMITS.URL_ANALYZE);
export const communityReportRateLimit = makeRateLimiter(SECURITY_CONFIG.RATE_LIMITS.COMMUNITY_REPORT);
export const adminApiRateLimit = makeRateLimiter(SECURITY_CONFIG.RATE_LIMITS.ADMIN_API);
export const securityLabRateLimit = makeRateLimiter(SECURITY_CONFIG.RATE_LIMITS.SECURITY_LAB);
