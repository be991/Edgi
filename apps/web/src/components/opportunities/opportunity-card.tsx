'use client';

import React from 'react';
import Link from 'next/link';
import {
  Calendar,
  DollarSign,
  MapPin,
  Bookmark,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { Opportunity } from '@edgi/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatRelativeDays, formatCurrency, cn } from '@/lib/utils';

interface OpportunityCardProps {
  opportunity: Opportunity;
  onToggleSave?: (id: string) => void;
}

export function OpportunityCard({ opportunity, onToggleSave }: OpportunityCardProps) {
  const isExpired = opportunity.verificationStatus === 'expired';
  const isUnverified = opportunity.verificationStatus === 'unverified';
  const hasNullDeadline = opportunity.deadline === null;

  // Eligibility status color mapping
  const getEligibilityBadge = (status?: string | null) => {
    switch (status) {
      case 'eligible':
        return <Badge variant="success">Eligible</Badge>;
      case 'likely_eligible':
        return <Badge variant="warning">Likely Eligible (Verify)</Badge>;
      case 'possibly_eligible':
        return <Badge variant="info">Possibly Eligible</Badge>;
      case 'ineligible':
        return <Badge variant="destructive">Ineligible</Badge>;
      default:
        return <Badge variant="outline">Eligibility: Unknown</Badge>;
    }
  };

  // Verification status color mapping
  const getVerificationBadge = () => {
    switch (opportunity.verificationStatus) {
      case 'verified':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" /> Verified Evidence
          </span>
        );
      case 'partially_verified':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-sky-600 dark:text-sky-400">
            <ShieldCheck className="w-3.5 h-3.5" /> Partially Verified
          </span>
        );
      case 'unverified':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" /> Unverified Post
          </span>
        );
      case 'expired':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
            <ShieldAlert className="w-3.5 h-3.5" /> Expired Listing
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'group relative rounded-xl border bg-card p-5 transition-all hover:shadow-md flex flex-col justify-between',
        isExpired ? 'opacity-70 border-red-500/30' : 'border-border hover:border-primary/40',
        isUnverified && 'border-amber-500/40 bg-amber-500/[0.02]',
      )}
    >
      <div>
        {/* Top Badges & Dual Scores Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {opportunity.category.replace('_', ' ')}
            </Badge>

            {/* Separate Eligibility Badge */}
            {getEligibilityBadge(opportunity.eligibilityStatus)}

            {/* Verification Status */}
            {getVerificationBadge()}
          </div>

          {/* Separate Relevance Score */}
          {opportunity.relevanceScore !== undefined && opportunity.relevanceScore !== null && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-xs font-bold">{opportunity.relevanceScore}% Match</span>
            </div>
          )}
        </div>

        {/* Title & Organization */}
        <h3 className="font-bold text-base text-foreground leading-snug group-hover:text-primary transition-colors">
          <Link href={`/opportunities/${opportunity.slug}`} className="hover:underline">
            {opportunity.title}
          </Link>
        </h3>
        <p className="text-xs font-medium text-muted-foreground mt-1 flex items-center gap-1.5">
          <span>{opportunity.organization.name}</span>
          {opportunity.organization.verified && (
            <span className="text-primary font-bold text-[10px]" title="Verified Organization">
              ✓
            </span>
          )}
        </p>

        {/* Summary */}
        <p className="text-xs text-muted-foreground mt-2.5 line-clamp-2 leading-relaxed">
          {opportunity.summary}
        </p>

        {/* Nasty Fixture Warning Notice if unverified */}
        {isUnverified && (
          <div className="mt-3 p-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
            <span>This item has not yet been corroborated by a second source. Treat details as unconfirmed.</span>
          </div>
        )}

        {/* Metadata Grid (Locations, Deadline, Stipend) */}
        <div className="mt-4 pt-3 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
          {/* Location */}
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {opportunity.locations.some((l) => l.isRemote)
                ? 'Worldwide Remote'
                : opportunity.locations.map((l) => l.country).filter(Boolean).join(', ') || 'Location Unknown'}
            </span>
          </div>

          {/* Deadline: Strictly No Fabrication */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            {hasNullDeadline ? (
              <span className="font-medium text-foreground">Rolling / Unknown</span>
            ) : (
              <span
                className={cn(
                  'font-medium truncate',
                  isExpired ? 'text-red-500 font-bold' : 'text-foreground',
                )}
              >
                {formatDate(opportunity.deadline)} ({formatRelativeDays(opportunity.deadline)})
              </span>
            )}
          </div>

          {/* Stipend / Funding */}
          <div className="flex items-center gap-1.5 sm:col-span-2">
            <DollarSign className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            <span>
              {opportunity.stipend?.description
                ? opportunity.stipend.description
                : opportunity.stipend?.min
                  ? `${formatCurrency(opportunity.stipend.min, opportunity.stipend.currency)} (${opportunity.stipend.period || 'total'})`
                  : 'Stipend: Undisclosed / Unpaid'}
            </span>
          </div>
        </div>

        {/* Tags */}
        {opportunity.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {opportunity.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card Actions */}
      <div className="mt-5 pt-3 border-t border-border flex items-center justify-between gap-3">
        <button
          onClick={() => onToggleSave?.(opportunity.id)}
          className={cn(
            'flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors',
            opportunity.isSaved
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'border-border text-muted-foreground hover:bg-muted',
          )}
        >
          <Bookmark className={cn('w-3.5 h-3.5', opportunity.isSaved && 'fill-current')} />
          <span>{opportunity.isSaved ? 'Saved' : 'Save'}</span>
        </button>

        <Link href={`/opportunities/${opportunity.slug}`}>
          <Button size="sm" variant="outline" className="text-xs gap-1">
            <span>View Details & Evidence</span>
            <ArrowUpRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
