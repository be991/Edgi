'use client';

import React, { useState, useEffect } from 'react';
import {
  Compass,
  Play,
  Eye,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  PlusCircle,
  ArrowRight,
  Shield,
  Layers,
  Inbox,
  Clock,
  Coins,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { Opportunity, OpportunityCategory, EligibilityStatus, VerificationStatus } from '@edgi/contracts';
import { OpportunityCard } from '@/components/opportunities/opportunity-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DiscoveredLeadItem {
  id: string;
  url: string;
  title: string;
  snippet?: string;
  publisherDomain?: string;
  searchProvider: string;
  status: 'pending' | 'processing' | 'processed' | 'dismissed';
  createdAt: string;
}

interface DiscoveryRunItem {
  id: string;
  provider: string;
  queriesExecuted: number;
  leadsFound: number;
  costUsd: number;
  status: string;
  errorMessage?: string;
  createdAt: string;
}

interface QueryPreviewItem {
  query: string;
  dimension: string;
  priority: number;
  reason: string;
}

export default function DiscoverPage() {
  const [activeTab, setActiveTab] = useState<'leads' | 'runs' | 'queries' | 'all_opportunities'>('leads');

  // Leads State
  const [leads, setLeads] = useState<DiscoveredLeadItem[]>([]);
  const [leadActionPending, setLeadActionPending] = useState<string | null>(null);

  // Runs State
  const [runs, setRuns] = useState<DiscoveryRunItem[]>([]);

  // Query Preview State
  const [previewQueries, setPreviewQueries] = useState<QueryPreviewItem[]>([]);
  const [dimensions, setDimensions] = useState<any>(null);

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // General Loading
  const [isLoading, setIsLoading] = useState(true);

  // Legacy Opportunity Explorer State
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<OpportunityCategory | 'all'>('all');

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [leadsRes, runsRes, queriesRes, oppsRes] = await Promise.all([
        api.getLeads('pending').catch(() => ({ leads: [], total: 0 })),
        api.getDiscoveryHistory(15).catch(() => []),
        api.getQueriesPreview(10).catch(() => ({ queries: [], total: 0, dimensions: {} })),
        api.getOpportunities({}).catch(() => ({ opportunities: [], total: 0 })),
      ]);

      setLeads(leadsRes.leads);
      setRuns(runsRes);
      setPreviewQueries(queriesRes.queries);
      setDimensions(queriesRes.dimensions);
      setOpportunities(oppsRes.opportunities);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Actions
  const handleTriggerRun = async (dryRun: boolean) => {
    setIsRunning(true);
    setRunMessage(null);
    try {
      const result = await api.runDiscovery({ dryRun, maxQueries: 6 });
      if (dryRun) {
        setRunMessage({
          type: 'success',
          text: `Dry run successful: Generated ${result.queries?.length || 6} queries without spending API credits.`,
        });
        setActiveTab('queries');
      } else {
        setRunMessage({
          type: 'success',
          text: `Live discovery run finished! Executed ${result.queriesExecuted} queries, discovered ${result.leadsFound} new leads ($${result.totalCostUsd.toFixed(4)} spent).`,
        });
        await loadAll();
        setActiveTab('leads');
      }
    } catch (err: any) {
      setRunMessage({
        type: 'error',
        text: err.message || 'Discovery run failed. Please check budget or provider status.',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleProcessLead = async (id: string) => {
    setLeadActionPending(id);
    try {
      await api.processLead(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLeadActionPending(null);
    }
  };

  const handleDismissLead = async (id: string) => {
    setLeadActionPending(id);
    try {
      await api.dismissLead(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLeadActionPending(null);
    }
  };

  const handleAddAsSource = async (id: string) => {
    setLeadActionPending(id);
    try {
      await api.addLeadAsSource(id);
      alert('Lead added to candidate sources queue for approval!');
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLeadActionPending(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-6 h-6 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Independent Discovery</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Autonomous web & search crawling tailored to your AppSec, fintech, and Nigerian undergraduate profile.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTriggerRun(true)}
            disabled={isRunning}
            className="text-xs gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Dry Run (Preview Queries)</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => handleTriggerRun(false)}
            disabled={isRunning}
            className="text-xs gap-1.5 bg-primary text-primary-foreground font-semibold"
          >
            {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>Run Discovery Now</span>
          </Button>
        </div>
      </div>

      {/* Status banner */}
      {runMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            runMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {runMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{runMessage.text}</span>
          </div>
          <button onClick={() => setRunMessage(null)} className="text-muted-foreground hover:text-foreground text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveTab('leads')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'leads' ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          <span>Leads Inbox</span>
          {leads.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {leads.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('runs')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'runs' ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Run History</span>
          <span className="text-[10px] text-muted-foreground">({runs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('queries')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'queries' ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Generated Queries</span>
          <span className="text-[10px] text-muted-foreground">({previewQueries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('all_opportunities')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'all_opportunities' ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Indexed Directory</span>
        </button>
      </div>

      {/* Tab 1: Leads Inbox */}
      {activeTab === 'leads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Unverified web discoveries found by search crawlers. Review and send to extraction, register the publisher, or dismiss.
            </span>
            <span className="font-semibold">{leads.length} pending leads</span>
          </div>

          {leads.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/50 space-y-3">
              <Inbox className="w-8 h-8 text-muted-foreground mx-auto" />
              <h3 className="text-sm font-semibold text-foreground">Inbox Zero</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No unverified leads waiting. Click "Run Discovery Now" above to trigger a search sweep or let the scheduler run.
              </p>
              <Button size="sm" onClick={() => handleTriggerRun(false)} className="text-xs mt-2">
                Run Discovery Sweep
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-all space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <a
                          href={lead.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1"
                        >
                          {lead.title}
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground">{lead.publisherDomain}</span>
                        <span>&bull;</span>
                        <span>Provider: {lead.searchProvider}</span>
                        <span>&bull;</span>
                        <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleProcessLead(lead.id)}
                        disabled={leadActionPending === lead.id}
                        className="text-[11px] h-7 px-2.5 bg-primary text-primary-foreground"
                      >
                        Send to Processing
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddAsSource(lead.id)}
                        disabled={leadActionPending === lead.id}
                        className="text-[11px] h-7 px-2"
                        title="Add publisher domain as a monitored Source"
                      >
                        <PlusCircle className="w-3 h-3 mr-1" />
                        Add as Source
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDismissLead(lead.id)}
                        disabled={leadActionPending === lead.id}
                        className="text-[11px] h-7 px-2 text-muted-foreground hover:text-destructive"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>

                  {lead.snippet && (
                    <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/30 p-2 rounded-lg">
                      {lead.snippet}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Run History */}
      {activeTab === 'runs' && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-bold">Discovery Run Audit Log</h2>
            <span className="text-xs text-muted-foreground">Track query executions, lead yields, and search costs</span>
          </div>
          {runs.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">No discovery runs logged yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3">Run Date</th>
                    <th className="p-3">Provider</th>
                    <th className="p-3">Queries Executed</th>
                    <th className="p-3">Leads Found</th>
                    <th className="p-3">Cost (USD)</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {runs.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/20">
                      <td className="p-3 text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3 font-medium text-foreground">{r.provider}</td>
                      <td className="p-3">{r.queriesExecuted}</td>
                      <td className="p-3 font-semibold text-primary">{r.leadsFound}</td>
                      <td className="p-3 font-mono">${(r.costUsd || 0).toFixed(4)}</td>
                      <td className="p-3">
                        <Badge variant={r.status === 'completed' ? 'success' : r.status === 'failed' ? 'destructive' : 'secondary'}>
                          {r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Generated Queries */}
      {activeTab === 'queries' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-border bg-card space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Multi-Dimensional Query Generation</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              These queries are dynamically derived from your profile: AppSec, fintech security, AI defense, 200L undergraduate, Nigeria + global funding criteria.
            </p>
          </div>

          <div className="space-y-2">
            {previewQueries.map((pq, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
                      {pq.query}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      Priority {pq.priority}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{pq.reason}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0 self-start sm:self-auto">
                  {pq.dimension}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Indexed Opportunities (Legacy Filter Directory) */}
      {activeTab === 'all_opportunities' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter indexed opportunities..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {opportunities
              .filter((o) => !search || o.title.toLowerCase().includes(search.toLowerCase()))
              .map((opp) => (
                <OpportunityCard key={opp.id} opportunity={opp} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
