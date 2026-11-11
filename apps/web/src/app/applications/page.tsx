'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  FileText,
  AlertCircle,
  MoreVertical,
  Sparkles,
  Paperclip,
  History,
  Copy,
  Check,
  Send,
  AlertTriangle,
  ExternalLink,
  Trash2,
  X,
  UploadCloud,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import {
  Application,
  ApplicationStatus,
  UserDocument,
  AiDraftResponse,
} from '@edgi/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatRelativeDays } from '@/lib/utils';

const PIPELINE_STAGES: Array<{ key: ApplicationStatus; label: string; color: string }> = [
  { key: 'saved', label: 'Saved', color: 'border-muted text-muted-foreground' },
  { key: 'interested', label: 'Interested', color: 'border-sky-500/50 text-sky-500' },
  { key: 'preparing', label: 'Preparing', color: 'border-primary/50 text-primary' },
  { key: 'applied', label: 'Applied', color: 'border-blue-500/50 text-blue-500' },
  { key: 'assessment', label: 'Assessment', color: 'border-purple-500/50 text-purple-500' },
  { key: 'interview', label: 'Interview', color: 'border-amber-500/50 text-amber-500' },
  { key: 'accepted', label: 'Accepted', color: 'border-emerald-500/50 text-emerald-500' },
  { key: 'rejected', label: 'Rejected', color: 'border-rose-500/50 text-rose-500' },
  { key: 'withdrawn', label: 'Withdrawn', color: 'border-muted text-muted-foreground' },
  { key: 'closed', label: 'Closed', color: 'border-red-500/50 text-red-500' },
];

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [userDocuments, setUserDocuments] = useState<UserDocument[]>([]);
  const [activeStage, setActiveStage] = useState<ApplicationStatus | 'all'>('all');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Status transition state
  const [targetStatus, setTargetStatus] = useState<ApplicationStatus>('preparing');
  const [transitionNote, setTransitionNote] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // AI Assistant state
  const [aiDraft, setAiDraft] = useState<AiDraftResponse | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);

  // Attach Document Modal
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [apps, docs] = await Promise.all([
        api.getApplications(),
        api.getUserDocuments(),
      ]);
      setApplications(apps);
      setUserDocuments(docs);
      if (selectedApp) {
        const refreshed = apps.find((a) => a.id === selectedApp.id);
        if (refreshed) setSelectedApp(refreshed);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (appId: string, newStatus: ApplicationStatus, note?: string) => {
    setIsTransitioning(true);
    try {
      const updated = await api.transitionApplicationStatus(appId, newStatus, note);
      setApplications((prev) => prev.map((a) => (a.id === appId ? updated : a)));
      setSelectedApp(updated);
      setTransitionNote('');
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleToggleChecklist = async (appId: string, checkId: string) => {
    const app = applications.find((a) => a.id === appId);
    if (!app) return;
    const updatedChecklist = app.checklist.map((item) =>
      item.id === checkId ? { ...item, completed: !item.completed } : item,
    );
    const updated = await api.updateApplication(appId, { checklist: updatedChecklist });
    setApplications((prev) => prev.map((a) => (a.id === appId ? updated : a)));
    if (selectedApp?.id === appId) setSelectedApp(updated);
  };

  const handleRunAiAssist = async (
    promptType: 'tailor_cv_bullets' | 'draft_motivation' | 'explain_requirements' | 'missing_documents',
  ) => {
    if (!selectedApp) return;
    setIsAiLoading(true);
    try {
      const res = await api.runAiAssist(selectedApp.id, promptType);
      setAiDraft(res);
      setCopiedDraft(false);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCopyDraft = () => {
    if (!aiDraft) return;
    navigator.clipboard.writeText(aiDraft.content);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 3000);
  };

  const handleSaveDraftToNotes = async () => {
    if (!selectedApp || !aiDraft) return;
    const newNotes = selectedApp.notes
      ? `${selectedApp.notes}\n\n--- [AI Draft saved on ${new Date().toLocaleDateString()}] ---\n${aiDraft.content}`
      : aiDraft.content;
    const updated = await api.updateApplication(selectedApp.id, { notes: newNotes });
    setApplications((prev) => prev.map((a) => (a.id === selectedApp.id ? updated : a)));
    setSelectedApp(updated);
    setCopiedDraft(true);
  };

  const handleAttachDoc = async () => {
    if (!selectedApp || !selectedDocId) return;
    await api.attachDocumentToApplication(selectedApp.id, selectedDocId);
    await loadData();
    setShowAttachModal(false);
    setSelectedDocId('');
  };

  const filteredApps = applications.filter((a) => {
    if (activeStage === 'all') return true;
    return a.status === activeStage;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Application Pipeline & Tracker</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track 10 lifecycle stages, complete required document checklists, and generate profile-grounded AI drafts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/documents">
            <Button size="sm" variant="outline" className="text-xs gap-1.5">
              <Paperclip className="w-3.5 h-3.5" />
              <span>Documents Vault ({userDocuments.length})</span>
            </Button>
          </Link>
          <Link href="/discover">
            <Button size="sm" className="text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              <span>Add from Discover</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stage Selector Pills */}
      <div className="flex overflow-x-auto gap-1.5 pb-2 scrollbar-none text-xs">
        <button
          onClick={() => setActiveStage('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
            activeStage === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          All Stages ({applications.length})
        </button>
        {PIPELINE_STAGES.map((s) => {
          const count = applications.filter((a) => a.status === s.key).length;
          return (
            <button
              key={s.key}
              onClick={() => setActiveStage(s.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
                activeStage === s.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {s.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Main Grid: Pipeline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredApps.map((app) => {
          const completedChecks = app.checklist.filter((c) => c.completed).length;
          const totalChecks = app.checklist.length;
          const isClosed = app.opportunityStatus === 'closed';

          return (
            <div
              key={app.id}
              onClick={() => {
                setSelectedApp(app);
                setTargetStatus(app.status);
                setAiDraft(null);
              }}
              className="rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition-all cursor-pointer space-y-4 shadow-sm hover:shadow-md flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                    {app.opportunityCategory || 'Opportunity'}
                  </Badge>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                    PIPELINE_STAGES.find((s) => s.key === app.status)?.color || 'border-border text-foreground'
                  }`}>
                    {app.status}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-foreground line-clamp-2 leading-snug">
                  {app.opportunityTitle}
                </h3>
                <p className="text-xs text-muted-foreground font-medium">{app.organizationName}</p>

                {isClosed && (
                  <div className="flex items-center gap-1.5 text-xs text-red-500 font-bold bg-red-500/10 px-2.5 py-1 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Canonical listing closed/expired</span>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2 border-t border-border/60 text-xs">
                {/* Deadline indicator */}
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Deadline:</span>
                  </span>
                  <span className="font-semibold text-foreground">
                    {app.deadline ? formatRelativeDays(app.deadline) : 'Rolling'}
                  </span>
                </div>

                {/* Checklist progress */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Packet Progress</span>
                    <span className="font-bold text-foreground">
                      {completedChecks}/{totalChecks} items
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${totalChecks > 0 ? (completedChecks / totalChecks) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Document count */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span className="flex items-center gap-1">
                    <Paperclip className="w-3 h-3" />
                    <span>{app.documents.length} attached documents</span>
                  </span>
                  <span className="text-primary font-semibold flex items-center gap-0.5">
                    Details <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide-over Detail Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-end animate-in fade-in">
          <div className="w-full max-w-2xl bg-card border-l border-border h-full overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold">
                    {selectedApp.opportunityCategory}
                  </Badge>
                  <span className="text-xs font-bold text-primary capitalize">{selectedApp.status}</span>
                </div>
                <h2 className="text-xl font-bold text-foreground">{selectedApp.opportunityTitle}</h2>
                <p className="text-xs text-muted-foreground">{selectedApp.organizationName}</p>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Transition Bar */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Move to Stage:</span>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as ApplicationStatus)}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold"
                >
                  {PIPELINE_STAGES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                placeholder="Optional transition note (e.g. Received interview invitation)..."
                value={transitionNote}
                onChange={(e) => setTransitionNote(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
              />
              <Button
                size="sm"
                disabled={isTransitioning || targetStatus === selectedApp.status}
                onClick={() => handleStatusChange(selectedApp.id, targetStatus, transitionNote)}
                className="text-xs font-bold w-full"
              >
                {isTransitioning ? 'Updating Status...' : 'Apply Status Transition'}
              </Button>
            </div>

            {/* AI Assistant Section */}
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-sm text-foreground">Grounded AI Application Assistant</h3>
                </div>
                <Badge variant="outline" className="text-[10px] text-primary border-primary/40 font-bold">
                  Profile Facts Only &bull; Zero Fabrication
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground">
                Generate tailored CV bullet points, draft motivation statements, or analyze missing requirements grounded strictly in your verified 200L Cyber Security profile.
              </p>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRunAiAssist('tailor_cv_bullets')}
                  disabled={isAiLoading}
                  className="text-xs justify-start gap-1.5"
                >
                  <span>🎯 Tailor CV Bullets</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRunAiAssist('draft_motivation')}
                  disabled={isAiLoading}
                  className="text-xs justify-start gap-1.5"
                >
                  <span>✍️ Draft Statement</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRunAiAssist('explain_requirements')}
                  disabled={isAiLoading}
                  className="text-xs justify-start gap-1.5"
                >
                  <span>📋 Explain Criteria</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRunAiAssist('missing_documents')}
                  disabled={isAiLoading}
                  className="text-xs justify-start gap-1.5"
                >
                  <span>⚠️ Check Missing Docs</span>
                </Button>
              </div>

              {/* AI Draft Result */}
              {aiDraft && (
                <div className="p-4 rounded-xl border border-primary/40 bg-card space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs border-b border-border pb-2">
                    <span className="font-bold text-primary uppercase">{aiDraft.draftType.replace('_', ' ')}</span>
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="ghost" onClick={handleCopyDraft} className="text-xs gap-1 h-7">
                        {copiedDraft ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedDraft ? 'Copied' : 'Copy'}</span>
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleSaveDraftToNotes} className="text-xs h-7">
                        Save to Notes
                      </Button>
                    </div>
                  </div>

                  {/* Fact Citations */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      Verified Profile Facts Used:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {aiDraft.usedProfileFacts.map((fact, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded text-[10px] bg-muted text-muted-foreground font-medium">
                          {fact}
                        </span>
                      ))}
                    </div>
                  </div>

                  <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed bg-muted/20 p-3 rounded-lg border border-border/60">
                    {aiDraft.content}
                  </pre>

                  <p className="text-[10px] text-amber-500 font-bold italic">
                    {aiDraft.disclaimer}
                  </p>
                </div>
              )}
            </div>

            {/* Document Checklist */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-foreground">Application Checklist</h3>
              <div className="space-y-2">
                {selectedApp.checklist.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card/60 cursor-pointer hover:bg-muted/20 transition-colors text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleChecklist(selectedApp.id, item.id)}
                      className="w-4 h-4 accent-primary rounded cursor-pointer"
                    />
                    <span className={item.completed ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}>
                      {item.task}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Attached Documents */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-foreground">Attached Documents ({selectedApp.documents.length})</h3>
                <Button size="sm" variant="outline" onClick={() => setShowAttachModal(true)} className="text-xs gap-1.5 h-7">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Attach Document</span>
                </Button>
              </div>

              {selectedApp.documents.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                  No documents attached yet. Click "Attach Document" to select from your Document Vault.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedApp.documents.map((doc) => (
                    <div key={doc.id} className="p-3 rounded-xl border border-border bg-card flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-primary" />
                        <div>
                          <span className="font-bold text-foreground">{doc.name}</span>
                          <span className="text-[11px] text-muted-foreground block uppercase">{doc.type}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">Verified Attachment</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status History Timeline */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-bold text-sm text-foreground">Status Audit History</h3>
              </div>

              <div className="space-y-2 border-l-2 border-border ml-2 pl-4">
                {selectedApp.statusHistory.map((hist) => (
                  <div key={hist.id} className="space-y-0.5 text-xs relative">
                    <span className="w-2 h-2 rounded-full bg-primary absolute -left-[21px] top-1.5" />
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground capitalize">
                        {hist.fromStatus} &rarr; {hist.toStatus}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{formatDate(hist.changedAt)}</span>
                    </div>
                    {hist.note && <p className="text-[11px] text-muted-foreground">{hist.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attach Document Modal */}
      {showAttachModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground">Attach from Documents Vault</h3>
              <button onClick={() => setShowAttachModal(false)} className="text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Select Stored Document</label>
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-2.5 text-xs"
              >
                <option value="">-- Choose document --</option>
                {userDocuments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} (v{d.version} &bull; {d.type.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="ghost" onClick={() => setShowAttachModal(false)} className="text-xs">
                Cancel
              </Button>
              <Button size="sm" disabled={!selectedDocId} onClick={handleAttachDoc} className="text-xs font-bold">
                Attach to Application
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
