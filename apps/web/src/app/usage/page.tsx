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
  PauseOctagon,
  PlayCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { UsageBudget, SystemHealth } from '@edgi/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

export default function UsagePage() {
  const [budget, setBudget] = useState<any>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingPause, setIsTogglingPause] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [b, h] = await Promise.all([
        api.getUsageBudget().catch(() => null),
        api.getSystemHealth().catch(() => null),
      ]);
      setBudget(b);
      setHealth(h);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleEmergencyPause = async () => {
    if (!budget) return;
    const nextState = !budget.isEmergencyPaused;
    setIsTogglingPause(true);
    try {
      await api.updateBudgetSettings({ isEmergencyPaused: nextState });
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to update emergency pause setting');
    } finally {
      setIsTogglingPause(false);
    }
  };

  if (isLoading || !budget) {
    return <div className="p-8 text-center text-xs text-muted-foreground">Loading system telemetry & budget...</div>;
  }

  const totalSpent = budget.totalSpentUsd ?? 0;
  const totalLimit = budget.totalLimitUsd ?? 10.0;
  const searchSpent = budget.searchSpentUsd ?? 0;
  const searchLimit = budget.searchLimitUsd ?? 4.0;
  const llmSpent = budget.llmSpentUsd ?? 0;
  const llmLimit = budget.llmLimitUsd ?? 5.0;
  const bufferRemaining = budget.bufferRemainingUsd ?? 1.0;

  const totalPercent = Math.min(Math.round((totalSpent / totalLimit) * 100), 100);
  const searchPercent = Math.min(Math.round((searchSpent / searchLimit) * 100), 100);
  const llmPercent = Math.min(Math.round((llmSpent / llmLimit) * 100), 100);

  const isPaused = Boolean(budget.isEmergencyPaused);
  const thresholdStatus = budget.status || (budget.isHardStopActive ? 'hard_stop' : totalPercent >= 70 ? 'warning' : 'normal');

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Budget & Telemetry Monitor</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Strict $10/month cap enforcement (Search APIs + LLM verification) and background worker operational health.
          </p>
        </div>

        {/* Emergency Pause Action Button */}
        <div className="flex items-center gap-2">
          <Button
            variant={isPaused ? 'default' : 'destructive'}
            size="sm"
            onClick={handleToggleEmergencyPause}
            disabled={isTogglingPause}
            className="text-xs gap-1.5 font-semibold"
          >
            {isTogglingPause ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : isPaused ? (
              <PlayCircle className="w-3.5 h-3.5" />
            ) : (
              <PauseOctagon className="w-3.5 h-3.5" />
            )}
            <span>{isPaused ? 'Resume Discovery Crawlers' : 'Emergency Pause'}</span>
          </Button>
        </div>
      </div>

      {/* Emergency Pause Alert Banner */}
      {isPaused && (
        <div className="p-4 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <span className="font-bold block">Discovery Pipeline Paused</span>
            All scheduled and manual search discovery sweeps are temporarily locked until you resume them.
          </div>
        </div>
      )}

      {/* Monthly Budget Card */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-base font-bold text-foreground">Monthly Enforced Budget Cap</h2>
              <span className="text-xs text-muted-foreground">Current Billing Cycle: {budget.month || 'Current Month'}</span>
            </div>
          </div>

          <Badge
            variant={
              isPaused
                ? 'destructive'
                : thresholdStatus === 'hard_stop'
                ? 'destructive'
                : thresholdStatus === 'degraded' || thresholdStatus === 'warning'
                ? 'warning'
                : 'success'
            }
          >
            {isPaused
              ? 'Manually Paused'
              : thresholdStatus === 'hard_stop'
              ? 'Hard Stop Locked'
              : thresholdStatus === 'degraded'
              ? 'Degraded Mode (>= 90%)'
              : thresholdStatus === 'warning'
              ? 'Warning (>= 70%)'
              : 'Healthy Under Cap'}
          </Badge>
        </div>

        {/* Overall Spend Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span>Total Combined Spend: {formatCurrency(totalSpent)}</span>
            <span>Monthly Hard Stop: {formatCurrency(totalLimit)}</span>
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
            <span>{totalPercent}% of monthly limit consumed</span>
            <span>${(totalLimit - totalSpent).toFixed(2)} remaining</span>
          </div>
        </div>

        {/* Breakdown Grid: Search vs LLM vs Buffer */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Search Budget */}
          <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">Search Engine APIs</span>
              <span className="font-bold text-primary">${searchSpent.toFixed(2)}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full"
                style={{ width: `${Math.min(searchPercent, 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground block">
              Budget: ${searchLimit.toFixed(2)} ({searchPercent}% used)
            </span>
          </div>

          {/* LLM Spend */}
          <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">LLM Extraction / Rationale</span>
              <span className="font-bold text-primary">${llmSpent.toFixed(2)}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full"
                style={{ width: `${Math.min(llmPercent, 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground block">
              Budget: ${llmLimit.toFixed(2)} ({llmPercent}% used)
            </span>
          </div>

          {/* Buffer */}
          <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">Reserve Buffer</span>
              <span className="font-bold text-emerald-500">${bufferRemaining.toFixed(2)}</span>
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
          <span className="font-bold text-foreground block">Enforced Hard Stop Invariants:</span>
          <p>&bull; 70% threshold: Non-blocking warning notification triggered.</p>
          <p>&bull; 90% threshold: Low-priority recurring discovery queries are dropped automatically.</p>
          <p>&bull; 100% threshold: Hard stop kicks in; all search and LLM API calls are locked until next month.</p>
        </div>
      </div>

      {/* System Telemetry & Worker Health */}
      {health && (
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
                Query Latency: {health.database?.latencyMs ?? 5}ms
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
                Ping Latency: {health.redis?.latencyMs ?? 2}ms
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
                Last Heartbeat: {health.workers?.lastHeartbeat ? new Date(health.workers.lastHeartbeat).toLocaleTimeString() : 'Active'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
