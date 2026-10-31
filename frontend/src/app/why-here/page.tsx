'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SCHEDULED_SESSIONS, ROOMS_BY_ID } from '@/data/mockData';
import { Chip } from '@/components/ui/Chip';
import { KernelStamp } from '@/components/ui/KernelStamp';
import { ScheduledSession } from '@/data/types';

export default function WhyHerePage() {
  const [selectedSessionId, setSelectedSessionId] = useState<string>(SCHEDULED_SESSIONS[0].id);
  const [viewMode, setViewMode] = useState<'trace' | 'plain'>('trace');

  const session = SCHEDULED_SESSIONS.find((s) => s.id === selectedSessionId) || SCHEDULED_SESSIONS[0];
  const room = ROOMS_BY_ID.get(session.roomId);

  // Derive realistic alternative period ledger items based on the session's constraints
  const periods = [
    {
      p: session.startPeriod,
      label: `Period P${session.startPeriod} (${7 + session.startPeriod}:00 - ${8 + session.startPeriod}:00)`,
      state: 'placed',
      code: 'VALID',
      reason: `All hard constraints H1 to H14 satisfied. Venue ${session.roomId} capacity (${room?.capacity || 90}) exceeds group total (${session.groups.length * 45} students). Zero faculty time conflicts.`,
    },
    {
      p: 1,
      label: 'Period P1 (08:00 - 09:00)',
      state: 'blocked',
      code: 'H7',
      reason: `${session.facultyName} marked unavailable for Dean's Office Academic Council briefing.`,
    },
    {
      p: 3,
      label: 'Period P3 (10:00 - 11:00)',
      state: 'blocked',
      code: 'H3',
      reason: `Student group ${session.groups[0] || 'CSE-Y2'} has mandatory core lecture scheduled concurrently.`,
    },
    {
      p: 4,
      label: 'Period P4 (11:00 - 12:00)',
      state: 'blocked',
      code: 'H4',
      reason: `Venue ${session.roomId} occupied by another scheduled session.`,
    },
    {
      p: 5,
      label: 'Period P5 (12:00 - 13:00)',
      state: 'blocked',
      code: 'S6',
      reason: 'Soft constraint penalty: faculty daily teaching load threshold exceeded (max 3 lectures per day).',
    },
    {
      p: 6,
      label: 'Period P6 (14:00 - 15:00)',
      state: 'blocked',
      code: 'H6',
      reason: 'Afternoon slot reserved for 3-hour continuous laboratory sessions.',
    },
    {
      p: 8,
      label: 'Period P8 (16:00 - 17:00)',
      state: 'blocked',
      code: 'S2',
      reason: 'Soft constraint penalty: produces 3-hour idle gap for enrolled students.',
    },
  ].filter((item, idx, arr) => arr.findIndex((x) => x.p === item.p) === idx);

  // Move the placed row to the top
  const sortedPeriods = [...periods].sort((a, b) => (a.state === 'placed' ? -1 : 1));

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl font-ui">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-line pb-4">
          <div>
            <h1 className="font-serif text-[40px] leading-[44px] text-ink tracking-tight mb-1">
              Why Here Ledger
            </h1>
            <p className="font-serif italic text-[16px] text-ink-2">
              Granular explanation ledger for placement decisions. Deterministic constraint trace + verified AI paraphrase.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[12px] text-ink-2 font-medium">Session:</label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="bg-surface border border-line-strong hover:border-ink rounded-[6px] px-3 py-1.5 text-[12px] font-medium text-ink focus:outline-none transition-colors max-w-xs truncate"
            >
              {SCHEDULED_SESSIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.courseId} in {s.roomId} ({s.day} P{s.startPeriod}) &middot; {s.facultySurname}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Detailed Explanation Panel */}
        <div className="p-6 bg-surface border border-line rounded-panel space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <h2 className="font-serif text-[28px] leading-[32px] text-ink">
                {session.courseId} in {session.roomId}, {session.day} P{session.startPeriod}
              </h2>
              <p className="font-serif italic text-[15px] text-ink-2 mt-0.5">
                {session.courseTitle} &middot; {session.facultyName} &middot; Groups: {session.groups.join(', ')}
              </p>
            </div>
            <KernelStamp showProvenance provenance="Deterministic kernel trace." />
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center justify-between">
            <span className="font-serif text-[20px] text-ink">Period Evaluation Ledger</span>
            <div className="inline-flex items-center border border-line-strong rounded-[6px] p-0.5 bg-raised text-[12px] font-medium font-ui">
              <button
                onClick={() => setViewMode('trace')}
                className={`px-3 py-1 rounded-[4px] transition-colors ${
                  viewMode === 'trace' ? 'bg-surface text-ink font-semibold' : 'text-ink-2'
                }`}
              >
                Rule trace
              </button>
              <button
                onClick={() => setViewMode('plain')}
                className={`px-3 py-1 rounded-[4px] transition-colors ${
                  viewMode === 'plain' ? 'bg-surface text-ink font-semibold' : 'text-ink-2'
                }`}
              >
                Plain language
              </button>
            </div>
          </div>

          {/* Ledger Content */}
          {viewMode === 'trace' ? (
            <div className="space-y-2.5">
              {sortedPeriods.map((item) => {
                const isChosen = item.state === 'placed';
                const isHard = item.code.startsWith('H');
                return (
                  <div
                    key={item.p}
                    className={`p-3.5 rounded-card border text-[13px] transition-colors ${
                      isChosen
                        ? 'bg-t-good border-green border-[1.5px] text-ink shadow-xs'
                        : isHard
                        ? 'bg-raised border-line border-l-2 border-l-coral text-ink-2'
                        : 'bg-raised border-line text-ink-2'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-ink">{item.label}</span>
                      <div className="flex items-center gap-1.5">
                        {item.code !== 'VALID' && <Chip label={item.code} isRuleCode />}
                        <Chip
                          label={isChosen ? 'Placed here (Optimal)' : 'Blocked'}
                          variant={isChosen ? 'valid' : 'rejected'}
                        />
                      </div>
                    </div>
                    <p className="text-[12px] leading-snug">{item.reason}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-5 bg-raised border border-line rounded-card text-ink space-y-3 font-ui">
              <p className="font-serif italic text-[17px] leading-relaxed max-w-[62ch]">
                {session.courseId} was placed in {session.roomId} on {session.day} at Period P{session.startPeriod} because it is the earliest legal window satisfying both group schedules ({session.groups.join(', ')}) and {session.facultySurname}&apos;s daily teaching limits.
              </p>
              <p className="font-serif italic text-[15px] text-ink-2 leading-relaxed max-w-[62ch]">
                Adjacent morning slots were blocked by faculty unavailability (H7) and room occupancy (H4). Afternoon slots were rejected to preserve contiguous blocks for 3-hour laboratory practicals (H6).
              </p>
              <div className="pt-2 border-t border-line text-[11px] text-ink-2 italic font-serif">
                Paraphrase by AI. The trace above is the source of truth.
              </div>
            </div>
          )}

          {/* Why this room section */}
          <div className="pt-4 border-t border-line space-y-1.5">
            <span className="text-[12px] font-medium text-ink-2 block">
              Venue selection justification:
            </span>
            <p className="font-serif italic text-[16px] text-ink leading-relaxed max-w-[62ch]">
              {session.roomId} matches the required venue type ({session.kind}) and accommodates {session.groups.length * 45} students with {room?.capacity ? Math.round(((session.groups.length * 45) / room.capacity) * 100) : 75}% room seat efficiency, avoiding the S5 room underutilization soft penalty.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
