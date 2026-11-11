'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Compass,
  Sparkles,
  Bookmark,
  Briefcase,
  Radio,
  FileCheck2,
  Building2,
  UserCheck,
  CircleDollarSign,
  Settings,
  ShieldAlert,
  FolderGit2,
  GitMerge,
  Share2,
  UploadCloud,
  Bell,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Compass },
  { href: '/discover', label: 'Discover', icon: FolderGit2 },
  { href: '/recommended', label: 'Recommended', icon: Sparkles },
  { href: '/capture', label: 'Quick Capture', icon: UploadCloud },
  { href: '/connectors', label: 'Social Connectors', icon: Share2 },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/applications', label: 'Application Pipeline', icon: Briefcase },
  { href: '/documents', label: 'Documents Vault', icon: FileText },
  { href: '/notifications', label: 'Notifications Hub', icon: Bell },
  { href: '/sources', label: 'Sources & Health', icon: Radio },
  { href: '/sources/candidates', label: 'Candidate Approvals', icon: FileCheck2 },
  { href: '/processing', label: 'Processing Queue', icon: GitMerge },
  { href: '/organizations', label: 'Organizations', icon: Building2 },
  { href: '/profile', label: 'Profile & Criteria', icon: UserCheck },
  { href: '/usage', label: 'Budget & Telemetry', icon: CircleDollarSign },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'w-64 border-r border-border bg-card/60 backdrop-blur-md flex flex-col justify-between shrink-0 h-screen sticky top-0',
        className,
      )}
    >
      <div>
        {/* Brand */}
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-black text-lg">
            E
          </div>
          <div>
            <h1 className="font-bold text-base leading-none tracking-tight">Edgi</h1>
            <span className="text-[10px] text-muted-foreground tracking-wider uppercase font-semibold">
              Opportunity Intel
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
                )}
              >
                <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-primary-foreground' : 'text-muted-foreground')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Profile quick tag */}
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center font-bold text-xs text-primary">
            CS
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate">200-L Cyber Security</p>
            <p className="text-[10px] text-muted-foreground truncate">Africa/Lagos (UTC+1)</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
