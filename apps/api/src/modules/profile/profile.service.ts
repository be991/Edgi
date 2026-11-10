import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UserProfile, UpdateUserProfile } from '@edgi/contracts';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return {
        id: 'prof-001',
        userId,
        fullName: 'Bethel Okafor Egwuchukwu',
        email: 'bethelokafor34562@gmail.com',
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      id: profile.id,
      userId: profile.userId,
      fullName: profile.fullName,
      email: 'bethelokafor34562@gmail.com',
      headline: profile.headline,
      degree: profile.degree,
      major: profile.major,
      yearOfStudy: profile.yearOfStudy,
      university: profile.university,
      country: profile.country,
      timezone: profile.timezone,
      bio: profile.bio,
      skills: (profile.skills as string[]) || [],
      targetRoles: (profile.targetRoles as string[]) || [],
      interests: (profile.interests as string[]) || [],
      links: (profile.links as any) || {},
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  async updateProfile(userId: string, data: UpdateUserProfile): Promise<UserProfile> {
    const updated = await this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        fullName: data.fullName,
        headline: data.headline,
        degree: data.degree,
        major: data.major,
        yearOfStudy: data.yearOfStudy,
        university: data.university,
        country: data.country,
        timezone: data.timezone,
        bio: data.bio,
        skills: data.skills ? JSON.parse(JSON.stringify(data.skills)) : undefined,
        targetRoles: data.targetRoles ? JSON.parse(JSON.stringify(data.targetRoles)) : undefined,
        interests: data.interests ? JSON.parse(JSON.stringify(data.interests)) : undefined,
        links: data.links ? JSON.parse(JSON.stringify(data.links)) : undefined,
      },
      create: {
        userId,
        fullName: data.fullName || 'Bethel Okafor Egwuchukwu',
        headline: data.headline || '',
        degree: data.degree || 'Bachelor of Science: Cyber Security',
        major: data.major || 'Cyber Security',
        yearOfStudy: data.yearOfStudy || '200-level',
        university: data.university || 'Newgate University Minna',
        country: data.country || 'Nigeria (Kubwa, Abuja)',
        timezone: data.timezone || 'Africa/Lagos',
        bio: data.bio || '',
        skills: (data.skills as any) || [],
        targetRoles: (data.targetRoles as any) || [],
        interests: (data.interests as any) || [],
        links: (data.links as any) || {},
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      fullName: updated.fullName,
      email: 'bethelokafor34562@gmail.com',
      headline: updated.headline,
      degree: updated.degree,
      major: updated.major,
      yearOfStudy: updated.yearOfStudy,
      university: updated.university,
      country: updated.country,
      timezone: updated.timezone,
      bio: updated.bio,
      skills: (updated.skills as string[]) || [],
      targetRoles: (updated.targetRoles as string[]) || [],
      interests: (updated.interests as string[]) || [],
      links: (updated.links as any) || {},
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
