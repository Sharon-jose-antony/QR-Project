/**
 * QRGuard File Upload Security Validator
 * Dedicated file signature, MIME, extension, and dimension validator.
 */

import fs from 'fs';
import path from 'path';
import Jimp from 'jimp';
import { SECURITY_CONFIG } from '../../config/security';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: string;
  width?: number;
  height?: number;
}

/**
 * Validates magic bytes against known image file signatures.
 */
export function validateFileSignature(filePath: string, mimeType: string): boolean {
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

/**
 * Validates uploaded file MIME type and extension against the allowlist.
 */
export function validateFileExtensionAndMime(originalFilename: string, mimeType: string): boolean {
  const ext = path.extname(originalFilename).toLowerCase();
  const allowedExtensions = SECURITY_CONFIG.ALLOWED_UPLOAD_EXTENSIONS as readonly string[];
  const allowedMimes = SECURITY_CONFIG.ALLOWED_UPLOAD_TYPES as readonly string[];

  return allowedExtensions.includes(ext) && allowedMimes.includes(mimeType);
}

/**
 * Full security validation of an uploaded image file.
 */
export async function validateImageFile(filePath: string, mimeType: string): Promise<FileValidationResult> {
  // Check file signature
  if (!validateFileSignature(filePath, mimeType)) {
    return {
      valid: false,
      error: 'File signature does not match declared image type',
      errorCode: 'INVALID_FILE_SIGNATURE',
    };
  }

  // Check image dimensions using Jimp
  try {
    const image = await Jimp.read(filePath);
    const width = image.getWidth();
    const height = image.getHeight();

    if (
      width > SECURITY_CONFIG.MAX_IMAGE_DIMENSION ||
      height > SECURITY_CONFIG.MAX_IMAGE_DIMENSION ||
      width < SECURITY_CONFIG.MIN_IMAGE_DIMENSION ||
      height < SECURITY_CONFIG.MIN_IMAGE_DIMENSION
    ) {
      return {
        valid: false,
        error: `Image dimensions (${width}x${height}) exceed permitted limits`,
        errorCode: 'INVALID_IMAGE_DIMENSIONS',
        width,
        height,
      };
    }

    return {
      valid: true,
      width,
      height,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: 'Failed to process image data: corrupt or invalid format',
      errorCode: 'CORRUPT_IMAGE_DATA',
    };
  }
}
