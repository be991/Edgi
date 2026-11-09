'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  DollarSign,
  MapPin,
  Bookmark,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ExternalLink,
  ArrowLeft,
  FileText,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Briefcase,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { Opportunity } from '@edgi/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatRelativeDays, formatCurrency } from '@/lib/utils';

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (!slug) return;
    async function load() {
      try {
        const opp = await api.getOpportunityBySlug(slug);
        setOpportunity(opp);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [slug]);

  if (isLoading) {
    return <div className="p-8 text-center text-xs text-muted-foreground">Loading opportunity details...</div>;
  }

  if (!opportunity) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="text-lg font-bold">Opportunity Not Found</h2>
        <p className="text-xs text-muted-foreground">The opportunity you requested does not exist in the index.</p>
        <Link href="/discover">
          <Button size="sm" variant="outline">
            &larr; Back to Discover
          </Button>
        </Link>
      </div>
    );
  }

  const handleToggleSave = async () => {
    const isSaved = await api.toggleSaveOpportunity(opportunity.id);
    setOpportunity({ ...opportunity, isSaved });
  };

  const handleStartApplication = async () => {
    setIsApplying(true);
    try {
      await api.createApplicationFromOpportunity(opportunity.id);
      router.push('/applications');
    } finally {
      setIsApplying(false);
    }
  };

  const isExpired = opportunity.verificationStatus === 'expired';
  const isUnverified = opportunity.verificationStatus === 'unverified';

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          href="/discover"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Discover Feed</span>
        </Link>
      </div>

      {/* Main Canonical Header */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {opportunity.category.replace('_', ' ')}
            </Badge>

            {opportunity.verificationStatus === 'verified' && (
              <Badge variant="success">Verified Evidence</Badge>
            )}
            {opportunity.verificationStatus === 'unverified' && (
              <Badge variant="warning">Unverified Post</Badge>
            )}
            {opportunity.verificationStatus === 'expired' && (
              <Badge variant="destructive">Expired</Badge>
            )}

            {opportunity.eligibilityStatus && (
              <Badge variant={opportunity.eligibilityStatus === 'eligible' ? 'success' : 'outline'}>
                Eligibility: {opportunity.eligibilityStatus.replace('_', ' ')}
              </Badge>
            )}
          </div>

          {opportunity.relevanceScore !== undefined && opportunity.relevanceScore !== null && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 font-bold text-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{opportunity.relevanceScore}% Relevance Score</span>
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground leading-tight">
            {opportunity.title}
          </h1>
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{opportunity.organization.name}</span>
            {opportunity.organization.verified && (
              <span className="text-primary font-bold text-xs" title="Verified Host">✓</span>
            )}
            {opportunity.organization.country && (
              <span>&bull; {opportunity.organization.country}</span>
            )}
          </div>
        </div>

        {/* Warning Callout if Unverified */}
        {isUnverified && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Unverified Source Notice</p>
              <p className="mt-0.5 leading-relaxed text-[11px]">
                This opportunity has only been discovered in an unconfirmed channel (confidence {Math.round(opportunity.confidence * 100)}%). Verify all eligibility requirements, stipend numbers, and application links independently before providing personal documents.
              </p>
            </div>
          </div>
        )}

        {/* Key Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-muted/40 border border-border/80 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px] mb-1">Application Deadline</span>
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              {opportunity.deadline ? (
                <span className={isExpired ? 'text-red-500' : ''}>
                  {formatDate(opportunity.deadline)} ({formatRelativeDays(opportunity.deadline)})
                </span>
              ) : (
                <span>Rolling / Unknown (No fabrication)</span>
              )}
            </div>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px] mb-1">Compensation / Stipend</span>
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                {opportunity.stipend?.description ||
                  (opportunity.stipend?.min
                    ? `${formatCurrency(opportunity.stipend.min, opportunity.stipend.currency)} (${opportunity.stipend.period || 'total'})`
                    : 'Unknown / Undisclosed')}
              </span>
            </div>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px] mb-1">Location & Remote</span>
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <MapPin className="w-3.5 h-3.5 text-sky-500" />
              <span>
                {opportunity.locations.some((l) => l.isRemote)
                  ? 'Worldwide Remote'
                  : opportunity.locations.map((l) => l.country).filter(Boolean).join(', ') || 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* Start Application in Tracker */}
          <Button onClick={handleStartApplication} disabled={isApplying} className="gap-2 text-xs">
            <Briefcase className="w-3.5 h-3.5" />
            <span>{isApplying ? 'Adding to Tracker...' : 'Start Application in Tracker'}</span>
          </Button>

          {/* Bookmark Button */}
          <Button variant="outline" onClick={handleToggleSave} className="gap-2 text-xs">
            <Bookmark className={`w-3.5 h-3.5 ${opportunity.isSaved ? 'fill-current text-primary' : ''}`} />
            <span>{opportunity.isSaved ? 'Saved to Bookmarks' : 'Save for Later'}</span>
          </Button>

          {/* External Apply Link with Safety Guard */}
          <a
            href={opportunity.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto"
          >
            <Button variant="secondary" className="gap-2 text-xs">
              <span>Visit Official Apply URL</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>
        </div>
      </div>

      {/* Summary & Benefits */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-foreground mb-3">Overview & Scope</h2>
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
            {opportunity.summary}
          </p>
        </div>

        {opportunity.benefits.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-foreground mb-2.5">Documented Benefits</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
              {opportunity.benefits.map((b, i) => (
                <li key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {opportunity.tags.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-2">Category Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {opportunity.tags.map((t) => (
                <span key={t} className="px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground">
                  #{t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Traceable Evidence Trail (Strict Invariant: Traceable to sources) */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Traceable Evidence Ledger</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Every assertion (deadline, stipend, eligibility) is backed by recorded evidence snippets from verified crawlers.
        </p>

        {opportunity.evidence.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No granular evidence records logged.</p>
        ) : (
          <div className="space-y-3 mt-4">
            {opportunity.evidence.map((ev) => (
              <div
                key={ev.id}
                className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono uppercase text-[10px]">
                      {ev.fieldName}
                    </Badge>
                    <span className="font-semibold text-foreground">{ev.sourceName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>Confidence: {Math.round(ev.confidence * 100)}%</span>
                    <span>&bull;</span>
                    <a
                      href={ev.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <span>Source Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="bg-background/80 p-3 rounded-lg border border-border/60 font-mono text-[11px] text-foreground/90 leading-relaxed">
                  &ldquo;{ev.snippet}&rdquo;
                </div>

                <div className="text-[11px] text-muted-foreground">
                  Extracted value: <span className="font-semibold text-foreground">{ev.extractedValue}</span> &bull; {new Date(ev.extractedAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
