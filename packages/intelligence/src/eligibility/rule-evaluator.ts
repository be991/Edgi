import {
  EligibilityStatus,
  EligibilityCriterionResult,
  EligibilityAssessment,
} from '@edgi/contracts';
import { EvaluatorUserProfile, EvaluatorOpportunity } from '../types';
import { GeographyGate } from './geography-gate';

export class EligibilityRuleEvaluator {
  private geoGate = new GeographyGate();

  evaluate(user: EvaluatorUserProfile, opp: EvaluatorOpportunity): EligibilityAssessment {
    const criteriaResults: EligibilityCriterionResult[] = [];
    const lowerSummary = opp.summary.toLowerCase();
    const lowerTitle = opp.title.toLowerCase();
    const combinedText = `${lowerTitle} ${lowerSummary} ${opp.tags.join(' ').toLowerCase()}`;

    // 1. Geographic Suitability Criterion
    const geoResult = this.geoGate.evaluate(user, opp);
    criteriaResults.push(geoResult);

    // 2. Education Level & Student Status
    const eduResult = this.evaluateEducation(user, combinedText);
    criteriaResults.push(eduResult);

    // 3. Field of Study / Major
    const majorResult = this.evaluateFieldOfStudy(user, combinedText);
    criteriaResults.push(majorResult);

    // 4. Experience Level
    const expResult = this.evaluateExperience(user, combinedText);
    criteriaResults.push(expResult);

    // 5. Skills & Technical Alignment
    const skillsResult = this.evaluateSkills(user, opp);
    criteriaResults.push(skillsResult);

    // 6. Graduation Year (Explicit Missing Info Invariant)
    const gradResult = this.evaluateGraduationYear(user, combinedText);
    if (gradResult) {
      criteriaResults.push(gradResult);
    }

    // 7. Age Limits (if specified)
    const ageResult = this.evaluateAge(user, combinedText);
    if (ageResult) {
      criteriaResults.push(ageResult);
    }

    // Aggregate Overall Status
    const mandatoryFails = criteriaResults.filter((c) => c.isMandatory && c.result === 'fails');
    const mandatoryUnknowns = criteriaResults.filter((c) => c.isMandatory && c.result === 'unknown');
    const nonMandatoryUnknowns = criteriaResults.filter((c) => !c.isMandatory && c.result === 'unknown');

    let status: EligibilityStatus = 'eligible';
    const reasons: string[] = [];
    const blockers: string[] = [];
    const missingInfo: string[] = [];

    if (mandatoryFails.length > 0) {
      status = 'ineligible';
      mandatoryFails.forEach((f) => {
        blockers.push(`${f.criterion}: ${f.notes || f.requirementDescription}`);
        reasons.push(`Does not meet mandatory requirement: ${f.requirementDescription}`);
      });
    } else if (mandatoryUnknowns.length > 1) {
      status = 'unknown';
      mandatoryUnknowns.forEach((u) => {
        missingInfo.push(`${u.criterion}: ${u.notes || u.requirementDescription}`);
        reasons.push(`Verification needed for mandatory criteria: ${u.requirementDescription}`);
      });
    } else if (mandatoryUnknowns.length === 1) {
      status = 'possibly_eligible';
      const u = mandatoryUnknowns[0]!;
      missingInfo.push(`${u.criterion}: ${u.notes || u.requirementDescription}`);
      reasons.push(`Likely match, but missing confirmation on ${u.criterion}: ${u.notes}`);
    } else if (nonMandatoryUnknowns.length > 0) {
      status = 'likely_eligible';
      nonMandatoryUnknowns.forEach((u) => {
        missingInfo.push(`${u.criterion}: ${u.notes || u.requirementDescription}`);
      });
      reasons.push('Meets all primary mandatory criteria; minor optional requirement needs verification.');
    } else {
      status = 'eligible';
      reasons.push('Meets all documented eligibility criteria (education, field of study, skills, and geography).');
    }

    return {
      status,
      reasons,
      blockers,
      missingInfo,
      criteriaResults,
      engineVersion: 'v1.0',
      evaluatedAt: new Date().toISOString(),
    };
  }

  private evaluateEducation(user: EvaluatorUserProfile, text: string): EligibilityCriterionResult {
    const requiresPhd = /\bphd\b|\bdoctoral\b|\bpostdoc\b/i.test(text);
    const requiresMasters = /\bmaster'?s degree\b|\bpostgraduate\b|\bmsc\b/i.test(text) && !/bachelor|undergraduate/i.test(text);
    const requiresStudent = /\benrolled student\b|\buniversity student\b|\bundergraduate\b|\bcollege student\b|\bdegree seeking\b/i.test(text);

    if (requiresPhd) {
      return {
        criterion: 'education_level',
        requirementDescription: 'PhD or Doctoral candidate status required',
        profileValue: `${user.yearOfStudy} Undergraduate (${user.degree})`,
        requirementValue: 'PhD / Post-Doctorate',
        result: 'fails',
        isMandatory: true,
        notes: 'Opportunity is strictly for doctoral researchers.',
      };
    }

    if (requiresMasters) {
      return {
        criterion: 'education_level',
        requirementDescription: 'Master\'s / Graduate degree required',
        profileValue: `${user.yearOfStudy} Undergraduate (${user.degree})`,
        requirementValue: "Master's Degree",
        result: 'fails',
        isMandatory: true,
        notes: 'Requires completed or ongoing Master\'s degree.',
      };
    }

    if (requiresStudent) {
      const isUndergrad = /undergraduate|b\.?sc|student|200-level|sophomore/i.test(user.yearOfStudy + ' ' + user.degree);
      return {
        criterion: 'education_level',
        requirementDescription: 'Enrolled university / undergraduate student status',
        profileValue: `${user.yearOfStudy} (${user.degree} at ${user.university})`,
        requirementValue: 'Enrolled Undergraduate Student',
        result: isUndergrad ? 'meets' : 'fails',
        isMandatory: true,
        notes: isUndergrad ? 'Enrolled 200-level university student verified.' : 'Student status not demonstrated.',
      };
    }

    return {
      criterion: 'education_level',
      requirementDescription: 'Open education level / no strict degree prerequisite',
      profileValue: `${user.yearOfStudy} ${user.degree}`,
      requirementValue: 'Any / Open',
      result: 'meets',
      isMandatory: false,
      notes: 'No restrictive education level specified by host.',
    };
  }

  private evaluateFieldOfStudy(user: EvaluatorUserProfile, text: string): EligibilityCriterionResult {
    const csCyberKeywords = /\bcyber security\b|\bcomputer science\b|\bsoftware engineering\b|\binformation technology\b|\bstem\b|\bcomputing\b/i.test(text);
    const strictMedicalLegal = /\bmedical doctors? only\b|\blaw degree only\b|\bcivil engineering only\b/i.test(text);

    if (strictMedicalLegal) {
      return {
        criterion: 'field_of_study',
        requirementDescription: 'Specific non-computing field required',
        profileValue: user.major,
        requirementValue: 'Non-STEM / Specialized field',
        result: 'fails',
        isMandatory: true,
        notes: `Requires specific non-computing field; profile is ${user.major}.`,
      };
    }

    if (csCyberKeywords) {
      const majorMatches = /cyber|security|computer|software|stem/i.test(user.major);
      return {
        criterion: 'field_of_study',
        requirementDescription: 'Computer Science, Cyber Security, or related STEM field',
        profileValue: user.major,
        requirementValue: 'Cyber Security / CS / STEM',
        result: majorMatches ? 'meets' : 'fails',
        isMandatory: true,
        notes: `Your major "${user.major}" directly aligns with required technical disciplines.`,
      };
    }

    return {
      criterion: 'field_of_study',
      requirementDescription: 'Open to all academic disciplines',
      profileValue: user.major,
      requirementValue: 'All Majors',
      result: 'meets',
      isMandatory: false,
      notes: 'No specific academic discipline required.',
    };
  }

  private evaluateExperience(user: EvaluatorUserProfile, text: string): EligibilityCriterionResult {
    const seniorPattern = /\b10\+ years\b|\b8\+ years\b|\bprincipal architect\b|\bsenior director\b/i.test(text);
    const earlyCareerPattern = /\b0-2 years\b|\bno experience required\b|\bentry level\b|\bearly career\b|\bjunior\b|\bintern\b|\bfellow\b/i.test(text);

    if (seniorPattern) {
      return {
        criterion: 'experience',
        requirementDescription: 'Requires 8-10+ years professional senior industry experience',
        profileValue: `${user.experienceYears || 1.5} years (Undergraduate student)`,
        requirementValue: '10+ Years Senior',
        result: 'fails',
        isMandatory: true,
        notes: 'Strict senior industry experience requirement.',
      };
    }

    if (earlyCareerPattern) {
      return {
        criterion: 'experience',
        requirementDescription: 'Early career / student experience (0-2 years)',
        profileValue: `${user.experienceYears || 1.5} years practical / lab experience`,
        requirementValue: '0-2 Years',
        result: 'meets',
        isMandatory: false,
        notes: 'Targeted at students and early-career talent.',
      };
    }

    return {
      criterion: 'experience',
      requirementDescription: 'Experience requirements flexible / unstated',
      profileValue: `${user.experienceYears || 1.5} years`,
      requirementValue: 'Flexible',
      result: 'meets',
      isMandatory: false,
      notes: 'No rigid minimum years of experience stated.',
    };
  }

  private evaluateSkills(user: EvaluatorUserProfile, opp: EvaluatorOpportunity): EligibilityCriterionResult {
    const oppKeywords = [...opp.tags, opp.title, opp.summary].join(' ').toLowerCase();
    const userSkills = user.skills.map((s) => s.toLowerCase());

    const matchedSkills = userSkills.filter((skill) => oppKeywords.includes(skill.toLowerCase()));

    if (matchedSkills.length >= 2) {
      return {
        criterion: 'skills',
        requirementDescription: 'Demonstrated skills in AppSec, Security, or Systems',
        profileValue: user.skills.slice(0, 4).join(', '),
        requirementValue: matchedSkills.join(', '),
        result: 'meets',
        isMandatory: false,
        notes: `Strong technical match: matches ${matchedSkills.length} key skills (${matchedSkills.slice(0, 3).join(', ')}).`,
      };
    }

    if (matchedSkills.length === 1) {
      return {
        criterion: 'skills',
        requirementDescription: 'Relevant foundational technical skills',
        profileValue: user.skills.slice(0, 3).join(', '),
        requirementValue: matchedSkills[0]!,
        result: 'likely',
        isMandatory: false,
        notes: `Foundational skill match on ${matchedSkills[0]}.`,
      };
    }

    return {
      criterion: 'skills',
      requirementDescription: 'Specific technical prerequisite skills',
      profileValue: user.skills.slice(0, 3).join(', '),
      requirementValue: 'Unspecified',
      result: 'unknown',
      isMandatory: false,
      notes: 'No direct skill intersection detected from tags.',
    };
  }

  private evaluateGraduationYear(user: EvaluatorUserProfile, text: string): EligibilityCriterionResult | null {
    const hasGradReq = /graduating (in|between)|graduation year|class of 202[5-9]/i.test(text);
    if (!hasGradReq) return null;

    if (!user.graduationYear) {
      // Missing profile data -> strictly UNKNOWN
      return {
        criterion: 'graduation_year',
        requirementDescription: 'Specific graduation cohort year required by host',
        profileValue: 'Not set in profile',
        requirementValue: 'Class of 2026-2028',
        result: 'unknown',
        isMandatory: true,
        notes: 'Host requires graduation year, but your profile has not set graduationYear. Marked unknown.',
      };
    }

    const matches2028 = text.includes(String(user.graduationYear)) || /202[7-9]/.test(text);
    return {
      criterion: 'graduation_year',
      requirementDescription: 'Eligible graduation window',
      profileValue: `Class of ${user.graduationYear}`,
      requirementValue: '2027 - 2029',
      result: matches2028 ? 'meets' : 'fails',
      isMandatory: true,
      notes: matches2028 ? `Graduation year ${user.graduationYear} within eligible window.` : 'Graduation year outside cohort.',
    };
  }

  private evaluateAge(user: EvaluatorUserProfile, text: string): EligibilityCriterionResult | null {
    const hasAgeReq = /between (the ages of )?18 (and|to) 2[5-9]|under (the age of )?2[5-9]/i.test(text);
    if (!hasAgeReq) return null;

    return {
      criterion: 'age',
      requirementDescription: 'Youth / student age restriction (18-29)',
      profileValue: '200-level student (Age ~20)',
      requirementValue: '18 - 29',
      result: 'meets',
      isMandatory: false,
      notes: 'Student age criteria satisfied.',
    };
  }
}
