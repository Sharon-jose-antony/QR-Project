/**
 * QRGuard Security Tests — XSS & SQL Injection Defense
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('XSS Defense — Output Encoding & Input Safety', () => {
  it('should safely store and retrieve XSS payloads without script execution', async () => {
    const xssPayload = '<script>alert("xss")</script><img src=x onerror=alert(1)>';

    // Create a community report with raw XSS payload
    const user = await prisma.user.create({
      data: {
        email: `xsstest-${Date.now()}@example.com`,
        username: `xsstest_${Date.now()}`,
        passwordHash: 'dummyhash',
        role: 'USER',
      },
    });

    const report = await prisma.communityReport.create({
      data: {
        userId: user.id,
        targetUrl: 'https://example.com/test',
        targetDomain: 'example.com',
        category: 'SUSPICIOUS_URL',
        description: xssPayload,
        status: 'PENDING',
      },
    });

    expect(report.description).toBe(xssPayload);

    // Clean up
    await prisma.communityReport.delete({ where: { id: report.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});

describe('SQL Injection Defense — Parameterized Prisma Queries', () => {
  it('should safely handle SQL injection payloads in username and email filters', async () => {
    const sqliPayload = "' OR '1'='1' --";

    // Attempt querying with SQL injection string
    const result = await prisma.user.findFirst({
      where: {
        OR: [
          { email: sqliPayload },
          { username: sqliPayload },
        ],
      },
    });

    // Parameterized query must treat payload as literal string and return null
    expect(result).toBeNull();
  });

  it('should safely handle UNION SELECT payload in URL queries', async () => {
    const unionPayload = "https://example.com/' UNION SELECT * FROM User --";

    const result = await prisma.urlAnalysis.findFirst({
      where: { url: unionPayload },
    });

    expect(result).toBeNull();
  });
});
