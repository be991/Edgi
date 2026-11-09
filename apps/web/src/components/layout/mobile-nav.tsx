'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Sparkles, Bookmark, Briefcase, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

const mobileNavItems = [
  { href: '/', label: 'Overview', icon: Compass },
  { href: '/discover', label: 'Discover', icon: Sparkles },
  { href: '/applications', label: 'Tracker', icon: Briefcase },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/sources', label: 'Sources', icon: Radio },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-lg border-t border-border px-2 py-1.5 flex items-center justify-around">
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-medium transition-colors w-14',
              isActive ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className={cn('w-5 h-5 mb-0.5', isActive ? 'text-primary' : 'text-muted-foreground')} />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
