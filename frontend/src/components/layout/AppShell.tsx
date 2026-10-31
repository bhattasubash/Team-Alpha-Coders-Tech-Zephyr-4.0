'use client';

import React from 'react';
import { Rail } from './Rail';
import { Header } from './Header';
import { WhyHereDrawer } from './WhyHereDrawer';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { JudgeTour } from '@/components/ui/JudgeTour';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-paper text-ink">
      {/* 232px lagoon-ink rail (desktop), 64px tablet, bottom bar phone */}
      <Rail />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 56px sticky header */}
        <Header />

        {/* Page Content: padding 32px desktop, 16px mobile, max-width 1440 */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto pb-20 sm:pb-8">
          {children}
        </main>
      </div>

      {/* Global Overlays */}
      <WhyHereDrawer />
      <CommandPalette />
      <JudgeTour />
    </div>
  );
}
