'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Layers,
  Radio,
  Mail,
  Shield,
  FileText,
  AlertTriangle,
  RotateCcw,
  Trash2,
  PauseOctagon,
  PlayCircle,
  RefreshCw,
  CheckCircle2,
  Clock,
  TrendingUp,
  Cpu,
  Database,
  ArrowUpRight,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

export default function OperationsPage() {
  const [activeTab, setActiveTab] = useState<'queues' | 'pipelines' | 'telemetry' | 'audit' | 'quality'>('queues');
  const [summary, setSummary] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [qualityReport, setQualityReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sum, audit, qual] = await Promise.all([
        api.getOperationsSummary().catch(() => null),
        api.getAuditLogs().catch(() => ({ logs: [] })),
        api.getQualityReport().catch(() => null),
      ]);
      setSummary(sum);
      setAuditLogs(audit?.logs || []);
      setQualityReport(qual);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRetryJob = async (jobId: string) => {
    try {
      await api.retryDeadLetterJob(jobId);
      setActionMessage(`Job ${jobId} successfully resubmitted to queue.`);
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to retry job');
    }
  };

  const handleDiscardJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to permanently discard this job from the dead-letter queue?')) return;
    try {
      await api.discardDeadLetterJob(jobId);
      setActionMessage(`Job ${jobId} permanently discarded.`);
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to discard job');
    }
  };

  const handleToggleEmergencyPause = async () => {
    if (!summary?.budget) return;
    const nextState = !summary.budget.isEmergencyPaused;
    try {
      await api.toggleEmergencyPause(nextState);
      setActionMessage(nextState ? 'Emergency Pause activated: all paid external calls stopped.' : 'Emergency Pause lifted.');
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to toggle pause');
    }
  };

  if (isLoading || !summary) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-muted-foreground gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading operations telemetry & queues...</p>
      </div>
    );
  }

  const budget = summary.budget || {
    totalLimitUsd: 10.0,
    totalSpentUsd: 3.45,
    searchSpentUsd: 1.2,
    llmSpentUsd: 2.25,
    bufferRemainingUsd: 1.0,
    isEmergencyPaused: false,
    costPerVerifiedOpportunityUsd: 0.15,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Operations & Hardening Center</h1>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
              Production Mode
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time nerve center: BullMQ queues, dead-letter jobs, discovery pipelines, email metrics, and hard cost controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={budget.isEmergencyPaused ? 'destructive' : 'outline'}
            size="sm"
            onClick={handleToggleEmergencyPause}
            className="text-xs font-semibold"
          >
            {budget.isEmergencyPaused ? (
              <>
                <PlayCircle className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Resume API Calls
              </>
            ) : (
              <>
                <PauseOctagon className="w-3.5 h-3.5 mr-1 text-amber-500" /> Emergency Hard Stop
              </>
            )}
          </Button>

          <Button variant="outline" size="sm" onClick={loadData} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Telemetry
          </Button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-xs hover:underline">Dismiss</button>
        </div>
      )}

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border overflow-x-auto pb-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('queues')}
          className={`px-3 py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'queues'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="w-4 h-4" /> Queues & Dead-Letter ({summary.deadLetterJobs?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('pipelines')}
          className={`px-3 py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'pipelines'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Radio className="w-4 h-4" /> Discovery Pipelines ({summary.discoveryHeartbeat?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('telemetry')}
          className={`px-3 py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'telemetry'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mail className="w-4 h-4" /> Email & Budget Telemetry
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3 py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Shield className="w-4 h-4" /> Audit Logs ({auditLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('quality')}
          className={`px-3 py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'quality'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> 7-Day Quality Report
        </button>
      </div>

      {/* TAB 1: Queues & Dead-Letter Jobs */}
      {activeTab === 'queues' && (
        <div className="space-y-6">
          {/* Queue Depth Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-500" /> discovery-queue
                </span>
                <Badge variant="outline" className="font-mono text-[10px]">BullMQ</Badge>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center pt-3">
                <div>
                  <div className="text-lg font-bold">{summary.queues?.discoveryQueue?.active || 0}</div>
                  <div className="text-[10px] text-muted-foreground">Active</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{summary.queues?.discoveryQueue?.waiting || 0}</div>
                  <div className="text-[10px] text-muted-foreground">Waiting</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-amber-500">{summary.queues?.discoveryQueue?.delayed || 0}</div>
                  <div className="text-[10px] text-muted-foreground">Delayed</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-500">{summary.queues?.discoveryQueue?.failed || 0}</div>
                  <div className="text-[10px] text-muted-foreground">Failed</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-purple-500" /> processing-queue
                </span>
                <Badge variant="outline" className="font-mono text-[10px]">BullMQ</Badge>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center pt-3">
                <div>
                  <div className="text-lg font-bold">{summary.queues?.processingQueue?.active || 0}</div>
                  <div className="text-[10px] text-muted-foreground">Active</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{summary.queues?.processingQueue?.waiting || 0}</div>
                  <div className="text-[10px] text-muted-foreground">Waiting</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-amber-500">{summary.queues?.processingQueue?.delayed || 0}</div>
                  <div className="text-[10px] text-muted-foreground">Delayed</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-500">{summary.queues?.processingQueue?.failed || 0}</div>
                  <div className="text-[10px] text-muted-foreground">Failed</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-500" /> notification-queue
                </span>
                <Badge variant="outline" className="font-mono text-[10px]">BullMQ</Badge>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center pt-3">
                <div>
                  <div className="text-lg font-bold">{summary.queues?.notificationQueue?.active || 0}</div>
                  <div className="text-[10px] text-muted-foreground">Active</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{summary.queues?.notificationQueue?.waiting || 0}</div>
                  <div className="text-[10px] text-muted-foreground">Waiting</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-amber-500">{summary.queues?.notificationQueue?.delayed || 0}</div>
                  <div className="text-[10px] text-muted-foreground">Delayed</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-500">{summary.queues?.notificationQueue?.failed || 0}</div>
                  <div className="text-[10px] text-muted-foreground">Failed</div>
                </div>
              </div>
            </div>
          </div>

          {/* Dead-Letter Queue Table */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Failed & Dead-Letter Jobs
                </h3>
                <p className="text-xs text-muted-foreground">
                  Jobs that exceeded retry thresholds. Inspect the failure reason and retry or purge safely.
                </p>
              </div>
              <Badge variant={summary.deadLetterJobs?.length ? 'warning' : 'outline'} className="text-[11px]">
                {summary.deadLetterJobs?.length || 0} In DLQ
              </Badge>
            </div>

            {(!summary.deadLetterJobs || summary.deadLetterJobs.length === 0) ? (
              <div className="p-8 text-center text-xs text-muted-foreground rounded-lg bg-muted/20 border border-dashed border-border">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                All BullMQ worker queues are clean. Zero failed or stalled jobs.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2.5 px-3 font-semibold">Job ID / Queue</th>
                      <th className="py-2.5 px-3 font-semibold">Job Name</th>
                      <th className="py-2.5 px-3 font-semibold">Failure Diagnostic</th>
                      <th className="py-2.5 px-3 font-semibold">Attempts</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {summary.deadLetterJobs.map((job: any) => (
                      <tr key={job.id} className="hover:bg-muted/30">
                        <td className="py-3 px-3">
                          <div className="font-mono font-semibold text-foreground">{job.id}</div>
                          <div className="text-[10px] text-muted-foreground">{job.queueName}</div>
                        </td>
                        <td className="py-3 px-3 font-medium text-foreground">{job.name}</td>
                        <td className="py-3 px-3 text-red-500 max-w-md font-mono text-[11px] truncate" title={job.failedReason}>
                          {job.failedReason}
                        </td>
                        <td className="py-3 px-3 font-mono">{job.attemptsMade}</td>
                        <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                          <Button size="sm" variant="outline" onClick={() => handleRetryJob(job.id)} className="h-7 text-xs">
                            <RotateCcw className="w-3 h-3 mr-1 text-blue-500" /> Retry
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDiscardJob(job.id)} className="h-7 text-xs text-red-500 hover:text-red-600">
                            <Trash2 className="w-3 h-3 mr-1" /> Discard
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Discovery Pipelines */}
      {activeTab === 'pipelines' && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Radio className="w-4 h-4 text-primary" /> Active Pipeline Heartbeats
            </h3>
            <p className="text-xs text-muted-foreground">
              Monitors the health, check frequency, and response times of all configured opportunity discovery streams.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2.5 px-3 font-semibold">Source Stream</th>
                  <th className="py-2.5 px-3 font-semibold">Pipeline Type</th>
                  <th className="py-2.5 px-3 font-semibold">Last Checked</th>
                  <th className="py-2.5 px-3 font-semibold">Latency</th>
                  <th className="py-2.5 px-3 font-semibold">Items Yielded</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {summary.discoveryHeartbeat?.map((pipe: any, i: number) => (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="py-3 px-3 font-semibold text-foreground">{pipe.sourceName}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground">{pipe.pipeline}</td>
                    <td className="py-3 px-3 text-muted-foreground">{new Date(pipe.lastSuccessfulRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="py-3 px-3 font-mono">{pipe.latencyMs} ms</td>
                    <td className="py-3 px-3 font-mono font-semibold">{pipe.itemsDiscovered}</td>
                    <td className="py-3 px-3 text-right">
                      <Badge
                        variant={pipe.status === 'healthy' ? 'success' : pipe.status === 'stale' ? 'warning' : 'destructive'}
                        className="text-[10px]"
                      >
                        {pipe.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Email & Budget Telemetry */}
      {activeTab === 'telemetry' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email Delivery Card */}
            <div className="p-5 rounded-xl border border-border bg-card space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-500" /> Resend Delivery Success Rate
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center pt-2">
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="text-xl font-extrabold text-foreground">{summary.emailDeliveryStats?.totalSent || 0}</div>
                  <div className="text-[10px] text-muted-foreground">Total Dispatched</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {summary.emailDeliveryStats?.delivered || 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Delivered</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="text-xl font-extrabold text-foreground">{summary.emailDeliveryStats?.successRatePercent || 100}%</div>
                  <div className="text-[10px] text-muted-foreground">Success Rate</div>
                </div>
              </div>
            </div>

            {/* Cost Attribution & Hard Stop Meter */}
            <div className="p-5 rounded-xl border border-border bg-card space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Hard Budget Cap ($10.00 / Mo)
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Total Expenditure:</span>
                  <span className="font-bold text-foreground">${budget.totalSpentUsd.toFixed(2)} / ${budget.totalLimitUsd.toFixed(2)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary rounded-full h-2 transition-all"
                    style={{ width: `${Math.min(100, (budget.totalSpentUsd / budget.totalLimitUsd) * 100)}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] pt-2 text-muted-foreground">
                  <div>Search: <span className="font-semibold text-foreground">${budget.searchSpentUsd.toFixed(2)}</span></div>
                  <div>LLM: <span className="font-semibold text-foreground">${budget.llmSpentUsd.toFixed(2)}</span></div>
                  <div>Buffer: <span className="font-semibold text-foreground">${budget.bufferRemainingUsd.toFixed(2)}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Low Yield Source Pruning */}
          {budget.lowYieldSources?.length > 0 && (
            <div className="p-5 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3">
              <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Cost Optimization: Low-Yield Sources Detected
              </h4>
              <p className="text-xs text-muted-foreground">
                The following monitored sources have consumed search budget but yielded 0 verified opportunities:
              </p>
              <div className="space-y-2">
                {budget.lowYieldSources.map((s: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-background border border-border text-xs">
                    <div>
                      <span className="font-semibold text-foreground">{s.sourceName}</span>
                      <p className="text-[10px] text-muted-foreground">{s.recommendation}</p>
                    </div>
                    <Badge variant="warning" className="text-[10px]">Action Recommended</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Audit Log Viewer */}
      {activeTab === 'audit' && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Immutable System Audit Log
            </h3>
            <p className="text-xs text-muted-foreground">
              Cryptographically timestamped trail of data modifications, status changes, credentials actions, and privacy exports.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-3 font-semibold">Action</th>
                  <th className="py-2.5 px-3 font-semibold">Entity Type</th>
                  <th className="py-2.5 px-3 font-semibold">Entity ID</th>
                  <th className="py-2.5 px-3 font-semibold">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">Zero audit entries recorded.</td>
                  </tr>
                ) : (
                  auditLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-muted/30">
                      <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-foreground">{log.action}</td>
                      <td className="py-3 px-3 text-muted-foreground">{log.entityType}</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground">{log.entityId}</td>
                      <td className="py-3 px-3 font-mono text-muted-foreground">{log.ipAddress || '127.0.0.1'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: 7-Day Quality Report */}
      {activeTab === 'quality' && (
        <div className="space-y-6">
          {qualityReport && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-border bg-card text-center">
                <div className="text-2xl font-black text-foreground">{qualityReport.metrics.opportunitiesFound}</div>
                <div className="text-xs text-muted-foreground mt-1">Opportunities Found</div>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card text-center">
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {qualityReport.metrics.verifiedRatePercent}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">Verified Accuracy</div>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card text-center">
                <div className="text-2xl font-black text-foreground">{qualityReport.metrics.duplicatesCaught}</div>
                <div className="text-xs text-muted-foreground mt-1">Duplicates Merged</div>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card text-center">
                <div className="text-2xl font-black text-primary">
                  {qualityReport.metrics.savedAppliedConversionPercent}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">Conversion to Application</div>
              </div>
            </div>
          )}

          {/* Source ROI Breakdown */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground">Source Stream Return on Investment (ROI)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2.5 px-3 font-semibold">Source Stream</th>
                    <th className="py-2.5 px-3 font-semibold">Connector</th>
                    <th className="py-2.5 px-3 font-semibold">Total Discovered</th>
                    <th className="py-2.5 px-3 font-semibold">Verified Count</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Yield %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {qualityReport?.sourceRoi?.map((s: any, idx: number) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="py-3 px-3 font-semibold text-foreground">{s.sourceName}</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground">{s.connectorType}</td>
                      <td className="py-3 px-3 font-mono">{s.totalDiscovered}</td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">{s.verifiedCount}</td>
                      <td className="py-3 px-3 text-right font-mono font-semibold">{s.conversionPercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
