/**
 * QRGuard URL Analysis Route
 * POST /api/url/analyze
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { analyzeUrl } from '../services/urlService';
import { urlAnalyzeRateLimit } from '../middleware/rateLimit';
import { optionalAuth } from '../middleware/auth';
import { sendSuccess, sendError, sendValidationError } from '../utils/response';
import { SECURITY_CONFIG } from '../config/security';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const UrlAnalyzeSchema = z.object({
  url: z
    .string()
    .min(1, 'URL is required')
    .max(SECURITY_CONFIG.MAX_URL_LENGTH, 'URL is too long')
    .trim(),
});

router.post('/analyze', urlAnalyzeRateLimit, optionalAuth, async (req: Request, res: Response) => {
  const parsed = UrlAnalyzeSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error.errors[0]?.message || 'Invalid input');
    return;
  }

  const sessionRef = req.session?.userId
    ? req.session.userId
    : `anon-${uuidv4().substring(0, 8)}`;

  try {
    const result = await analyzeUrl(parsed.data.url, {
      userId: req.session?.userId,
      sessionRef,
    });

    sendSuccess(res, result);
  } catch (err) {
    logger.error('Analysis failed', { error: (err as Error).message, stack: (err as Error).stack });
    sendError(res, 500, 'ANALYSIS_ERROR', 'Analysis failed. Please try again.');
  }
});

export default router;
