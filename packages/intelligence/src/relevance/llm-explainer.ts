import { RelevanceBreakdown, EligibilityAssessment } from '@edgi/contracts';
import { EvaluatorUserProfile, EvaluatorOpportunity } from '../types';

export class RelevanceExplainer {
  /**
   * Generates a plain-English explanation for why this opportunity received its score.
   * LLM writes the explanation only; it never computes the score.
   */
  async generateExplanation(
    user: EvaluatorUserProfile,
    opp: EvaluatorOpportunity,
    breakdown: RelevanceBreakdown,
    eligibility: EligibilityAssessment,
  ): Promise<string> {
    // Deterministic fallback / template explanation (reproducible & fast)
    const highlights: string[] = [];

    if (breakdown.totalScore >= 80) {
      highlights.push(`High priority match (${breakdown.totalScore}%) for your ${user.yearOfStudy} Cyber Security trajectory.`);
    } else if (breakdown.totalScore >= 50) {
      highlights.push(`Moderate relevance (${breakdown.totalScore}%) for your current profile.`);
    } else {
      highlights.push(`Low relevance score (${breakdown.totalScore}%).`);
    }

    if (breakdown.skillsScore >= 80) {
      highlights.push('Strong intersection with your core technical focus in Application Security and vulnerability research.');
    }

    if (breakdown.geographyScore === 100) {
      highlights.push('Offers full remote flexibility from Lagos (UTC+1).');
    } else if (breakdown.geographyScore === 0) {
      highlights.push('Requires physical international attendance without travel funding.');
    }

    if (breakdown.benefitsScore === 100) {
      highlights.push('Includes confirmed financial stipend or equipment compensation.');
    }

    if (eligibility.status === 'ineligible') {
      highlights.push(`Note: You are currently evaluated as Ineligible due to: ${eligibility.blockers.join('; ')}.`);
    } else if (eligibility.status === 'unknown') {
      highlights.push('Eligibility is partially unknown; verify prerequisite details before applying.');
    }

    return highlights.join(' ');
  }
}
