/**
 * QRGuard QR Analysis Route
 * POST /api/qr/analyze
 * Handles QR image upload, decoding, and analysis pipeline.
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import Jimp from 'jimp';
import jsQR from 'jsqr';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { analyzeUrl } from '../services/urlService';
import { validateImageFile } from '../security/upload/fileValidator';
import { optionalAuth } from '../middleware/auth';
import { qrAnalyzeRateLimit } from '../middleware/rateLimit';
import { sendSuccess, sendError } from '../utils/response';
import { SECURITY_CONFIG } from '../config/security';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// ── Secure Multer Storage ──────────────────────────────────────────────────────
// Store to disk with UUID filenames — never trust user-provided filename
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, _file, cb) => {
    // Generate safe filename — never use original filename
    const safeFilename = `qr-${uuidv4()}.upload`;
    cb(null, safeFilename);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check MIME type from Content-Type header (first layer — not trusted alone)
  const allowedMimes = [...SECURITY_CONFIG.ALLOWED_UPLOAD_TYPES] as string[];
  if (!allowedMimes.includes(file.mimetype)) {
    cb(new Error('INVALID_FILE_TYPE'));
    return;
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: SECURITY_CONFIG.MAX_UPLOAD_SIZE_BYTES,
    files: 1,
  },
});

// ── File signature validation ──────────────────────────────────────────────────
function validateFileSignature(filePath: string, mimeType: string): boolean {
  try {
    const buffer = Buffer.alloc(8);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    const signature = SECURITY_CONFIG.FILE_SIGNATURES[mimeType];
    if (!signature) return false;

    return signature.every((byte, idx) => buffer[idx] === byte);
  } catch {
    return false;
  }
}

// ── POST /api/qr/analyze ───────────────────────────────────────────────────────
router.post(
  '/analyze',
  qrAnalyzeRateLimit,
  optionalAuth,
  upload.single('image'),
  async (req: Request, res: Response) => {
    const file = req.file;

    if (!file) {
      sendError(res, 400, 'NO_FILE', 'No image file uploaded');
      return;
    }

    let filePath = file.path;

    try {
      // ── Image security validation (signatures & dimensions) ───────────────
      const validation = await validateImageFile(filePath, file.mimetype);
      if (!validation.valid) {
        fs.unlinkSync(filePath);
        await prisma.fileUpload.create({
          data: {
            userId: req.session?.userId,
            storedName: path.basename(filePath),
            mimeType: file.mimetype,
            sizeBytes: file.size,
            isValid: false,
            validationMsg: validation.error || 'Invalid file format',
          },
        });
        sendError(res, 400, validation.errorCode || 'INVALID_FILE', validation.error || 'Invalid file format');
        return;
      }

      const image = await Jimp.read(filePath);

      // ── QR Decoding ────────────────────────────────────────────────────────
      const imageData = image.bitmap;
      const decoded = jsQR(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
      );

      // Store file upload record
      await prisma.fileUpload.create({
        data: {
          userId: req.session?.userId,
          storedName: path.basename(filePath),
          mimeType: file.mimetype,
          sizeBytes: file.size,
          isValid: true,
        },
      });

      if (!decoded) {
        sendError(res, 422, 'QR_NOT_FOUND', 'No QR code found in the uploaded image');
        return;
      }

      const payload = decoded.data;

      // ── Classify payload type ──────────────────────────────────────────────
      let payloadType = 'TEXT';
      let analysisResult = null;

      if (/^https?:\/\//i.test(payload) || /^[a-z0-9-]+\.[a-z]{2,}/i.test(payload)) {
        payloadType = 'URL';

        // Analyze the extracted URL
        analysisResult = await analyzeUrl(payload, {
          userId: req.session?.userId,
          sessionRef: req.session?.userId || `anon-${uuidv4().substring(0, 8)}`,
        });
      } else if (/^mailto:/i.test(payload)) {
        payloadType = 'EMAIL';
      } else if (/^tel:/i.test(payload)) {
        payloadType = 'TEL';
      }

      // ── Store QR submission ────────────────────────────────────────────────
      const qrSubmission = await prisma.qrSubmission.create({
        data: {
          userId: req.session?.userId,
          payloadType,
          payload: payload.substring(0, 2048),
          analysisId: analysisResult?.id,
        },
      });

      // Clean up file after processing
      fs.unlinkSync(filePath);

      sendSuccess(res, {
        qrId: qrSubmission.id,
        payload: payload.substring(0, 500), // Truncated for display
        payloadType,
        analysis: analysisResult,
      });
    } catch (err) {
      // Clean up file on error
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch { /* ignore */ }
      }
      logger.error('QR analysis error', { error: (err as Error).message });
      sendError(res, 500, 'ANALYSIS_ERROR', 'QR analysis failed. Please try again.');
    }
  }
);

export default router;
