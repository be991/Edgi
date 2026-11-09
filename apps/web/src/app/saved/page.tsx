'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bookmark, Trash2, ArrowRight, Compass } from 'lucide-react';
import { api } from '@/lib/api/client';
import { Opportunity } from '@edgi/contracts';
import { OpportunityCard } from '@/components/opportunities/opportunity-card';
import { Button } from '@/components/ui/button';

export default function SavedPage() {
  const [savedOpportunities, setSavedOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getOpportunities();
        setSavedOpportunities(res.opportunities.filter((o) => o.isSaved));
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleRemove = async (id: string) => {
    await api.toggleSaveOpportunity(id);
    setSavedOpportunities((prev) => prev.filter((o) => o.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Saved Bookmarks</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Shortlisted opportunities saved for deeper evaluation or upcoming application deadlines.
          </p>
        </div>
        <Link href="/discover">
          <Button variant="outline" size="sm" className="text-xs gap-1.5">
            <Compass className="w-3.5 h-3.5" />
            <span>Discover More</span>
          </Button>
        </Link>
      </div>

      {savedOpportunities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Bookmark className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base">No saved opportunities yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Click the &quot;Save&quot; bookmark button on any opportunity card in Discover or Recommended to keep track of it here.
          </p>
          <Link href="/discover">
            <Button size="sm" className="text-xs">
              Go to Discover Feed
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedOpportunities.map((opp) => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              onToggleSave={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
