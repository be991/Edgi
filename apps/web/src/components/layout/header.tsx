'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, Moon, Sun, Menu, X, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { DemoDataBadge } from './demo-data-badge';
import { api } from '@/lib/api/client';
import { Notification } from '@edgi/contracts';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  isMobileMenuOpen: boolean;
}

export function Header({ onToggleMobileMenu, isMobileMenuOpen }: HeaderProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    // Check initial dark mode
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        document.documentElement.classList.add('dark');
        setIsDarkMode(true);
      }
    }

    // Load initial notifications
    api.getNotifications().then(setNotifications);
  }, []);

  const toggleTheme = () => {
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.toggle('dark');
      setIsDarkMode(isDark);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    await api.markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  return (
    <header className="h-16 border-b border-border bg-card/60 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground focus:outline-none"
          aria-label="Toggle Navigation"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Brand indicator for mobile */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-black text-sm">
            E
          </div>
          <span className="font-bold text-sm tracking-tight">Edgi</span>
        </div>

        {/* Demo Data Badge */}
        <DemoDataBadge />
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notification Bell with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground relative transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>

          {/* Notifications Dropdown Drawer */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-card shadow-2xl p-4 z-50 text-foreground">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Close
                </button>
              </div>

              <div className="divide-y divide-border/50 max-h-80 overflow-y-auto mt-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No notifications</p>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`py-3 text-xs flex gap-2.5 ${notif.read ? 'opacity-70' : 'font-medium'}`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {notif.type === 'priority_alert' && (
                          <Sparkles className="w-4 h-4 text-primary" />
                        )}
                        {notif.type === 'deadline_reminder' && (
                          <ShieldAlert className="w-4 h-4 text-amber-500" />
                        )}
                        {notif.type === 'source_issue' && (
                          <ShieldAlert className="w-4 h-4 text-red-500" />
                        )}
                        {notif.type === 'daily_digest' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-snug">{notif.title}</p>
                        <p className="text-muted-foreground text-[11px] mt-0.5 leading-relaxed">
                          {notif.message}
                        </p>
                        {!notif.read && (
                          <button
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="mt-1 text-[10px] text-primary hover:underline font-semibold"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dark/Light toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Toggle theme"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User Pill */}
        <Link
          href="/profile"
          className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-border hover:opacity-80 transition-opacity"
        >
          <div className="w-7 h-7 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center border border-primary/30">
            CS
          </div>
          <span className="hidden sm:inline text-xs font-semibold">Student</span>
        </Link>
      </div>
    </header>
  );
}
