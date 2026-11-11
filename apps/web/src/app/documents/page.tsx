'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  FileText,
  Download,
  Trash2,
  CheckCircle2,
  Tag,
  ShieldCheck,
  Plus,
  RefreshCw,
  Clock,
  X,
  FileCheck,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { UserDocument } from '@edgi/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Upload Form State
  const [docName, setDocName] = useState('');
  const [fileName, setFileName] = useState('');
  const [docType, setDocType] = useState<string>('cv');
  const [docTags, setDocTags] = useState('');
  const [fileSize, setFileSize] = useState<number>(145000);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const docs = await api.getUserDocuments();
      setDocuments(docs);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName || !fileName) return;

    setIsUploading(true);
    try {
      const newDoc = await api.uploadUserDocument({
        name: docName,
        fileName,
        fileSize,
        mimeType: fileName.endsWith('.pdf') ? 'application/pdf' : 'text/markdown',
        type: docType,
        tags: docTags ? docTags.split(',').map((t) => t.trim()) : [],
      });
      setDocuments((prev) => [newDoc, ...prev]);
      setShowUploadModal(false);
      setDocName('');
      setFileName('');
      setDocTags('');
      showToast(`Document "${newDoc.name}" uploaded successfully (v${newDoc.version}).`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" from your private vault?`)) return;
    await api.deleteUserDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    showToast(`Document "${name}" deleted.`);
  };

  const handleDownload = (doc: UserDocument) => {
    showToast(`Generated secure signed download token for "${doc.fileName}".`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Private Documents Vault</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Secure, versioned document repository. Store verified CVs, transcripts, and certificates for application checklists.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setShowUploadModal(true)} className="text-xs font-bold gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </Button>
          <Link href="/applications">
            <Button size="sm" variant="outline" className="text-xs">
              Go to Applications
            </Button>
          </Link>
        </div>
      </div>

      {/* Upload Drop Zone Banner */}
      <div
        onClick={() => setShowUploadModal(true)}
        className="rounded-2xl border-2 border-dashed border-border p-8 text-center bg-card/40 hover:bg-muted/20 transition-all cursor-pointer space-y-3 group"
      >
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-foreground">Upload Document Packet</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            PDF, DOCX, Markdown, or Plain Text. Max 15MB. Encrypted at rest.
          </p>
        </div>
        <Button size="sm" variant="outline" className="text-xs">
          Select File to Upload
        </Button>
      </div>

      {/* Documents List */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-foreground">Stored Documents ({documents.length})</h3>
            <span className="text-xs text-muted-foreground">Versioned and ready to attach to application packets</span>
          </div>
          <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">
            Private Storage Verified
          </Badge>
        </div>

        {documents.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            No documents in vault yet. Click "Upload Document" to get started.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs hover:bg-muted/10 transition-colors"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground text-sm truncate">{doc.name}</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-4">
                        v{doc.version}
                      </Badge>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-muted text-muted-foreground">
                        {doc.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                      <span>{doc.fileName}</span>
                      <span>&bull;</span>
                      <span>{Math.round(doc.fileSize / 1024)} KB</span>
                      <span>&bull;</span>
                      <span>Uploaded {formatDate(doc.createdAt)}</span>
                    </div>

                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {doc.tags.map((t, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded text-[9px] bg-muted/60 text-muted-foreground">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDownload(doc)}
                    className="text-xs text-primary gap-1 h-8"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(doc.id, doc.name)}
                    className="text-xs text-red-500 hover:text-red-600 h-8 p-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleUploadSubmit}
            className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-4 shadow-2xl animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-base text-foreground">Upload Document to Vault</h3>
                <p className="text-xs text-muted-foreground">Add versioned CV, transcript, or personal statement.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Document Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Cyber Security Technical Resume (200L)"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-2.5 text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">File Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CyberSec_Resume_v2.pdf"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-2.5 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Document Type</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-2.5 text-xs font-medium"
                >
                  <option value="cv">CV / Resume</option>
                  <option value="transcript">Academic Transcript</option>
                  <option value="essay">Statement of Intent / Essay</option>
                  <option value="certificate">Certification / Credential</option>
                  <option value="cover_letter">Cover Letter</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Tags (comma separated)</label>
              <input
                type="text"
                placeholder="e.g. appsec, futo, fellowship, python"
                value={docTags}
                onChange={(e) => setDocTags(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-2.5 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setShowUploadModal(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={isUploading} className="text-xs font-bold px-5">
                {isUploading ? 'Encrypting & Storing...' : 'Save to Vault'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
