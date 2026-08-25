/**
 * QRGuard Security Tests — File Upload Security
 */

import fs from 'fs';
import path from 'path';
import { validateFileSignature, validateFileExtensionAndMime } from '../../src/security/upload/fileValidator';

describe('File Upload Security — Magic Byte & Extension Verification', () => {
  const tempDir = path.join(__dirname, '../temp_upload_test');

  beforeAll(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should validate valid PNG magic bytes [0x89, 0x50, 0x4E, 0x47]', () => {
    const pngPath = path.join(tempDir, 'valid.png');
    // PNG header
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    fs.writeFileSync(pngPath, pngBuffer);

    const isValid = validateFileSignature(pngPath, 'image/png');
    expect(isValid).toBe(true);
  });

  it('should validate valid JPEG magic bytes [0xFF, 0xD8, 0xFF]', () => {
    const jpegPath = path.join(tempDir, 'valid.jpg');
    // JPEG header
    const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]);
    fs.writeFileSync(jpegPath, jpegBuffer);

    const isValid = validateFileSignature(jpegPath, 'image/jpeg');
    expect(isValid).toBe(true);
  });

  it('should REJECT spoofed file (e.g. PHP script with .png extension)', () => {
    const spoofedPath = path.join(tempDir, 'malicious.png');
    // PHP text content disguised as .png
    const phpBuffer = Buffer.from('<?php echo "evil"; ?>');
    fs.writeFileSync(spoofedPath, phpBuffer);

    const isValid = validateFileSignature(spoofedPath, 'image/png');
    expect(isValid).toBe(false);
  });

  it('should REJECT dangerous file extensions even if MIME is spoofed', () => {
    expect(validateFileExtensionAndMime('shell.php', 'image/png')).toBe(false);
    expect(validateFileExtensionAndMime('payload.exe', 'image/jpeg')).toBe(false);
    expect(validateFileExtensionAndMime('script.sh', 'image/png')).toBe(false);
    expect(validateFileExtensionAndMime('page.html', 'image/gif')).toBe(false);
  });

  it('should ACCEPT legitimate image extension and MIME pairs', () => {
    expect(validateFileExtensionAndMime('qr_code.png', 'image/png')).toBe(true);
    expect(validateFileExtensionAndMime('invoice.jpg', 'image/jpeg')).toBe(true);
    expect(validateFileExtensionAndMime('scan.webp', 'image/webp')).toBe(true);
  });
});
