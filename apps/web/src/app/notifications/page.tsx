'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  Mail,
  Clock,
  AlertTriangle,
  Sparkles,
  Calendar,
  CheckCircle2,
  Sliders,
  Eye,
  ShieldCheck,
  Send,
  ExternalLink,
  RefreshCw,
  X,
  FileText,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import {
  Notification,
  NotificationPreferences,
  NotificationDelivery,
  EmailTemplatePreview,
} from '@edgi/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'preferences' | 'previews' | 'deliveries'>('inbox');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [deliveries, setDeliveries] = useState<NotificationDelivery[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [selectedPreviewTemplate, setSelectedPreviewTemplate] = useState<'priority_alert' | 'daily_digest' | 'deadline_reminder'>('priority_alert');
  const [previewData, setPreviewData] = useState<EmailTemplatePreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [notifs, prefs, dels] = await Promise.all([
        api.getNotifications(),
        api.getNotificationPreferences(),
        api.getNotificationDeliveries(),
      ]);
      setNotifications(Array.isArray(notifs) ? notifs : (notifs as any)?.items || []);
      setPreferences(prefs);
      setDeliveries(Array.isArray(dels) ? dels : (dels as any)?.deliveries || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'previews') {
      loadPreview(selectedPreviewTemplate);
    }
  }, [activeTab, selectedPreviewTemplate]);

  const loadPreview = async (template: 'priority_alert' | 'daily_digest' | 'deadline_reminder') => {
    setIsPreviewLoading(true);
    try {
      const prev = await api.previewEmailTemplate(template);
      setPreviewData(prev);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    await api.markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n)),
    );
  };

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsAsRead();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() })),
    );
    showToast('All notifications marked as read.');
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferences) return;
    setIsSavingPrefs(true);
    try {
      const updated = await api.updateNotificationPreferences(preferences);
      setPreferences(updated);
      showToast('Notification preferences saved successfully!');
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleSendTestAlert = async () => {
    showToast('Dispatching test priority alert...');
    await api.triggerTestAlert('11111111-1111-1111-1111-111111111111');
    const dels = await api.getNotificationDeliveries();
    setDeliveries(dels);
    showToast('Test priority alert dispatched with idempotency key.');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const notifList = Array.isArray(notifications) ? notifications : [];
  const unreadCount = notifList.filter((n) => !n.read).length;
  const filteredNotifications = notifList.filter((n) => {
    if (selectedType === 'all') return true;
    if (selectedType === 'unread') return !n.read;
    return n.type === selectedType;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Notifications & Alerts Hub</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Timely in-app alerts, idempotent Resend email dispatches, verified deadline reminders, and daily digest settings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={handleMarkAllRead} className="text-xs gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark All as Read ({unreadCount})</span>
            </Button>
          )}
          <Link href="/applications">
            <Button size="sm" className="text-xs gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Application Pipeline</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('inbox')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
            activeTab === 'inbox'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          Inbox & History ({notifications.length})
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
            activeTab === 'preferences'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          Notification Preferences
        </button>
        <button
          onClick={() => setActiveTab('previews')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
            activeTab === 'previews'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          Email Previews (HTML)
        </button>
        <button
          onClick={() => setActiveTab('deliveries')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
            activeTab === 'deliveries'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          Delivery Ledger ({deliveries.length})
        </button>
      </div>

      {/* TAB 1: INBOX & HISTORY */}
      {activeTab === 'inbox' && (
        <div className="space-y-4">
          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-muted-foreground font-semibold shrink-0 mr-1">Filter:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: `Unread (${unreadCount})` },
              { id: 'priority_alert', label: 'Priority Alerts' },
              { id: 'deadline_reminder', label: 'Deadline Reminders' },
              { id: 'daily_digest', label: 'Daily Digests' },
              { id: 'source_issue', label: 'Source Issues' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedType(f.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                  selectedType === f.id
                    ? 'bg-foreground text-background'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          {filteredNotifications.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground text-xs">
              No notifications match this filter.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-2xl border p-4 sm:p-5 transition-colors flex items-start justify-between gap-4 ${
                    n.read
                      ? 'border-border/60 bg-card/40 opacity-80'
                      : 'border-primary/40 bg-card shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        n.type === 'priority_alert'
                          ? 'bg-amber-500/10 text-amber-500'
                          : n.type === 'deadline_reminder'
                            ? 'bg-red-500/10 text-red-500'
                            : n.type === 'source_issue'
                              ? 'bg-rose-500/10 text-rose-500'
                              : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {n.type === 'priority_alert' && <Sparkles className="w-4 h-4" />}
                      {n.type === 'deadline_reminder' && <Clock className="w-4 h-4" />}
                      {n.type === 'source_issue' && <AlertTriangle className="w-4 h-4" />}
                      {n.type === 'daily_digest' && <Mail className="w-4 h-4" />}
                      {n.type === 'system' && <Bell className="w-4 h-4" />}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">{n.title}</span>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                        <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-4">
                          {n.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{n.message}</p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                        <span>{formatDate(n.createdAt)}</span>
                        {n.link && (
                          <Link
                            href={n.link}
                            className="text-primary hover:underline font-semibold flex items-center gap-1"
                          >
                            <span>Open Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {!n.read && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleMarkAsRead(n.id)}
                      className="text-[11px] text-muted-foreground hover:text-foreground shrink-0"
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: NOTIFICATION PREFERENCES */}
      {activeTab === 'preferences' && preferences && (
        <form onSubmit={handleSavePreferences} className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6">
          <div className="border-b border-border pb-4">
            <h3 className="font-bold text-base text-foreground">Delivery & Timing Preferences</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Control when, how, and for which opportunity categories you receive immediate emails or daily digests.
            </p>
          </div>

          {/* Master Email Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
            <div>
              <span className="font-bold text-sm text-foreground block">Email Notifications Master Switch</span>
              <span className="text-xs text-muted-foreground">
                When disabled, all notifications will remain strictly in-app.
              </span>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailEnabled}
              onChange={(e) => setPreferences({ ...preferences, emailEnabled: e.target.checked })}
              className="w-4 h-4 accent-primary rounded cursor-pointer"
            />
          </div>

          {/* High Priority Threshold */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground">High-Priority Immediate Alert Threshold</span>
              <span className="font-mono text-primary font-bold">{preferences.highPriorityThreshold}% Match</span>
            </div>
            <input
              type="range"
              min="50"
              max="98"
              step="1"
              value={preferences.highPriorityThreshold}
              onChange={(e) =>
                setPreferences({ ...preferences, highPriorityThreshold: parseInt(e.target.value) })
              }
              className="w-full accent-primary cursor-pointer"
            />
            <p className="text-[11px] text-muted-foreground">
              Opportunities scoring &ge; {preferences.highPriorityThreshold}% trigger an immediate alert even outside daily digests.
            </p>
          </div>

          {/* Daily Digest Time & Timezone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Daily Digest Time</label>
              <input
                type="time"
                value={preferences.digestTime}
                onChange={(e) => setPreferences({ ...preferences, digestTime: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Timezone Indicator</label>
              <input
                type="text"
                value={preferences.timezone}
                disabled
                className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs font-mono text-muted-foreground"
              />
            </div>
          </div>

          {/* Verified Deadline Reminder Offsets */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground block">Verified Deadline Reminder Offsets</label>
            <div className="flex flex-wrap gap-2">
              {[14, 7, 3, 1].map((days) => {
                const isSelected = preferences.reminderOffsets.includes(days);
                return (
                  <button
                    key={days}
                    type="button"
                    onClick={() => {
                      const newOffsets = isSelected
                        ? preferences.reminderOffsets.filter((d) => d !== days)
                        : [...preferences.reminderOffsets, days].sort((a, b) => b - a);
                      setPreferences({ ...preferences, reminderOffsets: newOffsets });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {days} Days Before
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Reminders only fire for opportunities with <strong>verified deadlines</strong>. Null/unknown deadlines are never reminded.
            </p>
          </div>

          {/* Category Toggles */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground block">Category Subscriptions</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.keys(preferences.categoryPreferences).map((cat) => (
                <label
                  key={cat}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-border/60 bg-muted/20 text-xs font-medium cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={preferences.categoryPreferences[cat] ?? true}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        categoryPreferences: {
                          ...preferences.categoryPreferences,
                          [cat]: e.target.checked,
                        },
                      })
                    }
                    className="w-3.5 h-3.5 accent-primary rounded cursor-pointer"
                  />
                  <span className="capitalize">{cat.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-border">
            <Button type="submit" disabled={isSavingPrefs} className="text-xs font-bold px-6">
              {isSavingPrefs ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </form>
      )}

      {/* TAB 3: EMAIL PREVIEWS */}
      {activeTab === 'previews' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">Select Template:</span>
              {(['priority_alert', 'daily_digest', 'deadline_reminder'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedPreviewTemplate(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    selectedPreviewTemplate === t
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {t.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>

            <Button size="sm" variant="outline" onClick={handleSendTestAlert} className="text-xs gap-1.5">
              <Send className="w-3.5 h-3.5" />
              <span>Send Test Email (Ledger Check)</span>
            </Button>
          </div>

          {isPreviewLoading || !previewData ? (
            <div className="p-16 text-center text-xs text-muted-foreground rounded-2xl border border-border bg-card">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
              Rendering responsive email preview...
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  <strong>Subject:</strong> {previewData.subject}
                </div>
                <div>
                  <strong>Recipient:</strong> {previewData.recipient}
                </div>
              </div>
              <div className="p-6 bg-slate-950 flex justify-center">
                <div
                  className="w-full max-w-[620px] shadow-2xl rounded-xl overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: previewData.html }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DELIVERY LEDGER */}
      {activeTab === 'deliveries' && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-foreground">Notification Deliveries & Idempotency Ledger</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cryptographic idempotency guarantees retried jobs never send duplicate emails.
              </p>
            </div>
            <span className="text-xs text-muted-foreground">{deliveries.length} entries</span>
          </div>

          <div className="divide-y divide-border/60">
            {deliveries.map((del) => (
              <div key={del.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        del.status === 'sent' || del.status === 'delivered'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                          : del.status === 'failed'
                            ? 'bg-red-500/10 text-red-500 border-red-500/30'
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                      }
                    >
                      {del.status.toUpperCase()}
                    </Badge>
                    <span className="font-mono text-xs font-bold text-foreground truncate">{del.idempotencyKey}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>Channel: {del.channel}</span>
                    <span>&bull;</span>
                    <span>Attempts: {del.attempts}</span>
                    <span>&bull;</span>
                    <span>Provider ID: {del.providerId || 'N/A'}</span>
                    <span>&bull;</span>
                    <span>{del.sentAt ? formatDate(del.sentAt) : 'Pending'}</span>
                  </div>
                  {del.lastError && (
                    <p className="text-[11px] text-red-400 font-mono mt-1">Error: {del.lastError}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
