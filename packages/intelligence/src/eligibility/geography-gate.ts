import { EligibilityCriterionResult } from '@edgi/contracts';
import { EvaluatorUserProfile, EvaluatorOpportunity } from '../types';

export class GeographyGate {
  /**
   * Evaluates geographic suitability strictly distinguishing host country from applicant scope.
   * Invariant: "International" or foreign host NEVER implies "Open to my country" without verification.
   */
  evaluate(user: EvaluatorUserProfile, opp: EvaluatorOpportunity): EligibilityCriterionResult {
    const isRemote = opp.locations.some((l) => l.isRemote);
    const hostCountry = opp.organization?.country || opp.locations[0]?.country || 'Unknown';
    const remoteRegions = opp.locations.flatMap((l) => l.remoteRegions || []).map((r) => r.toLowerCase());
    const lowerSummary = opp.summary.toLowerCase();
    const lowerTags = opp.tags.map((t) => t.toLowerCase());

    const hasTravelGrant =
      opp.benefits?.some((b) => /travel|flight|hotel|accommodation|stipend.*travel/i.test(b)) ||
      /travel grant|flight covered|hotel covered|fully funded travel/i.test(lowerSummary);

    // 1. Explicit Exclusions / Domestic Only Restrictions
    const isUkOnly =
      /\buk only\b|\buk residents\b|\buk citizens\b|\bliving in the uk\b/i.test(lowerSummary) ||
      (hostCountry.toLowerCase() === 'united kingdom' && !isRemote && !lowerSummary.includes('international'));

    const isUsOnly =
      /\bus only\b|\bus residents\b|\bus citizens\b|\bwork authorization in the us\b|\bus citizenship required\b/i.test(lowerSummary) ||
      (hostCountry.toLowerCase() === 'united states' && !isRemote && !lowerSummary.includes('international'));

    if (isUkOnly && user.country.toLowerCase() !== 'united kingdom') {
      return {
        criterion: 'country',
        requirementDescription: 'Must reside or hold citizenship in the United Kingdom',
        profileValue: `${user.country} (Africa/Lagos)`,
        requirementValue: 'United Kingdom Only',
        result: 'fails',
        isMandatory: true,
        notes: 'Strict domestic residency restriction. Host country is UK and eligibility excludes international applicants.',
      };
    }

    if (isUsOnly && user.country.toLowerCase() !== 'united states') {
      return {
        criterion: 'country',
        requirementDescription: 'Must be a US Citizen or permanent US resident',
        profileValue: `${user.country} (Africa/Lagos)`,
        requirementValue: 'United States Only',
        result: 'fails',
        isMandatory: true,
        notes: 'Strict US domestic work authorization or citizenship required.',
      };
    }

    // 2. Explicit Nigerian / African Regional Scope
    const isAfricanRegional =
      /\bafrica\b|\bafrican\b|\bnigeria\b|\bwest africa\b/i.test(lowerSummary) ||
      lowerTags.some((t) => /africa|nigeria/.test(t));

    if (isAfricanRegional) {
      return {
        criterion: 'country',
        requirementDescription: 'Open to African / Nigerian applicants',
        profileValue: `${user.country} (Resident in Nigeria)`,
        requirementValue: 'Africa / Nigeria',
        result: 'meets',
        isMandatory: true,
        notes: 'Direct regional eligibility match: African / Nigerian residents eligible.',
      };
    }

    // 3. Worldwide Remote
    const isWorldwideRemote =
      isRemote &&
      (remoteRegions.some((r) => r.includes('worldwide') || r.includes('global') || r.includes('anywhere')) ||
        /worldwide|anywhere in the world|international applicants welcome|remote global/i.test(lowerSummary) ||
        opp.locations.some((l) => l.isRemote && (!l.country || l.country.toLowerCase() === 'global')));

    if (isWorldwideRemote) {
      return {
        criterion: 'country',
        requirementDescription: 'Worldwide remote eligibility',
        profileValue: `${user.country} (Remote from Nigeria)`,
        requirementValue: 'Worldwide / Anywhere',
        result: 'meets',
        isMandatory: true,
        notes: `Fully remote opportunity open to international applicants worldwide from host ${hostCountry}.`,
      };
    }

    // 4. In-person foreign event / fellowship
    if (!isRemote && hostCountry.toLowerCase() !== 'nigeria' && hostCountry.toLowerCase() !== 'unknown') {
      if (hasTravelGrant) {
        return {
          criterion: 'country',
          requirementDescription: `In-person in ${hostCountry} with international travel support`,
          profileValue: `${user.country} (Valid Passport: ${user.hasPassport !== false ? 'Yes' : 'No'})`,
          requirementValue: `${hostCountry} (Full Travel/Flight Support)`,
          result: user.hasPassport !== false ? 'likely' : 'fails',
          isMandatory: true,
          notes: `Event hosted physically in ${hostCountry}. Travel and accommodation grants provided for international attendees.`,
        };
      } else {
        return {
          criterion: 'country',
          requirementDescription: `In-person physical attendance in ${hostCountry} (No travel grant provided)`,
          profileValue: `${user.country} (Self-funded travel required)`,
          requirementValue: `${hostCountry} (Unfunded On-site)`,
          result: 'fails',
          isMandatory: true,
          notes: `Physical event in ${hostCountry} requires in-person presence without travel assistance. Infeasible for undergraduate abroad.`,
        };
      }
    }

    // 5. Domestic Nigerian On-site
    if (hostCountry.toLowerCase() === 'nigeria') {
      return {
        criterion: 'country',
        requirementDescription: 'Physical presence in Nigeria',
        profileValue: `${user.country} (Lagos / Nigeria)`,
        requirementValue: 'Nigeria',
        result: 'meets',
        isMandatory: true,
        notes: 'Opportunity is based in Nigeria; local resident.',
      };
    }

    // 6. Ambiguous / Unstated
    return {
      criterion: 'country',
      requirementDescription: 'Geographic residency / citizenship requirements unstated',
      profileValue: `${user.country}`,
      requirementValue: 'Unspecified',
      result: 'unknown',
      isMandatory: true,
      notes: 'Publisher did not declare explicit country boundaries or remote scope. Verification required.',
    };
  }
}
