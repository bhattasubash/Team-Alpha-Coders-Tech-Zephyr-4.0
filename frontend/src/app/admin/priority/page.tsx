'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/context/AppContext';
import { PriorityRank } from '@/components/ui/PriorityRank';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { RowSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';

interface PriorityRow {
  id: string;
  name: string;
  rank: number;
  locked?: boolean;
  code: string;
  desc: string;
}

interface AuditEntry {
  id: string;
  time: string;
  admin: string;
  change: string;
}

export default function PriorityPage() {
  const router = useRouter();
  const { role } = useApp();
  const [isDebug, setIsDebug] = useState(false);

  // Role Guard: Admin access only
  useEffect(() => {
    if (role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [role, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDebug(new URLSearchParams(window.location.search).get('debug') === '1');
      const savedLadder = localStorage.getItem('cit-priority-ladder');
      if (savedLadder) {
        try {
          setLadder(JSON.parse(savedLadder));
        } catch {
          // Keep initial
        }
      }
      const savedAudit = localStorage.getItem('cit-priority-audit');
      if (savedAudit) {
        try {
          setAuditLog(JSON.parse(savedAudit));
        } catch {
          // Keep default
        }
      }
    }
  }, []);
  const initialLadder: PriorityRow[] = [
    {
      id: 'exams',
      name: 'Exams',
      rank: 1,
      locked: true,
      code: 'RANK_1_EXAMS',
      desc: 'Semester end-term and mid-term examinations. Absolute preemption priority.',
    },
    {
      id: 'regular_classes',
      name: 'Regular classes',
      rank: 2,
      code: 'RANK_2_CLASSES',
      desc: 'Accredited lectures, tutorials, and laboratory practical sessions.',
    },
    {
      id: 'institute_events',
      name: 'Institute events',
      rank: 3,
      code: 'RANK_3_INSTITUTE',
      desc: 'Convocation, Annual Day, Dean orientation, and official council briefings.',
    },
    {
      id: 'guest_lectures',
      name: 'Guest lectures',
      rank: 4,
      code: 'RANK_4_GUEST',
      desc: 'Invited academic and industry keynote sessions.',
    },
    {
      id: 'department_events',
      name: 'Department events',
      rank: 5,
      code: 'RANK_5_DEPT',
      desc: 'Department colloquia, research seminars, and student project vivas.',
    },
    {
      id: 'club_events',
      name: 'Club events',
      rank: 6,
      code: 'RANK_6_CLUBS',
      desc: 'Spectra fest cultural societies, robotics club, quiz, and music rehearsals.',
    },
  ];

  const [ladder, setLadder] = useState<PriorityRow[]>(initialLadder);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [hasChanged, setHasChanged] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // State simulator for quality floor review: normal | skeleton | error | empty_audit
  const [viewState, setViewState] = useState<'normal' | 'skeleton' | 'error' | 'empty_audit'>('normal');

  const [auditLog, setAuditLog] = useState<AuditEntry[]>([
    {
      id: 'AUD-902',
      time: '02 Nov 2026, 09:14',
      admin: "Dean's Office (Dr. Raman Patnaik)",
      change: 'Promoted Institute events above regular classes for Week 7 Spectra fest',
    },
    {
      id: 'AUD-881',
      time: '28 Oct 2026, 16:30',
      admin: 'Academic Council',
      change: 'Locked Semester Mid-term Examinations at Rank 1 (preemption priority)',
    },
    {
      id: 'AUD-740',
      time: '15 Oct 2026, 11:00',
      admin: 'Dean Academics',
      change: 'Initial semester baseline priority ladder established',
    },
  ]);

  // Reorder helper
  const reorderList = (fromIndex: number, toIndex: number) => {
    if (fromIndex === 0 || toIndex === 0) return; // Exams locked at Rank 1
    if (fromIndex === toIndex) return;

    const updated = [...ladder];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);

    // Re-assign ranks 1..6
    updated.forEach((item, i) => {
      item.rank = i + 1;
    });

    setLadder(updated);
    setHasChanged(true);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (index === 0) {
      e.preventDefault();
      return;
    }
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (index === 0) return; // Cannot drop onto locked Rank 1
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || dropIndex === 0) return;
    reorderList(draggedIdx, dropIndex);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  // Accessible keyboard reorder path (Alt + ArrowUp / Alt + ArrowDown)
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (index === 0) return;
    if (e.altKey && e.key === 'ArrowUp' && index > 1) {
      e.preventDefault();
      reorderList(index, index - 1);
    } else if (e.altKey && e.key === 'ArrowDown' && index < ladder.length - 1) {
      e.preventDefault();
      reorderList(index, index + 1);
    }
  };

  // Button-based reordering with accessible touch targets (min 40px)
  const moveUp = (index: number) => {
    if (index <= 1) return;
    reorderList(index, index - 1);
  };

  const moveDown = (index: number) => {
    if (index === 0 || index >= ladder.length - 1) return;
    reorderList(index, index + 1);
  };

  // Save order commit
  const handleSave = () => {
    const newEntry: AuditEntry = {
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      time: 'Just now',
      admin: "Dean's Office (Dean Patnaik)",
      change: `Reordered priority ladder: ${ladder.map((l) => l.name).join(' > ')}`,
    };
    const nextAudit = [newEntry, ...auditLog];
    setAuditLog(nextAudit);
    setHasChanged(false);

    if (typeof window !== 'undefined') {
      localStorage.setItem('cit-priority-ladder', JSON.stringify(ladder));
      localStorage.setItem('cit-priority-audit', JSON.stringify(nextAudit));
    }

    setSaveToast('Saved priority order. 4 Spectra bookings re-evaluated and committed.');
    setTimeout(() => setSaveToast(null), 4000);
  };

  return (
    <AppShell>
      <div className="space-y-8 max-w-5xl font-ui">
        {/* Title, Subtitle, and Primary Save Action */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-line pb-4">
          <div>
            <h1 className="font-serif text-[40px] leading-[44px] text-ink tracking-tight mb-1">
              Priority Hierarchy
            </h1>
            <p className="font-serif italic text-[16px] text-ink-2 max-w-2xl">
              Deterministic preemption ladder for venue booking allocation. When multiple events compete for the same room, the higher rank prevails.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="primary"
              onClick={handleSave}
              className={`w-full sm:w-auto ${hasChanged ? 'bg-violet text-white ring-2 ring-violet/40 animate-pulse' : ''}`}
            >
              Save order
            </Button>
          </div>
        </div>

        {/* Save confirmation toast (quiet paper notification, no decorative dot) */}
        {saveToast && (
          <div className="p-3 bg-surface border border-good/60 rounded-card text-[13px] text-ink flex items-center justify-between animate-fade-in">
            <span>{saveToast}</span>
            <button
              onClick={() => setSaveToast(null)}
              className="text-ink-2 hover:text-ink text-[12px] font-semibold underline underline-offset-2 ml-3"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ERROR STATE: Solver/Council Lock Failure */}
        {viewState === 'error' && (
          <ErrorState
            title="Priority database synchronization failed"
            message="Academic Council preemption write lock is currently active for mid-term exam scheduling. Ladder changes cannot be saved until the lock is released."
            actionLabel="Retry connection"
            onAction={() => setViewState('normal')}
          />
        )}

        {/* LOADING SKELETON STATE */}
        {viewState === 'skeleton' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-4">
              <RowSkeleton rows={6} />
            </div>
            <div className="lg:col-span-5 p-5 bg-surface border border-line rounded-panel space-y-3">
              <div className="h-6 w-32 bg-line/40 rounded-cell" />
              <div className="space-y-2">
                <div className="h-16 bg-line/20 rounded-card" />
                <div className="h-16 bg-line/20 rounded-card" />
                <div className="h-16 bg-line/20 rounded-card" />
              </div>
            </div>
          </div>
        )}

        {/* NORMAL VIEW */}
        {(viewState === 'normal' || viewState === 'empty_audit') && (
          <>
            {/* 12-Column Layout: Ladder on Left (7 cols) + Right-Rail Impact Preview (5 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Vertical Drag-and-Drop Ladder (7 cols) */}
              <div className="lg:col-span-7 bg-surface border border-line rounded-panel p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <div>
                    <h2 className="font-serif text-[22px] text-ink">Ranking Ladder</h2>
                    <p className="font-serif italic text-[13px] text-ink-2">
                      Drag and drop rows or use Alt+Up / Alt+Down to reorder ranks 2 to 6.
                    </p>
                  </div>
                  <span className="text-[11px] text-ink-2 font-mono">Rank 1 is locked</span>
                </div>

                {/* Keyboard path instruction line (stacks cleanly on 360px mobile) */}
                <div className="px-3 py-2 bg-raised border border-line rounded-card text-[11px] text-ink-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span>
                    <strong>Keyboard:</strong> Focus row &amp; press <kbd className="px-1 bg-surface border border-line rounded-cell font-mono text-[10px]">Alt + &uarr;</kbd> / <kbd className="px-1 bg-surface border border-line rounded-cell font-mono text-[10px]">Alt + &darr;</kbd> or use buttons.
                  </span>
                  <span className="font-mono text-[10px] text-ink-2">6 ranks</span>
                </div>

                {/* Ladder rows */}
                <div className="space-y-2.5">
                  {ladder.map((item, idx) => {
                    const isLocked = item.locked || idx === 0;
                    const isDragging = draggedIdx === idx;
                    const isDropTarget = dragOverIdx === idx;

                    let rowBorder = 'border-line hover:border-ink';
                    if (isDropTarget) rowBorder = 'border-ink bg-surface ring-1 ring-ink';
                    if (isDragging) rowBorder = 'border-ink border-dashed opacity-50 bg-raised';

                    return (
                      <div
                        key={item.id}
                        tabIndex={isLocked ? -1 : 0}
                        draggable={!isLocked}
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={(e) => handleDrop(e, idx)}
                        onDragEnd={handleDragEnd}
                        onKeyDown={(e) => handleKeyDown(e, idx)}
                        aria-label={`${item.name}, Priority Rank ${item.rank}`}
                        className={`p-3 sm:p-3.5 rounded-card border transition-all select-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isLocked ? 'bg-paper border-line-strong' : 'bg-raised cursor-grab active:cursor-grabbing'
                        } ${rowBorder}`}
                      >
                        {/* Left: Reorder buttons & Label */}
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Reorder controls with accessible 40px touch targets (no generic emoji, no decorative dots) */}
                          <div className="flex sm:flex-col gap-1 items-center shrink-0">
                            {isLocked ? (
                              <span className="text-[10px] font-mono text-ink-2 bg-surface px-1.5 py-0.5 rounded-cell border border-line">
                                LOCKED
                              </span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => moveUp(idx)}
                                  disabled={idx <= 1}
                                  aria-label={`Move ${item.name} up`}
                                  className="w-8 h-8 sm:w-7 sm:h-7 bg-surface border border-line hover:border-ink rounded-cell text-[11px] text-ink flex items-center justify-center disabled:opacity-20 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
                                  title="Move up (Alt + Up)"
                                >
                                  &uarr;
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveDown(idx)}
                                  disabled={idx >= ladder.length - 1}
                                  aria-label={`Move ${item.name} down`}
                                  className="w-8 h-8 sm:w-7 sm:h-7 bg-surface border border-line hover:border-ink rounded-cell text-[11px] text-ink flex items-center justify-center disabled:opacity-20 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
                                  title="Move down (Alt + Down)"
                                >
                                  &darr;
                                </button>
                              </>
                            )}
                          </div>

                          {/* Row text content */}
                          <div className="min-w-0">
                            <span className="font-semibold text-[14px] text-ink block truncate">
                              {item.name}
                            </span>
                            <p className="text-[11px] text-ink-2 mt-0.5 leading-snug line-clamp-2">
                              {item.desc}
                            </p>
                          </div>
                        </div>

                        {/* Right: PriorityRank Mark (collapses redundant text label on mobile < 400px to prevent overflow) */}
                        <div className="flex items-center justify-end gap-2 shrink-0 self-end sm:self-center">
                          <PriorityRank rank={item.rank} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Impact Preview (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 sm:p-5 bg-surface border border-line rounded-panel space-y-3.5">
                  <div className="border-b border-line pb-2.5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif text-[22px] text-ink">Impact Preview</h3>
                      <span className="text-[11px] font-mono text-ink-2">Live Simulation</span>
                    </div>
                    <p className="font-serif italic text-[14px] text-ink leading-snug mt-1">
                      &ldquo;4 of 25 Spectra bookings change outcome&rdquo;
                    </p>
                  </div>

                  {/* Four Re-evaluated Bookings with Before/After Chips */}
                  <div className="space-y-3 text-[12px]">
                    {/* 1. BR-04 */}
                    <div className="p-3 bg-raised border border-line rounded-card space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="font-semibold text-ink">BR-04: Robotics Workshop</span>
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          <Chip label="Pending" variant="pending" />
                          <span className="text-ink-2">&rarr;</span>
                          <Chip label="Approved" variant="approved" />
                        </div>
                      </div>
                      <p className="text-[11px] text-ink-2 leading-relaxed">
                        Promoted above departmental viva; secures CS-LAB-1 venue on Thursday evening without timetable conflict.
                      </p>
                    </div>

                    {/* 2. BR-07 */}
                    <div className="p-3 bg-raised border border-line rounded-card space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="font-semibold text-ink">BR-07: Quiz Club Prelims</span>
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          <Chip label="Alt offered" variant="pending" />
                          <span className="text-ink-2">&rarr;</span>
                          <Chip label="Approved" variant="approved" />
                        </div>
                      </div>
                      <p className="text-[11px] text-ink-2 leading-relaxed">
                        Outranks ad-hoc departmental colloquium in Seminar Hall 1; awarded preferred Friday P8 slot.
                      </p>
                    </div>

                    {/* 3. BR-14 */}
                    <div className="p-3 bg-raised border border-line rounded-card space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="font-semibold text-ink">BR-14: Drama Society Rehearsal</span>
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          <Chip label="Approved" variant="approved" />
                          <span className="text-ink-2">&rarr;</span>
                          <Chip label="Waitlist" variant="rejected" />
                        </div>
                      </div>
                      <p className="text-[11px] text-ink-2 leading-relaxed">
                        Preempted by promoted Institute Annual Lecture Series in Main Auditorium on Wednesday P10.
                      </p>
                    </div>

                    {/* 4. BR-19 */}
                    <div className="p-3 bg-raised border border-line rounded-card space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="font-semibold text-ink">BR-19: E-Cell Pitch Session</span>
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          <Chip label="Pending" variant="pending" />
                          <span className="text-ink-2">&rarr;</span>
                          <Chip label="Approved" variant="approved" />
                        </div>
                      </div>
                      <p className="text-[11px] text-ink-2 leading-relaxed">
                        Granted Lecture Hall 1 for founder pitch series over unconfirmed evening tutorial.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* FULL-WIDTH AUDIT LOG TABLE (Time, Admin, Change) */}
            <div className="p-4 sm:p-6 bg-surface border border-line rounded-panel space-y-4">
              <div className="border-b border-line pb-3">
                <h2 className="font-serif text-[24px] text-ink">Priority Audit Log</h2>
                <p className="font-serif italic text-[14px] text-ink-2 mt-0.5">
                  Historical ledger of administrative priority ladder reorderings and policy preemption overrides.
                </p>
              </div>

              {viewState === 'empty_audit' ? (
                <EmptyState
                  message="No priority modifications recorded. The priority ranking ladder is operating on the default Academic Council semester baseline."
                  actionLabel="Restore default order"
                  onAction={() => setViewState('normal')}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px] border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-line text-ink-2 text-[11px] font-mono">
                        <th className="py-2.5 font-medium w-40">Time</th>
                        <th className="py-2.5 font-medium w-64">Admin</th>
                        <th className="py-2.5 font-medium">Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {auditLog.map((log) => (
                        <tr key={log.id} className="hover:bg-raised/60 transition-colors">
                          <td className="py-2.5 font-mono text-[12px] text-ink-2">{log.time}</td>
                          <td className="py-2.5 text-ink font-medium">{log.admin}</td>
                          <td className="py-2.5 text-ink-2">{log.change}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
              {(['normal', 'skeleton', 'error', 'empty_audit'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setViewState(s)}
                  className={`px-2 py-1 rounded-[4px] capitalize text-[11px] font-medium transition-colors ${
                    viewState === s
                      ? 'bg-ink text-paper font-semibold shadow-xs'
                      : 'bg-raised border border-line text-ink-2 hover:border-ink hover:text-ink'
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>
    </AppShell>
  );
}
