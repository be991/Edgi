'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, SlidersHorizontal, RefreshCw, X } from 'lucide-react';
import { api } from '@/lib/api/client';
import { Opportunity, OpportunityCategory, EligibilityStatus, VerificationStatus } from '@edgi/contracts';
import { OpportunityCard } from '@/components/opportunities/opportunity-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const ALL_CATEGORIES: { label: string; value: OpportunityCategory }[] = [
  { label: 'Fellowships', value: 'fellowship' },
  { label: 'Internships', value: 'internship' },
  { label: 'Hackathons & CTFs', value: 'hackathon_ctf' },
  { label: 'Dev Programmes', value: 'dev_programme' },
  { label: 'Funding & Grants', value: 'funding' },
  { label: 'Jobs', value: 'job' },
  { label: 'OSS Bounties', value: 'oss_bounty' },
];

export default function DiscoverPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<OpportunityCategory | 'all'>('all');
  const [isRemoteOnly, setIsRemoteOnly] = useState(false);
  const [minRelevance, setMinRelevance] = useState<number>(0);
  const [verificationFilter, setVerificationFilter] = useState<VerificationStatus | 'all'>('all');
  const [eligibilityFilter, setEligibilityFilter] = useState<EligibilityStatus | 'all'>('all');

  const fetchFiltered = async () => {
    setIsLoading(true);
    try {
      const res = await api.getOpportunities({
        search: search || undefined,
        categories: selectedCategory !== 'all' ? [selectedCategory] : undefined,
        isRemoteOnly: isRemoteOnly || undefined,
        minRelevanceScore: minRelevance > 0 ? minRelevance : undefined,
        verificationStatuses: verificationFilter !== 'all' ? [verificationFilter] : undefined,
        eligibilityStatuses: eligibilityFilter !== 'all' ? [eligibilityFilter] : undefined,
      });
      setOpportunities(res.opportunities);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiltered();
  }, [selectedCategory, isRemoteOnly, minRelevance, verificationFilter, eligibilityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFiltered();
  };

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setIsRemoteOnly(false);
    setMinRelevance(0);
    setVerificationFilter('all');
    setEligibilityFilter('all');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Discover Opportunities</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Global search index spanning registered sources and independent crawler discoveries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs gap-1">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </Button>
        </div>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by keywords, tags (e.g. 'AppSec', 'fintech', 'remote', 'fellowship')..."
          className="w-full pl-10 pr-24 py-2.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <Button
          type="submit"
          size="sm"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
        >
          Search
        </Button>
      </form>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
            selectedCategory === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          All Categories
        </button>
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
              selectedCategory === cat.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Filter Controls Row */}
      <div className="p-4 rounded-xl border border-border bg-card/60 flex flex-wrap items-center gap-4 text-xs">
        {/* Remote Toggle */}
        <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
          <input
            type="checkbox"
            checked={isRemoteOnly}
            onChange={(e) => setIsRemoteOnly(e.target.checked)}
            className="rounded border-border text-primary focus:ring-primary/30 w-4 h-4"
          />
          <span>Remote Only</span>
        </label>

        {/* Eligibility Filter */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Eligibility:</span>
          <select
            value={eligibilityFilter}
            onChange={(e) => setEligibilityFilter(e.target.value as any)}
            className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Eligibility</option>
            <option value="eligible">Eligible</option>
            <option value="likely_eligible">Likely Eligible</option>
            <option value="unknown">Unknown</option>
            <option value="ineligible">Ineligible</option>
          </select>
        </div>

        {/* Verification Filter */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Verification:</span>
          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value as any)}
            className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Statuses</option>
            <option value="verified">Verified Only</option>
            <option value="unverified">Unverified Only</option>
            <option value="expired">Expired Only</option>
          </select>
        </div>

        {/* Min Relevance Slider */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Min Match: {minRelevance}%</span>
          <input
            type="range"
            min="0"
            max="95"
            step="5"
            value={minRelevance}
            onChange={(e) => setMinRelevance(Number(e.target.value))}
            className="w-24 accent-primary"
          />
        </div>

        <div className="ml-auto text-muted-foreground font-semibold">
          {opportunities.length} result{opportunities.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Opportunities Grid */}
      {opportunities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base">No opportunities matched your criteria</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Try adjusting your category, lowering the match threshold, or clearing the remote filter.
          </p>
          <Button size="sm" variant="outline" onClick={resetFilters} className="text-xs">
            Clear All Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {opportunities.map((opp) => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              onToggleSave={async (id) => {
                const isSaved = await api.toggleSaveOpportunity(id);
                setOpportunities((prev) =>
                  prev.map((o) => (o.id === id ? { ...o, isSaved } : o)),
                );
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
