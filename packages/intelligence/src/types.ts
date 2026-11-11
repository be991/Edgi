import {
  EligibilityStatus,
  EligibilityCriterionResult,
  EligibilityAssessment,
  RelevanceBreakdown,
  Match,
} from '@edgi/contracts';

export interface EvaluatorUserProfile {
  id?: string;
  fullName: string;
  headline?: string;
  degree: string; // e.g. "B.Sc"
  major: string; // e.g. "Cyber Security"
  yearOfStudy: string; // e.g. "200-level" or "Sophomore"
  university: string;
  country: string; // e.g. "Nigeria"
  nationality?: string; // e.g. "Nigerian"
  timezone?: string; // e.g. "Africa/Lagos"
  graduationYear?: number | null; // e.g. 2028
  skills: string[]; // e.g. ["AppSec", "Cyber Security", "Python", "TypeScript", "Vulnerability Research"]
  targetRoles: string[]; // e.g. ["Security Engineer", "AppSec Intern"]
  interests: string[]; // e.g. ["Fintech Security", "Fuzzing", "CTFs"]
  experienceYears?: number; // e.g. 1.5
  gpa?: number | null;
  hasPassport?: boolean;
  workAuthorizations?: string[]; // e.g. ["Nigeria"]
}

export interface EvaluatorOpportunity {
  id: string;
  title: string;
  slug?: string;
  category: string; // fellowship, internship, hackathon_ctf, funding, etc.
  organization: {
    name: string;
    country?: string | null;
    verified?: boolean;
  };
  summary: string;
  deadline?: string | null;
  stipend?: {
    min?: number | null;
    max?: number | null;
    currency?: string;
    isUnpaid?: boolean;
    description?: string;
  } | null;
  locations: Array<{
    country?: string | null;
    isRemote: boolean;
    remoteRegions?: string[];
  }>;
  benefits?: string[];
  tags: string[];
  applyUrl: string;
  rawRequirements?: Array<{
    type?: string;
    description: string;
    isMandatory?: boolean;
  }>;
  confidence?: number;
  verificationStatus?: string;
}

export interface RelevanceDimensionWeights {
  category: number; // default 0.25
  skills: number; // default 0.20
  education: number; // default 0.15
  geography: number; // default 0.15
  benefits: number; // default 0.10
  organization: number; // default 0.10
  timing: number; // default 0.05
}

export const DEFAULT_WEIGHTS: RelevanceDimensionWeights = {
  category: 0.25,
  skills: 0.20,
  education: 0.15,
  geography: 0.15,
  benefits: 0.10,
  organization: 0.10,
  timing: 0.05,
};
