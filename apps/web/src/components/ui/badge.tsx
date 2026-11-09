import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' | 'info' | 'purple';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantStyles = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    outline: 'border border-border text-foreground',
    success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30',
    destructive: 'bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30',
    info: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30',
    purple: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
