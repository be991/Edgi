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
      // Fallback seed profile for development
      return {
        id: 'prof-001',
        userId,
        fullName: 'Cyber Security Student & Developer',
        email: 'developer@edgi.local',
        headline: '200-level Cyber Security Student | Software & AppSec Developer',
        degree: 'B.Sc. Cybersecurity',
        major: 'Cybersecurity & Information Assurance',
        yearOfStudy: '200-level',
        university: 'University Technology Campus',
        country: 'Nigeria',
        timezone: 'Africa/Lagos',
        bio: 'Cyber Security undergraduate focused on Application Security, fintech security, and AI safety.',
        skills: ['Application Security', 'Penetration Testing', 'TypeScript', 'Python'],
        targetRoles: ['AppSec Intern', 'Security Engineer Fellow'],
        interests: ['Fintech Security', 'AI Safety & Red Teaming'],
        links: {
          github: 'https://github.com/developer-edgi',
          linkedin: 'https://linkedin.com/in/developer-edgi',
          portfolio: 'https://developer-edgi.dev',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      id: profile.id,
      userId: profile.userId,
      fullName: profile.fullName,
      email: 'developer@edgi.local',
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
        fullName: data.fullName || 'Student',
        headline: data.headline || '',
        degree: data.degree || '',
        major: data.major || '',
        yearOfStudy: data.yearOfStudy || '200-level',
        university: data.university || '',
        country: data.country || 'Nigeria',
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
      email: 'developer@edgi.local',
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
