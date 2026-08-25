import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding QRGuard database...');

  // ── Create admin user ──────────────────────────────────────────────────────
  const adminPasswordHash = await argon2.hash('Admin@QRGuard2024!', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@qrguard.local' },
    update: {},
    create: {
      email: 'admin@qrguard.local',
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // ── Create demo user ──────────────────────────────────────────────────────
  const userPasswordHash = await argon2.hash('User@QRGuard2024!', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@qrguard.local' },
    update: {},
    create: {
      email: 'demo@qrguard.local',
      username: 'demouser',
      passwordHash: userPasswordHash,
      role: 'USER',
    },
  });
  console.log(`✅ Demo user: ${demoUser.email}`);

  // ── Seed some domains for demo ─────────────────────────────────────────────
  const suspiciousDomain = await prisma.domain.upsert({
    where: { hostname: 'example-suspicious-login.net' },
    update: {},
    create: {
      hostname: 'example-suspicious-login.net',
      analysisCount: 17,
      avgRiskScore: 78,
      communityReportCount: 5,
      riskLevel: 'CRITICAL',
      isKnownSuspicious: true,
    },
  });

  const safeDomain = await prisma.domain.upsert({
    where: { hostname: 'wikipedia.org' },
    update: {},
    create: {
      hostname: 'wikipedia.org',
      analysisCount: 42,
      avgRiskScore: 3,
      communityReportCount: 0,
      riskLevel: 'LOW',
      isKnownSuspicious: false,
    },
  });

  console.log(`✅ Seeded domains`);

  // ── Seed system config ─────────────────────────────────────────────────────
  await prisma.systemConfiguration.upsert({
    where: { key: 'PLATFORM_VERSION' },
    update: {},
    create: { key: 'PLATFORM_VERSION', value: '1.0.0', updatedBy: admin.id },
  });
  await prisma.systemConfiguration.upsert({
    where: { key: 'AI_ENABLED' },
    update: {},
    create: { key: 'AI_ENABLED', value: 'true', updatedBy: admin.id },
  });

  console.log(`✅ System configuration seeded`);
  console.log('\n🎉 Database seeded successfully!');
  console.log('\nDefault credentials:');
  console.log('  Admin: admin@qrguard.local / Admin@QRGuard2024!');
  console.log('  User:  demo@qrguard.local  / User@QRGuard2024!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
