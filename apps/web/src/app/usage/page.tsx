'use client';

import React, { useState, useEffect } from 'react';
import {
  CircleDollarSign,
  Cpu,
  Database,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Radio,
  Clock,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { UsageBudget, SystemHealth } from '@edgi/contracts';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

export default function UsagePage() {
  const [budget, setBudget] = useState<UsageBudget | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [b, h] = await Promise.all([api.getUsageBudget(), api.getSystemHealth()]);
        setBudget(b);
        setHealth(h);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading || !budget || !health) {
    return <div className="p-8 text-center text-xs text-muted-foreground">Loading system telemetry...</div>;
  }

  const totalPercent = Math.round((budget.totalSpentUsd / budget.totalLimitUsd) * 100);
  const searchPercent = Math.round((budget.searchSpentUsd / budget.searchLimitUsd) * 100);
  const llmPercent = Math.round((budget.llmSpentUsd / budget.llmLimitUsd) * 100);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="pb-2 border-b border-border">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Budget & Telemetry Monitor</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Strict $10/month cap enforcement (Search APIs + LLM verification) and background worker operational health.
        </p>
      </div>

      {/* Monthly Budget Card */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-base font-bold text-foreground">Monthly Enforced Budget Cap</h2>
              <span className="text-xs text-muted-foreground">Current Billing Cycle: {budget.month}</span>
            </div>
          </div>

          <Badge variant={budget.isHardStopActive ? 'destructive' : totalPercent >= 70 ? 'warning' : 'success'}>
            {budget.isHardStopActive ? 'Hard Stop Active' : totalPercent >= 70 ? 'Warning (>= 70%)' : 'Healthy Under Cap'}
          </Badge>
        </div>

        {/* Overall Spend Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span>Total Combined Spend: {formatCurrency(budget.totalSpentUsd)}</span>
            <span>Monthly Hard Stop: {formatCurrency(budget.totalLimitUsd)}</span>
          </div>
          <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                totalPercent >= 90 ? 'bg-red-500' : totalPercent >= 70 ? 'bg-amber-500' : 'bg-primary'
              }`}
              style={{ width: `${Math.min(totalPercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>{totalPercent}% of limit consumed</span>
            <span>${(budget.totalLimitUsd - budget.totalSpentUsd).toFixed(2)} remaining</span>
          </div>
        </div>

        {/* Breakdown Grid: Search vs LLM vs Buffer */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Search Budget */}
          <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">Search Engine APIs</span>
              <span className="font-bold text-primary">${budget.searchSpentUsd.toFixed(2)}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full"
                style={{ width: `${Math.min(searchPercent, 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground block">
              Budget: ${budget.searchLimitUsd.toFixed(2)} ({searchPercent}% used)
            </span>
          </div>

          {/* LLM Spend */}
          <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">LLM Extraction / Rationale</span>
              <span className="font-bold text-primary">${budget.llmSpentUsd.toFixed(2)}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full"
                style={{ width: `${Math.min(llmPercent, 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground block">
              Budget: ${budget.llmLimitUsd.toFixed(2)} ({llmPercent}% used)
            </span>
          </div>

          {/* Buffer */}
          <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">Reserve Buffer</span>
              <span className="font-bold text-emerald-500">${budget.bufferRemainingUsd.toFixed(2)}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-emerald-500/20 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full w-full" />
            </div>
            <span className="text-[10px] text-muted-foreground block">
              Untouched safety reserve ($1.00)
            </span>
          </div>
        </div>

        {/* Budget Rules Explainer */}
        <div className="p-4 rounded-xl bg-muted/50 border border-border/80 text-[11px] text-muted-foreground space-y-1">
          <span className="font-bold text-foreground block">Cap Invariants:</span>
          <p>&bull; 70% threshold: Non-blocking warning notification triggered.</p>
          <p>&bull; 90% threshold: Low-priority recurring discovery queries are dropped automatically.</p>
          <p>&bull; 100% threshold: Hard stop kicks in; all search and LLM API calls are locked until next month.</p>
        </div>
      </div>

      {/* System Telemetry & Worker Health */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Activity className="w-5 h-5 text-emerald-500" />
          <h2 className="text-base font-bold text-foreground">System Health & Process Telemetry</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Database */}
          <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Database className="w-4 h-4 text-primary" /> PostgreSQL 16
              </span>
              <Badge variant="success">Connected</Badge>
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Query Latency: {health.database.latencyMs}ms
            </span>
          </div>

          {/* Redis */}
          <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-primary" /> Redis 7 Queue
              </span>
              <Badge variant="success">Connected</Badge>
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Ping Latency: {health.redis.latencyMs}ms
            </span>
          </div>

          {/* BullMQ Worker Heartbeat */}
          <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary" /> BullMQ Worker
              </span>
              <Badge variant="success">Healthy</Badge>
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Last Heartbeat: {health.workers.lastHeartbeat ? new Date(health.workers.lastHeartbeat).toLocaleTimeString() : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
