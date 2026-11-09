'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Shield, Bell, Clock, Database, Globe } from 'lucide-react';
import { api } from '@/lib/api/client';
import { UserPreferences } from '@edgi/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

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
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  if (isLoading || !preferences) {
    return <div className="p-8 text-center text-xs text-muted-foreground">Loading settings...</div>;
  }

  const isMock = api.isMockMode();

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">System & Account Settings</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Configure system execution modes, notification delivery parameters, and timezone synchronization.
          </p>
        </div>
        <Button type="submit" size="sm" className="text-xs">
          Save Settings
        </Button>
      </div>

      {isSaved && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
          Settings successfully updated.
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
                Signups are restricted exclusively to your pre-authorized account. Public registration is permanently locked.
              </p>
            </div>
            <Badge variant="success">Enforced</Badge>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
            <div>
              <span className="font-semibold text-foreground">Active Frontend Mode</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Configured via NEXT_PUBLIC_API_MODE environment flag.
              </p>
            </div>
            <Badge variant={isMock ? 'warning' : 'success'}>
              {isMock ? 'Mock Fixtures Mode' : 'Live API Backend'}
            </Badge>
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
