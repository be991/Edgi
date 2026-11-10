import { OpportunityCategory } from '@edgi/contracts';
import { DetectionResult } from '../types';

export class OpportunityDetector {
  private static readonly HIGH_SIGNAL_KEYWORDS: Array<{ word: string; weight: number; category?: OpportunityCategory }> = [
    { word: 'fellowship', weight: 0.35, category: 'fellowship' },
    { word: 'internship', weight: 0.35, category: 'internship' },
    { word: 'intern', weight: 0.25, category: 'internship' },
    { word: 'apprenticeship', weight: 0.35, category: 'internship' },
    { word: 'apprentice', weight: 0.25, category: 'internship' },
    { word: 'hackathon', weight: 0.35, category: 'hackathon_ctf' },
    { word: 'ctf', weight: 0.35, category: 'hackathon_ctf' },
    { word: 'bug bounty', weight: 0.35, category: 'oss_bounty' },
    { word: 'grant', weight: 0.35, category: 'funding' },
    { word: 'funding', weight: 0.25, category: 'funding' },
    { word: 'residency', weight: 0.30, category: 'fellowship' },
    { word: 'accelerator', weight: 0.30, category: 'dev_programme' },
    { word: 'incubator', weight: 0.30, category: 'dev_programme' },
    { word: 'mentorship program', weight: 0.30, category: 'dev_programme' },
    { word: 'mentorship programme', weight: 0.30, category: 'dev_programme' },
    { word: 'call for applications', weight: 0.30 },
    { word: 'apply now', weight: 0.20 },
    { word: 'apply', weight: 0.15 },
    { word: 'eligibility', weight: 0.20 },
    { word: 'requirements', weight: 0.15 },
    { word: 'stipend', weight: 0.20 },
    { word: 'fully funded', weight: 0.25 },
    { word: 'deadline', weight: 0.25 },
    { word: 'closing date', weight: 0.25 },
    { word: 'apply by', weight: 0.20 },
  ];

  private static readonly NEGATIVE_SIGNALS: Array<{ word: string; penalty: number }> = [
    { word: 'privacy policy', penalty: 0.5 },
    { word: 'terms of service', penalty: 0.5 },
    { word: 'cookie notice', penalty: 0.3 },
    { word: 'all rights reserved', penalty: 0.1 },
    { word: 'unsubscribe', penalty: 0.2 },
    { word: 'breaking news', penalty: 0.4 },
    { word: 'opinion editorial', penalty: 0.4 },
  ];

  public static detect(text: string, title = ''): DetectionResult {
    const combined = `${title} ${text}`.toLowerCase();
    let score = 0;
    const reasons: string[] = [];
    const categoryVotes: Record<string, number> = {};

    // 1. Check positive signals
    for (const item of this.HIGH_SIGNAL_KEYWORDS) {
      if (combined.includes(item.word)) {
        score += item.weight;
        reasons.push(`Matched signal "${item.word}" (+${item.weight.toFixed(2)})`);
        if (item.category) {
          categoryVotes[item.category] = (categoryVotes[item.category] || 0) + item.weight;
        }
      }
    }

    // 2. Check date patterns (e.g., deadline: Nov 30, 2025)
    const deadlinePattern = /(?:deadline|closing date|apply by|applications close)[:\s]+(?:[a-z]{3,9}\s+\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{2}[/-]\d{2})/i;
    if (deadlinePattern.test(combined)) {
      score += 0.25;
      reasons.push('Detected explicit deadline date pattern (+0.25)');
    }

    // 3. Apply negative penalties
    for (const neg of this.NEGATIVE_SIGNALS) {
      if (combined.includes(neg.word)) {
        score = Math.max(0, score - neg.penalty);
        reasons.push(`Penalized by negative signal "${neg.word}" (-${neg.penalty.toFixed(2)})`);
      }
    }

    // Normalize score to max 1.0
    const finalScore = Math.min(Math.round(score * 100) / 100, 1.0);
    const isCandidate = finalScore >= 0.35;

    // Pick top category estimate
    let bestCategory: OpportunityCategory | undefined;
    let maxCategoryWeight = 0;
    for (const [cat, w] of Object.entries(categoryVotes)) {
      if (w > maxCategoryWeight) {
        maxCategoryWeight = w;
        bestCategory = cat as OpportunityCategory;
      }
    }

    return {
      isCandidate,
      score: finalScore,
      categoryEstimate: bestCategory || (isCandidate ? 'fellowship' : undefined),
      reasons,
    };
  }
}
