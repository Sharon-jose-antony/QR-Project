/**
 * QRGuard Security Tests — Authorization & IDOR Defense
 */

import { PrismaClient } from '@prisma/client';
import { checkAnalysisOwnership } from '../../src/security/authorization/ownershipCheck';

const prisma = new PrismaClient();

describe('Authorization & IDOR Defense — Ownership Verification', () => {
  let userAId: string;
  let userBId: string;
  let analysisAId: string;

  beforeAll(async () => {
    // Create two test users in SQLite
    const userA = await prisma.user.create({
      data: {
        email: `usera-${Date.now()}@example.com`,
        username: `usera_${Date.now()}`,
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy',
        role: 'USER',
      },
    });
    userAId = userA.id;

    const userB = await prisma.user.create({
      data: {
        email: `userb-${Date.now()}@example.com`,
        username: `userb_${Date.now()}`,
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy',
        role: 'USER',
      },
    });
    userBId = userB.id;

    // Create an analysis owned by User A
    const analysisA = await prisma.urlAnalysis.create({
      data: {
        userId: userAId,
        url: 'https://example.com/test',
        domain: 'example.com',
        scheme: 'https',
        riskScore: 10,
        riskLevel: 'LOW',
        status: 'COMPLETED',
        indicators: '[]',
      },
    });
    analysisAId = analysisA.id;
  });

  afterAll(async () => {
    // Clean up
    if (analysisAId) {
      await prisma.urlAnalysis.deleteMany({ where: { id: analysisAId } });
    }
    if (userAId || userBId) {
      await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
    }
    await prisma.$disconnect();
  });

  it('should ALLOW User A to access User A analysis (Ownership verified)', async () => {
    const result = await checkAnalysisOwnership(analysisAId, userAId);
    expect(result.allowed).toBe(true);
  });

  it('should DENY User B when attempting to access User A analysis (IDOR Blocked)', async () => {
    const result = await checkAnalysisOwnership(analysisAId, userBId);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Access denied');
  });

  it('should DENY access to a non-existent analysis ID', async () => {
    const result = await checkAnalysisOwnership('00000000-0000-0000-0000-000000000000', userAId);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Analysis not found');
  });
});
