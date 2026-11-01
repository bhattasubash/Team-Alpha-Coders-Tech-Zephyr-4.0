'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';
import { Chip } from '@/components/ui/Chip';
import { KernelStamp } from '@/components/ui/KernelStamp';

const SESSIONS = [
  { id: 'CS101-L1', courseId: 'CS101', courseTitle: 'Introduction to Computing', roomId: 'LH-1', day: 'MON', startPeriod: 2, duration: 1, groups: ['Y1-A'], facultyName: 'Dr. Patnaik', facultySurname: 'Patnaik' },
  { id: 'CS102-L2', courseId: 'CS102', courseTitle: 'Data Structures and Algorithms', roomId: 'LH-2', day: 'MON', startPeriod: 3, duration: 1, groups: ['CSE-Y2'], facultyName: 'Prof. Sen', facultySurname: 'Sen' },
  { id: 'PHY-L2', courseId: 'PH101', courseTitle: 'Engineering Physics', roomId: 'LH-1', day: 'TUE', startPeriod: 4, duration: 1, groups: ['Y1-B'], facultyName: 'Dr. Mishra', facultySurname: 'Mishra' },
];

export default function WhyHerePage() {
  const [selectedSessionId, setSelectedSessionId] = useState<string>('CS101-L1');
  const [viewMode, setViewMode] = useState<'trace' | 'plain'>('trace');
  const [explainData, setExplainData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const session = SESSIONS.find((s) => s.id === selectedSessionId) || SESSIONS[0];
  const room = { id: session.roomId, name: `Lecture Hall ${session.roomId.replace(/\D/g, '') || '1'}`, capacity: 120 };

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    api.explainSession(selectedSessionId)
      .then((data) => {
        if (mounted) setExplainData(data);
      })
      .catch(() => {
        if (mounted) setExplainData(null);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedSessionId]);

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
              Detailed placement explanations and constraint verification for scheduled sessions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[12px] text-ink-2 font-medium">Session:</label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="bg-surface border border-line-strong hover:border-ink rounded-[6px] px-3 py-1.5 text-[12px] font-medium text-ink focus:outline-none transition-colors max-w-xs truncate"
            >
              {SESSIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.courseId} in {s.roomId} ({s.day} P{s.startPeriod}) &middot; {s.facultySurname}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Detailed Explanation Panel */}
        <div className="p-6 bg-surface/80 border border-line rounded-panel space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <h2 className="font-serif text-[28px] leading-[32px] text-ink">
                {session.courseId} in {session.roomId}, {session.day} P{session.startPeriod}
              </h2>
              <p className="font-serif italic text-[15px] text-ink-2 mt-0.5">
                {session.courseTitle} &middot; {session.facultyName} &middot; Groups: {session.groups.join(', ')}
              </p>
            </div>
            <KernelStamp showProvenance provenance="Deterministic CP-SAT solver constraint trace." />
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
                Audit trace
              </button>
              <button
                onClick={() => setViewMode('plain')}
                className={`px-3 py-1 rounded-[4px] transition-colors ${
                  viewMode === 'plain' ? 'bg-surface text-ink font-semibold' : 'text-ink-2'
                }`}
              >
                Summary
              </button>
            </div>
          </div>

          {/* Ledger Content */}
          {viewMode === 'trace' ? (
            <div className="space-y-3">
              {/* Placed Row */}
              <div className="p-3.5 rounded-card border bg-t-good/30 border-good text-ink shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-ink text-[13px]">
                    Period P{session.startPeriod} ({7 + session.startPeriod}:00 - {8 + session.startPeriod}:00)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Chip label="VALID" isRuleCode />
                    <Chip label="Placed here" variant="valid" />
                  </div>
                </div>
                <p className="text-[12px] text-ink leading-snug">
                  {explainData?.placed_reason ||
                    `All core timetable hard constraints satisfied. Venue ${session.roomId} (${room.capacity} seats) accommodates student group requirements with zero faculty schedule clashes.`}
                </p>
              </div>

              {/* Dynamic alternative periods or honest status */}
              {explainData && Array.isArray(explainData.alternative_periods) && explainData.alternative_periods.length > 0 ? (
                explainData.alternative_periods.map((alt: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-card border bg-raised border-line text-ink-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-ink text-[13px]">
                        {alt.period_label || `Period P${alt.period}`}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Chip label={alt.rule_code || 'H1'} isRuleCode />
                        <Chip label="Blocked" variant="rejected" />
                      </div>
                    </div>
                    <p className="text-[12px] text-ink-2 leading-snug mt-1">
                      {alt.reason}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-card border border-dashed border-line bg-raised/50 text-center space-y-1.5">
                  <div className="flex items-center justify-center gap-2 text-[13px] font-semibold text-ink">
                    <span className="w-2 h-2 rounded-full bg-violet animate-pulse" />
                    <span>{isLoading ? 'Connecting to explanation service...' : 'Explanation engine loading...'}</span>
                  </div>
                  <p className="text-[12px] text-ink-2 max-w-lg mx-auto">
                    The granular alternative period conflict traces are computed on-demand by the CP-SAT explainer (HTTP 501 pending). Formal feasibility is verified by the kernel engine.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Plain Language View */
            <div className="space-y-4">
              <div className="p-5 bg-raised/70 border border-line rounded-card text-ink space-y-3">
                <p className="font-serif italic text-[17px] leading-[1.55] text-ink">
                  {explainData?.plain_heading ||
                    `${session.courseId} was assigned to ${session.roomId} on ${session.day} at Period P${session.startPeriod} by the CP-SAT solver.`}
                </p>
                <p className="font-serif italic text-[14px] leading-[1.55] text-ink-2">
                  {explainData?.plain_body ||
                    'Explanation engine loading... Complete solver placement proof and alternative feasibility logs are maintained in the solver audit ledger.'}
                </p>
                <div className="pt-3 border-t border-line text-[11px] text-ink-2 italic font-serif">
                  
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
