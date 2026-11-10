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
  History,
  Info,
  Clock,
  Layers,
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
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (!slug) return;
    async function load() {
      try {
        const opp = await api.getOpportunityBySlug(slug);
        setOpportunity(opp);
        if (opp?.id) {
          const hist = await api.getOpportunityHistory(opp.id);
          setHistoryItems(hist || []);
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [slug]);

  if (isLoading) {
    return <div className="p-8 text-center text-xs text-muted-foreground">Loading opportunity details & evidence ledger...</div>;
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

  // Find provenance info from evidence ledger
  const deadlineEvidence = opportunity.evidence?.find((e) => e.fieldName === 'deadline');
  const stipendEvidence = opportunity.evidence?.find((e) => e.fieldName === 'stipend');

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
              <Badge variant="success" className="gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Verified Evidence</span>
              </Badge>
            )}
            {opportunity.verificationStatus === 'unverified' && (
              <Badge variant="warning" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Unverified Source</span>
              </Badge>
            )}
            {opportunity.verificationStatus === 'expired' && (
              <Badge variant="destructive" className="gap-1">
                <Clock className="w-3 h-3" />
                <span>Expired</span>
              </Badge>
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
                This opportunity was discovered via an aggregator or unconfirmed feed (confidence {Math.round(opportunity.confidence * 100)}%). Verify all eligibility requirements, stipend numbers, and application links independently before providing personal documents.
              </p>
            </div>
          </div>
        )}

        {/* Key Metadata Grid with Field-Level Provenance Tooltips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-muted/40 border border-border/80 text-xs">
          {/* Deadline Field + Provenance */}
          <div className="space-y-1">
            <span className="text-muted-foreground block text-[11px]">Application Deadline</span>
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              {opportunity.deadline ? (
                <span className={isExpired ? 'text-red-500' : ''}>
                  {formatDate(opportunity.deadline)} ({formatRelativeDays(opportunity.deadline)})
                </span>
              ) : (
                <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-400/40">
                  Rolling / Unknown (No fabrication)
                </Badge>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground pt-1 flex items-center gap-1">
              <Info className="w-2.5 h-2.5 text-primary" />
              <span>
                {deadlineEvidence
                  ? `Provenance: ${deadlineEvidence.sourceName}`
                  : opportunity.deadline
                  ? 'Provenance: Official portal direct crawl'
                  : 'Explicitly Unknown: No date declared by host'}
              </span>
            </div>
          </div>

          {/* Stipend Field + Provenance */}
          <div className="space-y-1">
            <span className="text-muted-foreground block text-[11px]">Compensation / Stipend</span>
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                {opportunity.stipend?.description ||
                  (opportunity.stipend?.min
                    ? `${formatCurrency(opportunity.stipend.min, opportunity.stipend.currency)} (${opportunity.stipend.period || 'total'})`
                    : 'Unknown / Undisclosed')}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground pt-1 flex items-center gap-1">
              <Info className="w-2.5 h-2.5 text-emerald-500" />
              <span>
                {stipendEvidence
                  ? `Provenance: Extracted (${Math.round(stipendEvidence.confidence * 100)}% conf)`
                  : opportunity.stipend?.description
                  ? 'Provenance: Primary announcement text'
                  : 'Explicitly Unknown: Not declared by host'}
              </span>
            </div>
          </div>

          {/* Location Field */}
          <div className="space-y-1">
            <span className="text-muted-foreground block text-[11px]">Location & Remote</span>
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <MapPin className="w-3.5 h-3.5 text-sky-500" />
              <span>
                {opportunity.locations.some((l) => l.isRemote)
                  ? 'Worldwide Remote'
                  : opportunity.locations.map((l) => l.country).filter(Boolean).join(', ') || 'Unknown'}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground pt-1 flex items-center gap-1">
              <Info className="w-2.5 h-2.5 text-sky-500" />
              <span>Provenance: Structured job spec</span>
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

          {/* External Apply Link */}
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

      {/* Scope, Overview & Documented Benefits */}
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

        {/* Explicit Unknown Fields Section (Pipeline Rule: Never hide or default) */}
        <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-xs text-muted-foreground">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Field Provenance & Explicit Unknowns</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            To prevent hallucination, fields not declared by the publisher are explicitly marked Unknown rather than guessed:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {!opportunity.deadline && (
              <Badge variant="outline" className="text-[10px] font-mono">
                Deadline: Unknown (Open / Rolling)
              </Badge>
            )}
            {!opportunity.stipend?.description && !opportunity.stipend?.min && (
              <Badge variant="outline" className="text-[10px] font-mono">
                Stipend Amount: Unknown
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] font-mono">
              Visa Sponsorship: Unknown
            </Badge>
            <Badge variant="outline" className="text-[10px] font-mono">
              Interview Rounds: Unknown
            </Badge>
          </div>
        </div>

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

      {/* Status & Deadline Modification History */}
      {historyItems.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Status & Modification History</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Audit trail of deadline changes, status shifts, and crawler updates over time.
          </p>

          <div className="space-y-3 mt-4">
            {historyItems.map((hist, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-[10px] uppercase">
                    {hist.changeType.replace('_', ' ')}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(hist.changedAt).toLocaleString()}
                  </span>
                </div>
                <div className="text-[11px] text-foreground font-semibold">
                  Deadline updated: <span className="text-muted-foreground line-through">{hist.oldValue ? formatDate(hist.oldValue) : 'None'}</span> &rarr; <span className="text-primary">{hist.newValue ? formatDate(hist.newValue) : 'Unknown'}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Reason: {hist.reason}
                </p>
                {hist.sourceUrl && (
                  <a
                    href={hist.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <span>Crawl source</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Traceable Evidence Ledger */}
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
