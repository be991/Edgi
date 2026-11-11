import { ProfileCompleteness } from '@edgi/contracts';
import { EvaluatorUserProfile } from '../types';

export class ProfileCompletenessMeter {
  calculate(profile: EvaluatorUserProfile): ProfileCompleteness {
    const fields = [
      { name: 'Full Name', value: profile.fullName, weight: 10 },
      { name: 'Country / Residence', value: profile.country, weight: 15 },
      { name: 'Degree & Major', value: profile.degree && profile.major, weight: 20 },
      { name: 'Year of Study', value: profile.yearOfStudy, weight: 15 },
      { name: 'Graduation Year', value: profile.graduationYear, weight: 15 },
      { name: 'Technical Skills (3+)', value: profile.skills && profile.skills.length >= 3, weight: 15 },
      { name: 'Target Roles & Interests', value: profile.targetRoles && profile.targetRoles.length > 0, weight: 10 },
    ];

    let totalScore = 0;
    const completedFields: string[] = [];
    const missingFields: string[] = [];
    const impactNotes: string[] = [];

    fields.forEach((f) => {
      if (f.value) {
        totalScore += f.weight;
        completedFields.push(f.name);
      } else {
        missingFields.push(f.name);
      }
    });

    if (!profile.graduationYear) {
      impactNotes.push('Missing Graduation Year: Opportunities with strict graduation cohorts will show as "Unknown".');
    }
    if (!profile.skills || profile.skills.length < 3) {
      impactNotes.push('Low Skills Count: Add AppSec, Python, or Cyber Security skills to increase technical alignment.');
    }
    if (!profile.country) {
      impactNotes.push('Missing Country: Geographic gates cannot verify African or Nigerian applicant eligibility.');
    }

    return {
      percentage: totalScore,
      completedFields,
      missingFields,
      impactNotes,
    };
  }
}
