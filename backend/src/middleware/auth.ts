/**
 * QRGuard Auth Middleware
 * Extracts and validates session-based authentication.
 */

import { Request, Response, NextFunction } from 'express';
import { sendUnauthorized, sendForbidden } from '../utils/response';
export type Role = 'USER' | 'MODERATOR' | 'ADMIN';

// Augment express session types
declare module 'express-session' {
  interface SessionData {
    userId: string;
    userRole: Role;
    username: string;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    sendUnauthorized(res);
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    sendUnauthorized(res);
    return;
  }
  if (req.session.userRole !== 'ADMIN') {
    sendForbidden(res, 'Admin access required');
    return;
  }
  next();
}

export function requireModerator(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    sendUnauthorized(res);
    return;
  }
  if (req.session.userRole !== 'ADMIN' && req.session.userRole !== 'MODERATOR') {
    sendForbidden(res, 'Moderator access required');
    return;
  }
  next();
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  // Continues regardless — handlers check req.session.userId themselves
  next();
}
