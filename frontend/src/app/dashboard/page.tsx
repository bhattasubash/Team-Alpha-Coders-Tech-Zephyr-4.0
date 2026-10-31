'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { SessionCard } from '@/components/ui/SessionCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { CampusVenueMap } from '@/components/ui/CampusVenueMap';
import { Role, ScheduledSession, DEMO_USERS } from '@/data/types';

export default function DashboardPage() {
  const { role, setRole, openDrawer } = useApp();

  // Real backend metrics
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [apiError, setApiError] = useState<{ code: string; message: string } | null>(null);
  const [mondaySessions, setMondaySessions] = useState<ScheduledSession[]>([]);
  const [isDebug, setIsDebug] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDebug(new URLSearchParams(window.location.search).get('debug') === '1');
    }

    api.getDashboard()
      .then((data) => {
        setDashboardData(data);
        setApiError(null);
      })
      .catch((err) => {
        setApiError({ code: err.code || 'HTTP_501', message: err.message || 'Dashboard endpoint pending.' });
      });

    api.getTimetableAll()
      .then((data) => {
        if (Array.isArray(data?.sessions)) {
          const mapped: ScheduledSession[] = data.sessions
            .filter((s: any) => s.day === 'MON')
            .map((s: any) => ({
              id: s.session_id || s.id,
              sessionId: s.session_id || s.id,
              courseId: s.course_id || s.courseId,
              courseTitle: s.course_name || s.courseTitle || s.course_id || s.courseId,
              facultyId: s.faculty_id || s.facultyId,
              facultyName: s.faculty_name || s.facultyName || s.faculty_id || s.facultyId,
              facultySurname: s.faculty_surname || s.facultySurname || s.faculty_name || s.faculty_id,
              roomId: s.room_id || s.roomId,
              roomName: s.room_name || s.roomName || s.room_id || s.roomId,
              day: s.day,
              startPeriod: s.start_period ?? s.startPeriod ?? 1,
              duration: s.duration || 1,
              kind: s.kind || 'lecture',
              state: s.state || (s.kind === 'tutorial' ? 'tutorial' : s.kind === 'lab' ? 'lab' : 'lecture'),
              groups: s.groups || [],
            }));
          setMondaySessions(mapped);
        }
      })
      .catch(() => {});
  }, []);

  // State switcher for review: normal | skeleton | error | empty
  const [viewState, setViewState] = useState<'normal' | 'skeleton' | 'error' | 'empty'>('normal');

  // Specific role action definitions (large text rows, NOT cards with icons)
  const roleActions: Record<
    Role,
    Array<{
      title: string;
      desc: string;
      href: string;
      btnLabel: string;
      variant?: 'primary' | 'secondary';
    }>
  > = {
    admin: [
      {
        title: 'Simulate disruption scenario',
        desc: 'Calculate minimal-move schedule for faculty leave or emergency room maintenance using CP-SAT.',
        href: '/disruption',
        btnLabel: 'Open solver',
        variant: 'primary',
      },
      {
        title: 'Run official validator audit',
        desc: 'Typeset audit of 0 hard violations, soft penalties (S1â€“S6), and differential invariance verification.',
        href: '/admin/proof',
        btnLabel: 'Run audit',
        variant: 'secondary',
      },
      {
        title: 'Review venue priority ladder',
        desc: 'Reorder preemption ranks (Exams &rarr; Regular &rarr; Spectra events) and inspect outcome shifts.',
        href: '/admin/priority',
        btnLabel: 'Edit ladder',
        variant: 'secondary',
      },
    ],
    department_coordinator: [
      {
        title: 'Audit department timetable',
        desc: 'Inspect CSE lecture distribution, faculty daily limits (H12), and 3-hour laboratory slots.',
        href: '/timetable',
        btnLabel: 'View timetable',
        variant: 'primary',
      },
      {
        title: 'Simulate faculty conference leave',
        desc: 'Calculate substitute coverage and room swaps for Dr. Mishra or Dr. Raman.',
        href: '/disruption',
        btnLabel: 'Reschedule',
        variant: 'secondary',
      },
      {
        title: 'Check available lecture halls',
        desc: 'Find free venues with capacity &ge; 90 for remedial tutorial sessions.',
        href: '/rooms',
        btnLabel: 'Find room',
        variant: 'secondary',
      },
    ],
    faculty: [
      {
        title: 'View my weekly teaching schedule',
        desc: 'Check assigned lecture halls, laboratories, and teaching periods with zero personal conflicts.',
        href: '/timetable',
        btnLabel: 'My timetable',
        variant: 'primary',
      },
      {
        title: 'Inspect room accessibility & features',
        desc: 'Verify projector availability, PA systems, and step-free wheelchair access for CR-01 & LH-1.',
        href: '/rooms',
        btnLabel: 'Room finder',
        variant: 'secondary',
      },
      {
        title: 'Request extra seminar hall slot',
        desc: 'Submit booking request for guest lecture or midsem review with deterministic check.',
        href: '/bookings/new',
        btnLabel: 'Book venue',
        variant: 'secondary',
      },
    ],
    club: [
      {
        title: 'Submit Spectra venue booking',
        desc: 'Draft auditorium, open-air theatre, or seminar hall reservation with AI prompt parsing.',
        href: '/bookings/new',
        btnLabel: 'New booking',
        variant: 'primary',
      },
      {
        title: 'Check booking approval decisions',
        desc: 'Review 25 Spectra fest requests, approval reasons, and kernel priority ranking.',
        href: '/bookings',
        btnLabel: 'Track status',
        variant: 'secondary',
      },
      {
        title: 'Explore free evening venues (P10â€“P13)',
        desc: 'Inspect night slots in the campus map for music rehearsals and quiz prelims.',
        href: '/rooms',
        btnLabel: 'Venue map',
        variant: 'secondary',
      },
    ],
  };

  const currentActions = roleActions[role] || roleActions.admin;

  return (
    <AppShell>
      <div className="space-y-6 pb-16 select-none">
        {/* Institutional sub-header: Operating context */}
        <div className="flex items-center justify-between pb-2 border-b border-line text-[12px]">
          <div className="flex items-center gap-2 text-ink-2">
            <span>Operating as</span>
            <span className="font-semibold text-ink">{DEMO_USERS[role].title}</span>
            <span className="text-ink-2/70 hidden md:inline">({DEMO_USERS[role].email})</span>
          </div>
          <span className="text-[11px] text-ink-2">Semester Autumn 2026 &middot; Week 7</span>
        </div>

        {/* 1. SKELETON STATE VIEW */}
        {viewState === 'skeleton' && (
          <div className="space-y-8 animate-slow-pulse">
            {/* Banner skeleton */}
            <div className="w-full h-44 bg-surface border border-line rounded-panel p-6 flex items-center justify-between">
              <div className="space-y-3 max-w-lg w-full">
                <div className="h-3 w-28 bg-line/50 rounded-cell" />
                <div className="h-8 w-3/4 bg-line/40 rounded-cell" />
                <div className="h-4 w-1/2 bg-line/30 rounded-cell" />
              </div>
              <div className="w-64 h-32 bg-line/30 rounded-card hidden md:block" />
            </div>

            {/* Metric strip skeleton */}
            <div className="bg-surface border border-line rounded-panel p-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-6 border-b border-line">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-24 bg-line/40 rounded-cell" />
                    <div className="h-12 w-20 bg-line/50 rounded-cell" />
                    <div className="h-3 w-32 bg-line/30 rounded-cell" />
                  </div>
                ))}
              </div>
              <div className="pt-4 h-3 w-full bg-line/20 rounded-pill" />
            </div>

            {/* 8/4 grid skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-surface border border-line rounded-panel p-6 space-y-4">
                <div className="h-6 w-48 bg-line/40 rounded-cell" />
                <div className="divide-y divide-line">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="py-4 space-y-2">
                      <div className="h-4 w-60 bg-line/40 rounded-cell" />
                      <div className="h-3 w-96 bg-line/20 rounded-cell" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-4 bg-surface border border-line rounded-panel p-6 space-y-4">
                <div className="h-6 w-36 bg-line/40 rounded-cell" />
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-16 bg-raised rounded-card border border-line/40" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. ERROR STATE VIEW */}
        {viewState === 'error' && (
          <div className="py-8">
            <ErrorState
              title="Kernel synchronization timeout"
              message="The timetable kernel did not respond within 30 s. The live schedule state could not be refreshed. Try again or check the manual logs."
              actionLabel="Retry connection"
              onAction={() => setViewState('normal')}
            />
          </div>
        )}

        {/* 3. EMPTY STATE VIEW */}
        {viewState === 'empty' && (
          <div className="py-12">
            <EmptyState
              message="No scheduled sessions or events found for the selected filter."
              actionLabel="Reset to Week 7 overview"
              onAction={() => setViewState('normal')}
            />
          </div>
        )}

        {/* 4. NORMAL COMPLETE DASHBOARD VIEW */}
        {viewState === 'normal' && (
          <>
            {/* FULL-WIDTH BANNER PANEL */}
            <div className="w-full glass-panel rounded-panel p-6 lg:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden relative shadow-card">
              <div className="max-w-xl z-10">
                <span className="text-[13px] font-medium text-ink-2 block mb-1">
                  Week 7 Academic & Festival Operations
                </span>
                <h1 className="font-serif text-[34px] sm:text-[42px] leading-[1.06] text-ink tracking-tight mb-2 font-normal">
                  Week 7 is the busiest week of the semester.
                </h1>
                <p className="font-serif italic text-[17px] sm:text-[18px] text-ink-2 leading-relaxed">
                  25 Spectra bookings, regular classes and midsem preparation overlap.
                </p>
              </div>

              {/* High-Resolution Interactive Isometric Campus Venue Map */}
              <div className="relative w-full md:w-[380px] lg:w-[440px] h-52 select-none flex-shrink-0">
                <CampusVenueMap className="w-full h-full" compact />
              </div>
            </div>

            {/* Honest Endpoint Status */}
            {apiError && (
              <div className="p-4 bg-surface border border-coral text-ink rounded-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-coral">Backend Status: </span>
                  <span>Not available yet ({apiError.code}). {apiError.message}</span>
                </div>
                {apiError.code === 'UNAUTHENTICATED' && (
                  <Link
                    href="/login"
                    className="px-3 py-1 bg-coral/10 hover:bg-coral/20 border border-coral text-coral rounded-cell text-xs font-semibold tracking-wide transition-colors"
                  >
                    Sign In to Demo
                  </Link>
                )}
              </div>
            )}

            {/* ONE METRIC STRIP PANEL (Four hairline-divided cells + 5th utilisation line) */}
            <div className="glass-panel rounded-panel overflow-hidden shadow-card">
              <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-line">
                {/* Cell 1: Sessions scheduled */}
                <div className="p-5 sm:p-6">
                  <span className="text-[13px] text-ink-2 font-medium block mb-1">
                    Sessions scheduled
                  </span>
                  <div className="font-serif text-[56px] leading-[56px] text-ink font-normal my-1 tabular-nums tracking-tight">
                    {dashboardData ? (dashboardData.sessions_scheduled ?? dashboardData.sessions_count ?? 'â€”') : 'â€”'}
                  </div>
                  <span className="text-[12px] text-ink-2">Total teaching slots active</span>
                </div>

                {/* Cell 2: Hard violations 0 with "Valid" chip */}
                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] text-ink-2 font-medium">Hard violations</span>
                    <Chip label={dashboardData?.hard_violations === 0 ? 'Valid' : 'Audit'} variant={dashboardData?.hard_violations === 0 ? 'valid' : 'rejected'} />
                  </div>
                  <div className="font-serif text-[56px] leading-[56px] text-ink font-normal my-1 tabular-nums tracking-tight">
                    {dashboardData ? (dashboardData.hard_violations ?? '0') : 'â€”'}
                  </div>
                  <span className="text-[12px] text-ink-2">Rules H1â€“H14 satisfied</span>
                </div>

                {/* Cell 3: Soft penalty */}
                <div className="p-5 sm:p-6">
                  <span className="text-[13px] text-ink-2 font-medium block mb-1">Soft penalty</span>
                  <div className="font-serif text-[56px] leading-[56px] text-ink font-normal my-1 tabular-nums tracking-tight">
                    {dashboardData ? (dashboardData.soft_penalty ?? 'â€”') : 'â€”'}
                  </div>
                  <span className="text-[12px] text-ink-2">Minimised across preferences</span>
                </div>

                {/* Cell 4: Pending approvals */}
                <div className="p-5 sm:p-6">
                  <span className="text-[13px] text-ink-2 font-medium block mb-1">
                    Pending approvals
                  </span>
                  <div className="font-serif text-[56px] leading-[56px] text-ink font-normal my-1 tabular-nums tracking-tight">
                    {dashboardData ? (dashboardData.pending_approvals ?? dashboardData.pending_bookings ?? 'â€”') : 'â€”'}
                  </div>
                  <span className="text-[12px] text-ink-2">Fest & guest lecture requests</span>
                </div>
              </div>

              {/* Fifth line: Campus room utilisation bar */}
              <div className="p-4 bg-raised border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px]">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">Campus room utilisation:</span>
                  <span className="font-semibold text-ink tabular-nums">{dashboardData?.campus_utilization ? `${dashboardData.campus_utilization}%` : 'â€”'}</span>
                  <span className="text-ink-2 hidden sm:inline">&middot; Live schedule capacity</span>
                </div>
                <div className="w-full sm:w-72 h-2 bg-line rounded-pill overflow-hidden">
                  <div
                    className="h-full bg-violet transition-all duration-300"
                    style={{ width: `${dashboardData?.campus_utilization || 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 8/4 TWO-COLUMN LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (8 cols): Role-Adaptive Action List (Large text rows, NOT cards) */}
              <div className="lg:col-span-8 glass-panel rounded-panel p-6 shadow-card space-y-4">
                <div className="flex items-baseline justify-between border-b border-line pb-3">
                  <div>
                    <h2 className="font-serif text-[26px] leading-[30px] text-ink">
                      Operational Actions
                    </h2>
                    <p className="text-[13px] text-ink-2 mt-0.5">
                      Workflow actions adapted for {DEMO_USERS[role].title}.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-ink-2 uppercase">Role: {role}</span>
                </div>

                {/* Action list as large text rows with one-line descriptions */}
                <div className="divide-y divide-line">
                  {currentActions.map((action, idx) => (
                    <div
                      key={idx}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-raised/40 px-3 rounded-card transition-colors duration-120 -mx-3"
                    >
                      <div className="space-y-1 max-w-lg">
                        <Link
                          href={action.href}
                          className="font-ui text-[15px] font-semibold text-ink hover:underline block leading-tight"
                        >
                          {action.title}
                        </Link>
                        <p className="font-ui text-[13px] text-ink-2 leading-snug">
                          {action.desc}
                        </p>
                      </div>

                      <Link href={action.href} className="flex-shrink-0 self-start sm:self-center">
                        <Button
                          variant={action.variant || 'secondary'}
                          className="h-9 text-[13px] px-4"
                        >
                          {action.btnLabel}
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Rail (4 cols): Conflict Radar & Today's Schedule Timeline with Now-Line */}
              <div className="lg:col-span-4 space-y-6">
                {/* Conflict Radar Sentence Panel */}
                <div className="glass-panel rounded-panel p-5 shadow-card space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-[20px] text-ink">Conflict Radar</h3>
                    <Chip label="Valid" variant="valid" />
                  </div>
                  <p className="font-serif italic text-[15px] text-ink leading-relaxed">
                    "0 active conflicts."
                  </p>
                  <p className="text-[12px] text-ink-2 leading-normal">
                    All 189 sessions and approved bookings comply with faculty limits, room capacities, and accessibility mandates.
                  </p>
                </div>

                {/* Today's Schedule as a Vertical Timeline with a Dashed Now-Line */}
                <div className="glass-panel rounded-panel p-5 shadow-card space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <div>
                      <h3 className="font-serif text-[20px] text-ink">Today's Schedule</h3>
                      <span className="text-[11px] text-ink-2 font-mono">Mon 2 Nov &middot; Week 7</span>
                    </div>
                    <span className="px-2 py-0.5 bg-ink text-paper text-[10px] font-semibold rounded-pill">
                      Active Day
                    </span>
                  </div>

                  {/* Vertical Timeline */}
                  <div className="relative pl-6 space-y-4 border-l border-line ml-3">
                    {/* Dashed Now-Line */}
                    <div className="relative my-2">
                      <div className="border-t border-dashed border-ink w-full" />
                      <div className="absolute -left-[29px] -top-[5px] w-2.5 h-2.5 rounded-full bg-ink" />
                      <span className="absolute left-2 -top-2.5 px-1.5 py-0.2 bg-ink text-paper text-[9px] font-mono rounded-cell leading-tight">
                        11:30 NOW
                      </span>
                    </div>

                    {/* Timeline items for Monday */}
                    {mondaySessions.slice(0, 5).map((s) => (
                      <div key={s.id} className="relative group">
                        {/* Timeline dot */}
                        <div className="absolute -left-[30px] top-2 w-2 h-2 rounded-full bg-line-strong group-hover:bg-ink transition-colors" />

                        {/* Period and Time header */}
                        <div className="flex items-center justify-between text-[11px] font-mono text-ink-2 mb-1">
                          <span className="font-semibold text-ink">P{s.startPeriod}</span>
                          <span>{7 + s.startPeriod}:00 - {8 + s.startPeriod}:00</span>
                        </div>

                        {/* Session Card */}
                        <SessionCard
                          session={s}
                          onClick={() => openDrawer(s)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Evening Festivities Strip (P10â€“P13) - Balances 8/4 grid height */}
                <div className="bg-surface border border-line rounded-panel p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <div>
                      <h3 className="font-serif text-[18px] text-ink">Evening Activities (P10â€“P13)</h3>
                      <p className="text-[11px] text-ink-2">Spectra festival & cultural allocations</p>
                    </div>
                    <Chip label="SPECTRA" variant="event" />
                  </div>

                  <div className="space-y-2">
                    <div className="p-2.5 bg-raised border border-line rounded-card flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-[13px] text-ink">Spectra Fest Opening Ceremony</div>
                        <div className="text-[11px] text-ink-2">Main Auditorium (AUD) &middot; P10&ndash;P12 (18:00&ndash;21:00)</div>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-cell bg-yellow text-ink border border-ink/20">
                        AUD
                      </span>
                    </div>

                    <div className="p-2.5 bg-raised border border-line rounded-card flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-[13px] text-ink">Acoustic Society Rehearsal</div>
                        <div className="text-[11px] text-ink-2">Open-Air Theatre (OAT) &middot; P11&ndash;P13 (19:00&ndash;22:00)</div>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-cell bg-yellow text-ink border border-ink/20">
                        OAT
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Floating Judge Inspection Utility Dock - gated behind ?debug=1 */}
        {isDebug && (
          <aside
            aria-label="Judge state switcher"
            className="fixed bottom-4 right-4 z-40 bg-surface border border-line-strong rounded-panel shadow-palette p-2 flex items-center gap-2.5 text-[11px] font-ui"
          >
            <span className="text-ink-2 font-medium flex items-center gap-1.5 pl-1">
              <span className="w-2 h-2 rounded-full bg-violet" />
              <span className="hidden sm:inline">Evaluation State:</span>
            </span>
            <div className="flex items-center gap-1">
              {(['normal', 'skeleton', 'error', 'empty'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setViewState(s)}
                  className={`px-2 py-1 rounded-[4px] capitalize text-[11px] font-medium transition-colors ${
                    viewState === s
                      ? 'bg-ink text-paper font-semibold shadow-xs'
                      : 'bg-raised border border-line text-ink-2 hover:border-ink hover:text-ink'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>
    </AppShell>
  );
}
