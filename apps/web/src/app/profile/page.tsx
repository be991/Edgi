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
  RefreshCw,
  Sparkles,
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
  HelpCircle,
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
  const [completenessData, setCompletenessData] = useState<any>(null);
  const [weightsData, setWeightsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetStatus, setResetStatus] = useState<string | null>(null);

  // Skill input
  const [newSkill, setNewSkill] = useState('');

  const loadData = async () => {
    try {
      const [p, pref, comp, w] = await Promise.all([
        api.getUserProfile(),
        api.getUserPreferences(),
        api.getProfileCompleteness(),
        api.getScoringWeights(),
      ]);
      setProfile(p);
      setPreferences(pref);
      setCompletenessData(comp);
      setWeightsData(w);
    } catch (err) {
      console.error('Failed to load profile intelligence data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResetWeights = async () => {
    try {
      await api.resetScoringWeights();
      const w = await api.getScoringWeights();
      setWeightsData(w);
      setResetStatus('Learned weights successfully reset to baseline.');
      setTimeout(() => setResetStatus(null), 3500);
    } catch (err) {
      console.error('Failed to reset weights:', err);
    }
  };

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

      {/* Profile Completeness Meter */}
      {completenessData && (
        <div className="rounded-2xl border border-primary/20 bg-card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Profile Completeness: {completenessData.percentage}%
                </h2>
                <p className="text-xs text-muted-foreground">
                  Missing fields prevent automated verification and cause assessments to evaluate to &quot;Unknown&quot;.
                </p>
              </div>
            </div>

            <Badge
              variant={completenessData.percentage >= 90 ? 'success' : 'warning'}
              className="text-xs px-2.5 py-1 font-bold"
            >
              {completenessData.percentage >= 90 ? 'High Completeness' : 'Needs Information'}
            </Badge>
          </div>

          <div className="space-y-1.5">
            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${completenessData.percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{completenessData.completedFields?.length || 9} fields verified</span>
              <span>{completenessData.missingFields?.length || 1} fields missing</span>
            </div>
          </div>

          {/* Impact Warning Alerts */}
          {completenessData.missingImpactNotes && completenessData.missingImpactNotes.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2 text-xs">
              <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Missing Fields Impact on Matching:
              </span>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px]">
                {completenessData.missingImpactNotes.map((note: string, idx: number) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          )}
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

      {/* Section 4: Learned Matching Weights Inspector (Strictly Bounded +/- 5%) */}
      {weightsData && (
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Learned Scoring Weights &amp; Bounded Feedback Inspector
                </h2>
                <p className="text-xs text-muted-foreground">
                  Scoring weights automatically adapt from your feedback within a strict &plusmn;5% bounding box.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetWeights}
              className="gap-1.5 text-xs hover:border-rose-500/40 hover:text-rose-600"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Learned Adjustments</span>
            </Button>
          </div>

          {resetStatus && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{resetStatus}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2.5 px-3 font-semibold">Dimension</th>
                  <th className="py-2.5 px-3 font-semibold">Default Baseline</th>
                  <th className="py-2.5 px-3 font-semibold">Learned Delta</th>
                  <th className="py-2.5 px-3 font-semibold">Strict Bounds</th>
                  <th className="py-2.5 px-3 font-semibold">Effective Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {Object.entries(weightsData.weights).map(([dimension, weight]) => {
                  const numWeight = weight as number;
                  const def = (weightsData.defaults?.[dimension] ?? numWeight) as number;
                  const delta = (weightsData.deltas?.[dimension] ?? 0) as number;
                  const bound = weightsData.bounds?.[dimension] || [0.05, 0.35];

                  return (
                    <tr key={dimension} className="hover:bg-muted/20">
                      <td className="py-2.5 px-3 font-semibold capitalize text-foreground">{dimension}</td>
                      <td className="py-2.5 px-3 text-muted-foreground font-mono">{(def * 100).toFixed(0)}%</td>
                      <td className="py-2.5 px-3 font-mono">
                        {delta > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            +{(delta * 100).toFixed(1)}%
                          </span>
                        ) : delta < 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 font-bold">
                            {(delta * 100).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0.0%</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground font-mono text-[11px]">
                        [{(bound[0] * 100).toFixed(0)}% – {(bound[1] * 100).toFixed(0)}%]
                      </td>
                      <td className="py-2.5 px-3 font-bold text-foreground font-mono">{(numWeight * 100).toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isSaving} className="gap-2 text-xs">
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Saving changes...' : 'Save Profile & Settings'}</span>
        </Button>
      </div>
    </form>
  );
}
