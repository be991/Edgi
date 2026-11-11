'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Link as LinkIcon,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  X,
  Share2,
  Calendar,
  Building2,
  DollarSign,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { api, submitCapture } from '@/lib/api/client';
import { CaptureSubmission, CaptureResult, ConnectorType } from '@edgi/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const PLATFORMS: Array<{ id: ConnectorType; label: string; icon: string }> = [
  { id: 'x_twitter', label: 'X (Twitter)', icon: '𝕏' },
  { id: 'instagram', label: 'Instagram', icon: '📷' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'telegram', label: 'Telegram', icon: '✈️' },
  { id: 'discord', label: 'Discord', icon: '💬' },
  { id: 'reddit', label: 'Reddit', icon: '🤖' },
  { id: 'youtube', label: 'YouTube', icon: '▶️' },
  { id: 'website', label: 'Website / Other', icon: '🌐' },
];

function CaptureContent() {
  const searchParams = useSearchParams();
  const initialPlatform = (searchParams.get('platform') as ConnectorType) || 'x_twitter';

  const [platform, setPlatform] = useState<ConnectorType>(initialPlatform);
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [author, setAuthor] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [runOcr, setRunOcr] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('platform')) {
      setPlatform(searchParams.get('platform') as ConnectorType);
    }
  }, [searchParams]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim() && !url.trim() && !imagePreview) {
      setErrorMsg('Please provide a URL, post caption, or upload a flyer screenshot.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const payload: CaptureSubmission = {
        platform,
        url: url.trim() || undefined,
        caption: caption.trim() || (imagePreview ? 'Event flyer uploaded for OCR processing' : ''),
        author: author.trim() || undefined,
        mediaBase64: imagePreview || undefined,
        tags: [platform, 'quick_capture'],
      };

      const captureFn =
        typeof api?.submitCapture === 'function'
          ? api.submitCapture.bind(api)
          : typeof submitCapture === 'function'
            ? submitCapture
            : null;

      if (captureFn) {
        const res = await captureFn(payload);
        setResult(res);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Capture submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setUrl('');
    setCaption('');
    setAuthor('');
    setImagePreview(null);
    setImageFile(null);
    setResult(null);
    setErrorMsg(null);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16">
      {/* Header */}
      <div className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Quick Capture Staging</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Mobile-friendly intake for X, LinkedIn, Instagram flyers, Discord, and Telegram announcements.
            </p>
          </div>
        </div>

        <Link href="/connectors">
          <Button variant="outline" size="sm" className="text-xs gap-1.5 font-semibold">
            <Share2 className="w-3.5 h-3.5" /> View Connectors
          </Button>
        </Link>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Capture Result Banner */}
      {result && (
        <div
          className={`p-5 rounded-2xl border transition-all space-y-4 animate-in fade-in ${
            result.isDuplicate
              ? 'bg-emerald-500/[0.05] border-emerald-500/30'
              : 'bg-primary/[0.04] border-primary/30'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  result.isDuplicate
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-primary/20 text-primary'
                }`}
              >
                {result.isDuplicate ? <CheckCircle2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  {result.isDuplicate ? 'Deduplicated & Corroborated' : 'Canonical Opportunity Staged'}
                </h3>
                <span className="text-[11px] text-muted-foreground">{result.message}</span>
              </div>
            </div>

            <Badge variant={result.isDuplicate ? 'success' : 'secondary'} className="text-[10px] font-bold">
              {result.isDuplicate ? `Evidence Trail #${result.evidenceCount}` : 'New Candidate'}
            </Badge>
          </div>

          <div className="p-3.5 rounded-xl bg-card border border-border/80 space-y-2 text-xs">
            <div className="font-bold text-base text-foreground">{result.title}</div>
            <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-[11px]">
              {result.organization && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <strong>{result.organization}</strong>
                </span>
              )}
              {result.deadline && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Deadline: {new Date(result.deadline).toLocaleDateString()}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <Button variant="outline" size="sm" onClick={handleResetForm} className="text-xs">
              Capture Another Announcement
            </Button>

            <Link href={result.opportunityId ? `/opportunities/${result.opportunityId}` : '/discover'}>
              <Button size="sm" className="text-xs font-bold gap-1.5">
                <span>View in Opportunity Ledger</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Main Intake Form */}
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-5 shadow-sm">
        {/* Platform Selector Pills */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-foreground flex items-center justify-between">
            <span>Select Source Platform</span>
            <span className="text-[11px] font-normal text-muted-foreground">Select ecosystem for honest classification</span>
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PLATFORMS.map((p) => {
              const isSelected = platform === p.id;
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span className="text-sm">{p.icon}</span>
                  <span className="truncate">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* URL Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Post URL or Application Link (Optional)</span>
          </label>
          <input
            type="url"
            placeholder="e.g. https://x.com/OpenSSF/status/1900000000 or https://forms.gle/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Post Caption / Text Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Announcement Caption or Snippet</span>
            </label>
            <span className="text-[10px] text-muted-foreground font-mono">{caption.length} chars</span>
          </div>
          <textarea
            rows={4}
            placeholder="Paste the tweet, post text, WhatsApp message, or requirements summary here..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Screenshot / Flyer Upload & OCR */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Upload Event Flyer or Story Screenshot</span>
            </label>
            <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-muted-foreground">
              <input
                type="checkbox"
                checked={runOcr}
                onChange={(e) => setRunOcr(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary w-3 h-3"
              />
              <span>Auto-Run OCR Text Extraction</span>
            </label>
          </div>

          {imagePreview ? (
            <div className="relative rounded-xl border border-border bg-muted/20 p-3 flex items-center gap-4">
              <img
                src={imagePreview}
                alt="Flyer Preview"
                className="w-20 h-20 object-cover rounded-lg border border-border"
              />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-foreground block truncate">
                  {imageFile?.name || 'Flyer Screenshot'}
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  {runOcr ? 'Document OCR Pipeline queued (Visual Evidence: 0.70 confidence)' : 'Image attached'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors text-center bg-muted/10">
              <UploadCloud className="w-7 h-7 text-muted-foreground mb-1.5" />
              <span className="text-xs font-semibold text-foreground">Click to upload flyer screenshot</span>
              <span className="text-[11px] text-muted-foreground mt-0.5">PNG, JPG, or WEBP up to 10MB</span>
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          )}
        </div>

        {/* Security Delimiter Notice */}
        <div className="p-3 rounded-xl bg-muted/40 border border-border/80 text-[11px] text-muted-foreground flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong>Prompt-Injection Sanitized:</strong> All social input is quarantined inside unverified data delimiters. Text instructions inside captions cannot override verification rules.
          </span>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetForm}
            disabled={isSubmitting}
            className="text-xs"
          >
            Clear
          </Button>

          <Button type="submit" disabled={isSubmitting} className="font-bold text-xs gap-1.5 px-5">
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Extracting Opportunity & Checking Dedup...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" /> Capture & Extract Opportunity
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function QuickCapturePage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading Quick Capture...</div>}>
      <CaptureContent />
    </React.Suspense>
  );
}
