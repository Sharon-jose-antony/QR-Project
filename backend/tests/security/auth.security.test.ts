/**
 * QRGuard Security Tests — Authentication & Password Security
 */

import { hashPassword, verifyPassword } from '../../src/security/auth/passwordHash';
import { SECURITY_CONFIG } from '../../src/config/security';

describe('Authentication Security — Argon2id Password Hashing', () => {
  const plainPassword = 'StrongPassword123!';

  it('should hash passwords using Argon2id with random salt', async () => {
    const hash1 = await hashPassword(plainPassword);
    const hash2 = await hashPassword(plainPassword);

    expect(hash1).toMatch(/^\$argon2id\$/);
    expect(hash2).toMatch(/^\$argon2id\$/);
    // Unique salts must produce distinct hashes for same plaintext
    expect(hash1).not.toBe(hash2);
  });

  it('should verify valid password against generated hash', async () => {
    const hash = await hashPassword(plainPassword);
    const isValid = await verifyPassword(hash, plainPassword);
    expect(isValid).toBe(true);
  });

  it('should reject invalid password against generated hash', async () => {
    const hash = await hashPassword(plainPassword);
    const isValid = await verifyPassword(hash, 'WrongPassword456!');
    expect(isValid).toBe(false);
  });

  it('should reject empty or malformed hash inputs gracefully', async () => {
    const isValid = await verifyPassword('invalid_hash_string', plainPassword);
    expect(isValid).toBe(false);
  });
});

describe('Authentication Security — Password Complexity Rules', () => {
  it('should enforce password constraints in security config', () => {
    expect(SECURITY_CONFIG.PASSWORD.MIN_LENGTH).toBeGreaterThanOrEqual(8);
    expect(SECURITY_CONFIG.PASSWORD.REQUIRE_UPPERCASE).toBe(true);
    expect(SECURITY_CONFIG.PASSWORD.REQUIRE_LOWERCASE).toBe(true);
    expect(SECURITY_CONFIG.PASSWORD.REQUIRE_NUMBER).toBe(true);
  });
});
