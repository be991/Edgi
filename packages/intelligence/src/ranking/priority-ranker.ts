import { EligibilityStatus } from '@edgi/contracts';
import { EvaluatorOpportunity } from '../types';

export class PriorityRanker {
  /**
   * Calculates overall feed priority ranking score.
   * Higher priority floats to top of feed.
   */
  calculatePriority(
    relevanceScore: number,
    eligibilityStatus: EligibilityStatus,
    opp: EvaluatorOpportunity,
  ): number {
    let priority = relevanceScore;

    // 1. Eligibility adjustments
    switch (eligibilityStatus) {
      case 'eligible':
        priority += 15;
        break;
      case 'likely_eligible':
        priority += 10;
        break;
      case 'possibly_eligible':
        priority += 0;
        break;
      case 'unknown':
        priority -= 5;
        break;
      case 'ineligible':
        priority -= 200; // Moves to ineligible archive
        break;
    }

    // 2. Deadline Urgency adjustments
    if (opp.deadline) {
      const now = Date.now();
      const diffDays = (new Date(opp.deadline).getTime() - now) / (1000 * 60 * 60 * 24);
      if (diffDays < 0) {
        priority -= 500; // Expired
      } else if (diffDays <= 3) {
        priority += 5; // Imminent deadline
      } else if (diffDays <= 21) {
        priority += 10; // Prime submission window
      }
    }

    // 3. Organization Reliability adjustment
    if (opp.organization?.verified) {
      priority += 5;
    }

    return Math.round(priority);
  }
}
