/**
 * QRGuard API Response Helpers
 * Consistent response format across all endpoints.
 */

import { Response } from 'express';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, meta?: Record<string, unknown>): void {
  const response: ApiSuccess<T> = { success: true, data };
  if (meta) response.meta = meta;
  res.status(statusCode).json(response);
}

export function sendError(res: Response, statusCode: number, code: string, message: string): void {
  const response: ApiError = {
    success: false,
    error: { code, message },
  };
  // Never expose internal details
  res.status(statusCode).json(response);
}

export function sendUnauthorized(res: Response, message = 'Authentication required'): void {
  sendError(res, 401, 'UNAUTHORIZED', message);
}

export function sendForbidden(res: Response, message = 'Access denied'): void {
  sendError(res, 403, 'FORBIDDEN', message);
}

export function sendNotFound(res: Response, resource = 'Resource'): void {
  sendError(res, 404, 'NOT_FOUND', `${resource} not found`);
}

export function sendValidationError(res: Response, message: string): void {
  sendError(res, 400, 'VALIDATION_ERROR', message);
}

export function sendTooManyRequests(res: Response): void {
  sendError(res, 429, 'RATE_LIMIT_EXCEEDED', 'Too many requests. Please try again later.');
}

export function sendInternalError(res: Response): void {
  // Never expose internal error details to clients
  sendError(res, 500, 'INTERNAL_ERROR', 'An internal error occurred. Please try again.');
}
