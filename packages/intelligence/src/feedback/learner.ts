import { RelevanceDimensionWeights, DEFAULT_WEIGHTS } from '../types';

export interface LearnedWeightAdjustment {
  dimension: keyof RelevanceDimensionWeights;
  delta: number;
  reason: string;
}

export class FeedbackLearner {
  private activeDeltas: Record<keyof RelevanceDimensionWeights, number> = {
    category: 0,
    skills: 0,
    education: 0,
    geography: 0,
    benefits: 0,
    organization: 0,
    timing: 0,
  };

  /**
   * Adjusts weights with a strict +/- 0.05 (5%) bounding box.
   * Hard preferences are NEVER altered automatically.
   */
  applyFeedback(
    action: 'save' | 'apply' | 'thumbs_up' | 'thumbs_down' | 'dismiss',
    category?: string,
    reason?: string,
  ): RelevanceDimensionWeights {
    const MAX_DELTA = 0.05; // 5% maximum deviation limit
    const MIN_DELTA = -0.05;

    switch (action) {
      case 'save':
      case 'apply':
        // Positive reinforcement on skills and category
        this.activeDeltas.category = Math.min(MAX_DELTA, this.activeDeltas.category + 0.01);
        this.activeDeltas.skills = Math.min(MAX_DELTA, this.activeDeltas.skills + 0.01);
        break;

      case 'thumbs_up':
        this.activeDeltas.skills = Math.min(MAX_DELTA, this.activeDeltas.skills + 0.02);
        this.activeDeltas.organization = Math.min(MAX_DELTA, this.activeDeltas.organization + 0.01);
        break;

      case 'thumbs_down':
      case 'dismiss':
        if (reason === 'unpaid' || reason === 'low_stipend') {
          this.activeDeltas.benefits = Math.min(MAX_DELTA, this.activeDeltas.benefits + 0.02);
        } else if (reason === 'too_senior' || reason === 'experience_mismatch') {
          this.activeDeltas.education = Math.min(MAX_DELTA, this.activeDeltas.education + 0.02);
        } else {
          this.activeDeltas.category = Math.max(MIN_DELTA, this.activeDeltas.category - 0.01);
        }
        break;
    }

    return this.getEffectiveWeights();
  }

  getEffectiveWeights(): RelevanceDimensionWeights {
    const rawWeights = {
      category: Math.max(0.05, DEFAULT_WEIGHTS.category + this.activeDeltas.category),
      skills: Math.max(0.05, DEFAULT_WEIGHTS.skills + this.activeDeltas.skills),
      education: Math.max(0.05, DEFAULT_WEIGHTS.education + this.activeDeltas.education),
      geography: Math.max(0.05, DEFAULT_WEIGHTS.geography + this.activeDeltas.geography),
      benefits: Math.max(0.05, DEFAULT_WEIGHTS.benefits + this.activeDeltas.benefits),
      organization: Math.max(0.05, DEFAULT_WEIGHTS.organization + this.activeDeltas.organization),
      timing: Math.max(0.02, DEFAULT_WEIGHTS.timing + this.activeDeltas.timing),
    };

    // Normalize so sum == 1.0
    const sum = Object.values(rawWeights).reduce((a, b) => a + b, 0);
    return {
      category: Number((rawWeights.category / sum).toFixed(4)),
      skills: Number((rawWeights.skills / sum).toFixed(4)),
      education: Number((rawWeights.education / sum).toFixed(4)),
      geography: Number((rawWeights.geography / sum).toFixed(4)),
      benefits: Number((rawWeights.benefits / sum).toFixed(4)),
      organization: Number((rawWeights.organization / sum).toFixed(4)),
      timing: Number((rawWeights.timing / sum).toFixed(4)),
    };
  }

  getLearnedDeltas(): Record<keyof RelevanceDimensionWeights, number> {
    return { ...this.activeDeltas };
  }

  resetWeights(): RelevanceDimensionWeights {
    this.activeDeltas = {
      category: 0,
      skills: 0,
      education: 0,
      geography: 0,
      benefits: 0,
      organization: 0,
      timing: 0,
    };
    return { ...DEFAULT_WEIGHTS };
  }
}
