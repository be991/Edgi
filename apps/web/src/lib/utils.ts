import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount?: number | null, currency = 'USD') {
  if (amount === undefined || amount === null) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString?: string | null) {
  if (!dateString) return 'Unknown / Rolling';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Invalid Date';
  }
}

export function formatRelativeDays(dateString?: string | null) {
  if (!dateString) return null;
  try {
    const target = new Date(dateString).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `${Math.abs(diffDays)}d ago (Expired)`;
    if (diffDays === 0) return 'Today (Deadline)';
    if (diffDays === 1) return 'Tomorrow';
    return `${diffDays} days left`;
  } catch {
    return null;
  }
}
