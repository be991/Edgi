import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for Edgi with Bethel Okafor Egwuchukwu profile...');

  // 1. Create primary user
  const user = await prisma.user.upsert({
    where: { email: 'bethelokafor34562@gmail.com' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'bethelokafor34562@gmail.com',
    },
  });

  console.log(`👤 Seeded User: ${user.email} (${user.id})`);

  // 2. Create Bethel's Profile
  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      fullName: 'Bethel Okafor Egwuchukwu',
      headline: '200-level Cyber Security Student (CGPA: 4.10) | Senior Software Engineer & Tech Lead',
      degree: 'Bachelor of Science: Cyber Security',
      major: 'Cyber Security (Dean\'s List, Fall 2025)',
      yearOfStudy: '200-level (Expected 2028)',
      university: 'Newgate University Minna',
      country: 'Nigeria (Kubwa, Abuja)',
      timezone: 'Africa/Lagos',
      bio: 'Cyber Security student (CGPA: 4.10) and software engineer / technical lead. Deep practical background in fintech payment infrastructure, application security, AES-256-GCM encryption, Web3 platforms, and applied AI agents (Gemini RAG). Actively targeting funded international fellowships, AppSec programmes, CTF competitions, and research opportunities.',
      skills: [
        'Application Security',
        'Penetration Testing',
        'Next.js',
        'React.js',
        'TypeScript',
        'Node.js',
        'NestJS',
        'PostgreSQL',
        'Redis',
        'Supabase',
        'Firebase',
        'Python',
        'Docker',
        'AES-256-GCM Encryption',
        'AWS',
        'Web3 & Hedera',
        'RAG & AI Agents',
        'PHP & Laravel',
      ],
      targetRoles: [
        'AppSec Research Fellow',
        'Fintech Security Engineer',
        'Full Stack Security Developer',
        'International Cyber Security Intern',
      ],
      interests: [
        'Fintech Security & Compliance',
        'AI Safety & Vulnerability Research',
        'Funded Global Fellowships',
        'Open Source Security Bounties',
        'CTF Blue/Red Team Competitions',
      ],
      links: {
        github: 'https://github.com/be991',
        portfolio: 'https://bethelegwuchukwu.vercel.app/',
        linkedin: '',
        cvUrl: 'https://bethelegwuchukwu.vercel.app/',
      },
    },
  });

  // 3. Create Preferences
  await prisma.userPreferences.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      targetCategories: [
        'fellowship',
        'internship',
        'hackathon_ctf',
        'dev_programme',
        'funding',
        'oss_bounty',
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
      description: 'Cross-industry organization advancing open-source software security and fuzzing.',
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
      description: 'Official student hackathon league and global fellowship incubator.',
    },
  });

  // 5. Seed Initial Sources
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
        latencyMs: 310,
        totalItemsDiscovered: 42,
      },
    },
  });

  console.log('✅ Database seeded successfully with Bethel Okafor Egwuchukwu profile and initial sources.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
