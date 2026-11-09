import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for Edgi...');

  // 1. Create or upsert primary user
  const user = await prisma.user.upsert({
    where: { email: 'developer@edgi.local' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'developer@edgi.local',
    },
  });

  console.log(`👤 Seeded User: ${user.email} (${user.id})`);

  // 2. Create User Profile (200-level Cyber Security student)
  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      fullName: 'Cyber Security Student & Developer',
      headline: '200-level Cyber Security Student | Software & AppSec Developer',
      degree: 'B.Sc. Cybersecurity',
      major: 'Cybersecurity & Information Assurance',
      yearOfStudy: '200-level',
      university: 'University Technology Campus',
      country: 'Nigeria',
      timezone: 'Africa/Lagos',
      bio: 'Cyber Security undergraduate and software developer focused on Application Security, secure software architecture, fintech security, and applied AI systems. Actively seeking funded international programmes, hackathons, and research fellowships.',
      skills: [
        'Application Security',
        'Penetration Testing',
        'TypeScript',
        'Python',
        'NestJS',
        'Next.js',
        'Network Security',
        'Cryptography',
        'Docker',
        'Reverse Engineering',
      ],
      targetRoles: [
        'AppSec Intern',
        'Security Engineer Fellow',
        'Full Stack Security Developer',
        'CTF Competitor',
      ],
      interests: [
        'Fintech Security',
        'AI Safety & Security',
        'Funded Global Fellowships',
        'Open Source Security',
        'Bug Bounties',
      ],
      links: {
        github: 'https://github.com/developer-edgi',
        linkedin: 'https://linkedin.com/in/developer-edgi',
        portfolio: 'https://developer-edgi.dev',
      },
    },
  });

  // 3. Create User Preferences
  await prisma.userPreferences.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      targetCategories: [
        'internship',
        'fellowship',
        'hackathon_ctf',
        'dev_programme',
        'oss_bounty',
        'funding',
      ],
      minRelevanceScore: 65,
      notifyInApp: true,
      notifyEmail: true,
      digestFrequency: 'daily',
      digestTime: '08:00',
      reminderDays: [14, 7, 3, 1],
      monthlyBudgetCap: 10.0,
      searchBudgetCap: 4.0,
      llmBudgetCap: 5.0,
      bufferBudgetCap: 1.0,
    },
  });

  // 4. Create Baseline Organizations
  const orgOpenSSF = await prisma.organization.upsert({
    where: { slug: 'openssf' },
    update: {},
    create: {
      name: 'Open Source Security Foundation (OpenSSF)',
      slug: 'openssf',
      website: 'https://openssf.org',
      country: 'Global',
      verified: true,
      description: 'Cross-industry organization advancing open-source security.',
    },
  });

  const orgMlh = await prisma.organization.upsert({
    where: { slug: 'major-league-hacking' },
    update: {},
    create: {
      name: 'Major League Hacking',
      slug: 'major-league-hacking',
      website: 'https://mlh.io',
      country: 'United States',
      verified: true,
      description: 'Official student hackathon league and fellowship incubator.',
    },
  });

  // 5. Seed Sources
  await prisma.source.upsert({
    where: { slug: 'openssf-feed' },
    update: {},
    create: {
      organizationId: orgOpenSSF.id,
      name: 'OpenSSF Announcements & Bounties',
      slug: 'openssf-feed',
      connectorType: 'rss_feed',
      url: 'https://openssf.org/feed',
      status: 'active',
      capabilities: {
        canSearch: false,
        canPaginate: true,
        rateLimitPerMin: 30,
        requiresAuth: false,
        isRealTime: false,
      },
      health: {
        lastSuccessfulCheck: new Date().toISOString(),
        nextCheck: new Date(Date.now() + 3600000).toISOString(),
        lastError: null,
        consecutiveFailures: 0,
        latencyMs: 340,
        totalItemsDiscovered: 42,
      },
    },
  });

  console.log('✅ Database seeded successfully with initial profile and sources.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
