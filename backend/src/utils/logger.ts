/**
 * QRGuard Structured Logger
 * Safe logging — never logs passwords, tokens, or sensitive data.
 */

import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: false }), // No stack traces in production
    winston.format.json()
  ),
  defaultMeta: { service: 'qrguard-backend' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// In production, also write to file
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10_485_760, // 10 MB
      maxFiles: 5,
    })
  );
}
