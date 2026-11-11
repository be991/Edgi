import { RelevanceBreakdown } from '@edgi/contracts';
import {
  EvaluatorUserProfile,
  EvaluatorOpportunity,
  RelevanceDimensionWeights,
  DEFAULT_WEIGHTS,
} from '../types';

export class WeightedRelevanceScorer {
  /**
   * Deterministic weighted score across 7 distinct dimensions.
   * Total score is between 0 and 100.
   * Math is pure and reproducible; LLM does NOT calculate this score.
   */
  calculate(
    user: EvaluatorUserProfile,
    opp: EvaluatorOpportunity,
    customWeights?: Partial<RelevanceDimensionWeights>,
  ): RelevanceBreakdown {
    const weights: RelevanceDimensionWeights = {
      ...DEFAULT_WEIGHTS,
      ...customWeights,
    };

    const factors: string[] = [];

    // 1. Category Alignment (25%)
    const targetCategories = ['fellowship', 'internship', 'hackathon_ctf', 'dev_programme', 'oss_bounty', 'funding'];
    let categoryScore = 40;
    if (targetCategories.includes(opp.category.toLowerCase())) {
      categoryScore = 100;
      factors.push(`Category "${opp.category.replace('_', ' ')}" matches your primary target programmes.`);
    } else {
      factors.push(`Category "${opp.category}" is outside primary focus.`);
    }

    // 2. Skills & Tech Alignment (20%)
    const oppText = `${opp.title} ${opp.summary} ${opp.tags.join(' ')}`.toLowerCase();
    const userSkills = user.skills.map((s) => s.toLowerCase());
    const matchedSkills = userSkills.filter((s) => oppText.includes(s));

    let skillsScore = 30;
    if (matchedSkills.length >= 3) {
      skillsScore = 100;
      factors.push(`Strong skills alignment on ${matchedSkills.slice(0, 3).join(', ')}.`);
    } else if (matchedSkills.length === 2) {
      skillsScore = 85;
      factors.push(`Solid technical overlap with ${matchedSkills.join(', ')}.`);
    } else if (matchedSkills.length === 1) {
      skillsScore = 65;
      factors.push(`Partial skill match on ${matchedSkills[0]}.`);
    } else {
      factors.push('General software/computing opportunity without specialized AppSec tags.');
    }

    // 3. Education & Experience Alignment (15%)
    let educationScore = 75;
    const isStudentFriendly = /undergraduate|student|fellowship|intern|internship|early career|entry level/i.test(oppText);
    const isSeniorOnly = /10\+ years|principal|director|lead architect/i.test(oppText);

    if (isSeniorOnly) {
      educationScore = 10;
      factors.push('Opportunity requires senior industry background.');
    } else if (isStudentFriendly) {
      educationScore = 100;
      factors.push('Tailored for enrolled university students and undergraduates.');
    } else {
      factors.push('Experience level flexible or unspecified.');
    }

    // 4. Geographic Suitability (15%)
    let geographyScore = 40;
    const isRemote = opp.locations.some((l) => l.isRemote);
    const hostCountry = opp.organization?.country || opp.locations[0]?.country || 'Unknown';
    const hasTravel = opp.benefits?.some((b) => /travel|flight|hotel/i.test(b));

    if (isRemote) {
      geographyScore = 100;
      factors.push('Worldwide remote flexibility from Lagos/Nigeria.');
    } else if (hostCountry.toLowerCase() === 'nigeria') {
      geographyScore = 95;
      factors.push('Local on-site opportunity in Nigeria.');
    } else if (hasTravel) {
      geographyScore = 75;
      factors.push(`On-site in ${hostCountry} with international flight/travel funding.`);
    } else {
      geographyScore = 0;
      factors.push(`Physical on-site in ${hostCountry} without travel assistance.`);
    }

    // 5. Benefits & Funding (10%)
    let benefitsScore = 50;
    const isPaid = (opp.stipend?.min && opp.stipend.min > 0) || !opp.stipend?.isUnpaid;
    const hasFundingKeywords = /stipend|\$|grant|funded|prize|reward|euro|usd|ngn/i.test(oppText);

    if (opp.stipend?.isUnpaid) {
      benefitsScore = 10;
      factors.push('Unpaid role; funding not provided.');
    } else if (isPaid || hasFundingKeywords) {
      benefitsScore = 100;
      factors.push(`Funded terms: ${opp.stipend?.description || 'Financial stipend / award confirmed.'}`);
    } else {
      factors.push('Compensation terms undisclosed.');
    }

    // 6. Organization & Industry Alignment (10%)
    let orgScore = 60;
    const isHighValueHost = /openssf|seal|linux foundation|google|defcon|flutterwave|paystack|microsoft/i.test(opp.organization?.name || '');
    if (isHighValueHost) {
      orgScore = 100;
      factors.push(`Priority organization: ${opp.organization.name}.`);
    } else if (opp.organization?.verified) {
      orgScore = 85;
      factors.push(`Verified publisher: ${opp.organization.name}.`);
    } else {
      factors.push(`Organization: ${opp.organization?.name || 'Independent host'}.`);
    }

    // 7. Timing & Practicality (5%)
    let timingScore = 90; // Default rolling/open
    if (opp.deadline) {
      const now = Date.now();
      const deadlineMs = new Date(opp.deadline).getTime();
      const diffDays = (deadlineMs - now) / (1000 * 60 * 60 * 24);

      if (diffDays < 0) {
        timingScore = 0;
        factors.push('Deadline has passed (expired).');
      } else if (diffDays <= 2) {
        timingScore = 25;
        factors.push('Urgent: Closes in less than 48 hours.');
      } else if (diffDays >= 10 && diffDays <= 60) {
        timingScore = 100;
        factors.push(`Healthy application window (${Math.round(diffDays)} days remaining).`);
      } else {
        timingScore = 80;
      }
    } else {
      factors.push('Rolling application intake with open timeline.');
    }

    // Weighted Sum
    const totalScore = Math.round(
      categoryScore * weights.category +
      skillsScore * weights.skills +
      educationScore * weights.education +
      geographyScore * weights.geography +
      benefitsScore * weights.benefits +
      orgScore * weights.organization +
      timingScore * weights.timing,
    );

    return {
      categoryScore,
      skillsScore,
      educationScore,
      geographyScore,
      benefitsScore,
      orgScore,
      timingScore,
      totalScore: Math.min(100, Math.max(0, totalScore)),
      weights: {
        category: weights.category,
        skills: weights.skills,
        education: weights.education,
        geography: weights.geography,
        benefits: weights.benefits,
        organization: weights.organization,
        timing: weights.timing,
      },
      factors,
    };
  }
}
