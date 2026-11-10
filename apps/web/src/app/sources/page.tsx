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
  Plus,
  Search,
  Sparkles,
  Info,
  X,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { Source } from '@edgi/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [checkLoadingId, setCheckLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add Source Form State
  const [urlInput, setUrlInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [scheduleInput, setScheduleInput] = useState('normal');
  const [evalResult, setEvalResult] = useState<any | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  async function loadSources() {
    try {
      const s = await api.getSources();
      setSources(s);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSources();
  }, []);

  const handleEvaluate = async () => {
    if (!urlInput.trim()) return;
    setIsEvaluating(true);
    setEvalError(null);
    setEvalResult(null);

    try {
      const res = await api.evaluateSource(urlInput.trim());
      setEvalResult(res);
      if (!nameInput && res.name) {
        setNameInput(res.name);
      }
      if (res.suggestedSchedule) {
        setScheduleInput(res.suggestedSchedule);
      }
    } catch (err: unknown) {
      setEvalError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleRegisterSource = async () => {
    if (!urlInput.trim() || !nameInput.trim()) return;
    setIsSubmitting(true);
    try {
      await api.createSource({
        name: nameInput.trim(),
        url: urlInput.trim(),
        connectorType: evalResult?.detectedType,
        checkInterval: scheduleInput,
      });
      setShowAddModal(false);
      setUrlInput('');
      setNameInput('');
      setEvalResult(null);
      setToastMessage('✅ New source registered and scheduled successfully.');
      setTimeout(() => setToastMessage(null), 4000);
      await loadSources();
    } catch (err: unknown) {
      setEvalError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckNow = async (id: string, name: string) => {
    setCheckLoadingId(id);
    try {
      const res = await api.checkSourceNow(id);
      if (res.success) {
        setToastMessage(`Check completed for "${name}": ${res.itemsFound} items evaluated, ${res.itemsNew} new records ingested.`);
      } else {
        setToastMessage(`Check failed for "${name}": ${res.errorMessage}`);
      }
      setTimeout(() => setToastMessage(null), 5000);
      await loadSources();
    } catch (err: unknown) {
      setToastMessage(`Error triggering check: ${err instanceof Error ? err.message : String(err)}`);
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setCheckLoadingId(null);
    }
  };

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
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-lg text-xs font-semibold flex items-center justify-between text-foreground">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Source Channels & Health</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Registered crawlers, RSS feeds, GitHub connectors, and social intake adapters. Honest telemetry is displayed without pretence.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sources/candidates">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Candidate Approvals</span>
            </Button>
          </Link>
          <Button size="sm" onClick={() => setShowAddModal(true)} className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            <span>Add Source</span>
          </Button>
        </div>
      </div>

      {/* Sources Health Table / Cards */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm">Monitored Ingestion Channels ({sources.length})</span>
          </div>
          <span className="text-xs text-muted-foreground">Automated BullMQ check intervals: 1h - 24h</span>
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
                    Capability: {src.capabilities.notes}
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

              {/* Right: Telemetry Metrics & Action */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] bg-muted/40 p-3 rounded-xl border border-border/60">
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

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCheckNow(src.id, src.name)}
                  disabled={checkLoadingId === src.id}
                  className="gap-1.5 text-xs shrink-0 self-stretch sm:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkLoadingId === src.id ? 'animate-spin text-primary' : ''}`} />
                  <span>{checkLoadingId === src.id ? 'Checking...' : 'Check Now'}</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base">Add Source Channel</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold block text-muted-foreground mb-1.5">
                  Target URL (Website, RSS feed, or GitHub repository/org)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.org/careers or https://github.com/org"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEvaluate}
                    disabled={isEvaluating || !urlInput.trim()}
                    className="gap-1 text-xs shrink-0"
                  >
                    <Search className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
                    <span>{isEvaluating ? 'Evaluating...' : 'Evaluate'}</span>
                  </Button>
                </div>
              </div>

              {evalError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                  {evalError}
                </div>
              )}

              {evalResult && (
                <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Detected Connector</span>
                    <Badge variant="outline" className="font-mono text-[10px] uppercase">
                      {evalResult.detectedType}
                    </Badge>
                  </div>

                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Method:</strong> {evalResult.proposedMethod}
                  </p>

                  {evalResult.restrictions && evalResult.restrictions.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 space-y-1">
                      <span className="font-bold block text-[11px]">Honest Restrictions:</span>
                      <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                        {evalResult.restrictions.map((r: string, i: number) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <div>
                      <label className="text-[11px] font-semibold block text-muted-foreground mb-1">Source Name</label>
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-input bg-background"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold block text-muted-foreground mb-1">Check Frequency</label>
                      <select
                        value={scheduleInput}
                        onChange={(e) => setScheduleInput(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-input bg-background"
                      >
                        <option value="high_value">High-Value (Every 1 hour)</option>
                        <option value="normal">Normal (Every 6 hours)</option>
                        <option value="low_value">Low-Value (Every 24 hours)</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button size="sm" variant="ghost" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleRegisterSource}
                disabled={!evalResult || !nameInput.trim() || isSubmitting}
              >
                {isSubmitting ? 'Registering...' : 'Confirm & Register Source'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
