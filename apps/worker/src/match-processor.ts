import { Job } from 'bullmq';
import { prisma } from '@edgi/database';
import {
  PersonalIntelligenceEngine,
  EvaluatorUserProfile,
  EvaluatorOpportunity,
  RelevanceDimensionWeights,
  DEFAULT_WEIGHTS,
} from '@edgi/intelligence';

export interface MatchJobData {
  opportunityId?: string;
  userId?: string;
  mode?: 'single_opportunity' | 'full_recalculation';
}

/**
 * Maps a Prisma User and UserProfile to an EvaluatorUserProfile.
 */
function mapToEvaluatorProfile(user: any): EvaluatorUserProfile {
  const profile = user.profile;
  const skills: string[] = Array.isArray(profile?.skills) ? (profile.skills as string[]) : [];
  const targetRoles: string[] = Array.isArray(profile?.targetRoles) ? (profile.targetRoles as string[]) : [];
  const interests: string[] = Array.isArray(profile?.interests) ? (profile.interests as string[]) : [];

  // Parse graduation year if present in yearOfStudy or headline (e.g. "Expected 2028")
  let graduationYear: number | null = null;
  const gradMatch = (profile?.yearOfStudy || '').match(/\b(202[4-9]|203[0-5])\b/);
  if (gradMatch) {
    graduationYear = parseInt(gradMatch[1], 10);
  }

  return {
    id: user.id,
    fullName: profile?.fullName || 'Bethel Okafor Egwuchukwu',
    headline: profile?.headline || '200-level Cyber Security Student',
    degree: profile?.degree || 'Bachelor of Science',
    major: profile?.major || 'Cyber Security',
    yearOfStudy: profile?.yearOfStudy || '200-level',
    university: profile?.university || 'Newgate University Minna',
    country: profile?.country?.includes('Nigeria') ? 'Nigeria' : profile?.country || 'Nigeria',
    nationality: 'Nigerian',
    timezone: profile?.timezone || 'Africa/Lagos',
    graduationYear,
    skills,
    targetRoles,
    interests,
    experienceYears: 2, // Practical experience
    gpa: 4.10,
    hasPassport: true,
    workAuthorizations: ['Nigeria'],
  };
}

/**
 * Maps a Prisma Opportunity to an EvaluatorOpportunity.
 */
function mapToEvaluatorOpportunity(opp: any): EvaluatorOpportunity {
  const rawRequirements = (opp.eligibilityReqs || []).map((req: any) => ({
    type: req.requirementType,
    description: req.description,
    isMandatory: req.isMandatory,
  }));

  const locations = (opp.locations || []).map((loc: any) => ({
    country: loc.country || null,
    isRemote: Boolean(loc.isRemote),
    remoteRegions: loc.remoteRegions || [],
  }));

  const benefits = (opp.benefits || []).map((b: any) => b.description || b.benefitType);

  return {
    id: opp.id,
    title: opp.title,
    slug: opp.slug,
    category: opp.category,
    organization: {
      name: opp.organization?.name || 'Independent Publisher',
      country: opp.organization?.country || null,
      verified: opp.organization?.verified || false,
    },
    summary: opp.summary,
    deadline: opp.deadline ? opp.deadline.toISOString() : null,
    stipend: {
      min: opp.stipendMin,
      max: opp.stipendMax,
      currency: opp.stipendCurrency || 'USD',
      isUnpaid: Boolean(opp.isUnpaid),
      description: opp.stipendPeriod || undefined,
    },
    locations: locations.length > 0 ? locations : [{ country: null, isRemote: false, remoteRegions: [] }],
    benefits,
    tags: [],
    applyUrl: opp.applyUrl,
    rawRequirements,
    confidence: opp.confidence,
    verificationStatus: opp.verificationStatus,
  };
}

/**
 * Evaluates and persists eligibility assessment & relevance score for a given opportunity and user.
 */
export async function calculateOpportunityMatch(
  opportunityId: string,
  userId?: string,
  customWeights?: Partial<RelevanceDimensionWeights>
) {
  // 1. Resolve User
  let user: any;
  if (userId) {
    user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, preferences: true },
    });
  } else {
    user = await prisma.user.findFirst({
      include: { profile: true, preferences: true },
    });
  }

  if (!user) {
    console.warn(`[Match Processor] No user found for match calculation.`);
    return null;
  }

  // 2. Fetch Opportunity
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    include: {
      organization: true,
      locations: true,
      benefits: true,
      eligibilityReqs: true,
    },
  });

  if (!opportunity) {
    console.warn(`[Match Processor] Opportunity #${opportunityId} not found.`);
    return null;
  }

  // 3. Map inputs
  const evalProfile = mapToEvaluatorProfile(user);
  const evalOpp = mapToEvaluatorOpportunity(opportunity);

  // 4. Run Personal Intelligence Engine
  const engine = new PersonalIntelligenceEngine();
  const assessment = await engine.evaluateOpportunity(evalProfile, evalOpp, customWeights);

  // 5. Persist EligibilityAssessment
  await prisma.eligibilityAssessment.upsert({
    where: {
      opportunityId_userId: {
        opportunityId: opportunity.id,
        userId: user.id,
      },
    },
    update: {
      status: assessment.eligibility.status,
      reasons: assessment.eligibility.reasons,
      blockers: assessment.eligibility.blockers,
      missingInfo: assessment.eligibility.missingInfo,
      criteriaResults: assessment.eligibility.criteriaResults as any,
      engineVersion: assessment.eligibility.engineVersion,
      evaluatedAt: new Date(),
    },
    create: {
      opportunityId: opportunity.id,
      userId: user.id,
      status: assessment.eligibility.status,
      reasons: assessment.eligibility.reasons,
      blockers: assessment.eligibility.blockers,
      missingInfo: assessment.eligibility.missingInfo,
      criteriaResults: assessment.eligibility.criteriaResults as any,
      engineVersion: assessment.eligibility.engineVersion,
      evaluatedAt: new Date(),
    },
  });

  // 6. Persist OpportunityMatch
  const matchRecord = await prisma.opportunityMatch.upsert({
    where: {
      opportunityId_userId: {
        opportunityId: opportunity.id,
        userId: user.id,
      },
    },
    update: {
      relevanceScore: assessment.relevance.totalScore,
      relevanceFactors: assessment.relevance.factors as any,
      eligibilityStatus: assessment.eligibility.status,
      eligibilityAssessment: assessment.eligibility as any,
      explanation: assessment.explanation,
    },
    create: {
      opportunityId: opportunity.id,
      userId: user.id,
      relevanceScore: assessment.relevance.totalScore,
      relevanceFactors: assessment.relevance.factors as any,
      eligibilityStatus: assessment.eligibility.status,
      eligibilityAssessment: assessment.eligibility as any,
      explanation: assessment.explanation,
    },
  });

  console.log(
    `[Match Processor] Scored Opportunity "${opportunity.title}": Relevance ${assessment.relevance.totalScore}/100 | Eligibility: ${assessment.eligibility.status}`
  );

  return {
    opportunityId: opportunity.id,
    relevanceScore: assessment.relevance.totalScore,
    eligibilityStatus: assessment.eligibility.status,
    priority: assessment.priority,
  };
}

/**
 * BullMQ Job Handler for Match Processing
 */
export async function processMatchJob(job: Job<MatchJobData>) {
  const { opportunityId, userId, mode = 'single_opportunity' } = job.data;

  if (mode === 'single_opportunity' && opportunityId) {
    return calculateOpportunityMatch(opportunityId, userId);
  }

  if (mode === 'full_recalculation') {
    console.log(`[Match Processor] Starting full recalculation for all opportunities...`);
    const allOpps = await prisma.opportunity.findMany({ select: { id: true } });
    const results = [];
    for (const opp of allOpps) {
      const res = await calculateOpportunityMatch(opp.id, userId);
      if (res) results.push(res);
    }
    return {
      totalProcessed: results.length,
      mode: 'full_recalculation',
    };
  }

  return { status: 'noop' };
}
