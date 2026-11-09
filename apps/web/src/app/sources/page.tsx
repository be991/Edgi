'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Radio,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  FolderPlus,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { Source } from '@edgi/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const s = await api.getSources();
        setSources(s);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const getStatusBadge = (status: Source['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active (Operational)</Badge>;
      case 'active_limited':
        return <Badge variant="info">Active (Rate Limited)</Badge>;
      case 'manual_capture_only':
        return <Badge variant="warning">Manual Capture Only</Badge>;
      case 'authorization_required':
        return <Badge variant="destructive">Auth Required</Badge>;
      case 'unavailable':
        return <Badge variant="destructive">Outage / Failing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Source Channels & Health</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Registered crawlers, RSS feeds, GitHub connectors, and social intake adapters. Real telemetry is displayed without pretence.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sources/candidates">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Candidate Approvals</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Sources Health Table / Cards */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm">Monitored Ingestion Channels ({sources.length})</span>
          </div>
          <span className="text-xs text-muted-foreground">Crawler check interval: 4 hours</span>
        </div>

        <div className="divide-y divide-border/60">
          {sources.map((src) => (
            <div key={src.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
              {/* Left: Info */}
              <div className="space-y-1.5 min-w-0 max-w-xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-foreground">{src.name}</span>
                  {getStatusBadge(src.status)}
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {src.connectorType}
                  </Badge>
                </div>

                <p className="text-muted-foreground truncate">
                  Target: <span className="font-mono text-[11px]">{src.url}</span>
                </p>

                {src.capabilities.notes && (
                  <p className="text-[11px] text-muted-foreground italic">
                    Note: {src.capabilities.notes}
                  </p>
                )}

                {/* Error Banner if failing */}
                {src.health.lastError && (
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-[11px] flex items-start gap-2 mt-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
                    <span>{src.health.lastError}</span>
                  </div>
                )}
              </div>

              {/* Right: Telemetry Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0 text-[11px] bg-muted/40 p-3 rounded-xl border border-border/60">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Last Checked</span>
                  <span className="font-semibold text-foreground">
                    {src.health.lastSuccessfulCheck
                      ? new Date(src.health.lastSuccessfulCheck).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Never'}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[10px]">Latency</span>
                  <span className="font-semibold text-foreground">
                    {src.health.latencyMs ? `${src.health.latencyMs}ms` : 'N/A'}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[10px]">Items Ingested</span>
                  <span className="font-semibold text-foreground">
                    {src.health.totalItemsDiscovered} records
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
