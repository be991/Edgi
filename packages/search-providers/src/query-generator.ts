import * as crypto from 'crypto';
import { GeneratedQuery } from './types';

export interface UserProfileDimensions {
  degreeLevel?: string;
  fieldOfStudy?: string;
  skills?: string[];
  interests?: string[];
  country?: string;
  targetYear?: number;
  priorityOrganizations?: Array<{ name: string; domain?: string }>;
}

export class QueryGenerator {
  /**
   * Generates a bounded, deduplicated query set based on structured user profile dimensions.
   */
  public generateQueries(
    profile: UserProfileDimensions = {},
    options: { maxQueries?: number; familyRotationOffset?: number } = {}
  ): GeneratedQuery[] {
    const { maxQueries = 12, familyRotationOffset = 0 } = options;

    const currentYear = profile.targetYear || 2026;
    const nextYear = currentYear + 1;
    const educationLevel = profile.degreeLevel || 'undergraduate';
    const region = profile.country || 'Nigeria';

    // Core dimension matrices
    const skillFocuses = (profile.skills && profile.skills.length > 0)
      ? profile.skills
      : ['AppSec', 'application security', 'fintech security', 'AI agent defense', 'penetration testing', 'smart contract security'];

    const opportunityCategories = [
      { name: 'fellowship', terms: ['fellowship', 'research fellowship', 'residency'] },
      { name: 'hackathon_ctf', terms: ['cybersecurity CTF hackathon', 'inter-collegiate defense challenge'] },
      { name: 'grant', terms: ['open source developer grant', 'student travel grant', 'security tooling grant'] },
      { name: 'internship', terms: ['security engineering internship', 'fintech software internship'] },
      { name: 'dev_programme', terms: ['mentorship programme', 'accelerator cohort', 'fellowship programme'] },
    ];

    const fundingModifiers = ['fully funded', 'stipend', 'grant', 'prize pool'];
    const eligibilityModifiers = ['international applicants', 'African developers', 'remote', region];

    const candidateQueries: Array<{ query: string; category: string; dimension: string; priority: 'high' | 'normal' | 'low' }> = [];

    // Family 1: Targeted site: queries for priority organizations (Highest Priority)
    if (profile.priorityOrganizations && profile.priorityOrganizations.length > 0) {
      for (const org of profile.priorityOrganizations.slice(0, 3)) {
        if (org.domain) {
          candidateQueries.push({
            query: `site:${org.domain} (fellowship OR grant OR internship OR opportunity) ${nextYear}`,
            category: 'grant',
            dimension: `Targeted Publisher: site:${org.domain}`,
            priority: 'high',
          });
        }
      }
    } else {
      candidateQueries.push({
        query: `site:ethereum.org grant ${nextYear}`,
        category: 'grant',
        dimension: 'Targeted: site:ethereum.org',
        priority: 'high',
      });
      candidateQueries.push({
        query: `site:owasp.org grant student ${nextYear}`,
        category: 'grant',
        dimension: 'Targeted: site:owasp.org',
        priority: 'high',
      });
    }

    // Family 2: High-Priority Technical AppSec / Security Fellowships & Grants
    for (const skill of skillFocuses.slice(0, 3)) {
      candidateQueries.push({
        query: `${skill} fellowship ${educationLevel} ${nextYear}`,
        category: 'fellowship',
        dimension: `Skill: ${skill} × ${educationLevel} × ${nextYear}`,
        priority: 'high',
      });
      candidateQueries.push({
        query: `fully funded ${skill} grant international applicants`,
        category: 'grant',
        dimension: `Skill: ${skill} × Fully Funded × Global`,
        priority: 'high',
      });
    }

    // Family 3: Hackathons, CTFs, and Developer Challenges
    candidateQueries.push({
      query: `cybersecurity CTF challenge student prize ${currentYear}`,
      category: 'hackathon_ctf',
      dimension: 'Cybersecurity CTF × Student Prize',
      priority: 'high',
    });
    candidateQueries.push({
      query: `fintech security hackathon remote ${currentYear}`,
      category: 'hackathon_ctf',
      dimension: 'Fintech Security × Hackathon',
      priority: 'normal',
    });

    // Family 4: International & African Student Travel / Research Grants
    candidateQueries.push({
      query: `fully funded technology conference travel grant undergraduate ${nextYear}`,
      category: 'grant',
      dimension: 'Undergraduate Conference Travel Grant',
      priority: 'normal',
    });
    candidateQueries.push({
      query: `open source security mentorship programme student ${nextYear}`,
      category: 'dev_programme',
      dimension: 'Open Source Security Mentorship',
      priority: 'normal',
    });

    // Family 5: Autonomous AI & Frontier Defense
    candidateQueries.push({
      query: `AI safety autonomous agent security research stipend ${nextYear}`,
      category: 'fellowship',
      dimension: 'AI Agent Defense Research Stipend',
      priority: 'normal',
    });

    // Deduplicate and Normalize
    const seenHashes = new Set<string>();
    const uniqueQueries: GeneratedQuery[] = [];

    // Apply rotation offset to rotate families across runs
    const rotated = this.rotateList(candidateQueries, familyRotationOffset);

    for (const item of rotated) {
      const normalized = this.normalizeQuery(item.query);
      const hash = crypto.createHash('sha256').update(normalized).digest('hex');

      if (!seenHashes.has(hash)) {
        seenHashes.add(hash);
        uniqueQueries.push({
          query: normalized,
          category: item.category,
          dimension: item.dimension,
          priority: item.priority,
          hash,
        });
      }

      if (uniqueQueries.length >= maxQueries) {
        break;
      }
    }

    return uniqueQueries;
  }

  /**
   * Normalizes search query strings (collapses whitespace, lowercases, removes punctuation)
   */
  public normalizeQuery(query: string): string {
    return query
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s:.-]/g, '');
  }

  private rotateList<T>(list: T[], offset: number): T[] {
    if (list.length === 0 || offset <= 0) return list;
    const actualOffset = offset % list.length;
    return [...list.slice(actualOffset), ...list.slice(0, actualOffset)];
  }
}
