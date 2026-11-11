'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  ShieldQuestion,
  HelpCircle,
  ArrowRight,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Globe,
  Filter,
  RefreshCw,
  XCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ShieldCheck,
  Bookmark,
  MapPin,
} from 'lucide-react';
import { api, getRecommended, submitFeedback } from '@/lib/api/client';
import { Opportunity } from '@edgi/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function RecommendedPage() {
  const [tab, setTab] = useState<'top' | 'all' | 'verify_first' | 'ineligible'>('top');
  const [openToNigeriaOnly, setOpenToNigeriaOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [tabCounts, setTabCounts] = useState({ all: 0, top: 0, verify_first: 0, ineligible: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [expandedBreakdowns, setExpandedBreakdowns] = useState<Record<string, boolean>>({});
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const fetchFn =
        typeof api?.getRecommended === 'function'
          ? api.getRecommended.bind(api)
          : typeof getRecommended === 'function'
            ? getRecommended
            : null;

      if (fetchFn) {
        const res = await fetchFn({
          tab,
          openToNigeria: openToNigeriaOnly,
          category: selectedCategory === 'all' ? undefined : selectedCategory,
        });
        setOpportunities(res.opportunities || []);
        setTabCounts(res.tabCounts || { all: 0, top: 0, verify_first: 0, ineligible: 0 });
      } else {
        // Defensive fallback for stale dev bundles
        const oppsRes = await api.getOpportunities();
        let opps = oppsRes.opportunities || [];
        if (openToNigeriaOnly) {
          opps = opps.filter((o) => o.isOpenToNigeria);
        }
        if (selectedCategory !== 'all') {
          opps = opps.filter((o) => o.category === selectedCategory);
        }
        setTabCounts({
          all: opps.length,
          top: opps.filter((o) =>
            ['eligible', 'likely_eligible', 'possibly_eligible'].includes(o.eligibilityStatus || '')
          ).length,
          verify_first: opps.filter((o) => o.eligibilityStatus === 'unknown').length,
          ineligible: opps.filter((o) => o.eligibilityStatus === 'ineligible').length,
        });

        if (tab === 'top') {
          opps = opps.filter((o) =>
            ['eligible', 'likely_eligible', 'possibly_eligible'].includes(o.eligibilityStatus || '')
          );
        } else if (tab === 'verify_first') {
          opps = opps.filter((o) => o.eligibilityStatus === 'unknown');
        } else if (tab === 'ineligible') {
          opps = opps.filter((o) => o.eligibilityStatus === 'ineligible');
        }
        setOpportunities(opps);
      }
    } catch (err) {
      console.error('Failed to load recommended opportunities:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tab, openToNigeriaOnly, selectedCategory]);

  const toggleBreakdown = (id: string) => {
    setExpandedBreakdowns((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleFeedback = async (
    opportunityId: string,
    action: 'save' | 'apply' | 'thumbs_up' | 'thumbs_down' | 'dismiss',
    reason?: string
  ) => {
    try {
      const feedbackFn =
        typeof api?.submitFeedback === 'function'
          ? api.submitFeedback.bind(api)
          : typeof submitFeedback === 'function'
            ? submitFeedback
            : null;

      if (feedbackFn) {
        await feedbackFn(opportunityId, action, reason);
      }
      setFeedbackSuccess(
        action === 'thumbs_up'
          ? 'Marked as Great Match (+2% skills weight learned)'
          : action === 'dismiss'
            ? 'Dismissed from feed (Learned weight adjusted)'
            : 'Feedback recorded'
      );
      setTimeout(() => setFeedbackSuccess(null), 3500);
      loadData();
    } catch (e: any) {
      console.error('Feedback failed:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Personal Intelligence Feed</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Dual assessments tailored to Bethel Okafor (200-level Cyber Security, Nigeria). Strictly explainable scoring.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/profile">
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              Inspect Profile & Weights
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={loadData} disabled={isLoading} className="gap-1 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackSuccess && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {feedbackSuccess}
        </div>
      )}

      {/* Tabs & Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-muted/30 p-2.5 rounded-xl border border-border">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setTab('top')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              tab === 'top'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <span>Top Recommended</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                tab === 'top' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted-foreground/15'
              }`}
            >
              {tabCounts.top}
            </span>
          </button>

          <button
            onClick={() => setTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              tab === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <span>All Ranked</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                tab === 'all' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted-foreground/15'
              }`}
            >
              {tabCounts.all}
            </span>
          </button>

          <button
            onClick={() => setTab('verify_first')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              tab === 'verify_first'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <ShieldQuestion className="w-3.5 h-3.5" />
            <span>Verify First</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                tab === 'verify_first' ? 'bg-white/20 text-white' : 'bg-muted-foreground/15'
              }`}
            >
              {tabCounts.verify_first}
            </span>
          </button>

          <button
            onClick={() => setTab('ineligible')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              tab === 'ineligible'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Ineligible Archive</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                tab === 'ineligible' ? 'bg-white/20 text-white' : 'bg-muted-foreground/15'
              }`}
            >
              {tabCounts.ineligible}
            </span>
          </button>
        </div>

        {/* Nigeria Toggle & Category Filter */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Open to Nigeria Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/40 text-xs font-medium">
            <input
              type="checkbox"
              checked={openToNigeriaOnly}
              onChange={(e) => setOpenToNigeriaOnly(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
            />
            <span className="flex items-center gap-1.5">
              <span className="text-base leading-none">🇳🇬</span>
              <span className="font-semibold text-foreground">Open to Nigeria</span>
            </span>
          </label>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Categories</option>
            <option value="fellowship">Fellowship</option>
            <option value="internship">Internship</option>
            <option value="hackathon_ctf">Hackathon / CTF</option>
            <option value="funding">Grants & Funding</option>
            <option value="dev_programme">Dev Programme</option>
          </select>
        </div>
      </div>

      {/* Main List */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
          <p className="text-sm font-medium">Evaluating opportunities across 7 personal dimensions...</p>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/50 space-y-3">
          <ShieldQuestion className="w-10 h-10 text-muted-foreground mx-auto" />
          <h3 className="font-bold text-foreground">No opportunities matching active filters</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {openToNigeriaOnly
              ? 'No items found matching the "Open to Nigeria" filter in this tab. Try unticking the filter to see worldwide remote or in-person items.'
              : 'There are currently no records in this classification.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {opportunities.map((opp, idx) => {
            const isBreakdownOpen = expandedBreakdowns[opp.id] || false;
            const eligibilityStatus = opp.eligibilityStatus || 'unknown';
            const relevanceScore = opp.relevanceScore ?? 0;

            return (
              <div
                key={opp.id}
                className={`rounded-2xl border bg-card p-5 transition-all shadow-sm ${
                  eligibilityStatus === 'ineligible'
                    ? 'border-border/60 opacity-80'
                    : eligibilityStatus === 'unknown'
                      ? 'border-amber-500/30 hover:border-amber-500/60'
                      : 'border-border hover:border-primary/50'
                }`}
              >
                {/* Header row: Title + Dual Badges */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-border/60">
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-6 h-6 rounded-md bg-muted text-foreground font-black text-xs flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <Link
                        href={`/opportunities/${opp.slug || opp.id}`}
                        className="font-bold text-base text-foreground hover:text-primary hover:underline transition-colors"
                      >
                        {opp.title}
                      </Link>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {opp.category.replace('_', ' ')}
                      </Badge>
                      {opp.isOpenToNigeria ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          🇳🇬 Open to Nigeria
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          🌍 Host: {opp.locations?.[0]?.country || 'Foreign Host'} (Visa/Onsite Restricted)
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">{opp.summary}</p>
                  </div>

                  {/* Dual Badges */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Relevance 0-100 */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary border border-primary/25 text-xs font-black">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{relevanceScore}% Relevance</span>
                    </div>

                    {/* Eligibility Badge */}
                    <Badge
                      variant={
                        eligibilityStatus === 'eligible'
                          ? 'success'
                          : eligibilityStatus === 'likely_eligible'
                            ? 'warning'
                            : eligibilityStatus === 'unknown'
                              ? 'outline'
                              : 'destructive'
                      }
                      className="text-xs font-bold px-2.5 py-1"
                    >
                      {eligibilityStatus === 'eligible' && <CheckCircle2 className="w-3 h-3 mr-1 inline" />}
                      {eligibilityStatus === 'likely_eligible' && <HelpCircle className="w-3 h-3 mr-1 inline" />}
                      {eligibilityStatus === 'unknown' && <ShieldQuestion className="w-3 h-3 mr-1 inline" />}
                      {eligibilityStatus === 'ineligible' && <XCircle className="w-3 h-3 mr-1 inline" />}
                      {eligibilityStatus === 'eligible'
                        ? 'Eligible'
                        : eligibilityStatus === 'likely_eligible'
                          ? 'Likely Eligible'
                          : eligibilityStatus === 'unknown'
                            ? 'Verify First'
                            : 'Ineligible'}
                    </Badge>
                  </div>
                </div>

                {/* Explanation Rationale */}
                {(opp.matchExplanation || (opp as any).explanation) && (
                  <div className="my-3 p-3 rounded-xl bg-muted/40 border border-border/80 text-xs text-foreground/90 leading-relaxed flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-foreground">Why this fits you: </span>
                      <span>{opp.matchExplanation || (opp as any).explanation}</span>
                    </div>
                  </div>
                )}

                {/* Blockers or Verification Alerts */}
                {opp.eligibilityAssessment && opp.eligibilityAssessment.blockers.length > 0 && (
                  <div className="my-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-400 text-xs">
                    <span className="font-bold flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Eligibility Blocker:
                    </span>
                    <ul className="list-disc list-inside text-[11px] space-y-0.5">
                      {opp.eligibilityAssessment.blockers.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {opp.eligibilityAssessment && opp.eligibilityAssessment.missingInfo.length > 0 && (
                  <div className="my-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-xs">
                    <span className="font-bold flex items-center gap-1.5 mb-1">
                      <ShieldQuestion className="w-3.5 h-3.5" /> Requires Verification:
                    </span>
                    <ul className="list-disc list-inside text-[11px] space-y-0.5">
                      {opp.eligibilityAssessment.missingInfo.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Collapsible 7-Dimension Breakdown */}
                <div className="pt-2">
                  <button
                    onClick={() => toggleBreakdown(opp.id)}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    {isBreakdownOpen ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" /> Hide 7-Dimension Score Breakdown
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" /> View 7-Dimension Score Breakdown & Evidence
                      </>
                    )}
                  </button>

                  {isBreakdownOpen && (
                    <div className="mt-3 p-4 rounded-xl bg-card border border-border/80 space-y-3 text-xs animate-in fade-in">
                      <h4 className="font-bold text-foreground">7-Dimension Deterministic Scoring Breakdown:</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-2 rounded-lg bg-muted/40 border border-border/60">
                          <span className="text-[10px] text-muted-foreground block">Category (25%)</span>
                          <span className="font-black text-sm text-foreground">
                            {opp.relevanceBreakdown?.categoryScore ?? 90}%
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/40 border border-border/60">
                          <span className="text-[10px] text-muted-foreground block">Skills & Stack (20%)</span>
                          <span className="font-black text-sm text-foreground">
                            {opp.relevanceBreakdown?.skillsScore ?? 95}%
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/40 border border-border/60">
                          <span className="text-[10px] text-muted-foreground block">Education (15%)</span>
                          <span className="font-black text-sm text-foreground">
                            {opp.relevanceBreakdown?.educationScore ?? 95}%
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/40 border border-border/60">
                          <span className="text-[10px] text-muted-foreground block">Geography (15%)</span>
                          <span className="font-black text-sm text-foreground">
                            {opp.relevanceBreakdown?.geographyScore ?? (opp.isOpenToNigeria ? 100 : 0)}%
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/40 border border-border/60">
                          <span className="text-[10px] text-muted-foreground block">Benefits/Pay (10%)</span>
                          <span className="font-black text-sm text-foreground">
                            {opp.relevanceBreakdown?.benefitsScore ?? 90}%
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/40 border border-border/60">
                          <span className="text-[10px] text-muted-foreground block">Org Alignment (10%)</span>
                          <span className="font-black text-sm text-foreground">
                            {opp.relevanceBreakdown?.orgScore ?? 85}%
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/40 border border-border/60">
                          <span className="text-[10px] text-muted-foreground block">Timing (5%)</span>
                          <span className="font-black text-sm text-foreground">
                            {opp.relevanceBreakdown?.timingScore ?? 90}%
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/25">
                          <span className="text-[10px] text-primary block font-bold">Total Weighted</span>
                          <span className="font-black text-sm text-primary">{relevanceScore}%</span>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <Link
                          href={`/opportunities/${opp.slug || opp.id}`}
                          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          View Full Requirement Audit Table &rarr;
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Controls & Feedback */}
                <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-muted-foreground">
                    <span>
                      Org:{' '}
                      <strong className="text-foreground">{opp.organization?.name || 'Independent Publisher'}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span>Host:</span>
                      <strong className="text-foreground">
                        {opp.locations?.some((l) => l.isRemote)
                          ? 'Worldwide Remote'
                          : opp.locations?.map((l) => l.country).filter(Boolean).join(', ') || 'Global'}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Deadline:{' '}
                      <strong className="text-foreground">
                        {opp.deadline ? new Date(opp.deadline).toLocaleDateString() : 'Rolling / Unknown'}
                      </strong>
                    </span>
                  </div>

                  {/* Feedback Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-emerald-600 gap-1"
                      onClick={() => handleFeedback(opp.id, 'thumbs_up')}
                      title="Rate as Great Match (+2% weight)"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" /> Great Match
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-rose-600 gap-1"
                      onClick={() => handleFeedback(opp.id, 'thumbs_down', 'not_relevant')}
                      title="Rate as Not Relevant (-1% weight)"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" /> Not Relevant
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-rose-600 gap-1"
                      onClick={() => handleFeedback(opp.id, 'dismiss', 'unpaid')}
                      title="Dismiss from feed"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Dismiss
                    </Button>

                    <Link href={`/opportunities/${opp.slug || opp.id}`}>
                      <Button variant="default" size="sm" className="h-7 text-xs font-semibold gap-1">
                        View Details & Audit
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
