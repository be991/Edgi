'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Briefcase,
  AlertOctagon,
  Calendar,
  Compass,
  ArrowRight,
  ShieldCheck,
  Radio,
  Clock,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { Opportunity, Application, Source } from '@edgi/contracts';
import { OpportunityCard } from '@/components/opportunities/opportunity-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [oppsRes, appsRes, srcsRes] = await Promise.all([
          api.getOpportunities(),
          api.getApplications(),
          api.getSources(),
        ]);
        setOpportunities(oppsRes.opportunities);
        setApplications(appsRes);
        setSources(srcsRes);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleToggleSave = async (id: string) => {
    const isSaved = await api.toggleSaveOpportunity(id);
    setOpportunities((prev) =>
      prev.map((o) => (o.id === id ? { ...o, isSaved } : o)),
    );
  };

  // KPI Calculations
  const strongMatches = opportunities.filter((o) => (o.relevanceScore ?? 0) >= 85);
  const closingSoon = opportunities.filter((o) => {
    if (!o.deadline) return false;
    const diffDays = Math.ceil((new Date(o.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 14;
  });
  const sourceFailures = sources.filter((s) => s.status === 'unavailable' || s.health.consecutiveFailures > 0);
  const activeApplications = applications.filter((a) => a.status === 'preparing' || a.status === 'submitted');

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Intelligence Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time telemetry, personalized cyber security matches, and application pipelines.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/discover">
            <Button className="gap-2 text-xs">
              <Compass className="w-3.5 h-3.5" />
              <span>Explore Discover Feed</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Critical Alert Notice if sources are failing */}
      {sourceFailures.length > 0 && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-800 dark:text-red-300 flex items-start justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertOctagon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Source Degradation Alert</p>
              <p className="text-muted-foreground mt-0.5">
                {sourceFailures.length} monitored source channel is failing health checks (HTTP 502/down). Showing last verified sync.
              </p>
            </div>
          </div>
          <Link href="/sources">
            <Button size="sm" variant="outline" className="border-red-500/30 text-red-700 dark:text-red-400 hover:bg-red-500/10 text-xs shrink-0">
              Inspect Source Health
            </Button>
          </Link>
        </div>
      )}

      {/* Key Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Strongest Matches */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">High Matches (&gt;85%)</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black">{strongMatches.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">AppSec & funded fellowships</p>
          </div>
        </div>

        {/* KPI 2: Closing Soon */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Closing &le; 14 Days</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black">{closingSoon.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Urgent deadlines pending</p>
          </div>
        </div>

        {/* KPI 3: In-Progress Applications */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Active Applications</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black">{activeApplications.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Preparing & submitted</p>
          </div>
        </div>

        {/* KPI 4: Monitored Channels */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Active Sources</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black">{sources.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Last run: 45 mins ago</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Strongest Matches & Closing Soon */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Top Recommended Matches</h2>
            <p className="text-xs text-muted-foreground">
              Ranked specifically against your 200-level Cyber Security background.
            </p>
          </div>
          <Link href="/recommended" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            <span>View All Ranked</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {opportunities.slice(0, 3).map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} onToggleSave={handleToggleSave} />
          ))}
        </div>
      </div>

      {/* Secondary Section: Active Applications Quick Glance */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm">Application Pipeline</h3>
            <p className="text-xs text-muted-foreground">Active applications and upcoming task deadlines.</p>
          </div>
          <Link href="/applications">
            <Button variant="outline" size="sm" className="text-xs">
              Go to Kanban Tracker
            </Button>
          </Link>
        </div>

        <div className="divide-y divide-border/60">
          {applications.map((app) => (
            <div key={app.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-foreground text-sm">{app.opportunityTitle}</span>
                <p className="text-muted-foreground mt-0.5">{app.organizationName} &bull; {app.notes}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={app.status === 'submitted' ? 'success' : 'secondary'} className="capitalize">
                  {app.status}
                </Badge>
                {app.deadline && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Due {new Date(app.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
