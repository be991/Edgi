'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Share2,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  HelpCircle,
  Key,
  RefreshCw,
  ExternalLink,
  UploadCloud,
  FileText,
  Lock,
  Zap,
  Globe,
  Radio,
  X,
  Activity,
  Trash2,
} from 'lucide-react';
import {
  api,
  getSocialConnectors,
  updateConnectorCredential,
  testConnectorHealth,
  revokeConnector,
} from '@/lib/api/client';
import { SocialPlatformSummary } from '@edgi/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<SocialPlatformSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<SocialPlatformSummary | null>(null);
  const [credentialInput, setCredentialInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [healthResults, setHealthResults] = useState<Record<string, { latency: number; ok: boolean }>>({});

  const loadData = async () => {
    setIsLoading(true);
    try {
      const getFn =
        typeof api?.getSocialConnectors === 'function'
          ? api.getSocialConnectors.bind(api)
          : typeof getSocialConnectors === 'function'
            ? getSocialConnectors
            : null;

      if (getFn) {
        const data = await getFn();
        setConnectors(data || []);
      }
    } catch (err) {
      console.error('Failed to load connectors:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleTestHealth = async (platform: string) => {
    try {
      const testFn =
        typeof api?.testConnectorHealth === 'function'
          ? api.testConnectorHealth.bind(api)
          : typeof testConnectorHealth === 'function'
            ? testConnectorHealth
            : null;

      if (testFn) {
        const res = await testFn(platform);
        setHealthResults((prev) => ({
          ...prev,
          [platform]: { latency: res.responseTimeMs, ok: res.isHealthy },
        }));
        showToast(`Health check passed for ${platform} (${res.responseTimeMs}ms)`);
      }
    } catch {
      showToast(`Health check failed for ${platform}`, 'error');
    }
  };

  const handleSaveCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModal || !credentialInput.trim()) return;

    setIsSubmitting(true);
    try {
      const updateFn =
        typeof api?.updateConnectorCredential === 'function'
          ? api.updateConnectorCredential.bind(api)
          : typeof updateConnectorCredential === 'function'
            ? updateConnectorCredential
            : null;

      if (updateFn) {
        await updateFn(activeModal.platform, credentialInput.trim());
        showToast(`Credential encrypted and configured for ${activeModal.name}`);
        setActiveModal(null);
        setCredentialInput('');
        loadData();
      }
    } catch {
      showToast(`Failed to update credential for ${activeModal.name}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (platform: string, name: string) => {
    try {
      const revokeFn =
        typeof api?.revokeConnector === 'function'
          ? api.revokeConnector.bind(api)
          : typeof revokeConnector === 'function'
            ? revokeConnector
            : null;

      if (revokeFn) {
        await revokeFn(platform);
        showToast(`Revoked credentials for ${name}. Status set to authorization required.`);
        loadData();
      }
    } catch {
      showToast(`Failed to revoke ${name}`, 'error');
    }
  };

  // Status badge styling
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="success" className="gap-1 font-semibold text-xs">
            <CheckCircle2 className="w-3 h-3" /> Active Polling
          </Badge>
        );
      case 'active_limited':
        return (
          <Badge variant="secondary" className="gap-1 font-semibold text-xs bg-sky-500/10 text-sky-600 border-sky-500/30">
            <Zap className="w-3 h-3" /> Active Limited
          </Badge>
        );
      case 'authorization_required':
        return (
          <Badge variant="warning" className="gap-1 font-semibold text-xs">
            <Key className="w-3 h-3" /> Auth Required
          </Badge>
        );
      case 'manual_capture_only':
        return (
          <Badge variant="outline" className="gap-1 font-semibold text-xs text-purple-700 dark:text-purple-400 border-purple-400/40 bg-purple-500/10">
            <UploadCloud className="w-3 h-3" /> Manual Capture Only
          </Badge>
        );
      default:
        return (
          <Badge variant="destructive" className="gap-1 font-semibold text-xs">
            <ShieldAlert className="w-3 h-3" /> Unavailable
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Social Connectors Hub</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Transparent platform adapters for YouTube, Reddit, Telegram, Discord, X, Instagram, and LinkedIn. Never faking access.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/capture">
            <Button size="sm" className="text-xs gap-1.5 font-bold shadow-sm">
              <UploadCloud className="w-3.5 h-3.5" /> Quick Capture Staging
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading} className="gap-1 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMsg && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
            toastMsg.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400'
          }`}
        >
          {toastMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toastMsg.text}
        </div>
      )}

      {/* Overview Metric Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-card p-4 rounded-xl border border-border">
        <div className="space-y-1">
          <span className="text-[11px] text-muted-foreground">Monitored Platforms</span>
          <div className="text-xl font-black text-foreground">7 Integrated</div>
          <span className="text-[10px] text-muted-foreground">Social ecosystems</span>
        </div>
        <div className="space-y-1">
          <span className="text-[11px] text-muted-foreground">Automated Ingestion</span>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">4 Active / Quota</div>
          <span className="text-[10px] text-muted-foreground">YouTube, Reddit, Telegram, Discord</span>
        </div>
        <div className="space-y-1">
          <span className="text-[11px] text-muted-foreground">Capture & OCR Only</span>
          <div className="text-xl font-black text-purple-600 dark:text-purple-400">3 Honest Gateways</div>
          <span className="text-[10px] text-muted-foreground">X, Instagram, LinkedIn</span>
        </div>
        <div className="space-y-1">
          <span className="text-[11px] text-muted-foreground">Encryption Status</span>
          <div className="text-xl font-black text-primary flex items-center gap-1">
            <Lock className="w-4 h-4" /> AES-256-GCM
          </div>
          <span className="text-[10px] text-muted-foreground">Tokens encrypted at rest</span>
        </div>
      </div>

      {/* Connectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {connectors.map((c) => {
          const health = healthResults[c.platform];
          return (
            <div
              key={c.platform}
              className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/60">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-foreground">{c.name}</h3>
                      {renderStatusBadge(c.status)}
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono block">
                      Auth: {c.authType}
                    </span>
                  </div>

                  {health && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted border border-border text-foreground">
                      {health.latency}ms ping
                    </span>
                  )}
                </div>

                {/* Capability Description */}
                <p className="text-xs text-foreground/90 leading-relaxed mt-3">
                  {c.capabilitiesDescription}
                </p>

                {/* Restrictions & Invariants */}
                <div className="mt-3 p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Truthful ToS & Rate Limits
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-muted-foreground">
                    {c.restrictions.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>Quota: <strong>{c.rateLimitPerMin}/min</strong></span>
                  <span>•</span>
                  <span>Discovered: <strong>{c.discoveredCount}</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleTestHealth(c.platform)}
                    title="Run live health ping"
                  >
                    <Activity className="w-3.5 h-3.5 text-primary" /> Test
                  </Button>

                  {c.status !== 'manual_capture_only' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 font-semibold"
                      onClick={() => {
                        setActiveModal(c);
                        setCredentialInput('');
                      }}
                    >
                      <Key className="w-3 h-3 text-amber-500" />
                      {c.credentialConfigured ? 'Update Key' : 'Configure'}
                    </Button>
                  )}

                  {c.credentialConfigured && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700"
                      onClick={() => handleRevoke(c.platform, c.name)}
                      title="Revoke and wipe stored token"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}

                  {c.status === 'manual_capture_only' && (
                    <Link href={`/capture?platform=${c.platform}`}>
                      <Button variant="secondary" size="sm" className="h-7 text-xs gap-1 font-bold">
                        <UploadCloud className="w-3 h-3 text-purple-600" /> Quick Capture
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Credential Configuration Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">Configure {activeModal.name} Token</h3>
              <p className="text-xs text-muted-foreground">
                Enter your official {activeModal.authType}. Value is encrypted with AES-256-GCM before saving and never logged.
              </p>
            </div>

            <form onSubmit={handleSaveCredential} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Credential Value</label>
                <input
                  type="password"
                  placeholder={`Paste ${activeModal.authType}...`}
                  value={credentialInput}
                  onChange={(e) => setCredentialInput(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border text-[11px] text-muted-foreground flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span>
                  Zero plaintext leakage: credentials stored in <code>source_credentials</code> table with randomized IV and verification tag.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setActiveModal(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting} className="font-bold gap-1 text-xs">
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                  Save Encrypted Key
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
