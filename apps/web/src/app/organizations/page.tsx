'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, ShieldCheck, ExternalLink, Globe, MapPin } from 'lucide-react';
import { api } from '@/lib/api/client';
import { Opportunity } from '@edgi/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function OrganizationsPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getOpportunities();
        setOpportunities(res.opportunities);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Deduplicate organizations from opportunities
  const orgMap = new Map<string, any>();
  opportunities.forEach((o) => {
    if (!orgMap.has(o.organization.id)) {
      orgMap.set(o.organization.id, {
        ...o.organization,
        opportunityCount: 1,
      });
    } else {
      const existing = orgMap.get(o.organization.id);
      existing.opportunityCount += 1;
    }
  });

  const orgs = Array.from(orgMap.values());

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-border">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Organization Directory</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Verified foundations, hackathon leagues, venture incubators, and research labs publishing opportunities.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orgs.map((org) => (
          <div
            key={org.id}
            className="rounded-2xl border border-border bg-card p-5 sm:p-6 flex flex-col justify-between hover:border-primary/40 transition-colors"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-sm border border-primary/20">
                  {org.name.slice(0, 2).toUpperCase()}
                </div>
                {org.verified && (
                  <Badge variant="success" className="text-[10px]">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Verified
                  </Badge>
                )}
              </div>

              <h3 className="font-bold text-base text-foreground mt-3">{org.name}</h3>
              {org.country && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{org.country}</span>
                </p>
              )}

              {org.description && (
                <p className="text-xs text-muted-foreground mt-3 line-clamp-3 leading-relaxed">
                  {org.description}
                </p>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-border flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">
                {org.opportunityCount} tracked opportunit{org.opportunityCount === 1 ? 'y' : 'ies'}
              </span>

              {org.website && (
                <a
                  href={org.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Website</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
