'use client';

import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Sliders,
  Shield,
  GraduationCap,
  Globe,
  Link as LinkIcon,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { UserProfile, UserPreferences, OpportunityCategory } from '@edgi/contracts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const ALL_CATEGORIES: { label: string; value: OpportunityCategory }[] = [
  { label: 'Internships', value: 'internship' },
  { label: 'Fellowships', value: 'fellowship' },
  { label: 'Hackathons & CTFs', value: 'hackathon_ctf' },
  { label: 'Dev Programmes', value: 'dev_programme' },
  { label: 'OSS Bounties', value: 'oss_bounty' },
  { label: 'Funding & Grants', value: 'funding' },
  { label: 'Full-time Jobs', value: 'job' },
  { label: 'Research', value: 'research' },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Skill input
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [p, pref] = await Promise.all([
          api.getUserProfile(),
          api.getUserPreferences(),
        ]);
        setProfile(p);
        setPreferences(pref);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !preferences) return;

    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await Promise.all([
        api.updateUserProfile(profile),
        api.updateUserPreferences(preferences),
      ]);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const addSkill = () => {
    if (!newSkill.trim() || !profile) return;
    if (!profile.skills.includes(newSkill.trim())) {
      setProfile({
        ...profile,
        skills: [...profile.skills, newSkill.trim()],
      });
    }
    setNewSkill('');
  };

  const removeSkill = (skill: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      skills: profile.skills.filter((s) => s !== skill),
    });
  };

  const toggleCategory = (cat: OpportunityCategory) => {
    if (!preferences) return;
    const exists = preferences.targetCategories.includes(cat);
    const updated = exists
      ? preferences.targetCategories.filter((c) => c !== cat)
      : [...preferences.targetCategories, cat];
    setPreferences({ ...preferences, targetCategories: updated });
  };

  if (isLoading || !profile || !preferences) {
    return <div className="p-8 text-center text-xs text-muted-foreground">Loading profile records...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Profile & Preferences</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Personalize the eligibility criteria, relevance thresholds, and alert notifications.
          </p>
        </div>

        <Button type="submit" disabled={isSaving} className="gap-2 text-xs">
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Saving changes...' : 'Save Profile & Settings'}</span>
        </Button>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="font-semibold">Profile and preferences saved successfully!</span>
        </div>
      )}

      {/* Section 1: Academic & Career Profile */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <GraduationCap className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">Academic Persona & Background</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold text-foreground block mb-1.5">Full Name</label>
            <input
              type="text"
              value={profile.fullName}
              onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1.5">Email Address</label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full px-3 py-2 rounded-lg border border-border bg-muted/50 text-muted-foreground cursor-not-allowed"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="font-semibold text-foreground block mb-1.5">Professional Headline</label>
            <input
              type="text"
              value={profile.headline}
              onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1.5">Academic Degree & Major</label>
            <input
              type="text"
              value={profile.degree}
              onChange={(e) => setProfile({ ...profile, degree: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1.5">Academic Level / Year</label>
            <input
              type="text"
              value={profile.yearOfStudy}
              onChange={(e) => setProfile({ ...profile, yearOfStudy: e.target.value })}
              placeholder="e.g. 200-level / Sophomore"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1.5">University / College</label>
            <input
              type="text"
              value={profile.university}
              onChange={(e) => setProfile({ ...profile, university: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1.5">Country & Timezone</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={profile.country}
                onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <input
                type="text"
                value={profile.timezone}
                onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="font-semibold text-foreground block mb-1.5">Bio & Research Focus</label>
            <textarea
              rows={3}
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary focus:outline-none leading-relaxed"
            />
          </div>
        </div>

        {/* Skills Tag Input */}
        <div>
          <label className="font-semibold text-foreground block mb-1.5 text-xs">Technical Skills & Focus Tags</label>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {profile.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSkill();
                }
              }}
              placeholder="Add skill (e.g. 'Fuzzing', 'Burp Suite', 'Smart Contracts')..."
              className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-xs focus:ring-1 focus:ring-primary focus:outline-none"
            />
            <Button type="button" size="sm" variant="outline" onClick={addSkill} className="text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
          </div>
        </div>
      </div>

      {/* Section 2: Portfolio & Document Links */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <LinkIcon className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">External Links & Documents</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold text-foreground block mb-1.5">GitHub Profile URL</label>
            <input
              type="url"
              value={profile.links.github || ''}
              onChange={(e) =>
                setProfile({ ...profile, links: { ...profile.links, github: e.target.value } })
              }
              placeholder="https://github.com/..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary focus:outline-none font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1.5">Portfolio / Blog URL</label>
            <input
              type="url"
              value={profile.links.portfolio || ''}
              onChange={(e) =>
                setProfile({ ...profile, links: { ...profile.links, portfolio: e.target.value } })
              }
              placeholder="https://..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary focus:outline-none font-mono text-[11px]"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Target Categories & Scoring Preferences */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Sliders className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">Opportunity Targeting & Thresholds</h2>
        </div>

        <div>
          <label className="font-semibold text-foreground block mb-2 text-xs">
            Target Opportunity Categories
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {ALL_CATEGORIES.map((cat) => {
              const isSelected = preferences.targetCategories.includes(cat.value);
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => toggleCategory(cat.value)}
                  className={`p-2.5 rounded-xl border text-left font-semibold transition-all ${
                    isSelected
                      ? 'bg-primary/10 border-primary/40 text-primary'
                      : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
          <div>
            <label className="font-semibold text-foreground block mb-1">
              Minimum Relevance Score Threshold: {preferences.minRelevanceScore}%
            </label>
            <input
              type="range"
              min="40"
              max="90"
              step="5"
              value={preferences.minRelevanceScore}
              onChange={(e) =>
                setPreferences({ ...preferences, minRelevanceScore: Number(e.target.value) })
              }
              className="w-full accent-primary mt-2"
            />
            <span className="text-[11px] text-muted-foreground block mt-1">
              Items below this score are filtered from priority notifications.
            </span>
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Daily Digest Delivery Time</label>
            <input
              type="text"
              value={preferences.digestTime}
              onChange={(e) => setPreferences({ ...preferences, digestTime: e.target.value })}
              placeholder="08:00 (WAT)"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary focus:outline-none"
            />
            <span className="text-[11px] text-muted-foreground block mt-1">
              Scheduled in your local timezone ({profile.timezone}).
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isSaving} className="gap-2 text-xs">
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Saving changes...' : 'Save Profile & Settings'}</span>
        </Button>
      </div>
    </form>
  );
}
