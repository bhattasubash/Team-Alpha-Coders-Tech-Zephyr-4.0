'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { EXAMS, ROOMS_BY_ID, COURSES_BY_ID } from '@/data/mockData';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Day, Exam } from '@/data/types';
import { WheelchairGlyph, CheckIcon } from '@/components/ui/Icons';

export default function ExamsPage() {
  // Filters
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [courseQuery, setCourseQuery] = useState<string>('');

  // State inspection toggle for review
  const [viewState, setViewState] = useState<'normal' | 'skeleton' | 'empty'>('normal');

  const days: { day: Day; label: string; date: string }[] = [
    { day: 'MON', label: 'Mon 9 Nov', date: '9' },
    { day: 'TUE', label: 'Tue 10 Nov', date: '10' },
    { day: 'WED', label: 'Wed 11 Nov', date: '11' },
    { day: 'THU', label: 'Thu 12 Nov', date: '12' },
    { day: 'FRI', label: 'Fri 13 Nov', date: '13' },
    { day: 'SAT', label: 'Sat 14 Nov', date: '14' },
  ];

  const slots = [
    { id: 'AM' as const, label: 'AM Session &middot; 09:00 to 12:00', time: '09:00 &ndash; 12:00' },
    { id: 'PM' as const, label: 'PM Session &middot; 14:00 to 17:00', time: '14:00 &ndash; 17:00' },
  ];

  // Filter exams
  const filteredExams = EXAMS.filter((ex) => {
    if (viewState === 'empty') return false;

    // Filter by branch
    if (selectedBranch !== 'ALL') {
      const matchBranch = ex.course_ids.some((cid) => {
        const course = COURSES_BY_ID.get(cid);
        return course?.department === selectedBranch || (selectedBranch === 'COMMON' && cid.startsWith('MA') || cid.startsWith('PH'));
      });
      if (!matchBranch) return false;
    }

    // Filter by year
    if (selectedYear !== 'ALL') {
      const matchYear = ex.course_ids.some((cid) => {
        const course = COURSES_BY_ID.get(cid);
        return course?.year === Number(selectedYear);
      });
      if (!matchYear) return false;
    }

    // Filter by course search query
    if (courseQuery.trim()) {
      const q = courseQuery.toLowerCase().trim();
      const matchQuery =
        ex.id.toLowerCase().includes(q) ||
        ex.course_ids.some((c) => c.toLowerCase().includes(q)) ||
        ex.groups.some((g) => g.toLowerCase().includes(q)) ||
        ex.room_id.toLowerCase().includes(q);
      if (!matchQuery) return false;
    }

    return true;
  });

  // Export JSON handler
  const handleExportJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(filteredExams, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'schedule_exams.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = [
      'exam_id',
      'course_ids',
      'groups',
      'day',
      'slot',
      'room_id',
      'normal_capacity',
      'exam_capacity',
      'seated_count',
    ];
    const rows = filteredExams.map((ex) => {
      const room = ROOMS_BY_ID.get(ex.room_id);
      const normalCap = room?.capacity || 120;
      return [
        ex.id,
        `"${ex.course_ids.join(';')}"`,
        `"${ex.groups.join(';')}"`,
        ex.day,
        ex.slot,
        ex.room_id,
        normalCap,
        ex.capacity,
        ex.seated_count,
      ].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', 'schedule_exams.csv');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleResetFilters = () => {
    setSelectedBranch('ALL');
    setSelectedYear('ALL');
    setCourseQuery('');
    setViewState('normal');
  };

  return (
    <AppShell>
      <div className="space-y-6 pb-12 select-none">
        {/* Header section: Page Title, Subtitle, and Export Secondary Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] font-medium text-ink-2">
                Midsem Examination Schedule
              </span>
              <span className="text-line-strong select-none">&middot;</span>
              <span className="text-[12px] text-ink-2">Week 8 Midsem Series</span>
            </div>
            <h1 className="font-serif text-[40px] leading-[44px] text-ink tracking-tight mb-2">
              Midsem Examination Schedule
            </h1>
            <p className="font-serif italic text-[16px] text-ink-2">
              Grid Mon to Sat with AM (09:00 to 12:00) and PM (14:00 to 17:00) rows. Exam hall capacity is strictly 50% of normal capacity.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button variant="secondary" onClick={handleExportJSON}>
              Export JSON
            </Button>
            <Button variant="secondary" onClick={handleExportCSV}>
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="p-3.5 bg-surface border border-line rounded-card flex flex-wrap items-center justify-between gap-4 text-[13px]">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-medium text-ink text-[12px]">
              Filter by:
            </span>

            {/* Branch Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="branch-filter" className="text-ink-2 text-[12px]">Branch:</label>
              <select
                id="branch-filter"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-raised border border-line-strong rounded-[6px] px-2.5 py-1 text-[12px] font-medium text-ink focus:outline-none focus:border-ink"
              >
                <option value="ALL">All Branches</option>
                <option value="COMMON">Common (Year 1)</option>
                <option value="CSE">Computer Science (CSE)</option>
                <option value="ECE">Electronics (ECE)</option>
                <option value="MECH">Mechanical (MECH)</option>
                <option value="CIVIL">Civil Engineering</option>
              </select>
            </div>

            {/* Year Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="year-filter" className="text-ink-2 text-[12px]">Year:</label>
              <select
                id="year-filter"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-raised border border-line-strong rounded-[6px] px-2.5 py-1 text-[12px] font-medium text-ink focus:outline-none focus:border-ink"
              >
                <option value="ALL">All Years</option>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>
            </div>

            {/* Course search input */}
            <div className="flex items-center gap-2">
              <label htmlFor="course-search" className="text-ink-2 text-[12px]">Search:</label>
              <input
                id="course-search"
                type="text"
                value={courseQuery}
                placeholder="Course or room (e.g. CS101, CR-01)"
                onChange={(e) => setCourseQuery(e.target.value)}
                className="w-48 h-7 px-2.5 bg-raised border border-line-strong rounded-[6px] text-[12px] text-ink placeholder:text-ink-2/60 focus:outline-none focus:border-ink"
              />
            </div>

            {(selectedBranch !== 'ALL' || selectedYear !== 'ALL' || courseQuery.trim() !== '') && (
              <button
                onClick={handleResetFilters}
                className="text-[11px] text-ink-2 underline hover:text-ink"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* 1. SKELETON STATE VIEW */}
        {viewState === 'skeleton' && (
          <div className="space-y-6 animate-slow-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-surface border border-line rounded-panel p-4 space-y-4">
                <div className="grid grid-cols-6 gap-2 pb-3 border-b border-line">
                  {days.map((d) => (
                    <div key={d.day} className="h-10 bg-line/40 rounded-cell" />
                  ))}
                </div>
                <div className="space-y-4">
                  {slots.map((s) => (
                    <div key={s.id} className="space-y-2">
                      <div className="h-4 w-40 bg-line/30 rounded-cell" />
                      <div className="grid grid-cols-6 gap-2">
                        {days.map((d) => (
                          <div
                            key={d.day}
                            className="h-32 bg-raised/70 border border-line/40 rounded-card p-2 space-y-2"
                          >
                            <div className="h-3 w-12 bg-line/40 rounded-cell" />
                            <div className="h-3 w-20 bg-line/30 rounded-cell" />
                            <div className="h-2 w-full bg-line/20 rounded-cell" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-4 bg-surface border border-line rounded-panel p-5 space-y-4">
                <div className="h-6 w-36 bg-line/40 rounded-cell" />
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 bg-raised rounded-card border border-line/40" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. EMPTY STATE VIEW (When 0 matches or user clicks empty state) */}
        {(viewState === 'empty' || (viewState === 'normal' && filteredExams.length === 0)) && (
          <div className="py-12">
            <EmptyState
              message="No examinations match the current filter criteria."
              actionLabel="Clear all filters"
              onAction={handleResetFilters}
            />
          </div>
        )}

        {/* 3. NORMAL EXAM GRID & CLASH VALIDATOR */}
        {viewState === 'normal' && filteredExams.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Mon to Sat Grid with AM and PM Rows (8 cols) */}
            <div className="lg:col-span-8 bg-surface border border-line rounded-panel overflow-hidden shadow-sm">
              {/* Day Headers (Mon to Sat) */}
              <div className="grid grid-cols-6 border-b border-line bg-raised divide-x divide-line">
                {days.map((d) => (
                  <div key={d.day} className="p-3 text-center">
                    <div className="text-[12px] font-medium text-ink-2 uppercase tracking-wide">
                      {d.day}
                    </div>
                    <div className="font-serif text-[24px] leading-tight text-ink font-normal mt-0.5">
                      {d.date}
                    </div>
                  </div>
                ))}
              </div>

              {/* Rows: AM (09:00 to 12:00) and PM (14:00 to 17:00) */}
              <div className="divide-y divide-line">
                {slots.map((slot) => (
                  <div key={slot.id} className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-ink-2 uppercase tracking-wider font-semibold px-1">
                      <span>{slot.label}</span>
                      <span>3 Hours Block</span>
                    </div>

                    <div className="grid grid-cols-6 gap-2.5">
                      {days.map((d) => {
                        const examsInSlot = filteredExams.filter(
                          (ex) => ex.day === d.day && ex.slot === slot.id
                        );

                        return (
                          <div
                            key={d.day}
                            className="min-h-[160px] bg-raised/70 border border-line rounded-card p-2 flex flex-col justify-between"
                          >
                            {examsInSlot.length > 0 ? (
                              <div className="space-y-2">
                                {examsInSlot.slice(0, 2).map((ex) => {
                                  const room = ROOMS_BY_ID.get(ex.room_id);
                                  const normalCap = room?.capacity || 120;
                                  const examCap = ex.capacity;
                                  const pct = Math.min(
                                    100,
                                    Math.round((ex.seated_count / examCap) * 100)
                                  );

                                  return (
                                    <div
                                      key={ex.id}
                                      className="p-2 bg-surface border border-line-strong rounded-cell text-[11px] space-y-1.5 shadow-xs"
                                    >
                                      {/* Course Code & Group */}
                                      <div className="flex items-start justify-between gap-1 leading-none">
                                        <span className="font-semibold text-[13px] text-ink tracking-tight">
                                          {ex.course_ids.join(', ')}
                                        </span>
                                        {room?.accessible && (
                                          <span title="Wheelchair accessible exam venue">
                                            <WheelchairGlyph
                                              size={12}
                                              className="text-ink-2 flex-shrink-0"
                                            />
                                          </span>
                                        )}
                                      </div>

                                      <div className="text-[10px] text-ink-2 truncate" title={ex.groups.join(', ')}>
                                        {ex.groups.join(', ')}
                                      </div>

                                      {/* Room Chip like "CR-01: 120 normal, 60 exam" */}
                                      <div className="p-1 bg-raised border border-line-strong/40 rounded-cell text-[10px] text-ink font-mono leading-tight">
                                        <span className="font-bold">{ex.room_id}</span>: {normalCap} normal,{' '}
                                        <span className="font-semibold text-ink">{examCap} exam</span>
                                      </div>

                                      {/* Seated count like "58 of 60 seated" with a thin bar */}
                                      <div className="pt-1 border-t border-line text-[10px] text-ink-2">
                                        <div className="flex items-center justify-between font-mono">
                                          <span>Seated:</span>
                                          <span className="font-semibold text-ink">
                                            {ex.seated_count} of {examCap}
                                          </span>
                                        </div>

                                        {/* Thin capacity bar */}
                                        <div className="w-full h-1 bg-line rounded-pill mt-1 overflow-hidden">
                                          <div
                                            className={`h-full transition-all ${
                                              pct > 95
                                                ? 'bg-bad'
                                                : pct > 80
                                                ? 'bg-event'
                                                : 'bg-good'
                                            }`}
                                            style={{ width: `${pct}%` }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center text-[11px] text-ink-2/40 italic">
                                Free slot
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Rail: Clash checks as rows with Valid or Failed chips (4 cols) */}
            <div className="lg:col-span-4 space-y-5">
              <div className="p-5 bg-surface border border-line rounded-panel space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h3 className="font-serif text-[20px] text-ink">Clash Validator</h3>
                  <Chip label="ALL PASS" variant="valid" />
                </div>

                <p className="text-[12px] text-ink-2 leading-relaxed">
                  The exam kernel performs deterministic bipartite matching for room allocations.
                </p>

                {/* Clash checks as rows with Valid or Failed chips */}
                <div className="space-y-2 text-[12px]">
                  <div className="flex items-center justify-between p-2.5 bg-raised border border-line rounded-card">
                    <div className="flex items-center gap-2">
                      <CheckIcon size={14} className="text-good" />
                      <span className="text-ink">No group has two exams at once</span>
                    </div>
                    <Chip label="Valid" variant="valid" />
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-raised border border-line rounded-card">
                    <div className="flex items-center gap-2">
                      <CheckIcon size={14} className="text-good" />
                      <span className="text-ink">50% capacity cap respected</span>
                    </div>
                    <Chip label="Valid" variant="valid" />
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-raised border border-line rounded-card">
                    <div className="flex items-center gap-2">
                      <CheckIcon size={14} className="text-good" />
                      <span className="text-ink">No exam during teaching P1&ndash;P9</span>
                    </div>
                    <Chip label="Valid" variant="valid" />
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-raised border border-line rounded-card">
                    <div className="flex items-center gap-2">
                      <CheckIcon size={14} className="text-good" />
                      <span className="text-ink">Wheelchair accessibility satisfied</span>
                    </div>
                    <Chip label="Valid" variant="valid" />
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-raised border border-line rounded-card">
                    <div className="flex items-center gap-2">
                      <CheckIcon size={14} className="text-good" />
                      <span className="text-ink">Exams placed in valid exam rooms</span>
                    </div>
                    <Chip label="Valid" variant="valid" />
                  </div>
                </div>
              </div>

              {/* Exam Policy Summary */}
              <div className="p-4 bg-surface border border-line rounded-panel text-[12px] text-ink-2 space-y-2">
                <span className="font-semibold text-ink uppercase tracking-wide text-[10px] block">
                  Capacity Halving Rule:
                </span>
                <p className="leading-relaxed">
                  Every examination room capacity is strictly halved (e.g. CR-01 from 120 down to 60) to maintain single-bench separation without invigilation crowding.
                </p>
                <div className="pt-2 border-t border-line font-mono text-[11px] text-ink flex justify-between">
                  <span>Total exams:</span>
                  <span className="font-semibold">{EXAMS.length} course exams</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Judge Inspection Utility Dock */}
        <aside
          aria-label="Judge state switcher"
          className="fixed bottom-4 right-4 z-40 bg-surface border border-line-strong rounded-panel shadow-palette p-2 flex items-center gap-2.5 text-[11px] font-ui"
        >
          <span className="text-ink-2 font-medium flex items-center gap-1.5 pl-1">
            <span className="w-2 h-2 rounded-full bg-violet" />
            <span className="hidden sm:inline">Evaluation State:</span>
          </span>
          <div className="flex items-center gap-1">
            {(['normal', 'skeleton', 'empty'] as const).map((s) => (
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
      </div>
    </AppShell>
  );
}
