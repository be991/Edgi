export * from './types';
export * from './eligibility/geography-gate';
export * from './eligibility/rule-evaluator';
export * from './relevance/weighted-scorer';
export * from './relevance/llm-explainer';
export * from './ranking/priority-ranker';
export * from './feedback/learner';
export * from './completeness/profile-meter';

import {
  EvaluatorUserProfile,
  EvaluatorOpportunity,
  RelevanceDimensionWeights,
} from './types';
import { EligibilityRuleEvaluator } from './eligibility/rule-evaluator';
import { WeightedRelevanceScorer } from './relevance/weighted-scorer';
import { RelevanceExplainer } from './relevance/llm-explainer';
import { PriorityRanker } from './ranking/priority-ranker';
import { FeedbackLearner } from './feedback/learner';
import { ProfileCompletenessMeter } from './completeness/profile-meter';

export class PersonalIntelligenceEngine {
  private eligibilityEvaluator = new EligibilityRuleEvaluator();
  private relevanceScorer = new WeightedRelevanceScorer();
  private explainer = new RelevanceExplainer();
  private ranker = new PriorityRanker();
  private learner = new FeedbackLearner();
  private profileMeter = new ProfileCompletenessMeter();

  async evaluateOpportunity(
    user: EvaluatorUserProfile,
    opp: EvaluatorOpportunity,
    customWeights?: Partial<RelevanceDimensionWeights>,
  ) {
    const eligibility = this.eligibilityEvaluator.evaluate(user, opp);
    const relevance = this.relevanceScorer.calculate(user, opp, customWeights);
    const explanation = await this.explainer.generateExplanation(user, opp, relevance, eligibility);
    const priority = this.ranker.calculatePriority(relevance.totalScore, eligibility.status, opp);

    return {
      eligibility,
      relevance,
      explanation,
      priority,
    };
  }

  getProfileCompleteness(profile: EvaluatorUserProfile) {
    return this.profileMeter.calculate(profile);
  }

  getLearner() {
    return this.learner;
  }
}
