'use client';

import React, { useState } from 'react';
import { UploadCloud, FileText, Download, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DocItem {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocItem[]>([
    {
      id: 'doc-1',
      name: 'CyberSec_Resume_AppSec_Focus.pdf',
      type: 'CV / Resume',
      size: '142 KB',
      uploadedAt: 'Nov 5, 2026',
    },
    {
      id: 'doc-2',
      name: 'Academic_Transcript_200L.pdf',
      type: 'Academic Transcript',
      size: '480 KB',
      uploadedAt: 'Nov 8, 2026',
    },
    {
      id: 'doc-3',
      name: 'OpenSSF_Statement_of_Intent.pdf',
      type: 'Personal Statement',
      size: '88 KB',
      uploadedAt: 'Nov 9, 2026',
    },
  ]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="pb-2 border-b border-border">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Application Documents Library</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Store and attach tailored CV versions, verification letters, and essay drafts directly to your application checklist.
        </p>
      </div>

      {/* Upload Placeholder Area */}
      <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center bg-card/50 hover:bg-muted/20 transition-colors space-y-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-foreground">Upload Document Packet</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Drag and drop your PDF, DOCX, or Markdown files here (Max 15MB).
          </p>
        </div>
        <Button size="sm" variant="outline" className="text-xs">
          Select Files from PC
        </Button>
      </div>

      {/* Documents List */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <span className="font-bold text-sm">Stored Documents ({docs.length})</span>
          <span className="text-xs text-muted-foreground">Encrypted in private storage</span>
        </div>

        <div className="divide-y divide-border/60">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="p-4 sm:p-5 flex items-center justify-between gap-4 text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-foreground text-sm truncate block">{doc.name}</span>
                  <div className="flex items-center gap-2 text-muted-foreground text-[11px] mt-0.5">
                    <span>{doc.type}</span>
                    <span>&bull;</span>
                    <span>{doc.size}</span>
                    <span>&bull;</span>
                    <span>Uploaded {doc.uploadedAt}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="ghost" className="text-xs text-primary gap-1">
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDocs(docs.filter((d) => d.id !== doc.id))}
                  className="text-xs text-muted-foreground hover:text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
