/**
 * QRGuard Security Headers Middleware
 * Uses Helmet with custom CSP and additional security headers.
 *
 * Header purposes documented inline per project requirements.
 */

import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export const securityHeaders = helmet({
  // Content-Security-Policy: Restricts sources of scripts, styles, images.
  // Prevents XSS by blocking inline script execution.
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for some CSS-in-JS; tighten for production
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", FRONTEND_URL],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
      // Clickjacking defense: no iframing
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },

  // Strict-Transport-Security: Forces HTTPS in production.
  // Prevents protocol downgrade attacks.
  strictTransportSecurity: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // X-Content-Type-Options: Prevents MIME type sniffing.
  // Stops browser from interpreting files as a different MIME type.
  xContentTypeOptions: true,

  // Referrer-Policy: Controls how much referrer info is sent.
  // Prevents leaking sensitive URL paths to external sites.
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

  // X-Frame-Options: Backup clickjacking protection (legacy browsers).
  xFrameOptions: { action: 'deny' },

  // X-XSS-Protection: Legacy XSS filter (modern browsers use CSP).
  xXssProtection: true,

  // X-DNS-Prefetch-Control: Disables DNS prefetching.
  dnsPrefetchControl: { allow: false },
});

// Permissions-Policy: Restricts browser feature access.
// Prevents unauthorized access to camera, mic, location, etc.
export function permissionsPolicy(req: Request, res: Response, next: NextFunction): void {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), accelerometer=()'
  );
  next();
}
