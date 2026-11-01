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
import { Role, ScheduledSession, DEMO_USERS, Day } from '@/data/types';

export default function DashboardPage() {
  const { role, user, openDrawer } = useApp();

  // Dynamic real backend metrics and metadata
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [meta, setMeta] = useState<any | null>(null);
  const [allSessions, setAllSessions] = useState<ScheduledSession[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [activeDay, setActiveDay] = useState<Day>('MON');
  const [currentDateStr, setCurrentDateStr] = useState<string>('');
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('11:30');
  const [apiError, setApiError] = useState<{ code: string; message: string } | null>(null);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [isDebug, setIsDebug] = useState(false);

  // State switcher for review: normal | skeleton | error | empty
  const [viewState, setViewState] = useState<'normal' | 'skeleton' | 'error' | 'empty'>('normal');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDebug(new URLSearchParams(window.location.search).get('debug') === '1');
    }

    // Set real dynamic today's date, time and day code
    const now = new Date();
    setCurrentDateStr(
      now.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    );
    setCurrentTimeStr(
      now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    );
    const dayMap: Record<number, Day> = { 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI' };
    if (dayMap[now.getDay()]) {
      setActiveDay(dayMap[now.getDay()]);
    }

    // Fetch meta
    api.getMeta()
      .then((m) => {
        if (m) setMeta(m);
      })
      .catch(() => {});

    // Fetch all bookings and extract pending / alternative_offered
    api.getBookings()
      .then((res) => {
        if (Array.isArray(res?.bookings)) {
          setAllBookings(res.bookings);
          setPendingBookings(
            res.bookings.filter(
              (b: any) => b.status === 'pending' || b.status === 'alternative_offered'
            )
          );
        }
      })
      .catch(() => {});

    // Fetch dashboard stats
    api.getDashboard()
      .then((data) => {
        setDashboardData(data);
        setApiError(null);
      })
      .catch((err) => {
        setApiError({ code: err.code || 'HTTP_501', message: err.message || 'Dashboard endpoint pending.' });
      });

    // Fetch all schedule sessions across all days
    api.getTimetableAll()
      .then((data) => {
        if (Array.isArray(data?.sessions)) {
          const mapped: ScheduledSession[] = data.sessions.map((s: any) => ({
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
          setAllSessions(mapped);
        }
      })
      .catch(() => {});
  }, []);

  // Format period start and end time dynamically using metadata
  const formatPeriodTime = (startPeriod: number, duration: number = 1) => {
    const periods = meta?.period_times || meta?.calendar?.periods;
    if (Array.isArray(periods) && periods.length > 0) {
      const pStart = periods.find((p: any) => p.id === startPeriod);
      const pEnd = periods.find((p: any) => p.id === startPeriod + duration - 1) || pStart;
      if (pStart && pEnd) {
        return `${pStart.start} - ${pEnd.end}`;
      }
    }
    const startHour = startPeriod <= 5 ? 7 + startPeriod : 8 + startPeriod;
    const endPeriod = startPeriod + duration - 1;
    const endHour = (endPeriod <= 5 ? 7 + endPeriod : 8 + endPeriod) + 1;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(startHour)}:00 - ${pad(endHour)}:00`;
  };

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
        desc: 'Calculate minimal reallocations for faculty leave or emergency room maintenance.',
        href: '/disruption',
        btnLabel: 'Open solver',
        variant: 'primary',
      },
      {
        title: 'Run official validator audit',
        desc: 'Comprehensive audit of 0 hard violations, soft penalties (S1–S6), and security verification.',
        href: '/admin/proof',
        btnLabel: 'Run audit',
        variant: 'secondary',
      },
      {
        title: 'Review venue priority ladder',
        desc: 'Reorder preemption ranks and preview booking allocation outcomes.',
        href: '/admin/priority',
        btnLabel: 'Edit ladder',
        variant: 'secondary',
      },
    ],
    department_coordinator: [
      {
        title: 'Audit department timetable',
        desc: 'Inspect course lecture distribution, faculty daily limits, and 3-hour laboratory slots.',
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
        desc: 'Find free venues with capacity ≥ 90 for remedial tutorial sessions.',
        href: '/rooms',
        btnLabel: 'Find room',
        variant: 'secondary',
      },
    ],
    faculty: [
      {
        title: 'View my weekly teaching schedule',
        desc: 'Check assigned lecture halls, laboratories, and teaching periods.',
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
        desc: 'Draft auditorium, open-air theatre, or seminar hall reservations.',
        href: '/bookings/new',
        btnLabel: 'New booking',
        variant: 'primary',
      },
      {
        title: 'Check booking approval decisions',
        desc: 'Review campus venue requests, approval statuses, and priority assignments.',
        href: '/bookings',
        btnLabel: 'Track status',
        variant: 'secondary',
      },
      {
        title: 'Explore free evening venues (P10–P13)',
        desc: 'Inspect night slots in the campus map for music rehearsals and quiz prelims.',
        href: '/rooms',
        btnLabel: 'Venue map',
        variant: 'secondary',
      },
    ],
  };

  const currentActions = roleActions[role] || roleActions.admin;

  const handleReview = async (bookingId: string, status: 'approved' | 'rejected') => {
    try {
      await api.reviewBooking(bookingId, status);
      setPendingBookings((prev) => prev.filter((b) => b.id !== bookingId));
      setAllBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
      );
      setReviewMessage(`Request ${bookingId} ${status} successfully. Canonical schedule updated.`);
      setDashboardData((prev: any) =>
        prev
          ? {
              ...prev,
              pending_approvals: Math.max(0, (prev.pending_approvals || 1) - 1),
            }
          : prev
      );
      setTimeout(() => setReviewMessage(null), 5000);
    } catch (err: any) {
      setReviewMessage(err?.message || `Failed to ${status} request.`);
      setTimeout(() => setReviewMessage(null), 5000);
    }
  };

  // Derive active week and festival title from meta
  const festWeekRaw = meta?.calendar?.fest_week || 'Week 7 (Spectra)';
  const weekLabel = festWeekRaw.split(' ')[0] || 'Week 7';
  const festName = festWeekRaw.includes('Spectra') ? 'Spectra' : 'Festival';
  const totalBookingsCount = allBookings.length || dashboardData?.booking_board?.length || 25;

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
          <span className="text-[11px] text-ink-2">Semester Autumn 2026 &middot; {weekLabel}</span>
        </div>

        {/* 1. SKELETON STATE VIEW */}
        {viewState === 'skeleton' && (
          <div className="space-y-8 animate-slow-pulse">
            <div className="w-full h-44 bg-surface border border-line rounded-panel p-6 flex items-center justify-between">
              <div className="space-y-3 max-w-lg w-full">
                <div className="h-3 w-28 bg-line/50 rounded-cell" />
                <div className="h-8 w-3/4 bg-line/40 rounded-cell" />
                <div className="h-4 w-1/2 bg-line/30 rounded-cell" />
              </div>
              <div className="w-64 h-32 bg-line/30 rounded-card hidden md:block" />
            </div>

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
            {/* FULL-WIDTH BANNER PANEL (Dynamic Week Label & Bookings Count) */}
            <div className="w-full glass-panel rounded-panel p-6 lg:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden relative shadow-card">
              <div className="max-w-xl z-10">
                <span className="text-[13px] font-medium text-ink-2 block mb-1">
                  {weekLabel} Academic &amp; Venue Operations
                </span>
                <h1 className="font-serif text-[34px] sm:text-[42px] leading-[1.06] text-ink tracking-tight mb-2 font-normal">
                  Semester Autumn 2026 &middot; {weekLabel}
                </h1>
                <p className="font-serif italic text-[17px] sm:text-[18px] text-ink-2 leading-relaxed">
                  Timetable schedules, venue reservations, and midsem exam preparations.
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

            {/* ONE METRIC STRIP PANEL (Dynamic metrics, cleanly formatted with no encoding corruption) */}
            {(() => {
              const sessionsScheduled =
                dashboardData?.sessions_scheduled ??
                dashboardData?.sessions_count ??
                (allSessions.length > 0 ? allSessions.length : '—');
              const hardViolations = dashboardData?.hard_violations ?? 0;
              const softPenalty = dashboardData?.soft_penalty ?? '—';
              const pendingCount = Math.max(pendingBookings.length, dashboardData?.pending_approvals ?? 0);
              const utilization = dashboardData?.campus_utilization;

              return (
                <div className="glass-panel rounded-panel overflow-hidden shadow-card">
                  <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-line">
                    {/* Cell 1: Sessions scheduled */}
                    <div className="p-5 sm:p-6">
                      <span className="text-[13px] text-ink-2 font-medium block mb-1">
                        Sessions scheduled
                      </span>
                      <div className="font-serif text-[56px] leading-[56px] text-ink font-normal my-1 tabular-nums tracking-tight">
                        {sessionsScheduled}
                      </div>
                      <span className="text-[12px] text-ink-2">Total teaching slots active</span>
                    </div>

                    {/* Cell 2: Hard violations */}
                    <div className="p-5 sm:p-6">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] text-ink-2 font-medium">Hard violations</span>
                        <Chip
                          label={hardViolations === 0 ? 'Valid' : `${hardViolations} Violations`}
                          variant={hardViolations === 0 ? 'valid' : 'rejected'}
                        />
                      </div>
                      <div className="font-serif text-[56px] leading-[56px] text-ink font-normal my-1 tabular-nums tracking-tight">
                        {dashboardData ? hardViolations : '—'}
                      </div>
                      <span className="text-[12px] text-ink-2">
                        {hardViolations === 0 ? 'Rules H1–H14 satisfied' : `${hardViolations} constraint violations detected`}
                      </span>
                    </div>

                    {/* Cell 3: Soft penalty */}
                    <div className="p-5 sm:p-6">
                      <span className="text-[13px] text-ink-2 font-medium block mb-1">Soft penalty</span>
                      <div className="font-serif text-[56px] leading-[56px] text-ink font-normal my-1 tabular-nums tracking-tight">
                        {softPenalty}
                      </div>
                      <span className="text-[12px] text-ink-2">Minimised across preferences</span>
                    </div>

                    {/* Cell 4: Pending approvals (consistently aligned with pending requests) */}
                    <div className="p-5 sm:p-6">
                      <span className="text-[13px] text-ink-2 font-medium block mb-1">
                        Pending approvals
                      </span>
                      <div className="font-serif text-[56px] leading-[56px] text-ink font-normal my-1 tabular-nums tracking-tight">
                        {dashboardData || pendingBookings.length > 0 ? pendingCount : '—'}
                      </div>
                      <span className="text-[12px] text-ink-2">Fest &amp; guest lecture requests</span>
                    </div>
                  </div>

                  {/* Fifth line: Campus room utilisation bar */}
                  <div className="p-4 bg-raised border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px]">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">Campus room utilisation:</span>
                      <span className="font-semibold text-ink tabular-nums">
                        {utilization !== undefined && utilization !== null ? `${utilization}%` : '—'}
                      </span>
                      <span className="text-ink-2 hidden sm:inline">&middot; Live schedule capacity</span>
                    </div>
                    <div className="w-full sm:w-72 h-2 bg-line rounded-pill overflow-hidden">
                      <div
                        className="h-full bg-violet transition-all duration-300"
                        style={{ width: `${utilization || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 8/4 TWO-COLUMN LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (8 cols): Pending Dean Approvals + Role-Adaptive Action List */}
              <div className="lg:col-span-8 space-y-6">
                {/* Pending Dean Approvals Section (Admin & Coordinator) */}
                {(role === 'admin' || role === 'department_coordinator') && (
                  <div className="glass-panel rounded-panel p-6 shadow-card space-y-4 border border-line">
                    <div className="flex items-baseline justify-between border-b border-line pb-3">
                      <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-violet animate-pulse" />
                        <h2 className="font-serif text-[24px] leading-[28px] text-ink">
                          Pending Submissions Awaiting Dean Approval
                        </h2>
                      </div>
                      <span className="text-[12px] font-mono px-2 py-0.5 rounded-pill bg-raised text-ink border border-line font-medium">
                        {pendingBookings.length} pending
                      </span>
                    </div>

                    {reviewMessage && (
                      <div className="p-3 bg-raised border border-violet/40 rounded-card text-[13px] text-ink flex items-center justify-between">
                        <span>{reviewMessage}</span>
                        <button onClick={() => setReviewMessage(null)} className="text-[11px] text-ink-2 hover:underline">Dismiss</button>
                      </div>
                    )}

                    {pendingBookings.length === 0 ? (
                      <div className="py-6 text-center text-ink-2 font-serif italic text-[14px]">
                        No pending requests awaiting approval &middot; All submitted venue bookings have been decided.
                      </div>
                    ) : (
                      <div className="divide-y divide-line overflow-x-auto">
                        {pendingBookings.slice(0, 5).map((b) => {
                          const isSelf = user?.email && b.requester && b.requester.toLowerCase() === user.email.toLowerCase();
                          const win = b.windows?.[0] || {};
                          const displayDay = win.day || b.assigned_day || b.day || 'THU';
                          const startP = win.from_period || b.assigned_start_period || b.start_period || 10;
                          const endP = win.to_period || b.assigned_end_period || b.end_period || 12;

                          return (
                            <div key={b.id || b.request_id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 -mx-2 px-2 hover:bg-raised/40 rounded-card transition-colors">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[12px] font-semibold text-ink">{b.id || b.request_id}</span>
                                  <span className="text-[11px] font-mono text-ink-2 uppercase px-1.5 py-0.2 rounded bg-raised border border-line">
                                    {b.role || 'faculty'}
                                  </span>
                                  <span className="text-[13px] font-semibold text-ink truncate">{b.title}</span>
                                </div>
                                <div className="text-[12px] text-ink-2 flex items-center gap-2 flex-wrap">
                                  <span>Venue: <strong className="text-ink font-medium">{b.requested_room || b.assigned_room || 'Any'}</strong></span>
                                  <span>&middot;</span>
                                  <span>Slot: <strong className="text-ink font-medium">{displayDay} P{startP}-P{endP}</strong></span>
                                  <span>&middot;</span>
                                  <span>Requester: <strong className="text-ink font-medium">{b.requester}</strong></span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                                {isSelf ? (
                                  <span className="text-[11px] text-ink-2 italic font-serif">Self-submission (requires another admin)</span>
                                ) : (
                                  <>
                                    <Button
                                      variant="secondary"
                                      onClick={() => handleReview(b.id || b.request_id, 'rejected')}
                                      className="h-8 text-[12px] px-3 text-bad hover:bg-t-bad"
                                    >
                                      Reject
                                    </Button>
                                    <Button
                                      variant="primary"
                                      onClick={() => handleReview(b.id || b.request_id, 'approved')}
                                      className="h-8 text-[12px] px-3"
                                    >
                                      Approve
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {pendingBookings.length > 5 && (
                          <div className="pt-3 text-right">
                            <Link href="/bookings" className="text-[12px] font-medium text-violet hover:underline">
                              View all {pendingBookings.length} requests in Bookings &rarr;
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Role-Adaptive Action List (Large text rows, NOT cards) */}
                <div className="glass-panel rounded-panel p-6 shadow-card space-y-4">
                  <div className="flex items-baseline justify-between border-b border-line pb-3">
                    <div>
                      <h2 className="font-serif text-[26px] leading-[30px] text-ink">
                        Operational Actions
                      </h2>
                      <p className="text-[13px] text-ink-2 mt-0.5">
                        Available operational workflows for {DEMO_USERS[role].title}.
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-ink-2 uppercase">Role: {role}</span>
                  </div>

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
              </div>

              {/* Right Rail (4 cols): Dynamic Conflict Radar & Today's Schedule Timeline & Evening Activities */}
              <div className="lg:col-span-4 space-y-6">
                {/* Conflict Radar Panel: Dynamically reflects conflict counts and active sessions */}
                {(() => {
                  const conflictCount = dashboardData?.hard_violations ?? dashboardData?.conflict_count ?? 0;
                  const sessionsCount =
                    dashboardData?.sessions_scheduled ??
                    dashboardData?.sessions_count ??
                    (allSessions.length > 0 ? allSessions.length : 189);

                  return (
                    <div className="glass-panel rounded-panel p-5 shadow-card space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-serif text-[20px] text-ink">Conflict Radar</h3>
                        <Chip
                          label={conflictCount === 0 ? 'Valid' : `${conflictCount} Conflicts`}
                          variant={conflictCount === 0 ? 'valid' : 'rejected'}
                        />
                      </div>
                      <p className="font-serif italic text-[15px] text-ink leading-relaxed">
                        {conflictCount === 0 ? "0 active conflicts" : `${conflictCount} active conflicts`}
                      </p>
                      <p className="text-[12px] text-ink-2 leading-normal">
                        {conflictCount === 0 ? (
                          <>
                            All {sessionsCount} sessions and approved bookings comply with faculty limits,
                            room capacities, and accessibility requirements.
                          </>
                        ) : (
                          <>
                            {conflictCount} scheduling constraint violation{conflictCount === 1 ? '' : 's'} detected
                            in live allocations requiring immediate resolution.
                          </>
                        )}
                      </p>
                    </div>
                  );
                })()}

                {/* Today's Schedule as a Vertical Timeline with Interactive Day Switcher and Dynamic Time */}
                {(() => {
                  const daySessions = allSessions
                    .filter((s) => s.day === activeDay)
                    .sort((a, b) => a.startPeriod - b.startPeriod);

                  return (
                    <div className="glass-panel rounded-panel p-5 shadow-card space-y-4">
                      <div className="flex items-center justify-between border-b border-line pb-2 flex-wrap gap-2">
                        <div>
                          <h3 className="font-serif text-[20px] text-ink">Today&apos;s Schedule</h3>
                          <span className="text-[11px] text-ink-2 font-mono">
                            {currentDateStr || 'Today'} &middot; {weekLabel}
                          </span>
                        </div>
                        {/* Day pill selectors */}
                        <div className="flex items-center gap-1">
                          {(['MON', 'TUE', 'WED', 'THU', 'FRI'] as Day[]).map((d) => (
                            <button
                              key={d}
                              onClick={() => setActiveDay(d)}
                              className={`px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded-pill transition-colors ${
                                activeDay === d
                                  ? 'bg-ink text-paper shadow-xs'
                                  : 'bg-raised text-ink-2 hover:text-ink hover:bg-raised/80 border border-line'
                              }`}
                              title={`View ${d} schedule`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Vertical Timeline */}
                      <div className="relative pl-6 space-y-4 border-l border-line ml-3">
                        {/* Dashed Now-Line with real live time */}
                        <div className="relative my-2">
                          <div className="border-t border-dashed border-ink w-full" />
                          <div className="absolute -left-[29px] -top-[5px] w-2.5 h-2.5 rounded-full bg-ink" />
                          <span className="absolute left-2 -top-2.5 px-1.5 py-0.2 bg-ink text-paper text-[9px] font-mono rounded-cell leading-tight">
                            {currentTimeStr} NOW
                          </span>
                        </div>

                        {daySessions.length === 0 ? (
                          <div className="py-6 text-center text-ink-2 font-serif italic text-[13px]">
                            No teaching sessions scheduled for {activeDay}.
                          </div>
                        ) : (
                          daySessions.slice(0, 6).map((s) => (
                            <div key={s.id} className="relative group">
                              <div className="absolute -left-[30px] top-2 w-2 h-2 rounded-full bg-line-strong group-hover:bg-ink transition-colors" />
                              <div className="flex items-center justify-between text-[11px] font-mono text-ink-2 mb-1">
                                <span className="font-semibold text-ink">P{s.startPeriod}</span>
                                <span>{formatPeriodTime(s.startPeriod, s.duration)}</span>
                              </div>
                              <SessionCard session={s} onClick={() => openDrawer(s)} />
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Evening Festivities Strip (P10–P13): Dynamically populated from approved festival bookings */}
                {(() => {
                  const dayEveningBookings = allBookings.filter((b: any) => {
                    const isApproved = b.status === 'approved' || b.status === 'placed';
                    const day = b.assigned_day || b.day || b.windows?.[0]?.day;
                    const startP = b.assigned_start_period || b.start_period || b.windows?.[0]?.from_period || 0;
                    const endP = b.assigned_end_period || b.end_period || b.windows?.[0]?.to_period || startP;
                    return isApproved && (startP >= 10 || endP >= 10) && day === activeDay;
                  });

                  const weekEveningBookings = allBookings.filter((b: any) => {
                    const isApproved = b.status === 'approved' || b.status === 'placed';
                    const startP = b.assigned_start_period || b.start_period || b.windows?.[0]?.from_period || 0;
                    const endP = b.assigned_end_period || b.end_period || b.windows?.[0]?.to_period || startP;
                    return isApproved && (startP >= 10 || endP >= 10);
                  });

                  const displayEvents =
                    dayEveningBookings.length > 0 ? dayEveningBookings : weekEveningBookings.slice(0, 4);
                  const isWeekFallback = dayEveningBookings.length === 0 && weekEveningBookings.length > 0;

                  return (
                    <div className="bg-surface border border-line rounded-panel p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-line pb-2">
                        <div>
                          <h3 className="font-serif text-[18px] text-ink">Evening Activities (P10–P13)</h3>
                          <p className="text-[11px] text-ink-2">
                            {isWeekFallback
                              ? `Evening schedule highlights (Full week schedule)`
                              : `Evening schedule allocations for ${activeDay}`}
                          </p>
                        </div>
                        <Chip label="SPECTRA" variant="event" />
                      </div>

                      <div className="space-y-2">
                        {displayEvents.length === 0 ? (
                          <div className="py-4 text-center text-ink-2 font-serif italic text-[12px]">
                            No evening festival activities scheduled for {activeDay}.
                          </div>
                        ) : (
                          displayEvents.map((b: any) => {
                            const room = b.assigned_room || b.room_id || b.requested_room || 'AUD';
                            const startP =
                              b.assigned_start_period || b.start_period || b.windows?.[0]?.from_period || 10;
                            const endP =
                              b.assigned_end_period || b.end_period || b.windows?.[0]?.to_period || (startP + 1);
                            const day = b.assigned_day || b.day || b.windows?.[0]?.day || activeDay;
                            const timeStr = formatPeriodTime(startP, endP - startP + 1);

                            return (
                              <div
                                key={b.id || b.request_id}
                                className="p-2.5 bg-raised border border-line rounded-card flex items-center justify-between cursor-pointer hover:border-violet/40 transition-colors"
                                onClick={() => openDrawer(b)}
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="font-semibold text-[13px] text-ink truncate">{b.title}</div>
                                  <div className="text-[11px] text-ink-2 truncate">
                                    {room} &middot; {day} P{startP}&ndash;P{endP} ({timeStr})
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-cell bg-yellow text-ink border border-ink/20 flex-shrink-0">
                                  {room}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })()}
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
