'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  Check,
  X,
  Ban,
  ArrowLeft,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { CandidateSource } from '@edgi/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function CandidateSourcesPage() {
  const [candidates, setCandidates] = useState<CandidateSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const c = await api.getCandidateSources();
        setCandidates(c);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleAction = async (id: string, name: string, status: 'approved' | 'ignored' | 'blocked') => {
    await api.updateCandidateStatus(id, status);
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    if (status === 'approved') {
      setToastMessage(`✅ Approved "${name}" — registered into active monitored channels.`);
    } else if (status === 'blocked') {
      setToastMessage(`🚫 Blocked "${name}" — domain will be excluded from discovery.`);
    } else {
      setToastMessage(`ℹ️ Ignored recommendation for "${name}".`);
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleTrustAutomatically = (domain: string) => {
    setToastMessage(`🛡️ Auto-trust rule created for "${domain}". Future candidates from this domain will auto-approve.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-lg text-xs font-semibold flex items-center justify-between text-foreground">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div>
        <Link
          href="/sources"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Monitored Sources</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Source Recommendations</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              New publishers, CTF platforms, and opportunity boards discovered by independent search. Review and approve before auto-monitoring.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {candidates.filter((c) => c.status === 'pending').length} Pending Review
          </Badge>
        </div>
      </div>

      <div className="space-y-4">
        {candidates.map((cand) => {
          let domain = '';
          try {
            domain = new URL(cand.url).hostname;
          } catch {}

          return (
            <div
              key={cand.id}
              className="rounded-2xl border border-border bg-card p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs shadow-sm"
            >
              <div className="space-y-2.5 min-w-0 max-w-xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-foreground">{cand.name}</span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {cand.connectorType}
                  </Badge>
                  <Badge
                    variant={
                      cand.status === 'approved'
                        ? 'success'
                        : cand.status === 'blocked'
                          ? 'destructive'
                          : 'secondary'
                    }
                    className="capitalize"
                  >
                    {cand.status}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-primary" />
                    <span>Credibility: {Math.round(cand.confidence * 100)}%</span>
                  </span>
                </div>

                <a
                  href={cand.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:underline flex items-center gap-1 font-mono text-[11px]"
                >
                  <span>{cand.url}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <div className="p-3 rounded-xl bg-muted/40 border border-border/80 text-[11px] text-foreground/90 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Why Recommended: </span>
                    <span>{cand.reasoning}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant={cand.status === 'approved' ? 'default' : 'outline'}
                  onClick={() => handleAction(cand.id, cand.name, 'approved')}
                  disabled={cand.status === 'approved'}
                  className="gap-1 text-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{cand.status === 'approved' ? 'Approved' : 'Approve & Monitor'}</span>
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAction(cand.id, cand.name, 'ignored')}
                  disabled={cand.status === 'ignored'}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Ignore</span>
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAction(cand.id, cand.name, 'blocked')}
                  disabled={cand.status === 'blocked'}
                  className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Block</span>
                </Button>

                {domain && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleTrustAutomatically(domain)}
                    className="text-xs text-primary hover:bg-primary/10"
                    title="Automatically approve future opportunities from this domain"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                    <span>Trust Domain</span>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
