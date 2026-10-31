'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { Role } from '@/data/types';
import { DEMO_USERS } from '@/data/mockData';
import { SearchIcon, ChevronDown, SunIcon, MoonIcon } from '@/components/ui/Icons';

export function Header() {
  const { role, setRole, theme, setTheme, setIsPaletteOpen, startTour } = useApp();

  const roles: { key: Role; label: string; short: string }[] = [
    { key: 'admin', label: "Admin (Dean's office)", short: 'Admin' },
    { key: 'department_coordinator', label: 'Department coordinator', short: 'Coordinator' },
    { key: 'faculty', label: 'Faculty member', short: 'Faculty' },
    { key: 'club', label: 'Club representative', short: 'Club' },
  ];

  const currentRole = roles.find((r) => r.key === role) || roles[0];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('');
  };

  return (
    <header className="sticky top-0 z-20 h-14 bg-surface border-b border-line px-4 lg:px-8 flex items-center justify-between gap-4 select-none">
      {/* Left: Week 7 Pill + Date */}
      <div className="flex items-center gap-2.5">
        <span className="px-2.5 py-1 text-[12px] font-semibold bg-ink text-paper rounded-pill leading-none tracking-tight">
          Week 7
        </span>
        <span className="text-[13px] text-ink-2 font-medium hidden xs:inline">
          Mon 2 Nov
        </span>
      </div>

      {/* Centre: Search Bar triggering Ctrl K */}
      <div className="flex-1 max-w-md mx-2">
        <button
          onClick={() => setIsPaletteOpen(true)}
          className="w-full h-9 px-3 bg-raised border border-line-strong rounded-[6px] flex items-center justify-between text-ink-2 hover:border-ink hover:text-ink transition-colors text-[13px]"
          title="Search (Ctrl+K)"
        >
          <div className="flex items-center gap-2 truncate">
            <SearchIcon size={15} />
            <span className="truncate">Search sessions, rooms, faculty...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-surface border border-line rounded-cell text-ink-2">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right: Role Switcher & Light|Dark Switch */}
      <div className="flex items-center gap-2.5">
        {/* Judge Tour Button */}
        <button
          onClick={startTour}
          className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-raised border border-line-strong hover:border-ink rounded-[6px] text-ink transition-colors"
          title="Launch guided judge tasks"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-event" />
          <span>Judge Tour</span>
        </button>

        {/* Role Switcher */}
        <div className="relative group">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            aria-label="Switch active demo role"
            className="appearance-none bg-raised border border-line-strong hover:border-ink rounded-[6px] pl-8 pr-7 py-1.5 text-[12px] font-medium text-ink cursor-pointer focus:outline-none focus:ring-1 focus:ring-ink transition-colors"
          >
            {roles.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
          {/* Avatar circle icon */}
          <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4 rounded-full bg-ink text-paper text-[9px] font-bold flex items-center justify-center">
            {getInitials(DEMO_USERS[role].name)}
          </div>
          {/* Chevron */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-ink-2">
            <ChevronDown size={13} />
          </div>
        </div>

        {/* Light | Dark Segmented Toggle (from TimeFrame reference) */}
        <div
          role="group"
          aria-label="Theme switcher"
          className="inline-flex items-center h-8 bg-raised border border-line-strong rounded-[6px] p-0.5 text-[11px] font-medium font-ui"
        >
          <button
            onClick={() => setTheme('light')}
            className={`px-2 py-1 rounded-[4px] transition-colors ${
              theme === 'light'
                ? 'bg-surface text-ink font-semibold border border-line'
                : 'text-ink-2 hover:text-ink'
            }`}
          >
            Light
          </button>
          <span className="text-line-strong select-none">|</span>
          <button
            onClick={() => setTheme('dark')}
            className={`px-2 py-1 rounded-[4px] transition-colors ${
              theme === 'dark'
                ? 'bg-surface text-ink font-semibold border border-line'
                : 'text-ink-2 hover:text-ink'
            }`}
          >
            Dark
          </button>
        </div>
      </div>
    </header>
  );
}
