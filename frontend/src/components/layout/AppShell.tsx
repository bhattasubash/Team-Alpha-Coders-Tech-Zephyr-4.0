'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AppBackground } from './AppBackground';
import { Rail } from './Rail';
import { Header } from './Header';
import { WhyHereDrawer } from './WhyHereDrawer';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { JudgeTour } from '@/components/ui/JudgeTour';
import { AssistantOrb } from '@/components/ai/AssistantOrb';
import { AssistantDrawer } from '@/components/ai/AssistantDrawer';
import { useApp } from '@/context/AppContext';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isSidebarCollapsed } = useApp();

  return (
    <div className="flex min-h-screen bg-paper text-ink transition-colors overflow-x-hidden w-full max-w-full relative">
      {/* Global Pastel Atmospheric Background Wash */}
      <AppBackground />

      {/* Dynamic Collapsible Sidebar: 232px expanded, 64px collapsed, bottom bar mobile */}
      <Rail />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200 overflow-x-hidden w-full max-w-full relative ${
        isSidebarCollapsed ? 'sm:pl-16' : 'sm:pl-16 lg:pl-[232px]'
      }`}>
        {/* Sticky Header with dynamic date and Spectra pill */}
        <Header />

        {/* Page Content with smooth page transition */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto pb-24 sm:pb-12 overflow-x-hidden relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full max-w-full overflow-x-hidden"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Global Overlays & 3D AI Assistant */}
      <WhyHereDrawer />
      <AssistantDrawer />
      <AssistantOrb />
      <CommandPalette />
      <JudgeTour />
    </div>
  );
}
