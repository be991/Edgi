'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, CheckCircle2, ShieldQuestion, HelpCircle, ArrowRight, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api/client';
import { Opportunity } from '@edgi/contracts';
import { OpportunityCard } from '@/components/opportunities/opportunity-card';
import { Badge } from '@/components/ui/badge';

export default function RecommendedPage() {
  const [recommended, setRecommended] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getRecommendedOpportunities();
        setRecommended(res);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Personalized Recommendations</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Ranked through dual separate scoring: Relevance against your AppSec/developer profile & Eligibility verification.
            </p>
          </div>
        </div>
      </div>

      {/* Intelligence Rule Banner */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
        <div>
          <span className="font-bold text-foreground">Rule of Transparency:</span>
          <p className="text-muted-foreground mt-0.5">
            Relevance (is it valuable to you?) and Eligibility (can you apply?) are strictly separated. No single opaque score.
          </p>
        </div>
        <Link href="/profile" className="text-primary font-bold hover:underline shrink-0">
          Refine Matching Criteria &rarr;
        </Link>
      </div>

      {/* Ranked Feed with Explanations */}
      <div className="space-y-6">
        {recommended.map((opp, index) => (
          <div
            key={opp.id}
            className="rounded-2xl border border-border bg-card p-5 sm:p-6 transition-all hover:border-primary/40 space-y-4"
          >
            {/* Top Match Rank Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-black text-xs flex items-center justify-center">
                  #{index + 1}
                </span>
                <span className="font-bold text-sm text-foreground">{opp.title}</span>
                <Badge variant="secondary" className="capitalize text-[10px]">
                  {opp.category.replace('_', ' ')}
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                {/* Relevance Score */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Relevance: {opp.relevanceScore}%</span>
                </div>

                {/* Eligibility Badge */}
                <Badge
                  variant={
                    opp.eligibilityStatus === 'eligible'
                      ? 'success'
                      : opp.eligibilityStatus === 'likely_eligible'
                        ? 'warning'
                        : 'outline'
                  }
                >
                  {opp.eligibilityStatus === 'eligible'
                    ? 'Eligible'
                    : opp.eligibilityStatus === 'likely_eligible'
                      ? 'Likely Eligible'
                      : 'Unknown'}
                </Badge>
              </div>
            </div>

            {/* AI Explanation Box */}
            {opp.matchExplanation && (
              <div className="p-3.5 rounded-xl bg-muted/50 border border-border/80 text-xs text-foreground/90 leading-relaxed flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Match Rationale: </span>
                  <span>{opp.matchExplanation}</span>
                </div>
              </div>
            )}

            {/* Eligibility Assessment Breakdown */}
            {opp.eligibilityAssessment && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Qualifying Factors */}
                {opp.eligibilityAssessment.reasons.length > 0 && (
                  <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mb-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Qualifying Points
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px]">
                      {opp.eligibilityAssessment.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Pending Confirmations / Missing Info */}
                {opp.eligibilityAssessment.missingInfo.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
                    <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-1.5">
                      <HelpCircle className="w-3.5 h-3.5" /> Needs Verification
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px]">
                      {opp.eligibilityAssessment.missingInfo.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Opportunity Card Embed */}
            <div className="pt-2">
              <OpportunityCard
                opportunity={opp}
                onToggleSave={async (id) => {
                  const isSaved = await api.toggleSaveOpportunity(id);
                  setRecommended((prev) =>
                    prev.map((o) => (o.id === id ? { ...o, isSaved } : o)),
                  );
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
