'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { DEMO_USERS } from '@/data/types';
import { SearchIcon, SunIcon, MoonIcon, SparklesIcon } from '@/components/ui/Icons';

export function Header() {
  const { role, theme, setTheme, setIsPaletteOpen, startTour, toggleMobileNav } = useApp();
  const [currentDateStr, setCurrentDateStr] = useState('Mon, Nov 2');

  useEffect(() => {
    try {
      const now = new Date();
      const formatted = now.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
      setCurrentDateStr(formatted);
    } catch {
      // Fallback
    }
  }, []);

  const user = DEMO_USERS[role];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('');
  };

  const roleLabels: Record<string, string> = {
    admin: "Dean's Office",
    department_coordinator: 'Coordinator',
    faculty: 'Faculty',
    club: 'Club Rep',
  };

  return (
    <header className="sticky top-0 z-20 h-14 bg-surface/85 backdrop-blur-md border-b border-line px-2 sm:px-4 lg:px-8 flex items-center justify-between gap-1.5 sm:gap-4 select-none transition-colors w-full max-w-full overflow-hidden">
      {/* Left: Mobile Hamburger + Spectra Week Pill + Dynamic Date */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
        <button
          onClick={toggleMobileNav}
          className="sm:hidden p-1.5 rounded-[6px] text-ink-2 hover:text-ink hover:bg-raised transition-colors"
          title="Open navigation menu"
          aria-label="Open navigation menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-[11px] sm:text-[11.5px] font-semibold bg-violet/15 text-violet border border-violet/30 rounded-pill leading-none shadow-[0_0_12px_rgba(125,93,255,0.2)]">
          <span className="w-1.5 h-1.5 rounded-full bg-violet animate-pulse" />
          <span>Spectra</span>
        </span>
        <span className="text-[12px] text-ink-2 font-medium hidden md:inline">
          {currentDateStr}
        </span>
      </div>

      {/* Centre: Search Bar triggering Ctrl K */}
      <div className="flex-1 max-w-[160px] xs:max-w-xs sm:max-w-md mx-1 sm:mx-2 min-w-0">
        <button
          onClick={() => setIsPaletteOpen(true)}
          className="w-full h-8 sm:h-9 px-2 sm:px-3 bg-raised/80 border border-line hover:border-violet/50 rounded-[6px] flex items-center justify-between text-ink-2 hover:text-ink transition-all text-[12px] sm:text-[13px] group shadow-xs truncate"
          title="Search (Ctrl+K)"
        >
          <div className="flex items-center gap-1.5 sm:gap-2 truncate">
            <SearchIcon size={14} className="group-hover:text-violet transition-colors flex-shrink-0" />
            <span className="truncate hidden xs:inline">Search sessions, rooms...</span>
            <span className="truncate xs:hidden">Search...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-surface border border-line rounded-cell text-ink-2 group-hover:border-violet/30">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right: Judge Tour, User Profile Card, & Light|Dark Switch */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
        {/* Judge Tour Button: visible on all devices */}
        <button
          onClick={startTour}
          className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-[11px] font-semibold bg-raised border border-line hover:border-event hover:shadow-[0_0_12px_rgba(251,230,77,0.25)] rounded-[6px] text-ink transition-all cursor-pointer flex-shrink-0"
          title="Launch guided judge walkthrough"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-yellow shadow-[0_0_6px_#FBE64D]" />
          <span className="hidden xs:inline">Judge Tour</span>
        </button>

        {/* Professional User Profile Display (Switches accounts on Login page) */}
        <Link
          href="/login"
          title={`Signed in as ${user.name} (${roleLabels[role] || role}). Click to switch account.`}
          className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2.5 py-1 rounded-[6px] bg-raised/80 border border-line hover:border-violet/40 hover:bg-raised transition-all group flex-shrink-0"
        >
          <div className="w-5 h-5 rounded-full bg-violet/20 border border-violet/40 text-violet text-[10px] font-bold flex items-center justify-center flex-shrink-0">
            {getInitials(user.name)}
          </div>
          <div className="hidden md:flex flex-col text-left leading-tight">
            <span className="text-[12px] font-semibold text-ink group-hover:text-violet transition-colors truncate max-w-[90px]">
              {user.name.split(' ')[0]}
            </span>
            <span className="text-[10px] text-ink-2 truncate">
              {roleLabels[role] || role}
            </span>
          </div>
        </Link>

        {/* Light | Dark Segmented Toggle */}
        <div
          role="group"
          aria-label="Theme switcher"
          className="inline-flex items-center h-7 sm:h-8 bg-raised border border-line-strong rounded-[6px] p-0.5 text-[11px] font-medium font-ui shadow-xs flex-shrink-0"
        >
          <button
            onClick={() => setTheme('light')}
            className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-[4px] transition-all flex items-center gap-1 ${
              theme === 'light'
                ? 'bg-surface text-ink font-semibold border border-line shadow-xs'
                : 'text-ink-2 hover:text-ink'
            }`}
            title="Light mode"
          >
            <SunIcon size={12} className={theme === 'light' ? 'text-yellow' : ''} />
            <span className="hidden lg:inline">Light</span>
          </button>
          <span className="text-line-strong select-none text-[10px]">|</span>
          <button
            onClick={() => setTheme('dark')}
            className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-[4px] transition-all flex items-center gap-1 ${
              theme === 'dark'
                ? 'bg-surface text-ink font-semibold border border-line shadow-xs glow-violet'
                : 'text-ink-2 hover:text-ink'
            }`}
            title="Dark mode"
          >
            <MoonIcon size={12} className={theme === 'dark' ? 'text-violet' : ''} />
            <span className="hidden lg:inline">Dark</span>
          </button>
        </div>
      </div>
    </header>
  );
}
