import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UserPreferences, UpdateUserPreferences } from '@edgi/contracts';

@Injectable()
export class PreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async getPreferences(userId: string): Promise<UserPreferences> {
    const pref = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });

    if (!pref) {
      return {
        id: 'pref-001',
        userId,
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
        excludedKeywords: ['senior lead', 'phd only'],
        monthlyBudgetCap: 10.0,
        searchBudgetCap: 4.0,
        llmBudgetCap: 5.0,
        bufferBudgetCap: 1.0,
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      id: pref.id,
      userId: pref.userId,
      targetCategories: pref.targetCategories as any,
      minRelevanceScore: pref.minRelevanceScore,
      notifyInApp: pref.notifyInApp,
      notifyEmail: pref.notifyEmail,
      digestFrequency: pref.digestFrequency as any,
      digestTime: pref.digestTime,
      reminderDays: pref.reminderDays,
      excludedKeywords: pref.excludedKeywords,
      monthlyBudgetCap: pref.monthlyBudgetCap,
      searchBudgetCap: pref.searchBudgetCap,
      llmBudgetCap: pref.llmBudgetCap,
      bufferBudgetCap: pref.bufferBudgetCap,
      updatedAt: pref.updatedAt.toISOString(),
    };
  }

  async updatePreferences(userId: string, data: UpdateUserPreferences): Promise<UserPreferences> {
    const updated = await this.prisma.userPreferences.upsert({
      where: { userId },
      update: {
        targetCategories: data.targetCategories,
        minRelevanceScore: data.minRelevanceScore,
        notifyInApp: data.notifyInApp,
        notifyEmail: data.notifyEmail,
        digestFrequency: data.digestFrequency,
        digestTime: data.digestTime,
        reminderDays: data.reminderDays,
        excludedKeywords: data.excludedKeywords,
        monthlyBudgetCap: data.monthlyBudgetCap,
        searchBudgetCap: data.searchBudgetCap,
        llmBudgetCap: data.llmBudgetCap,
        bufferBudgetCap: data.bufferBudgetCap,
      },
      create: {
        userId,
        targetCategories: data.targetCategories || [
          'internship',
          'fellowship',
          'hackathon_ctf',
          'dev_programme',
          'oss_bounty',
          'funding',
        ],
        minRelevanceScore: data.minRelevanceScore ?? 65,
        notifyInApp: data.notifyInApp ?? true,
        notifyEmail: data.notifyEmail ?? true,
        digestFrequency: data.digestFrequency ?? 'daily',
        digestTime: data.digestTime ?? '08:00',
        reminderDays: data.reminderDays ?? [14, 7, 3, 1],
        excludedKeywords: data.excludedKeywords ?? [],
        monthlyBudgetCap: data.monthlyBudgetCap ?? 10.0,
        searchBudgetCap: data.searchBudgetCap ?? 4.0,
        llmBudgetCap: data.llmBudgetCap ?? 5.0,
        bufferBudgetCap: data.bufferBudgetCap ?? 1.0,
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      targetCategories: updated.targetCategories as any,
      minRelevanceScore: updated.minRelevanceScore,
      notifyInApp: updated.notifyInApp,
      notifyEmail: updated.notifyEmail,
      digestFrequency: updated.digestFrequency as any,
      digestTime: updated.digestTime,
      reminderDays: updated.reminderDays,
      excludedKeywords: updated.excludedKeywords,
      monthlyBudgetCap: updated.monthlyBudgetCap,
      searchBudgetCap: updated.searchBudgetCap,
      llmBudgetCap: updated.llmBudgetCap,
      bufferBudgetCap: updated.bufferBudgetCap,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
