'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Bell,
  Clock,
  Database,
  Globe,
  Download,
  Trash2,
  Lock,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { UserPreferences } from '@edgi/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [retention, setRetention] = useState({
    rawContentDays: 30,
    logsDays: 90,
    auditDays: 180,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const pref = await api.getUserPreferences();
        setPreferences(pref);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferences) return;
    await api.updateUserPreferences(preferences);
    await api.updateRetentionPolicies(retention);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleExportData = async () => {
    try {
      setExportMessage('Generating secure export package...');
      const data = await api.exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edgi_personal_data_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportMessage('Export package downloaded successfully.');
      setTimeout(() => setExportMessage(null), 4000);
    } catch (e: any) {
      alert(e.message || 'Failed to export data');
      setExportMessage(null);
    }
  };

  const handleDeleteData = async () => {
    const confirmation = prompt(
      'WARNING: This will permanently delete your profile, applications, documents, and notifications from PostgreSQL.\nType "DELETE MY DATA" to confirm:'
    );
    if (confirmation !== 'DELETE MY DATA') {
      alert('Deletion cancelled: text did not match.');
      return;
    }

    try {
      await api.deleteUserData();
      alert('All personal data has been permanently purged.');
      window.location.reload();
    } catch (e: any) {
      alert(e.message || 'Failed to purge data');
    }
  };

  if (isLoading || !preferences) {
    return <div className="p-8 text-center text-xs text-muted-foreground">Loading settings...</div>;
  }

  const isMock = api.isMockMode();

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">System & Account Settings</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Configure system execution modes, data sovereignty retention rules, and notification delivery parameters.
          </p>
        </div>
        <Button type="submit" size="sm" className="text-xs font-semibold">
          Save Settings
        </Button>
      </div>

      {isSaved && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
          Settings successfully updated.
        </div>
      )}

      {exportMessage && (
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-semibold">
          {exportMessage}
        </div>
      )}

      {/* Security & Access Box */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 text-xs">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Shield className="w-4 h-4 text-primary" />
          <h2 className="font-bold text-sm text-foreground">Access Control & Privacy Anchor</h2>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
            <div>
              <span className="font-semibold text-foreground">Single-Tenant Mode</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Signups are restricted exclusively to Bethel Okafor Egwuchukwu. Public registration is permanently locked.
              </p>
            </div>
            <Badge variant="success">Enforced</Badge>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
            <div>
              <span className="font-semibold text-foreground">Active Frontend Mode</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Configured via NEXT_PUBLIC_API_MODE environment variable.
              </p>
            </div>
            <Badge variant={isMock ? 'warning' : 'success'}>
              {isMock ? 'Mock Fixtures Mode' : 'Live API Backend'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Data Sovereignty & GDPR Section */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 text-xs">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Database className="w-4 h-4 text-primary" />
          <h2 className="font-bold text-sm text-foreground">Data Sovereignty, Retention & Privacy</h2>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 space-y-1">
              <label className="font-semibold text-foreground block text-[11px]">Raw HTML Content Retention</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={retention.rawContentDays}
                  onChange={(e) => setRetention({ ...retention, rawContentDays: parseInt(e.target.value, 10) || 30 })}
                  className="w-16 p-1.5 rounded border border-border bg-background text-xs font-mono"
                  min="7"
                  max="180"
                />
                <span className="text-[11px] text-muted-foreground">days</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 space-y-1">
              <label className="font-semibold text-foreground block text-[11px]">Collection & Worker Logs</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={retention.logsDays}
                  onChange={(e) => setRetention({ ...retention, logsDays: parseInt(e.target.value, 10) || 90 })}
                  className="w-16 p-1.5 rounded border border-border bg-background text-xs font-mono"
                  min="14"
                  max="365"
                />
                <span className="text-[11px] text-muted-foreground">days</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 space-y-1">
              <label className="font-semibold text-foreground block text-[11px]">System Audit Trail</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={retention.auditDays}
                  onChange={(e) => setRetention({ ...retention, auditDays: parseInt(e.target.value, 10) || 180 })}
                  className="w-16 p-1.5 rounded border border-border bg-background text-xs font-mono"
                  min="30"
                  max="730"
                />
                <span className="text-[11px] text-muted-foreground">days</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Button type="button" variant="outline" size="sm" onClick={handleExportData} className="text-xs">
              <Download className="w-3.5 h-3.5 mr-1 text-primary" /> Export My Full Data (JSON)
            </Button>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteData}
              className="text-xs bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete My Data (Right to be Forgotten)
            </Button>
          </div>
        </div>
      </div>

      {/* Notification Rules */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 text-xs">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Bell className="w-4 h-4 text-primary" />
          <h2 className="font-bold text-sm text-foreground">Notification Schedule & Cadence</h2>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-lg bg-muted/30 cursor-pointer select-none">
            <div>
              <span className="font-semibold text-foreground">In-App Immediate Priority Alerts</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Surface immediate banner & feed notification when a new match exceeds {preferences.minRelevanceScore}%.
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.notifyInApp}
              onChange={(e) => setPreferences({ ...preferences, notifyInApp: e.target.checked })}
              className="rounded border-border text-primary focus:ring-primary/20 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg bg-muted/30 cursor-pointer select-none">
            <div>
              <span className="font-semibold text-foreground">Daily Digest Email</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Receive one consolidated daily overview email at {preferences.digestTime} WAT.
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.notifyEmail}
              onChange={(e) => setPreferences({ ...preferences, notifyEmail: e.target.checked })}
              className="rounded border-border text-primary focus:ring-primary/20 w-4 h-4"
            />
          </label>

          <div className="p-3 rounded-lg bg-muted/30 space-y-2">
            <span className="font-semibold text-foreground block">Deadline Reminder Stages</span>
            <p className="text-[11px] text-muted-foreground">
              Reminders are delivered prior to closing:
            </p>
            <div className="flex gap-2">
              {preferences.reminderDays.map((days) => (
                <Badge key={days} variant="secondary" className="font-mono text-xs">
                  {days} days before
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
