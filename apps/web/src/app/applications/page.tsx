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
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { Application, ApplicationStatus } from '@edgi/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatRelativeDays } from '@/lib/utils';

const STAGES: { key: ApplicationStatus; label: string; color: string }[] = [
  { key: 'saved', label: 'Bookmarked', color: 'border-muted text-muted-foreground' },
  { key: 'preparing', label: 'Preparing Packet', color: 'border-primary/50 text-primary' },
  { key: 'submitted', label: 'Submitted / Under Review', color: 'border-sky-500/50 text-sky-500' },
  { key: 'interviewing', label: 'Interviewing / Evaluation', color: 'border-purple-500/50 text-purple-500' },
  { key: 'offered', label: 'Offered / Accepted', color: 'border-emerald-500/50 text-emerald-500' },
];

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [activeTab, setActiveTab] = useState<ApplicationStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const apps = await api.getApplications();
        setApplications(apps);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleStatusChange = async (id: string, newStatus: ApplicationStatus) => {
    const updated = await api.updateApplication(id, { status: newStatus });
    setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
  };

  const handleToggleChecklist = async (appId: string, checkId: string) => {
    const app = applications.find((a) => a.id === appId);
    if (!app) return;
    const updatedChecklist = app.checklist.map((item) =>
      item.id === checkId ? { ...item, completed: !item.completed } : item,
    );
    const updated = await api.updateApplication(appId, { checklist: updatedChecklist });
    setApplications((prev) => prev.map((a) => (a.id === appId ? updated : a)));
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Application Pipeline</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track submission readiness, required checklist items, and follow-up deadlines for your fellowships and programmes.
          </p>
        </div>
        <Link href="/discover">
          <Button size="sm" className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            <span>Discover Opportunities</span>
          </Button>
        </Link>
      </div>

      {/* Mobile Stage Selector Tabs */}
      <div className="flex lg:hidden overflow-x-auto gap-2 pb-2 scrollbar-none">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 ${
            activeTab === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}
        >
          All Stages ({applications.length})
        </button>
        {STAGES.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveTab(s.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 ${
              activeTab === s.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {s.label} ({applications.filter((a) => a.status === s.key).length})
          </button>
        ))}
      </div>

      {/* Kanban Board Grid (Columns on desktop, filtered on mobile if tab selected) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {STAGES.filter((s) => activeTab === 'all' || activeTab === s.key).map((stage) => {
          const stageApps = applications.filter((a) => a.status === stage.key);

          return (
            <div
              key={stage.key}
              className="rounded-2xl border border-border/80 bg-muted/20 p-3 sm:p-4 flex flex-col min-h-[400px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
                <span className="font-bold text-xs text-foreground truncate">{stage.label}</span>
                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                  {stageApps.length}
                </span>
              </div>

              {/* Application Cards in Column */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {stageApps.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-center p-3 text-[11px] text-muted-foreground border border-dashed border-border/60 rounded-xl">
                    No items in {stage.label.toLowerCase()}
                  </div>
                ) : (
                  stageApps.map((app) => (
                    <div
                      key={app.id}
                      className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow space-y-3 text-xs"
                    >
                      {/* Card Header */}
                      <div>
                        <span className="font-bold text-foreground text-sm leading-snug line-clamp-2">
                          {app.opportunityTitle}
                        </span>
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                          {app.organizationName}
                        </p>
                      </div>

                      {/* Deadline Countdown */}
                      {app.deadline && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/50 p-2 rounded-lg">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          <span>Deadline: {formatRelativeDays(app.deadline)}</span>
                        </div>
                      )}

                      {/* Checklist Preview */}
                      {app.checklist.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                            Readiness Checklist (
                            {app.checklist.filter((c) => c.completed).length}/{app.checklist.length})
                          </span>
                          <div className="space-y-1">
                            {app.checklist.map((item) => (
                              <label
                                key={item.id}
                                className="flex items-start gap-2 cursor-pointer select-none text-[11px]"
                              >
                                <input
                                  type="checkbox"
                                  checked={item.completed}
                                  onChange={() => handleToggleChecklist(app.id, item.id)}
                                  className="rounded border-border text-primary focus:ring-primary/20 w-3.5 h-3.5 mt-0.5"
                                />
                                <span
                                  className={
                                    item.completed
                                      ? 'line-through text-muted-foreground'
                                      : 'text-foreground'
                                  }
                                >
                                  {item.task}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Documents count */}
                      {app.documents.length > 0 && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-1">
                          <FileText className="w-3.5 h-3.5" />
                          <span>{app.documents.length} document{app.documents.length === 1 ? '' : 's'} linked</span>
                        </div>
                      )}

                      {/* Status Transition Selector */}
                      <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground font-semibold">Move Stage:</span>
                        <select
                          value={app.status}
                          onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationStatus)}
                          className="text-[11px] font-semibold rounded-md border border-border bg-background px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {STAGES.map((s) => (
                            <option key={s.key} value={s.key}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
