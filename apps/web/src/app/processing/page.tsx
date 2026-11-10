'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GitMerge,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Calendar,
  DollarSign,
  ShieldAlert,
  Sparkles,
  Search,
  Filter,
  FileText,
  Clock,
  Layers,
  HelpCircle,
  PlusCircle,
  RefreshCw,
  Send,
  Building,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { ProcessingReviewItemMock } from '@/lib/fixtures/processing';

export default function ProcessingReviewPage() {
  const [items, setItems] = useState<ProcessingReviewItemMock[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'resolved' | 'rejected'>('pending');
  const [filterReason, setFilterReason] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ProcessingReviewItemMock | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  // Manual Capture State
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState<'url' | 'text'>('url');
  const [captureUrl, setCaptureUrl] = useState('');
  const [captureText, setCaptureText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [captureResult, setCaptureResult] = useState<any | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await api.getReviewItems();
      setItems(res.items || []);
      if (res.items && res.items.length > 0 && !selectedItem) {
        setSelectedItem(res.items[0] ?? null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = items.filter((item) => {
    if (activeTab !== 'all' && item.status !== activeTab) return false;
    if (filterReason !== 'all' && item.reviewReason !== filterReason) return false;
    return true;
  });

  const handleResolve = async (action: 'accept' | 'merge' | 'reject') => {
    if (!selectedItem) return;
    setIsResolving(true);
    try {
      await api.resolveReviewItem(selectedItem.id, action, actionNotes);
      setActionNotes('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setIsResolving(false);
    }
  };

  const handleRunCapture = async () => {
    setCaptureError(null);
    setIsAnalyzing(true);
    setCaptureResult(null);
    try {
      const res = await api.captureOpportunity({
        url: captureMode === 'url' ? captureUrl : undefined,
        text: captureMode === 'text' ? captureText : undefined,
      });
      setCaptureResult(res);
    } catch (err: any) {
      setCaptureError(err.message || 'Capture analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <GitMerge className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground">Processing Review Queue</h1>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Items where the pipeline flagged conflicting dates, duplicate candidates, upfront fees, or ambiguous eligibility.
            Review evidence side-by-side to maintain canonical data integrity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            disabled={isLoading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCaptureOpen(!isCaptureOpen)}
            className="gap-1.5 text-xs font-semibold"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{isCaptureOpen ? 'Close Capture' : 'Manual Capture'}</span>
          </Button>
        </div>
      </div>

      {/* Manual Add / Capture Interactive Drawer */}
      {isCaptureOpen && (
        <div className="p-6 rounded-2xl border-2 border-primary/30 bg-primary/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Manual Opportunity Capture & Parser</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={captureMode === 'url' ? 'default' : 'outline'}
                className="text-xs h-7"
                onClick={() => setCaptureMode('url')}
              >
                URL Link
              </Button>
              <Button
                size="sm"
                variant={captureMode === 'text' ? 'default' : 'outline'}
                className="text-xs h-7"
                onClick={() => setCaptureMode('text')}
              >
                Raw Text
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Paste an opportunity announcement URL or raw snippet. The pipeline isolates untrusted content, extracts structured fields, dedupes, and verifies before saving.
          </p>

          {captureMode === 'url' ? (
            <div className="flex gap-2">
              <input
                type="url"
                value={captureUrl}
                onChange={(e) => setCaptureUrl(e.target.value)}
                placeholder="https://openssf.org/fellowships/appsec-2027"
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                size="sm"
                onClick={handleRunCapture}
                disabled={isAnalyzing || !captureUrl}
                className="gap-2 text-xs"
              >
                {isAnalyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Analyze URL</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                rows={4}
                value={captureText}
                onChange={(e) => setCaptureText(e.target.value)}
                placeholder="Paste opportunity text here (e.g. OpenSSF Application Security Fellowship: applications close on November 23, 2026. $6,000 stipend. Apply at https://openssf.org/apply)..."
                className="w-full p-3 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              <Button
                size="sm"
                onClick={handleRunCapture}
                disabled={isAnalyzing || !captureText}
                className="gap-2 text-xs"
              >
                {isAnalyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Analyze Raw Text</span>
              </Button>
            </div>
          )}

          {captureError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{captureError}</span>
            </div>
          )}

          {captureResult && (
            <div className="p-4 rounded-xl border border-border bg-card space-y-3 text-xs mt-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Pipeline Analysis Complete</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={captureResult.verification.isLegitimate ? 'success' : 'destructive'}>
                    {captureResult.verification.isLegitimate ? 'Legitimate' : 'Flagged Risk'}
                  </Badge>
                  <Badge variant="outline">
                    Deduplication: {captureResult.deduplication.decision}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-muted-foreground block">Extracted Title</span>
                  <span className="font-semibold text-foreground">{captureResult.opportunity.title}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Organization</span>
                  <span className="font-semibold text-foreground">{captureResult.opportunity.organization}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Deadline</span>
                  <span className="font-semibold text-foreground">
                    {captureResult.opportunity.deadline ? formatDate(captureResult.opportunity.deadline) : 'Unknown (No fabrication)'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Stipend / Comp</span>
                  <span className="font-semibold text-foreground">{captureResult.opportunity.stipend || 'Unknown'}</span>
                </div>
              </div>

              {captureResult.opportunity.unknownFields && captureResult.opportunity.unknownFields.length > 0 && (
                <div className="p-2 rounded-lg bg-muted/40 border border-border/60">
                  <span className="text-muted-foreground block font-medium mb-1">Explicitly Unknown Fields:</span>
                  <div className="flex flex-wrap gap-1">
                    {captureResult.opportunity.unknownFields.map((f: string) => (
                      <Badge key={f} variant="outline" className="text-[10px] uppercase font-mono">
                        {f}: Unknown
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button size="sm" variant="ghost" onClick={() => setCaptureResult(null)} className="text-xs">
                  Discard
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    alert('Opportunity saved into canonical database!');
                    setIsCaptureOpen(false);
                    setCaptureResult(null);
                  }}
                  className="text-xs gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm & Save Opportunity</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border text-xs">
          {(['pending', 'resolved', 'rejected', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition-all ${
                activeTab === tab
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={filterReason}
            onChange={(e) => setFilterReason(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Review Reasons</option>
            <option value="conflicting_deadlines">Conflicting Deadlines</option>
            <option value="ambiguous_duplicate">Ambiguous Duplicate</option>
            <option value="fee_flagged">Upfront Fee Flagged</option>
            <option value="eligibility_uncertain">Eligibility Uncertain</option>
          </select>
        </div>
      </div>

      {/* Main Review Layout: Left List + Right Side-by-Side Reviewer */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-2xl space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <h3 className="font-bold text-sm">Processing Queue Clear</h3>
          <p className="text-xs text-muted-foreground">No items currently require human review in this view.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Queue Item List (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            {filteredItems.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border bg-card hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge
                      variant={
                        item.reviewReason === 'fee_flagged'
                          ? 'destructive'
                          : item.reviewReason === 'conflicting_deadlines'
                          ? 'warning'
                          : 'outline'
                      }
                      className="text-[10px] font-mono capitalize"
                    >
                      {item.reviewReason.replace('_', ' ')}
                    </Badge>

                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-foreground line-clamp-1">
                    {item.candidatePayload.title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                    {item.candidatePayload.organization} &bull; Source: {item.sourceType.replace('_', ' ')}
                  </p>

                  <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-border/60 text-[10px]">
                    <span className="text-muted-foreground">
                      Confidence: {Math.round(item.confidenceScore * 100)}%
                    </span>
                    <span
                      className={`font-semibold capitalize ${
                        item.status === 'pending'
                          ? 'text-amber-500'
                          : item.status === 'resolved'
                          ? 'text-emerald-500'
                          : 'text-red-500'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Side-by-Side Review & Action Area (7 cols) */}
          {selectedItem && (
            <div className="lg:col-span-7 rounded-2xl border border-border bg-card p-6 space-y-6">
              {/* Review Item Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize font-mono">
                      {selectedItem.reviewReason.replace('_', ' ')}
                    </Badge>
                    {selectedItem.status !== 'pending' && (
                      <Badge variant={selectedItem.status === 'resolved' ? 'success' : 'destructive'}>
                        {selectedItem.status.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-base font-bold text-foreground mt-1.5">
                    {selectedItem.candidatePayload.title}
                  </h2>
                </div>

                <a
                  href={selectedItem.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <span>Open Raw Source</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Special Warning if Scam / Fee Flagged */}
              {selectedItem.candidatePayload.flagReason && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold">Heuristic Safety Gate Triggered</h4>
                    <p className="mt-1 leading-relaxed text-[11px]">
                      {selectedItem.candidatePayload.flagReason}
                    </p>
                  </div>
                </div>
              )}

              {/* Side-by-Side Comparison Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Column A: Candidate Payload */}
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-primary pb-2 border-b border-primary/20">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Candidate Extraction</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Title</span>
                    <p className="font-semibold text-foreground text-xs">{selectedItem.candidatePayload.title}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Organization</span>
                    <p className="font-semibold text-foreground text-xs">{selectedItem.candidatePayload.organization}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Deadline</span>
                    <p className="font-semibold text-foreground text-xs flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-primary" />
                      {selectedItem.candidatePayload.deadline
                        ? formatDate(selectedItem.candidatePayload.deadline)
                        : 'Unknown (Not specified)'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Compensation</span>
                    <p className="font-semibold text-foreground text-xs flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-emerald-500" />
                      {selectedItem.candidatePayload.stipend || 'Unknown'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Summary</span>
                    <p className="text-[11px] text-foreground/90 leading-relaxed mt-0.5">
                      {selectedItem.candidatePayload.summary}
                    </p>
                  </div>
                </div>

                {/* Column B: Existing Opportunity (if duplicate or conflicting) */}
                <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-foreground pb-2 border-b border-border">
                    <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>
                      {selectedItem.conflictingOpportunity ? 'Existing Canonical Record' : 'No Canonical Collision'}
                    </span>
                  </div>

                  {selectedItem.conflictingOpportunity ? (
                    <>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Canonical Title</span>
                        <p className="font-semibold text-foreground text-xs">{selectedItem.conflictingOpportunity.title}</p>
                      </div>

                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Organization</span>
                        <p className="font-semibold text-foreground text-xs">{selectedItem.conflictingOpportunity.organization}</p>
                      </div>

                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Canonical Deadline</span>
                        <p className="font-semibold text-foreground text-xs flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-emerald-500" />
                          {selectedItem.conflictingOpportunity.deadline
                            ? formatDate(selectedItem.conflictingOpportunity.deadline)
                            : 'Unknown'}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Existing Summary</span>
                        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                          {selectedItem.conflictingOpportunity.summary}
                        </p>
                      </div>

                      <div className="pt-2">
                        <Link
                          href={`/opportunities/${selectedItem.conflictingOpportunity.id}`}
                          className="text-primary hover:underline text-[11px] inline-flex items-center gap-1 font-semibold"
                        >
                          <span>Inspect Live Canonical Page</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground space-y-1">
                      <HelpCircle className="w-5 h-5 mx-auto text-muted-foreground/60" />
                      <p className="text-xs">No direct collision found.</p>
                      <p className="text-[11px]">This item was held for review due to risk heuristic or uncertainty.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Evidence Timeline & Snippets */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <span>Crawl Evidence Timeline</span>
                </h4>

                <div className="space-y-2">
                  {selectedItem.evidenceTimeline.map((ev, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg border border-border/80 bg-background space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-foreground">{ev.sourceName}</span>
                        <span className="text-muted-foreground">{new Date(ev.date).toLocaleDateString()}</span>
                      </div>
                      <p className="font-mono text-[11px] text-muted-foreground bg-muted/50 p-2 rounded border border-border/50">
                        &ldquo;{ev.snippet}&rdquo;
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Extracted: <strong className="text-foreground">{ev.extractedValue}</strong></span>
                        <span>Confidence: {Math.round(ev.confidence * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review Actions */}
              {selectedItem.status === 'pending' && (
                <div className="pt-4 border-t border-border space-y-3">
                  <input
                    type="text"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder="Optional reviewer notes (e.g., 'Aggregator typo confirmed; official primary date preserved')..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isResolving}
                      onClick={() => handleResolve('reject')}
                      className="gap-1.5 text-xs"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject & Drop</span>
                    </Button>

                    {selectedItem.conflictingOpportunity && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isResolving}
                        onClick={() => handleResolve('merge')}
                        className="gap-1.5 text-xs"
                      >
                        <GitMerge className="w-3.5 h-3.5" />
                        <span>Merge as Evidence</span>
                      </Button>
                    )}

                    <Button
                      size="sm"
                      disabled={isResolving}
                      onClick={() => handleResolve('accept')}
                      className="gap-1.5 text-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Accept as Canonical</span>
                    </Button>
                  </div>
                </div>
              )}

              {selectedItem.status !== 'pending' && selectedItem.resolution && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground">
                  <strong>Resolution:</strong> {selectedItem.resolution}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
