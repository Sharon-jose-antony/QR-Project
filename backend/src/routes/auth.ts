/**
 * QRGuard Authentication Routes
 * POST /api/auth/register
 * POST /api/auth/login
 * POST /api/auth/logout
 * GET  /api/auth/me
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword } from '../security/auth/passwordHash';
import { requireAuth } from '../middleware/auth';
import { loginRateLimit, registerRateLimit } from '../middleware/rateLimit';
import { sendSuccess, sendError, sendUnauthorized } from '../utils/response';
import { audit, AUDIT_ACTIONS } from '../security/logging/auditLogger';
import { SECURITY_CONFIG } from '../config/security';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// ── Validation schemas ────────────────────────────────────────────────────────
const RegisterSchema = z.object({
  email: z.string().email('Invalid email address').max(254),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z
    .string()
    .min(SECURITY_CONFIG.PASSWORD.MIN_LENGTH, `Password must be at least ${SECURITY_CONFIG.PASSWORD.MIN_LENGTH} characters`)
    .max(SECURITY_CONFIG.PASSWORD.MAX_LENGTH)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

const LoginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(SECURITY_CONFIG.PASSWORD.MAX_LENGTH),
});

// ── POST /api/auth/register ────────────────────────────────────────────────────
router.post('/register', registerRateLimit, async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, 'VALIDATION_ERROR', parsed.error.errors[0]?.message || 'Invalid input');
    return;
  }

  const { email, username, password } = parsed.data;

  try {
    // Check if email/username already exists
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { id: true, email: true, username: true },
    });

    if (existing) {
      // Use generic message to avoid user enumeration
      sendError(res, 409, 'CONFLICT', 'Account with this email or username already exists');
      return;
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: { email, username, passwordHash, role: 'USER' },
      select: { id: true, email: true, username: true, role: true, createdAt: true },
    });

    await audit({
      userId: user.id,
      action: AUDIT_ACTIONS.USER_REGISTER,
      resource: 'User',
      resourceId: user.id,
      metadata: { email: user.email },
    });

    sendSuccess(res, { user }, 201);
  } catch (err) {
    logger.error('Register error', { error: (err as Error).message });
    sendError(res, 500, 'INTERNAL_ERROR', 'Registration failed. Please try again.');
  }
});

// ── POST /api/auth/login ───────────────────────────────────────────────────────
router.post('/login', loginRateLimit, async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    // Generic error to prevent information leakage
    sendError(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    return;
  }

  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, username: true, role: true, passwordHash: true, isActive: true },
    });

    // Use constant-time comparison to prevent timing attacks
    const dummyHash = '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy'; // placeholder
    const validPassword = user
      ? await verifyPassword(user.passwordHash, password)
      : await verifyPassword(dummyHash, password); // prevents timing oracle

    if (!user || !validPassword || !user.isActive) {
      await audit({
        action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
        metadata: { emailRef: email.substring(0, 3) + '***' }, // Partial email only
      });
      // Always return the same generic error
      sendError(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      return;
    }

    // Set session
    req.session.userId = user.id;
    req.session.userRole = user.role as any;
    req.session.username = user.username;

    await audit({
      userId: user.id,
      action: AUDIT_ACTIONS.USER_LOGIN,
      resource: 'User',
      resourceId: user.id,
    });

    sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    logger.error('Login error', { error: (err as Error).message });
    sendError(res, 500, 'INTERNAL_ERROR', 'Login failed. Please try again.');
  }
});

// ── POST /api/auth/logout ──────────────────────────────────────────────────────
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  const userId = req.session.userId;

  req.session.destroy((err) => {
    if (err) {
      logger.error('Session destroy error', { error: err.message });
    }
  });

  await audit({
    userId,
    action: AUDIT_ACTIONS.USER_LOGOUT,
  });

  res.clearCookie(SECURITY_CONFIG.SESSION.COOKIE_NAME);
  sendSuccess(res, { message: 'Logged out successfully' });
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { id: true, email: true, username: true, role: true, createdAt: true },
    });

    if (!user) {
      sendUnauthorized(res);
      return;
    }

    sendSuccess(res, { user });
  } catch (err) {
    logger.error('Get me error', { error: (err as Error).message });
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to get user');
  }
});

export default router;
