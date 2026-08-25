/**
 * QRGuard Express Application
 * Main application setup with all middleware and routes.
 */

import express from 'express';
import session from 'express-session';
import cors from 'cors';
import { securityHeaders, permissionsPolicy } from './middleware/headers';
import { csrfOriginProtection } from './middleware/csrf';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler';
import { SECURITY_CONFIG } from './config/security';

// Routes
import authRouter from './routes/auth';
import urlRouter from './routes/url';
import qrRouter from './routes/qr';
import communityRouter from './routes/community';
import analysesRouter from './routes/analyses';
import adminSecurityRouter from './routes/admin/security';
import adminLabRouter from './routes/admin/securityLab';

const app = express();

// ── Trust proxy (for Render/Railway deployment) ────────────────────────────────
app.set('trust proxy', 1);

// ── Security Headers ───────────────────────────────────────────────────────────
app.use(securityHeaders);
app.use(permissionsPolicy);

// ── CORS ───────────────────────────────────────────────────────────────────────
const CORS_ORIGIN = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || true;

app.use(
  cors({
    origin: CORS_ORIGIN,        // Allow configured frontend or reflect origin
    credentials: true,          // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 600,
  })
);

// ── Body Parsing ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));  // Limit JSON body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── CSRF / Origin Verification ────────────────────────────────────────────────
app.use(csrfOriginProtection);

// ── Session ────────────────────────────────────────────────────────────────────
app.use(
  session({
    name: SECURITY_CONFIG.SESSION.COOKIE_NAME,
    secret: process.env.SESSION_SECRET || 'CHANGE_THIS_IN_PRODUCTION_USE_LONG_RANDOM_SECRET',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: SECURITY_CONFIG.SESSION.SAME_SITE,
      maxAge: SECURITY_CONFIG.SESSION.COOKIE_MAX_AGE,
    },
  })
);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/url', urlRouter);
app.use('/api/qr', qrRouter);
app.use('/api/community', communityRouter);
app.use('/api/reports', communityRouter);       // alias
app.use('/api/analyses', analysesRouter);
app.use('/api/admin', adminSecurityRouter);
app.use('/api/admin/security-lab', adminLabRouter);

// ── Health Check ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'qrguard-backend', timestamp: new Date().toISOString() });
});

// ── Error Handling ─────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
