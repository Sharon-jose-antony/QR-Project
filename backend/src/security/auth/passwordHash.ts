/**
 * QRGuard Password Hasher
 * Uses Argon2id as primary hasher with secure Crypto.scrypt fallback for serverless runtimes.
 */

import crypto from 'crypto';

let argon2Module: any = null;
try {
  argon2Module = require('argon2');
} catch {
  argon2Module = null;
}

export async function hashPassword(plaintext: string): Promise<string> {
  if (argon2Module) {
    try {
      return await argon2Module.hash(plaintext, {
        type: argon2Module.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });
    } catch {
      // Fallback to scrypt on serverless environments
    }
  }

  // Native Node crypto.scrypt fallback (zero native binary dependency)
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(plaintext, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`$scrypt$${salt}$${derivedKey.toString('hex')}`);
    });
  });
}

export async function verifyPassword(hash: string, plaintext: string): Promise<boolean> {
  try {
    if (hash.startsWith('$scrypt$')) {
      const parts = hash.split('$');
      const salt = parts[2];
      const key = parts[3];
      return new Promise((resolve) => {
        crypto.scrypt(plaintext, salt, 64, (err, derivedKey) => {
          if (err) return resolve(false);
          const hashBuffer = Buffer.from(key, 'hex');
          resolve(crypto.timingSafeEqual(hashBuffer, derivedKey));
        });
      });
    }

    if (argon2Module) {
      return await argon2Module.verify(hash, plaintext);
    }

    return false;
  } catch {
    return false;
  }
}
