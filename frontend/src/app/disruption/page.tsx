'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/context/AppContext';
import { KernelStamp } from '@/components/ui/KernelStamp';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { Day } from '@/data/types';
import { AlertIcon } from '@/components/ui/Icons';

export default function DisruptionPage() {
  const { role } = useApp();

  // Input Panel State
  const [facultyId, setFacultyId] = useState<string>('F07');
  const [facultyLeaveDays, setFacultyLeaveDays] = useState<Day>('MON');
  const [facultyLeaveReason, setFacultyLeaveReason] = useState<string>(
    'Conference travel every Monday for the rest of semester'
  );

  const [roomId, setRoomId] = useState<string>('CR-102');
  const [roomClosureWindow, setRoomClosureWindow] = useState<string>('MON-FRI P1-P9');
  const [roomClosureReason, setRoomClosureReason] = useState<string>(
    'Water leak, room closed for semester repair'
  );

  const [emergencyCourse, setEmergencyCourse] = useState<string>('CS202-T2');
  const [emergencyFaculty, setEmergencyFaculty] = useState<string>('F06');
  const [emergencyGroup, setEmergencyGroup] = useState<string>('CSE-2');

  // Dynamic meta options
  const [metaRooms, setMetaRooms] = useState<Array<{ id: string; name: string }>>([
    { id: 'CR-101', name: 'CR-101 (Block A)' },
    { id: 'CR-102', name: 'CR-102 (Block A)' },
    { id: 'CR-103', name: 'CR-103 (Block A)' },
    { id: 'LH-1', name: 'LH-1 (Lecture Complex)' },
    { id: 'LH-2', name: 'LH-2 (Lecture Complex)' },
    { id: 'CS-LAB-1', name: 'CS-LAB-1 (Computer Lab)' },
    { id: 'PHY-LAB', name: 'PHY-LAB (Physics Lab)' },
    { id: 'AUD', name: 'AUD (Auditorium)' },
  ]);

  const [metaFaculty, setMetaFaculty] = useState<Array<{ id: string; name: string; department?: string }>>([
    { id: 'F01', name: 'Dr. Mishra', department: 'Physics' },
    { id: 'F02', name: 'Dr. Rao', department: 'Mathematics' },
    { id: 'F06', name: 'Prof. Sen', department: 'Computer Science' },
    { id: 'F07', name: 'Dr. Raman', department: 'Computer Science' },
  ]);

  // Solver View State
  const [isCalculated, setIsCalculated] = useState<boolean>(false);
  const [isInfeasible, setIsInfeasible] = useState<boolean>(false);
  const [diffViewMode, setDiffViewMode] = useState<'before-after' | 'side-by-side'>('side-by-side');
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [proposal, setProposal] = useState<any | null>(null);
  const [apiError, setApiError] = useState<{ code: string; message: string } | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getMeta().then((meta) => {
      if (meta?.rooms) setMetaRooms(meta.rooms);
      if (meta?.faculty) setMetaFaculty(meta.faculty);
    }).catch(() => {});
  }, []);

  const handleLoadSample = () => {
    setFacultyId('F07');
    setFacultyLeaveDays('MON');
    setFacultyLeaveReason('Conference travel every Monday for the rest of semester');
    setRoomId('CR-102');
    setRoomClosureWindow('MON-FRI P1-P9');
    setRoomClosureReason('Water leak, room closed for semester repair');
    setEmergencyCourse('CS202-T2');
    setEmergencyFaculty('F06');
    setEmergencyGroup('CSE-2');
    setToastMessage('Loaded sample disruption parameters.');
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    setApiError(null);
    try {
      const changes: any[] = [];
      if (roomId) {
        const days = roomClosureWindow.includes('MON-FRI')
          ? ['MON', 'TUE', 'WED', 'THU', 'FRI']
          : [facultyLeaveDays || 'MON'];
        changes.push({
          type: 'room_unavailable',
          room_id: roomId,
          days: days,
          periods: [1, 2, 3, 4, 5, 6, 7, 8, 9],
          reason: roomClosureReason || 'Room maintenance closure',
        });
      }
      if (facultyId) {
        changes.push({
          type: 'faculty_unavailable',
          faculty_id: facultyId,
          days: [facultyLeaveDays || 'MON'],
          periods: [1, 2, 3, 4, 5, 6, 7, 8, 9],
          reason: facultyLeaveReason || 'Faculty leave',
        });
      }
      if (emergencyCourse) {
        changes.push({
          type: 'add_session',
          session: {
            id: emergencyCourse,
            course_id: emergencyCourse.split('-')[0] || 'CS202',
            kind: 'tutorial',
            groups: [emergencyGroup || 'CSE-2'],
            faculty_id: emergencyFaculty || 'F06',
            size: 80,
            duration: 1,
            room_types: ['classroom', 'lecture_hall', 'auditorium'],
            needs_accessible: false,
            basket_slot: null,
            fixed_slot: null,
          },
        });
      }
      const res = await api.previewDisruption({ changes });
      setProposal(res);
      setIsCalculated(true);
      setIsInfeasible(Boolean(res.infeasible));
      setToastMessage(`Minimal moves computed: ${res.moved_count} sessions moved.${res.proven_minimum ? ' (Proven minimal)' : ''}`);
    } catch (err: any) {
      setApiError({ code: err.code || 'ERROR', message: err.message || 'Solver failed to compute minimal moves.' });
    } finally {
      setIsCalculating(false);
    }
  };

  const moves = proposal?.moves || [];
  const miniDays: Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

  return (
    <AppShell>
      <div className="space-y-6 max-w-6xl pb-44 sm:pb-36 select-none">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-ink text-paper rounded-cell">
                Rescheduling Engine
              </span>
              <span className="text-[12px] text-ink-2 font-mono">CP-SAT Minimal-Move Warm-Start</span>
            </div>
            <h1 className="font-serif text-[40px] leading-[44px] text-ink tracking-tight mb-2">
              Disruption Simulation
            </h1>
            <p className="font-serif italic text-[16px] text-ink-2">
              Calculate the minimal number of moved sessions when faculty take leave or rooms close.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsInfeasible(!isInfeasible)}
              className="text-[11px] font-mono text-ink-2 underline hover:text-ink cursor-pointer"
            >
              {isInfeasible ? 'View feasible result' : 'Simulate infeasible conflict'}
            </button>
            <Button variant="secondary" onClick={handleLoadSample}>
              Load sample disruption
            </Button>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="p-3 bg-t-good border border-good/50 rounded-panel text-[13px] text-good flex items-center justify-between animate-fadeIn">
            <span>{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-[11px] underline ml-4 hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Error Notification */}
        {apiError && (
          <div className="p-3 bg-t-bad border border-bad/50 rounded-panel text-[13px] text-bad flex items-center justify-between animate-fadeIn">
            <span>
              <strong>Error ({apiError.code}):</strong> {apiError.message}
            </span>
            <button
              onClick={() => setApiError(null)}
              className="text-[11px] underline ml-4 hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TWO-COLUMN LAYOUT: Left Input Panel (5 cols) + Right Result Panel (7 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT INPUT PANEL (5 cols) */}
          <div className="lg:col-span-5 bg-surface border border-line rounded-panel p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <h2 className="font-serif text-[22px] text-ink">Disruption Inputs</h2>
              <span className="text-[11px] font-mono text-ink-2">Practice Scenario</span>
            </div>

            <div className="space-y-4">
              {/* Field 1: Faculty + Leave Dates */}
              <div className="space-y-1.5 p-3 bg-raised border border-line rounded-card">
                <span className="text-[11px] font-mono uppercase tracking-wider text-ink font-semibold block">
                  1. Faculty Leave
                </span>
                <div className="space-y-2">
                  <div>
                    <label className="text-[12px] text-ink-2 block mb-0.5">Faculty member:</label>
                    <select
                      value={facultyId}
                      onChange={(e) => setFacultyId(e.target.value)}
                      className="w-full h-9 px-2.5 bg-surface border border-line-strong rounded-[6px] text-[13px] font-medium text-ink focus:outline-none focus:border-ink"
                    >
                      {metaFaculty.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.id} &middot; {f.name} {f.department ? `(${f.department})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[12px] text-ink-2 block mb-0.5">Leave day:</label>
                      <select
                        value={facultyLeaveDays}
                        onChange={(e) => setFacultyLeaveDays(e.target.value as Day)}
                        className="w-full h-8 px-2 bg-surface border border-line-strong rounded-[6px] text-[12px] text-ink"
                      >
                        <option value="MON">Monday (All day)</option>
                        <option value="TUE">Tuesday (All day)</option>
                        <option value="WED">Wednesday (All day)</option>
                        <option value="THU">Thursday (All day)</option>
                        <option value="FRI">Friday (All day)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[12px] text-ink-2 block mb-0.5">Reason:</label>
                      <input
                        type="text"
                        value={facultyLeaveReason}
                        onChange={(e) => setFacultyLeaveReason(e.target.value)}
                        className="w-full h-8 px-2 bg-surface border border-line-strong rounded-[6px] text-[12px] text-ink"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Field 2: Room + Closure Window */}
              <div className="space-y-1.5 p-3 bg-raised border border-line rounded-card">
                <span className="text-[11px] font-mono uppercase tracking-wider text-ink font-semibold block">
                  2. Room Closure Window
                </span>
                <div className="space-y-2">
                  <div>
                    <label className="text-[12px] text-ink-2 block mb-0.5">Closed room:</label>
                    <select
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      className="w-full h-9 px-2.5 bg-surface border border-line-strong rounded-[6px] text-[13px] font-medium text-ink focus:outline-none focus:border-ink"
                    >
                      {metaRooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.id} &middot; {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[12px] text-ink-2 block mb-0.5">Window:</label>
                      <input
                        type="text"
                        value={roomClosureWindow}
                        onChange={(e) => setRoomClosureWindow(e.target.value)}
                        className="w-full h-8 px-2 bg-surface border border-line-strong rounded-[6px] text-[12px] text-ink font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[12px] text-ink-2 block mb-0.5">Closure cause:</label>
                      <input
                        type="text"
                        value={roomClosureReason}
                        onChange={(e) => setRoomClosureReason(e.target.value)}
                        className="w-full h-8 px-2 bg-surface border border-line-strong rounded-[6px] text-[12px] text-ink"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Field 3: Emergency Session to Add */}
              <div className="space-y-1.5 p-3 bg-raised border border-line rounded-card">
                <span className="text-[11px] font-mono uppercase tracking-wider text-ink font-semibold block">
                  3. Emergency Session Addition
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-ink-2 block mb-0.5">Session ID:</label>
                    <input
                      type="text"
                      value={emergencyCourse}
                      onChange={(e) => setEmergencyCourse(e.target.value)}
                      className="w-full h-8 px-2 bg-surface border border-line-strong rounded-[6px] text-[12px] text-ink font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-ink-2 block mb-0.5">Faculty ID:</label>
                    <input
                      type="text"
                      value={emergencyFaculty}
                      onChange={(e) => setEmergencyFaculty(e.target.value)}
                      className="w-full h-8 px-2 bg-surface border border-line-strong rounded-[6px] text-[12px] text-ink font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-ink-2 block mb-0.5">Group:</label>
                    <input
                      type="text"
                      value={emergencyGroup}
                      onChange={(e) => setEmergencyGroup(e.target.value)}
                      className="w-full h-8 px-2 bg-surface border border-line-strong rounded-[6px] text-[12px] text-ink font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Primary Calculate Button */}
              <div className="pt-2">
                <Button
                  variant="primary"
                  className="w-full h-10 text-[14px]"
                  onClick={handleCalculate}
                  disabled={isCalculating}
                >
                  {isCalculating ? 'Computing minimal-move schedule (CP-SAT)...' : 'Calculate minimal-move schedule'}
                </Button>
              </div>
            </div>
          </div>

          {/* RIGHT RESULT PANEL (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* INFEASIBLE STATE VIEW */}
            {isInfeasible ? (
              <div className="p-6 bg-t-bad border border-bad/50 rounded-panel space-y-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-bad/30 pb-3">
                  <div>
                    <h2 className="font-serif text-[28px] text-bad tracking-tight">
                      No valid schedule exists.
                    </h2>
                    <p className="font-serif italic text-[15px] text-ink leading-relaxed mt-1">
                      Dr. Raman is on leave Wednesday; Physics Lab is closed Wednesday and a 3-hour lab needs P2 to P4 or P6 to P8. PHY-L2 has no legal slot.
                    </p>
                  </div>
                  <Chip label="INFEASIBLE" variant="failed" />
                </div>

                {/* Conflicting constraints as bordered rows with rule codes */}
                <div className="space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-bad font-semibold block">
                    Conflicting Constraints Detected by Kernel:
                  </span>

                  <div className="p-3 bg-surface border border-bad/40 rounded-card flex items-center justify-between text-[13px]">
                    <div className="flex items-center gap-2">
                      <Chip label="H7" isRuleCode />
                      <span className="text-ink">Dr. Raman (F07) marked on leave Wednesday (All periods)</span>
                    </div>
                    <Chip label="FAILED" variant="failed" />
                  </div>

                  <div className="p-3 bg-surface border border-bad/40 rounded-card flex items-center justify-between text-[13px]">
                    <div className="flex items-center gap-2">
                      <Chip label="H8" isRuleCode />
                      <span className="text-ink">PHY-LAB closed Wednesday for scheduled optics calibration</span>
                    </div>
                    <Chip label="FAILED" variant="failed" />
                  </div>

                  <div className="p-3 bg-surface border border-bad/40 rounded-card flex items-center justify-between text-[13px]">
                    <div className="flex items-center gap-2">
                      <Chip label="H9" isRuleCode />
                      <span className="text-ink">3-hour laboratory block requires continuous P2&ndash;P4 or P6&ndash;P8</span>
                    </div>
                    <Chip label="FAILED" variant="failed" />
                  </div>
                </div>

                {/* Single Action: "Edit the disruption" */}
                <div className="pt-2">
                  <Button
                    variant="secondary"
                    className="border-bad text-bad hover:bg-t-bad"
                    onClick={() => {
                      setIsInfeasible(false);
                      setToastMessage('Switched back to editable disruption inputs.');
                    }}
                  >
                    Edit the disruption
                  </Button>
                </div>
              </div>
            ) : isCalculated && proposal ? (
              /* FEASIBLE MINIMAL-MOVE RESULT */
              <div className="bg-surface border border-line rounded-panel p-6 shadow-sm space-y-6">
                
                {/* Header: Serif Sentence + Kernel Stamp */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
                  <div>
                    <h2 className="font-serif text-[28px] sm:text-[32px] leading-tight text-ink font-normal">
                      {proposal.moved_count} sessions moved.{proposal.proven_minimum ? ' This is the proven minimum possible.' : ''}
                    </h2>
                    <p className="font-serif italic text-[15px] text-ink-2 mt-0.5">
                      Status: {proposal.status} &middot; Forced moves: {proposal.forced_moves || 0}, Knock-on: {proposal.knock_on_moves || 0}
                    </p>
                  </div>

                  <KernelStamp label={proposal.proven_minimum ? "Proven minimal by solver" : "Solver Proposal"} />
                </div>

                {/* BEFORE AND AFTER MINI TIMETABLES */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-ink uppercase tracking-wide">
                      Before and After Mini Timetables
                    </span>
                    <span className="text-[11px] text-ink-2 font-mono">
                      {moves.length} relocation{moves.length === 1 ? '' : 's'} computed
                    </span>
                  </div>

                  {/* Visual Side-by-Side Mini Grids */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Before Grid (Baseline) */}
                    <div className="p-3.5 bg-raised border border-line rounded-card space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono text-ink-2 border-b border-line pb-1">
                        <span className="font-bold text-ink">BEFORE (Baseline Schedule)</span>
                        <span className="text-bad line-through">{moves.length} slot{moves.length === 1 ? '' : 's'} vacated</span>
                      </div>

                      {/* Mini Mon-Fri Grid */}
                      <div className="grid grid-cols-5 gap-1 text-[10px] font-mono text-center">
                        {miniDays.map((d) => (
                          <div key={d} className="p-1 bg-surface rounded-cell text-ink-2">
                            {d}
                          </div>
                        ))}
                      </div>

                      {/* Slots representation */}
                      <div className="space-y-1.5 pt-1">
                        {moves.map((m: any) => (
                          <div key={m.session_id} className="p-2 border border-bad border-dashed rounded-cell bg-t-bad/30 text-[11px] text-bad flex items-center justify-between">
                            <span className="line-through font-medium">{m.session_id} in {m.from_slot?.room_id} ({m.from_slot?.day} P{m.from_slot?.start_period})</span>
                            <span className="text-[10px] uppercase font-mono px-1 rounded-cell bg-bad text-paper">
                              {m.is_forced ? 'Forced' : 'Shift'}
                            </span>
                          </div>
                        ))}
                        {moves.length === 0 && (
                          <p className="text-[11px] text-ink-2 italic p-2">No baseline sessions disrupted.</p>
                        )}
                      </div>
                    </div>

                    {/* After Grid (Rescheduled) */}
                    <div className="p-3.5 bg-raised border border-line rounded-card space-y-2 relative overflow-hidden">
                      <div className="flex items-center justify-between text-[11px] font-mono text-ink-2 border-b border-line pb-1">
                        <span className="font-bold text-ink">AFTER (Minimal-Move Schedule)</span>
                        <span className="text-event font-semibold">{moves.length} slot{moves.length === 1 ? '' : 's'} allocated</span>
                      </div>

                      {/* Mini Mon-Fri Grid */}
                      <div className="grid grid-cols-5 gap-1 text-[10px] font-mono text-center">
                        {miniDays.map((d) => (
                          <div key={d} className="p-1 bg-surface rounded-cell text-ink-2">
                            {d}
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1.5 pt-1">
                        {moves.map((m: any) => (
                          <div key={m.session_id} className="p-2 border border-event rounded-cell bg-t-lab text-[11px] text-ink animate-pulse-twice flex items-center justify-between shadow-xs">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-event" />
                              <span className="font-semibold text-ink">{m.session_id} in {m.to_slot?.room_id} ({m.to_slot?.day} P{m.to_slot?.start_period})</span>
                            </div>
                            <Chip label="MOVED" variant="moved" />
                          </div>
                        ))}
                        {moves.length === 0 && (
                          <p className="text-[11px] text-ink-2 italic p-2">No relocated sessions needed.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* CHANGE TABLE (Session, From, To, Reason) */}
                <div className="space-y-2 pt-2 border-t border-line">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-ink uppercase tracking-wide">
                      Detailed Relocation Ledger
                    </span>
                    <span className="text-[11px] font-mono text-ink-2">{moves.length} Total Moves</span>
                  </div>

                  <div className="overflow-x-auto border border-line rounded-card bg-surface shadow-xs">
                    <table className="w-full text-left border-collapse text-[12px]">
                      <thead>
                        <tr className="border-b border-line bg-raised text-[10px] font-mono uppercase tracking-wider text-ink-2">
                          <th className="p-2.5 pl-3">Session</th>
                          <th className="p-2.5">From</th>
                          <th className="p-2.5">To</th>
                          <th className="p-2.5 pr-3">Kernel Justification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {moves.map((row: any) => (
                          <tr key={row.session_id} className="hover:bg-raised/50 transition-colors">
                            <td className="p-2.5 pl-3 font-semibold text-ink">
                              <div>{row.session_id}</div>
                              <div className="text-[10px] text-ink-2 font-normal truncate max-w-[140px]">
                                {row.course_title || row.course_id}
                              </div>
                            </td>
                            <td className="p-2.5 font-mono text-bad line-through text-[11px] whitespace-nowrap">
                              {row.from_slot ? `${row.from_slot.room_id} ${row.from_slot.day} P${row.from_slot.start_period}` : '—'}
                            </td>
                            <td className="p-2.5 font-mono text-ink font-semibold text-[11px] whitespace-nowrap">
                              <span className="text-event mr-1">&rarr;</span>
                              {row.to_slot ? `${row.to_slot.room_id} ${row.to_slot.day} P${row.to_slot.start_period}` : '—'}
                            </td>
                            <td className="p-2.5 pr-3 font-serif italic text-[12px] text-ink-2 leading-snug">
                              {row.reason || 'Continuity preservation.'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* STICKY BOTTOM BAR FOR APPROVAL */}
        {proposal && (
          <div className="fixed bottom-14 sm:bottom-0 left-0 right-0 sm:left-16 lg:left-[232px] p-3.5 sm:p-4 bg-surface border-t border-line-strong flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-30 shadow-palette">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green flex-shrink-0" />
              <span className="font-ui text-[13px] font-medium text-ink">
                {proposal.moved_count} sessions moved &middot; Minimal disruption schedule ready for commit
              </span>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              {role === 'admin' ? (
                <>
                  <Button
                    variant="secondary"
                    className="h-9 px-4 text-[13px]"
                    onClick={async () => {
                      try {
                        await api.rejectProposal(proposal.id, 'Rejected by Dean');
                        setIsCalculated(false);
                        setProposal(null);
                        setToastMessage('Proposal rejected. Timetable reverted to baseline.');
                      } catch (err: any) {
                        setToastMessage(`Reject error: ${err.message}`);
                      }
                    }}
                  >
                    Reject proposal
                  </Button>
                  <Button
                    variant="primary"
                    className="h-9 px-5 text-[13px] bg-violet hover:bg-violet/90 text-white"
                    onClick={async () => {
                      try {
                        await api.approveProposal(proposal.id);
                        setToastMessage(`Proposal ${proposal.id} committed successfully.`);
                      } catch (err: any) {
                        setToastMessage(`Commit error: ${err.message}`);
                      }
                    }}
                  >
                    Approve and commit
                  </Button>
                </>
              ) : (
                <span className="font-serif italic text-[14px] text-ink-2">
                  Waiting for admin approval (Dean's office).
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
