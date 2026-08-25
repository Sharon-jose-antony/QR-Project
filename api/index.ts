import fs from 'fs';
import path from 'path';

// Prepare writable SQLite database for Vercel Serverless environment
if (process.env.VERCEL) {
  const tmpDbPath = '/tmp/dev.db';
  process.env.DATABASE_URL = `file:${tmpDbPath}`;

  if (!fs.existsSync(tmpDbPath)) {
    const candidates = [
      path.join(process.cwd(), 'backend', 'prisma', 'dev.db'),
      path.join(process.cwd(), 'prisma', 'dev.db'),
      path.join(__dirname, '..', 'backend', 'prisma', 'dev.db'),
      path.join(__dirname, '..', 'prisma', 'dev.db'),
    ];

    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        try {
          fs.copyFileSync(cand, tmpDbPath);
          console.log(`Copied SQLite database from ${cand} to ${tmpDbPath}`);
          break;
        } catch (e) {
          console.error('Failed to copy db candidate', e);
        }
      }
    }
  }
}

import app from '../backend/src/app';

export default app;
