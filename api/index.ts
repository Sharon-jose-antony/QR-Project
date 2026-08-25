import fs from 'fs';
import path from 'path';

// MUST RUN SYNCHRONOUSLY BEFORE PRISMA CLIENT OR APP MODULES ARE IMPORTED
const tmpDbPath = '/tmp/dev.db';
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  process.env.DATABASE_URL = `file:${tmpDbPath}`;

  if (!fs.existsSync(tmpDbPath)) {
    const candidates = [
      path.join(process.cwd(), 'backend', 'prisma', 'dev.db'),
      path.join(process.cwd(), 'prisma', 'dev.db'),
      path.join(__dirname, '..', 'backend', 'prisma', 'dev.db'),
      path.join(__dirname, '..', 'prisma', 'dev.db'),
      path.join(__dirname, 'dev.db'),
    ];

    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        try {
          fs.copyFileSync(cand, tmpDbPath);
          console.log(`[Vercel Serverless] Successfully copied SQLite database from ${cand} to ${tmpDbPath}`);
          break;
        } catch (e) {
          console.error('[Vercel Serverless] Failed to copy db candidate', e);
        }
      }
    }
  }
}

// Dynamically import Express application after environment configuration
let cachedApp: any = null;

export default async function handler(req: any, res: any) {
  // Ensure database exists before handling requests
  if (process.env.VERCEL && !fs.existsSync(tmpDbPath)) {
    const fallbackSource = path.join(process.cwd(), 'backend', 'prisma', 'dev.db');
    if (fs.existsSync(fallbackSource)) {
      try {
        fs.copyFileSync(fallbackSource, tmpDbPath);
      } catch (e) {
        console.error('Runtime copy error', e);
      }
    }
  }

  if (!cachedApp) {
    const { default: app } = await import('../backend/src/app');
    cachedApp = app;
  }
  return cachedApp(req, res);
}
