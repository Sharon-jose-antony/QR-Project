/**
 * QRGuard Global Error Handler
 * Never exposes internal errors, stack traces, or SQL to clients.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { sendInternalError, sendError } from '../utils/response';
import { ZodError } from 'zod';

export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    const firstError = err.errors[0];
    sendError(res, 400, 'VALIDATION_ERROR', firstError?.message || 'Invalid input');
    return;
  }

  // Log internal errors safely (no sensitive data)
  logger.error('Unhandled error', {
    message: err.message,
    path: req.path,
    method: req.method,
    // No stack traces, no request bodies
  });

  // Return generic error to client
  sendInternalError(res);
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, 'NOT_FOUND', 'The requested endpoint does not exist');
}
