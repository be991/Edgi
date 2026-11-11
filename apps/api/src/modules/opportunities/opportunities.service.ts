import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import {
  PersonalIntelligenceEngine,
  EvaluatorUserProfile,
  EvaluatorOpportunity,
  RelevanceDimensionWeights,
  DEFAULT_WEIGHTS,
} from '@edgi/intelligence';

@Injectable()
export class OpportunitiesService {
  private engine = new PersonalIntelligenceEngine();
  private learner = this.engine.getLearner();
  private currentWeights: RelevanceDimensionWeights = { ...DEFAULT_WEIGHTS };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to retrieve Bethel's active profile or fallback default.
   */
  private async getActiveProfile(): Promise<EvaluatorUserProfile> {
    const user = await this.prisma.user.findFirst({
      include: { profile: true, preferences: true },
    });

    if (user?.profile) {
      const p = user.profile;
      const skills = Array.isArray(p.skills) ? (p.skills as string[]) : [];
      const targetRoles = Array.isArray(p.targetRoles) ? (p.targetRoles as string[]) : [];
      const interests = Array.isArray(p.interests) ? (p.interests as string[]) : [];

      let graduationYear: number | null = null;
      const match = (p.yearOfStudy || '').match(/\b(202[4-9]|203[0-5])\b/);
      if (match) graduationYear = parseInt(match[1], 10);

      return {
        id: user.id,
        fullName: p.fullName,
        headline: p.headline,
        degree: p.degree,
        major: p.major,
        yearOfStudy: p.yearOfStudy,
        university: p.university,
        country: 'Nigeria',
        nationality: 'Nigerian',
        timezone: p.timezone,
        graduationYear,
        skills,
        targetRoles,
        interests,
        experienceYears: 2,
        gpa: 4.10,
        hasPassport: true,
        workAuthorizations: ['Nigeria'],
      };
    }

    // Default target persona: Bethel Okafor Egwuchukwu
    return {
      fullName: 'Bethel Okafor Egwuchukwu',
      headline: '200-level Cyber Security Student (CGPA: 4.10)',
      degree: 'Bachelor of Science: Cyber Security',
      major: 'Cyber Security',
      yearOfStudy: '200-level (Expected 2028)',
      university: 'Newgate University Minna',
      country: 'Nigeria',
      nationality: 'Nigerian',
      timezone: 'Africa/Lagos',
      graduationYear: 2028,
      skills: [
        'Application Security',
        'Penetration Testing',
        'Next.js',
        'TypeScript',
        'Python',
        'Docker',
        'AES-256-GCM Encryption',
        'Web3 & Hedera',
        'RAG & AI Agents',
      ],
      targetRoles: ['AppSec Research Fellow', 'Fintech Security Engineer', 'Cyber Security Intern'],
      interests: ['Fintech Security', 'AI Safety & Vulnerability Research', 'Funded Global Fellowships'],
      experienceYears: 2,
      gpa: 4.10,
      hasPassport: true,
      workAuthorizations: ['Nigeria'],
    };
  }

  /**
   * Helper to map Prisma Opportunity to EvaluatorOpportunity.
   */
  private mapOpportunity(opp: any): EvaluatorOpportunity {
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
        name: opp.organization?.name || 'Global Publisher',
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
      tags: ['Cyber Security', 'AppSec'],
      applyUrl: opp.applyUrl,
      rawRequirements,
      confidence: opp.confidence,
      verificationStatus: opp.verificationStatus,
    };
  }

  /**
   * GET /opportunities/recommended
   * Returns ranked, explainable opportunities with dual assessments.
   */
  async getRecommended(query: { tab?: string; openToNigeria?: string; category?: string }) {
    const profile = await this.getActiveProfile();
    const opportunities = await this.prisma.opportunity.findMany({
      include: {
        organization: true,
        locations: true,
        benefits: true,
        eligibilityReqs: true,
        eligibilityAssessments: true,
        matches: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const evaluated = await Promise.all(
      opportunities.map(async (opp) => {
        const evalOpp = this.mapOpportunity(opp);
        const assessment = await this.engine.evaluateOpportunity(profile, evalOpp, this.currentWeights);

        // Check if explicitly open to Nigeria
        const isNigeriaResident = evalOpp.locations.some(
          (l) => l.isRemote || (l.country && /nigeria/i.test(l.country))
        );
        const hasNigeriaBlocker = assessment.eligibility.blockers.some((b) =>
          /nigeria|resident|citizenship|visa/i.test(b)
        );
        const isOpenToNigeria = isNigeriaResident && !hasNigeriaBlocker;

        return {
          id: opp.id,
          canonicalUrl: opp.canonicalUrl,
          title: opp.title,
          slug: opp.slug,
          summary: opp.summary,
          organization: opp.organization,
          category: opp.category,
          verificationStatus: opp.verificationStatus,
          confidence: opp.confidence,
          publishedAt: opp.publishedAt?.toISOString() || null,
          deadline: opp.deadline?.toISOString() || null,
          deadlineTz: opp.deadlineTz,
          isDeadlineEstimated: opp.isDeadlineEstimated,
          stipend: opp.stipendMin
            ? { min: opp.stipendMin, max: opp.stipendMax, currency: opp.stipendCurrency, period: opp.stipendPeriod }
            : null,
          locations: opp.locations.map((l) => ({
            country: l.country,
            isRemote: l.isRemote,
            remoteRegions: l.remoteRegions,
          })),
          benefits: opp.benefits.map((b) => b.description || b.benefitType),
          tags: ['Cyber Security', 'AppSec'],
          applyUrl: opp.applyUrl,
          // Phase 5 Intelligence additions
          relevanceScore: assessment.relevance.totalScore,
          eligibilityStatus: assessment.eligibility.status,
          priority: assessment.priority,
          relevanceFactors: assessment.relevance.factors,
          relevanceBreakdown: assessment.relevance,
          eligibilityAssessment: assessment.eligibility,
          explanation: assessment.explanation,
          isOpenToNigeria,
          createdAt: opp.createdAt.toISOString(),
          updatedAt: opp.updatedAt.toISOString(),
        };
      })
    );

    // Apply Filters
    let filtered = evaluated;

    if (query.tab === 'top') {
      filtered = filtered.filter((o) =>
        ['eligible', 'likely_eligible', 'possibly_eligible'].includes(o.eligibilityStatus)
      );
    } else if (query.tab === 'verify_first') {
      filtered = filtered.filter((o) => o.eligibilityStatus === 'unknown');
    } else if (query.tab === 'ineligible') {
      filtered = filtered.filter((o) => o.eligibilityStatus === 'ineligible');
    }

    if (query.openToNigeria === 'true') {
      filtered = filtered.filter((o) => o.isOpenToNigeria);
    }

    if (query.category) {
      filtered = filtered.filter((o) => o.category === query.category);
    }

    // Sort by Priority descending
    filtered.sort((a, b) => b.priority - a.priority);

    return {
      opportunities: filtered,
      total: filtered.length,
      tabCounts: {
        all: evaluated.length,
        top: evaluated.filter((o) =>
          ['eligible', 'likely_eligible', 'possibly_eligible'].includes(o.eligibilityStatus)
        ).length,
        verify_first: evaluated.filter((o) => o.eligibilityStatus === 'unknown').length,
        ineligible: evaluated.filter((o) => o.eligibilityStatus === 'ineligible').length,
      },
    };
  }

  /**
   * GET /opportunities/:slug
   */
  async getOpportunity(slug: string) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      include: {
        organization: true,
        locations: true,
        benefits: true,
        eligibilityReqs: true,
        evidences: true,
      },
    });

    if (!opp) {
      throw new NotFoundException(`Opportunity with identifier "${slug}" not found.`);
    }

    const profile = await this.getActiveProfile();
    const evalOpp = this.mapOpportunity(opp);
    const assessment = await this.engine.evaluateOpportunity(profile, evalOpp, this.currentWeights);

    return {
      id: opp.id,
      canonicalUrl: opp.canonicalUrl,
      title: opp.title,
      slug: opp.slug,
      summary: opp.summary,
      organization: opp.organization,
      category: opp.category,
      verificationStatus: opp.verificationStatus,
      confidence: opp.confidence,
      publishedAt: opp.publishedAt?.toISOString() || null,
      deadline: opp.deadline?.toISOString() || null,
      deadlineTz: opp.deadlineTz,
      isDeadlineEstimated: opp.isDeadlineEstimated,
      stipend: opp.stipendMin
        ? { min: opp.stipendMin, max: opp.stipendMax, currency: opp.stipendCurrency, period: opp.stipendPeriod }
        : null,
      locations: opp.locations.map((l) => ({
        country: l.country,
        isRemote: l.isRemote,
        remoteRegions: l.remoteRegions,
      })),
      benefits: opp.benefits.map((b) => b.description || b.benefitType),
      tags: ['Cyber Security', 'AppSec'],
      applyUrl: opp.applyUrl,
      evidence: opp.evidences.map((e) => ({
        fieldName: e.fieldName,
        extractedValue: e.extractedValue,
        confidence: e.confidence,
        snippet: e.snippet,
        extractedAt: e.extractedAt.toISOString(),
      })),
      relevanceScore: assessment.relevance.totalScore,
      eligibilityStatus: assessment.eligibility.status,
      priority: assessment.priority,
      relevanceFactors: assessment.relevance.factors,
      relevanceBreakdown: assessment.relevance,
      eligibilityAssessment: assessment.eligibility,
      explanation: assessment.explanation,
      createdAt: opp.createdAt.toISOString(),
      updatedAt: opp.updatedAt.toISOString(),
    };
  }

  /**
   * GET /opportunities/:id/eligibility
   */
  async getEligibilityAssessment(opportunityId: string) {
    const opp = await this.prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        organization: true,
        locations: true,
        benefits: true,
        eligibilityReqs: true,
      },
    });

    if (!opp) {
      throw new NotFoundException(`Opportunity #${opportunityId} not found.`);
    }

    const profile = await this.getActiveProfile();
    const evalOpp = this.mapOpportunity(opp);
    const assessment = await this.engine.evaluateOpportunity(profile, evalOpp, this.currentWeights);

    return assessment.eligibility;
  }

  /**
   * POST /opportunities/:id/feedback
   * Logs feedback and learns weight adjustments within +/- 5% bounding box.
   */
  async recordFeedback(
    opportunityId: string,
    action: 'save' | 'apply' | 'thumbs_up' | 'thumbs_down' | 'dismiss',
    reason?: string,
    notes?: string
  ) {
    const opp = await this.prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: { organization: true, locations: true, benefits: true, eligibilityReqs: true },
    });

    if (!opp) {
      throw new NotFoundException(`Opportunity #${opportunityId} not found.`);
    }

    const user = await this.prisma.user.findFirst();
    if (user) {
      await this.prisma.userFeedback.create({
        data: {
          userId: user.id,
          opportunityId: opp.id,
          action,
          reason: reason || null,
          notes: notes || null,
        },
      });
    }

    // Apply Bounded Feedback Learning
    this.currentWeights = this.learner.applyFeedback(action, opp.category, reason);
    const deltas = this.learner.getLearnedDeltas();

    return {
      success: true,
      action,
      opportunityId,
      deltas,
      currentWeights: this.currentWeights,
    };
  }

  /**
   * GET /preferences/weights
   */
  getWeights() {
    return {
      weights: this.currentWeights,
      defaults: DEFAULT_WEIGHTS,
      deltas: this.learner.getLearnedDeltas(),
      bounds: {
        category: [0.20, 0.30],
        skills: [0.15, 0.25],
        education: [0.10, 0.20],
        geography: [0.10, 0.20],
        benefits: [0.05, 0.15],
        organization: [0.05, 0.15],
        timing: [0.00, 0.10],
      },
    };
  }

  /**
   * POST /preferences/weights/reset
   */
  resetWeights() {
    this.currentWeights = this.learner.resetWeights();
    return {
      success: true,
      weights: this.currentWeights,
      message: 'Learned scoring weights reset to default baseline.',
    };
  }

  /**
   * GET /profile/completeness
   */
  async getProfileCompleteness() {
    const profile = await this.getActiveProfile();
    return this.engine.getProfileCompleteness(profile);
  }
}
