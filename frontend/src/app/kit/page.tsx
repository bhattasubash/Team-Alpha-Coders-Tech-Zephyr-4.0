'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SessionCard } from '@/components/ui/SessionCard';
import { Chip } from '@/components/ui/Chip';
import { PriorityRank } from '@/components/ui/PriorityRank';
import { KernelStamp } from '@/components/ui/KernelStamp';
import { GridSkeleton, RowSkeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useApp } from '@/context/AppContext';
import { BOOKINGS } from '@/data/mockData';
import { SessionCardState } from '@/data/types';

export default function KitPage() {
  const { openDrawer } = useApp();
  const [isTestDrawerOpen, setIsTestDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'components' | 'typography' | 'tokens'>('all');

  const demoSession = {
    id: 'CS101-L1',
    sessionId: 'CS101-L1',
    courseId: 'CS101',
    courseTitle: 'Introduction to Computer Programming',
    facultyId: 'F01',
    facultyName: 'Dr. Raman Patnaik',
    facultySurname: 'Dr. Raman',
    groups: ['CSE-1', 'CSE-2'],
    roomId: 'CR-01',
    roomName: 'Classroom 1 (Tiered)',
    day: 'MON' as const,
    startPeriod: 1,
    duration: 1,
    kind: 'lecture' as const,
    state: 'lecture' as const,
    tag: 'L',
    accessible: true,
  };

  const sessionStates: { state: SessionCardState; label: string; desc: string; extraProps?: any }[] = [
    {
      state: 'lecture',
      label: 'Lecture',
      desc: 'Neutral paper card, 3px Violet pip, corner tag "L"',
      extraProps: { session: { ...demoSession, courseId: 'CS101', tag: 'L', accessible: true } },
    },
    {
      state: 'tutorial',
      label: 'Tutorial',
      desc: 'Neutral paper card, 3px Lagoon pip, corner tag "T"',
      extraProps: { session: { ...demoSession, courseId: 'MA101-T', tag: 'T', accessible: false } },
    },
    {
      state: 'lab',
      label: 'Laboratory (3h)',
      desc: 'Neutral paper card, 3px Maize Yellow pip, tag "Lab 3h"',
      extraProps: {
        session: {
          ...demoSession,
          courseId: 'PHY-L2',
          courseTitle: 'Physics Optics Lab (3 Hours)',
          facultySurname: 'Dr. Raman',
          roomId: 'PHY-LAB',
          tag: 'Lab 3h',
          duration: 3,
        },
      },
    },
    {
      state: 'basket',
      label: 'Elective Basket',
      desc: 'Dashed border (as Teams tentative), basket tag',
      extraProps: {
        session: {
          ...demoSession,
          courseId: 'OE301',
          courseTitle: 'Environmental Studies',
          tag: 'Basket B',
        },
      },
    },
    {
      state: 'combined',
      label: 'Combined Lecture',
      desc: 'Double offset outline (+2px edge), tag "x3 groups"',
      extraProps: {
        session: {
          ...demoSession,
          courseId: 'MA101-ABC',
          groups: ['Y1-A', 'Y1-B', 'Y1-C'],
          tag: 'x3 groups',
        },
      },
    },
    {
      state: 'fixed',
      label: 'Fixed Slot',
      desc: 'Pinned glyph, 1px ink border',
      extraProps: {
        session: {
          ...demoSession,
          courseId: 'CS301',
          courseTitle: 'Operating Systems (Dean Pinned)',
          tag: undefined,
        },
      },
    },
    {
      state: 'event',
      label: 'Spectra Event',
      desc: 'Solid haritala fill (only solid on grid), ink text',
      extraProps: {
        session: {
          ...demoSession,
          courseId: 'SPECTRA',
          courseTitle: "Spectra '27 Fest Opening",
          roomId: 'AUD',
          facultySurname: 'Dean Office',
          tag: 'Event',
          accessible: true,
        },
      },
    },
    {
      state: 'closed',
      label: 'Closed / Maintenance',
      desc: 'Diagonal 45deg hatch in silt-dark, tag "Closed"',
      extraProps: {
        session: {
          ...demoSession,
          courseId: 'MAINTENANCE',
          courseTitle: 'Ceiling Repair Window',
          roomId: 'LH-4',
          facultySurname: 'Estate Office',
          tag: 'Closed',
        },
      },
    },
    {
      state: 'moved',
      label: 'Moved (Diff)',
      desc: 'Haritala tint, 1.5px border, tag "Moved", pulses twice',
      extraProps: {
        session: {
          ...demoSession,
          courseId: 'CS202-T2',
          courseTitle: 'Data Structures Rescheduled',
          tag: 'Moved',
        },
        isDiffPulse: true,
      },
    },
    {
      state: 'removed',
      label: 'Removed (Diff Old Slot)',
      desc: 'Dashed bad border, strikethrough text',
      extraProps: {
        session: {
          ...demoSession,
          courseId: 'CS202-OLD',
          courseTitle: 'Cancelled Slot',
          tag: 'Removed',
        },
      },
    },
    {
      state: 'violation',
      label: 'Violation',
      desc: 'Hingula red wash, 1.5px border, rule code chip',
      extraProps: {
        session: {
          ...demoSession,
          courseId: 'CS201',
          courseTitle: 'Discrete Math Clash',
          ruleCode: 'H2',
          tag: 'H2',
        },
      },
    },
  ];

  return (
    <AppShell>
      <div className="space-y-12 pb-16">
        {/* Header section */}
        <div className="border-b border-line pb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[12px] font-medium text-ink-2">Design system kit</span>
            <span className="text-line-2">&middot;</span>
            <span className="text-[12px] text-ink-2 font-mono">Chilika Operational Palette</span>
          </div>
          <h1 className="font-serif text-[40px] leading-[44px] text-ink tracking-tight mb-2">
            CIT Scheduler Design System
          </h1>
          <p className="font-serif italic text-[18px] text-ink-2 max-w-2xl leading-normal">
            A printed institute timetable redrawn as a precision operations instrument. Paper-like neutral foundation with a deliberate five-colour semantic accent system.
          </p>
        </div>

        {/* Section 1: Session Cards (The most important component) */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between border-b border-line pb-2">
            <div>
              <h2 className="font-serif text-[26px] leading-[30px] text-ink">
                1. Session Cards (11 Stroke & Fill States)
              </h2>
              <p className="text-[13px] text-ink-2 mt-0.5">
                State encoded in stroke, fill, corner tags and hatch. Colour is never the only signal. Hover darkens border; click opens Why Here drawer.
              </p>
            </div>
            <span className="text-[12px] text-ink-2 font-mono">Component: SessionCard</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sessionStates.map((item) => (
              <div
                key={item.state}
                className="p-3 bg-surface border border-line rounded-panel flex flex-col justify-between"
              >
                <div className="mb-2">
                  <div className="flex items-center justify-between text-[12px] font-medium text-ink mb-1">
                    <span>{item.label}</span>
                    <span className="text-[10px] font-mono text-ink-2 uppercase">{item.state}</span>
                  </div>
                  <p className="text-[11px] text-ink-2 leading-tight mb-3">{item.desc}</p>
                </div>
                <SessionCard
                  state={item.state}
                  onClick={() => openDrawer({ ...demoSession, ...item.extraProps?.session, state: item.state })}
                  {...item.extraProps}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Chips & Priority Ranks */}
        <section className="space-y-4">
          <div className="border-b border-line pb-2">
            <h2 className="font-serif text-[26px] leading-[30px] text-ink">
              2. Chips & Priority Ranks
            </h2>
            <p className="text-[13px] text-ink-2 mt-0.5">
              Status chips are 24px full pills. Rule codes are 2px square-cornered chips to distinguish them. Priority marks feature 6 progressive ink bars.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Chips */}
            <div className="p-5 bg-surface border border-line rounded-panel space-y-4">
              <h3 className="font-serif text-[18px] text-ink">Status Chips (Full Pill)</h3>
              <div className="flex flex-wrap gap-2.5 items-center">
                <Chip label="Approved" variant="approved" />
                <Chip label="Valid" variant="valid" />
                <Chip label="Rejected" variant="rejected" />
                <Chip label="Failed" variant="failed" />
                <Chip label="Pending" variant="pending" />
                <Chip label="Moved" variant="moved" />
                <Chip label="Cancelled" variant="cancelled" />
                <Chip label="Event" variant="event" />
                <Chip label="Neutral" variant="neutral" />
              </div>
            </div>

            {/* Rule Codes */}
            <div className="p-5 bg-surface border border-line rounded-panel space-y-4">
              <h3 className="font-serif text-[18px] text-ink">Rule Code Chips (2px Square Corners)</h3>
              <div className="flex flex-wrap gap-2 items-center">
                {['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8', 'H9', 'H10', 'H11', 'H12', 'H13', 'H14'].map((code) => (
                  <Chip key={code} label={code} isRuleCode title={`Hard Violation ${code}`} />
                ))}
                {['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map((code) => (
                  <Chip key={code} label={code} isRuleCode title={`Soft Penalty ${code}`} />
                ))}
                {['B1', 'B2', 'B3'].map((code) => (
                  <Chip key={code} label={code} isRuleCode title={`Booking Rule ${code}`} />
                ))}
              </div>
            </div>

            {/* Priority Rank Marks */}
            <div className="p-5 bg-surface border border-line rounded-panel space-y-4 md:col-span-2">
              <h3 className="font-serif text-[18px] text-ink">Priority Ladder (6 Ranks)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[1, 2, 3, 4, 5, 6].map((r) => (
                  <div key={r} className="p-2.5 bg-raised border border-line rounded-card">
                    <div className="text-[10px] text-ink-2 mb-1.5 uppercase font-medium">Rank {r}</div>
                    <PriorityRank rank={r} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Kernel Stamp & Provenance */}
        <section className="space-y-4">
          <div className="border-b border-line pb-2">
            <h2 className="font-serif text-[26px] leading-[30px] text-ink">
              3. The Kernel Stamp & AI Provenance
            </h2>
            <p className="text-[13px] text-ink-2 mt-0.5">
              The recurring motif. Bordered label with hingula double red rule. Appears on every AI draft, proposal, and proof. LLM drafts, kernel decides.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-surface border border-line rounded-panel space-y-3">
              <span className="text-[12px] font-medium text-ink">Standard Kernel Stamp</span>
              <KernelStamp />
            </div>

            <div className="p-5 bg-surface border border-line rounded-panel space-y-3">
              <span className="text-[12px] font-medium text-ink">With Provenance Line (Serif Italic)</span>
              <KernelStamp
                showProvenance
                provenance='Periods P10 to P12 inferred from "shaam 6 baje se 9 baje tak". Verified against AUD availability.'
              />
            </div>
          </div>
        </section>

        {/* Section 4: Buttons & Inputs */}
        <section className="space-y-4">
          <div className="border-b border-line pb-2">
            <h2 className="font-serif text-[26px] leading-[30px] text-ink">
              4. Buttons & Form Inputs
            </h2>
            <p className="text-[13px] text-ink-2 mt-0.5">
              Buttons name the result with plain verbs. No arrows. Inputs are raised surfaces with 1px silt-dark borders.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Buttons */}
            <div className="p-5 bg-surface border border-line rounded-panel space-y-4">
              <h3 className="font-serif text-[18px] text-ink">Button Variants</h3>
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="primary">Approve and commit</Button>
                <Button variant="secondary">Run official validator</Button>
                <Button variant="destructive">Reset demo to clean state</Button>
                <Button variant="primary" disabled>
                  Infeasible schedule
                </Button>
              </div>
            </div>

            {/* Inputs */}
            <div className="p-5 bg-surface border border-line rounded-panel space-y-3">
              <h3 className="font-serif text-[18px] text-ink">Input States</h3>
              <Input label="Venue name" placeholder="Main Auditorium (AUD)" defaultValue="Main Auditorium" />
              <Input
                label="Requested attendees"
                defaultValue="1200"
                error="No venue on campus seats 1,200. The largest is Open Air Theatre (800)."
              />
              <Input
                label="AI inferred period"
                defaultValue="P10 to P12 (18:00 - 21:00)"
                isAiGuessed
                helperText='Inferred from natural prompt "kal shaam ko". Confirm before submit.'
              />
            </div>
          </div>
        </section>

        {/* Section 5: Loading, Empty, and Error States */}
        <section className="space-y-4">
          <div className="border-b border-line pb-2">
            <h2 className="font-serif text-[26px] leading-[30px] text-ink">
              5. Required System States (Skeletons, Empty, Error)
            </h2>
            <p className="text-[13px] text-ink-2 mt-0.5">
              Every data view must provide a skeleton shaped like the final layout, an empty state (one sentence + action), and an error state (what failed, what to do).
            </p>
          </div>

          <div className="space-y-6">
            {/* Grid Skeleton */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[12px] font-medium text-ink">
                <span>Timetable Grid Skeleton (Slow 1.6s opacity pulse)</span>
                <span className="text-ink-2 font-mono">GridSkeleton</span>
              </div>
              <GridSkeleton rows={4} cols={5} />
            </div>

            {/* Row Skeleton */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[12px] font-medium text-ink">
                <span>Table Row Skeleton (Bookings / Ledger)</span>
                <span className="text-ink-2 font-mono">RowSkeleton</span>
              </div>
              <RowSkeleton rows={3} />
            </div>

            {/* Empty & Error Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-[12px] font-medium text-ink">Empty State</span>
                <EmptyState
                  message="No booking requests match the filter criteria."
                  actionLabel="Clear all filters"
                  onAction={() => alert('Filters cleared')}
                />
              </div>

              <div className="space-y-2">
                <span className="text-[12px] font-medium text-ink">Error State</span>
                <ErrorState
                  title="Solver timeout"
                  message="The solver did not respond within 30 s. The timetable was not changed. Try again or use the manual form."
                  actionLabel="Try again"
                  onAction={() => alert('Retrying solver')}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Drawer Trigger Test */}
        <section className="p-6 bg-surface border border-line rounded-panel space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-[26px] leading-[30px] text-ink">
                6. Elevated Drawer (Why Here)
              </h2>
              <p className="text-[13px] text-ink-2 mt-1">
                480px right drawer. The ONLY elevated surface with shadow and 180ms ease-out slide.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                onClick={() => openDrawer(demoSession)}
              >
                Open Why Here (CS101 in CR-01, Monday P1)
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  const rejectedBooking = BOOKINGS.find((b) => b.status === 'rejected') || BOOKINGS[3];
                  openDrawer(rejectedBooking);
                }}
              >
                Open from Rejected Booking
              </Button>
            </div>
          </div>
        </section>

        {/* Section 7: Palette Tokens Swatch Grid */}
        <section className="space-y-6">
          <div className="border-b border-line pb-2">
            <h2 className="font-serif text-[26px] leading-[30px] text-ink">
              7. Semantic Accent Palette &amp; Paper Foundations
            </h2>
            <p className="text-[13px] text-ink-2 mt-0.5">
              Five semantic accent colours mapped strictly to interaction, AI provenance, conflict, events, and validity. Paper and conch surfaces provide a quiet editorial base.
            </p>
          </div>

          {/* 5-Colour Semantic Accent System */}
          <div className="space-y-3">
            <h3 className="font-serif text-[18px] text-ink">Five Semantic Accent Tokens</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-[12px]">
              {[
                {
                  token: '--violet',
                  hex: '#7D5DFF',
                  name: 'Slate Blue / Violet',
                  role: 'Primary Interaction',
                  desc: 'Buttons, active tabs, keyboard focus, lecture indicator',
                  textColor: 'text-white',
                },
                {
                  token: '--pink',
                  hex: '#EA6DF8',
                  name: 'Violet / Pink',
                  role: 'AI Provenance',
                  desc: 'Inferred fields, natural language parsing, AI drafts',
                  textColor: 'text-ink',
                },
                {
                  token: '--coral',
                  hex: '#EF8869',
                  name: 'Coral',
                  role: 'Attention & Conflict',
                  desc: 'Hard violations H1–H14, destructive actions, >90% load',
                  textColor: 'text-ink',
                },
                {
                  token: '--yellow',
                  hex: '#FBE64D',
                  name: 'Maize Yellow',
                  role: 'Spectra Fest Events',
                  desc: 'Festival activities, evening strips P10–P13, lab pip',
                  textColor: 'text-ink',
                },
                {
                  token: '--green',
                  hex: '#63CC79',
                  name: 'Emerald Green',
                  role: 'Validity & Approval',
                  desc: 'Approved bookings, legal allocations, free venues',
                  textColor: 'text-ink',
                },
              ].map((c) => (
                <div key={c.token} className="p-3 bg-surface border border-line rounded-panel flex flex-col justify-between gap-3">
                  <div
                    className={`w-full h-14 rounded-card border border-ink/10 flex items-center justify-center font-mono text-[12px] font-semibold ${c.textColor}`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {c.hex}
                  </div>
                  <div>
                    <div className="font-semibold text-ink">{c.name}</div>
                    <div className="text-[11px] font-medium text-ink-2 font-mono mt-0.5">{c.role}</div>
                    <p className="text-[11px] text-ink-2 mt-1 leading-snug">{c.desc}</p>
                    <div className="text-[10px] text-ink-2/70 font-mono mt-1.5">{c.token}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Neutral Paper Foundations */}
          <div className="space-y-3 pt-2">
            <h3 className="font-serif text-[18px] text-ink">Neutral Paper Foundations</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-[12px]">
              {[
                { token: '--paper', hex: '#E8E6DD', name: 'Paper Background' },
                { token: '--surface', hex: '#F3F1E9', name: 'Conch Surface' },
                { token: '--raised', hex: '#F9F8F3', name: 'Raised Surface' },
                { token: '--ink', hex: '#12292B', name: 'Lagoon Ink (Primary)' },
                { token: '--ink-2', hex: '#4A5F60', name: 'Lagoon Mid (Secondary)' },
                { token: '--line', hex: '#CFCCBF', name: 'Silt Border' },
              ].map((c) => (
                <div key={c.token} className="p-2.5 bg-surface border border-line rounded-panel flex flex-col gap-2">
                  <div
                    className="w-full h-10 rounded-card border border-line-strong/30"
                    style={{ backgroundColor: `var(${c.token})` }}
                  />
                  <div>
                    <div className="font-medium text-ink truncate">{c.name}</div>
                    <div className="text-[10px] text-ink-2 font-mono">{c.token}</div>
                    <div className="text-[10px] text-ink-2 font-mono">{c.hex}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 8: Typography Scale */}
        <section className="p-6 bg-surface border border-line rounded-panel space-y-6">
          <h2 className="font-serif text-[26px] leading-[30px] text-ink border-b border-line pb-2">
            8. Typography Scale
          </h2>
          <div className="space-y-4">
            <div>
              <span className="text-[12px] font-mono text-ink-2">Hero 64 (Instrument Serif 400)</span>
              <div className="font-serif text-[64px] leading-[64px] text-ink tracking-tight mt-1">
                Every session in its place.
              </div>
            </div>

            <div>
              <span className="text-[12px] font-mono text-ink-2">Page title 40 (Instrument Serif 400)</span>
              <div className="font-serif text-[40px] leading-[44px] text-ink mt-1">
                Week 7 Academic Timetable
              </div>
            </div>

            <div>
              <span className="text-[12px] font-mono text-ink-2">Big number 56 (Instrument Serif 400)</span>
              <div className="font-serif text-[56px] leading-[56px] text-ink mt-1">
                189 <span className="text-[18px] font-ui text-ink-2">sessions</span>
              </div>
            </div>

            <div>
              <span className="text-[12px] font-mono text-ink-2">Italic aside 18 (Instrument Serif Italic 400)</span>
              <div className="font-serif italic text-[18px] leading-[24px] text-ink-2 max-w-2xl mt-1">
                &ldquo;Dr. Raman is on leave Wednesday; Physics Lab is closed Wednesday and a 3-hour lab requires periods P2 to P4 or P6 to P8.&rdquo;
              </div>
            </div>

            <div>
              <span className="text-[12px] font-mono text-ink-2">Body 14 (Inter 400, Tabular Figures)</span>
              <p className="font-ui text-[14px] leading-[22px] text-ink max-w-2xl mt-1">
                The constraint kernel validates hard and soft schedules deterministically. All periods are indexed P1 through P13 with tabular figures enabled for alignment across columns.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
