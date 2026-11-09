'use client';

import React from 'react';
import { AlertCircle, Database } from 'lucide-react';
import { api } from '@/lib/api/client';

export function DemoDataBadge() {
  const isMock = api.isMockMode();

  if (!isMock) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Live API Mode
      </div>
    );
  }

  return (
    <div
      title="Running on realistic test fixtures with edge cases. All data is labeled fictional."
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 select-none shadow-sm"
    >
      <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
      <span>Demo Data (Simulated)</span>
    </div>
  );
}
