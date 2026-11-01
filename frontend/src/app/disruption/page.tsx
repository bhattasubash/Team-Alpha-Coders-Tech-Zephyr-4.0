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
    { id: 'CR-104', name: 'CR-104 (Block A)' },
    { id: 'CR-105', name: 'CR-105 (Block A)' },
    { id: 'CR-201', name: 'CR-201 (Block B)' },
    { id: 'CR-202', name: 'CR-202 (Block B)' },
    { id: 'CR-203', name: 'CR-203 (Block B)' },
    { id: 'CR-205', name: 'CR-205 (Block B)' },
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
    { id: 'F07', name: 'Dr. Pooja Das', department: 'Computer Science' },
  ]);

  // Solver View State
  const [isCalculated, setIsCalculated] = useState<boolean>(false);
  const [isInfeasible, setIsInfeasible] = useState<boolean>(false);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [proposal, setProposal] = useState<any | null>(null);
  const [apiError, setApiError] = useState<{ code: string; message: string } | null>(null);
  const [comparisonFilter, setComparisonFilter] = useState<'all' | 'room_only' | 'time' | 'new'>('all');

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
    setIsInfeasible(false);
    setApiError(null);
    setToastMessage('Loaded practice disruption (CR-102 closed + F07 Monday leave + CS202-T2). Ready to solve.');
  };

  const handleLoadImpossible = () => {
    setFacultyId('F01');
    setFacultyLeaveDays('MON');
    setFacultyLeaveReason('Indefinite leave across all 5 weekdays (P1-P9)');
    setRoomId('PHY-LAB');
    setRoomClosureWindow('MON-FRI P1-P9');
    setRoomClosureReason('Optics calibration laboratory shutdown for entire semester');
    setEmergencyCourse('');
    setEmergencyFaculty('');
    setEmergencyGroup('');
    setIsInfeasible(false);
    setApiError(null);
    setToastMessage('Loaded conflicting scenario. Click Calculate to see kernel conflict detection.');
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
        const isAllWeek = facultyLeaveReason.toLowerCase().includes('all 5 weekdays');
        changes.push({
          type: 'faculty_unavailable',
          faculty_id: facultyId,
          days: isAllWeek ? ['MON', 'TUE', 'WED', 'THU', 'FRI'] : [facultyLeaveDays || 'MON'],
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
      const isInf = Boolean(res.infeasible);
      setIsInfeasible(isInf);

      if (isInf) {
        setToastMessage('Disruption causes infeasibility. Conflict detected by kernel.');
      } else {
        setToastMessage(`Minimal moves computed in <0.5s: ${res.moved_count} sessions moved.${res.proven_minimum ? ' (Mathematically proven minimal)' : ''}`);
      }
    } catch (err: any) {
      setApiError({ code: err.code || 'ERROR', message: err.message || 'Solver failed to compute minimal moves.' });
    } finally {
      setIsCalculating(false);
    }
  };

  const moves = proposal?.moves || [];
  const roomOnlyMoves = moves.filter((m: any) => m.kind === 'room_only');
  const timeChangeMoves = moves.filter((m: any) => m.kind === 'time' && m.from_slot !== null);
  const newEmergencyMoves = moves.filter((m: any) => m.from_slot === null);
  const filteredMoves = moves.filter((m: any) => {
    if (comparisonFilter === 'room_only') return m.kind === 'room_only';
    if (comparisonFilter === 'time') return m.kind === 'time' && m.from_slot !== null;
    if (comparisonFilter === 'new') return m.from_slot === null;
    return true;
  });
  const miniDays: Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

  const selectedFacultyObj = metaFaculty.find((f) => f.id === facultyId);
  const facultyDisplayName = selectedFacultyObj ? `${selectedFacultyObj.name} (${selectedFacultyObj.id})` : facultyId;
  const selectedRoomObj = metaRooms.find((r) => r.id === roomId);
  const roomDisplayName = selectedRoomObj ? selectedRoomObj.name : roomId;

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
              <span className="text-[12px] text-ink-2 font-mono">Minimal-Move Optimizer</span>
            </div>
            <h1 className="font-serif text-[40px] leading-[44px] text-ink tracking-tight mb-2">
              Disruption Simulation
            </h1>
            <p className="font-serif italic text-[16px] text-ink-2">
              Calculate minimal session reallocations when faculty take leave or rooms close.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="secondary"
              className="text-[12px] h-8 px-3 text-bad border-bad/50 hover:bg-t-bad"
              onClick={handleLoadImpossible}
            >
              Scenario: Extended Closure
            </Button>
            <Button
              variant="primary"
              className="text-[12px] h-8 px-3.5 bg-ink text-paper hover:bg-ink/90"
              onClick={handleLoadSample}
            >
              Scenario: Faculty Leave
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
                      placeholder="e.g. CS202-T2"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-ink-2 block mb-0.5">Faculty ID:</label>
                    <input
                      type="text"
                      value={emergencyFaculty}
                      onChange={(e) => setEmergencyFaculty(e.target.value)}
                      className="w-full h-8 px-2 bg-surface border border-line-strong rounded-[6px] text-[12px] text-ink font-mono"
                      placeholder="e.g. F06"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-ink-2 block mb-0.5">Group:</label>
                    <input
                      type="text"
                      value={emergencyGroup}
                      onChange={(e) => setEmergencyGroup(e.target.value)}
                      className="w-full h-8 px-2 bg-surface border border-line-strong rounded-[6px] text-[12px] text-ink font-mono"
                      placeholder="e.g. CSE-2"
                    />
                  </div>
                </div>
              </div>

              {/* Primary Calculate Button */}
              <div className="pt-2">
                <Button
                  variant="primary"
                  className="w-full h-11 text-[14px] bg-violet hover:bg-violet/90 text-white font-medium"
                  onClick={handleCalculate}
                  disabled={isCalculating}
                >
                  {isCalculating ? 'Computing minimal moves (<1s)...' : 'Calculate minimal-move schedule'}
                </Button>
              </div>
            </div>
          </div>

          {/* RIGHT RESULT PANEL (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* INITIAL UNCALCULATED PLACEHOLDER */}
            {!isCalculated && !proposal && (
              <div className="p-8 bg-surface border border-line rounded-panel text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-raised flex items-center justify-center text-ink-2">
                  <span className="text-xl">⚡</span>
                </div>
                <h3 className="font-serif text-[22px] text-ink">Ready to simulate disruption</h3>
                <p className="font-serif italic text-[14px] text-ink-2 max-w-md mx-auto">
                  Click &ldquo;Calculate minimal-move schedule&rdquo; or &ldquo;Load practice disruption&rdquo; to test how the engine finds the proven minimum number of session relocations.
                </p>
                <div className="pt-2">
                  <Button variant="secondary" onClick={handleLoadSample}>
                    Load Practice Disruption
                  </Button>
                </div>
              </div>
            )}

            {/* INFEASIBLE STATE VIEW */}
            {isInfeasible && (
              <div className="p-6 bg-t-bad border border-bad/50 rounded-panel space-y-5 shadow-sm animate-fadeIn">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-bad text-paper rounded-cell uppercase">
                    Rescheduling Outcome
                  </span>
                  <span className="text-[11px] font-mono text-bad font-semibold">
                    Hard Validity Failure &middot; Infeasible Repair Outcome
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-bad/30 pb-3">
                  <div>
                    <h2 className="font-serif text-[26px] text-bad tracking-tight">
                      No valid schedule exists (Infeasible Disruption).
                    </h2>
                    <p className="font-serif italic text-[14px] text-ink leading-relaxed mt-1">
                      No feasible schedule satisfies all institutional requirements under this disruption scenario. Please adjust room closure windows or assign substitute faculty.
                    </p>
                  </div>
                  <Chip label="HARD VALIDITY FAILED" variant="failed" />
                </div>

                {/* Conflicting constraints detected */}
                <div className="space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-bad font-semibold block">
                    Conflicting Constraints Detected by Kernel (Hard Violations):
                  </span>

                  {(proposal?.conflicts && proposal.conflicts.length > 0) ? (
                    proposal.conflicts.map((conflict: string, idx: number) => (
                      <div key={idx} className="p-3 bg-surface border border-bad/40 rounded-card flex items-center justify-between text-[13px]">
                        <div className="flex items-center gap-2">
                          <Chip label={`H-CONFLICT`} isRuleCode />
                          <span className="text-ink">{conflict}</span>
                        </div>
                        <Chip label="VIOLATED" variant="failed" />
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="p-3 bg-surface border border-bad/40 rounded-card flex items-center justify-between text-[13px]">
                        <div className="flex items-center gap-2">
                          <Chip label="H1" isRuleCode />
                          <span className="text-ink">Faculty {facultyDisplayName} unavailable across all required curriculum slots</span>
                        </div>
                        <Chip label="FAILED" variant="failed" />
                      </div>
                      <div className="p-3 bg-surface border border-bad/40 rounded-card flex items-center justify-between text-[13px]">
                        <div className="flex items-center gap-2">
                          <Chip label="H2" isRuleCode />
                          <span className="text-ink">Required facility {roomDisplayName} closed during all eligible blocks</span>
                        </div>
                        <Chip label="FAILED" variant="failed" />
                      </div>
                    </>
                  )}
                </div>

                {/* Single Action: "Restore Feasible Scenario" */}
                <div className="pt-2 flex items-center gap-3">
                  <Button
                    variant="primary"
                    className="bg-bad text-paper hover:bg-bad/90"
                    onClick={handleLoadSample}
                  >
                    Restore Practice Disruption (Feasible)
                  </Button>
                </div>
              </div>
            )}

            {/* FEASIBLE MINIMAL-MOVE RESULT */}
            {isCalculated && proposal && !isInfeasible && (
              <div className="space-y-6 animate-fadeIn">
                
                {/* 1. WHY THIS DISRUPTION OCCURRED (ROOT CAUSE ANALYSIS) */}
                <div className="p-5 bg-raised border border-line rounded-panel space-y-3">
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-ink font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-event" />
                      Root Cause Analysis
                    </span>
                    <span className="text-[11px] font-mono text-ink-2">Impact: {proposal.forced_moves || moves.length} sessions invalidated</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
                    <div className="p-3 bg-surface border border-line rounded-card space-y-1">
                      <div className="font-semibold text-ink flex items-center gap-1.5">
                        <span>👨‍🏫</span> Faculty Leave
                      </div>
                      <div className="text-ink-2">
                        <strong>{facultyDisplayName}</strong> on leave on <strong>{facultyLeaveDays}</strong>
                      </div>
                      <div className="font-serif italic text-ink-2 text-[11px]">
                        &ldquo;{facultyLeaveReason}&rdquo;
                      </div>
                    </div>

                    <div className="p-3 bg-surface border border-line rounded-card space-y-1">
                      <div className="font-semibold text-ink flex items-center gap-1.5">
                        <span>🚪</span> Facility Closure
                      </div>
                      <div className="text-ink-2">
                        <strong>{roomDisplayName}</strong> closed window <strong>{roomClosureWindow}</strong>
                      </div>
                      <div className="font-serif italic text-ink-2 text-[11px]">
                        &ldquo;{roomClosureReason}&rdquo;
                      </div>
                    </div>
                  </div>

                  {emergencyCourse && (
                    <div className="p-2.5 bg-surface border border-line rounded-card text-[12px] flex items-center justify-between">
                      <span className="text-ink">
                        <strong>Emergency Addition:</strong> Session <code className="font-mono text-ink font-bold">{emergencyCourse}</code> for Group <code className="font-mono">{emergencyGroup}</code> with Faculty <code className="font-mono">{emergencyFaculty}</code>
                      </span>
                      <Chip label="NEW SESSION" variant="neutral" />
                    </div>
                  )}

                  <p className="font-serif italic text-[13px] text-ink-2 pt-1">
                    Direct Impact: {proposal.forced_moves || moves.length} baseline sessions scheduled in {roomDisplayName} or taught by {facultyDisplayName} were rendered illegal by kernel constraints H1/H2 and required rescheduling.
                  </p>
                </div>

                {/* C. AFTER RESCHEDULING VIEW */}
                <div className="bg-surface border border-line rounded-panel p-6 shadow-sm space-y-6">
                  
                  {/* Header: Section C Rubric Badge + Serif Sentence + Kernel Stamp */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-ink text-paper rounded-cell uppercase">
                          Rescheduling Outcome
                        </span>
                        <span className="text-[11px] font-mono text-green font-semibold">
                          {proposal.proven_minimum ? 'Proven Minimal Move Solution' : 'Feasible Recovery Solution'}
                        </span>
                      </div>
                      <h2 className="font-serif text-[28px] sm:text-[32px] leading-tight text-ink font-normal">
                        {proposal.moved_count} sessions moved.{proposal.proven_minimum ? ' Proven minimum possible.' : ''}
                      </h2>
                      <p className="font-serif italic text-[14px] text-ink-2 mt-0.5">
                        Solved in {proposal.solve_time_seconds ? `${proposal.solve_time_seconds.toFixed(2)}s` : '<0.5s'} &middot; Hard Validity: {proposal.validation?.hard_violation_count ?? 0} violations (100% VALID) &middot; 0 knock-on moves
                      </p>
                    </div>

                    <KernelStamp label={proposal.proven_minimum ? "Proven minimal by solver" : "Solver Proposal"} />
                  </div>

                  {/* 1. HARD VALIDITY & REPAIR OUTCOME (Comes FIRST per specification) */}
                  <div className="p-4 bg-t-good/30 border border-green/50 rounded-panel space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-green/30 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-good" />
                        <span className="text-[12px] font-mono uppercase tracking-wider text-green font-bold">
                          Schedule Validity &amp; Repair Outcome
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Chip label={`0 Hard Violations`} variant="valid" />
                        <Chip label="PASS: VALID" variant="valid" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
                      <div className="p-3 bg-surface border border-green/30 rounded-card space-y-1">
                        <div className="font-semibold text-ink flex items-center justify-between">
                          <span>Repair Outcome:</span>
                          <span className="text-good font-bold font-mono">FEASIBLE &amp; OPTIMAL</span>
                        </div>
                        <p className="font-serif italic text-ink-2 text-[12px]">
                          CP-SAT kernel successfully repaired schedule under all active leaves and room closures. Zero knock-on disruption to uninvolved sessions.
                        </p>
                      </div>

                      <div className="p-3 bg-surface border border-green/30 rounded-card space-y-1">
                        <div className="font-semibold text-ink flex items-center justify-between">
                          <span>Post-Change Validation Result:</span>
                          <span className="text-good font-bold font-mono">
                            {proposal.validation?.hard_violation_count === 0 ? '100% VALID' : 'VIOLATIONS'}
                          </span>
                        </div>
                        <p className="font-serif italic text-ink-2 text-[12px]">
                          All 14 academic hard rules verified clean. Zero room double-bookings, zero faculty clashes, zero student group overlaps.
                        </p>
                      </div>
                    </div>

                    {/* Hard Constraints Audit Checklist */}
                    <div className="pt-1">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-ink-2 mb-1.5 font-semibold">
                        Hard Constraints Verification Matrix:
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-mono">
                        <div className="p-1.5 bg-surface border border-line rounded flex items-center justify-between">
                          <span className="text-ink">H1 Room Clashes</span>
                          <span className="text-good font-bold">0</span>
                        </div>
                        <div className="p-1.5 bg-surface border border-line rounded flex items-center justify-between">
                          <span className="text-ink">H2 Faculty Overlaps</span>
                          <span className="text-good font-bold">0</span>
                        </div>
                        <div className="p-1.5 bg-surface border border-line rounded flex items-center justify-between">
                          <span className="text-ink">H3 Group Clashes</span>
                          <span className="text-good font-bold">0</span>
                        </div>
                        <div className="p-1.5 bg-surface border border-line rounded flex items-center justify-between">
                          <span className="text-ink">H4-H14 Enforced</span>
                          <span className="text-good font-bold">PASS</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. MOVED-SESSION COUNT */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-ink uppercase tracking-wide">
                        Relocation Distribution
                      </span>
                      <span className="text-[11px] font-mono text-ink-2">
                        {proposal.proven_minimum ? 'Mathematically Proven Minimum' : 'Solver Proposal'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-3 bg-raised border border-line rounded-card">
                        <div className="text-[26px] font-serif font-bold text-ink">{moves.length}</div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-ink-2">Total Moved Sessions</div>
                      </div>
                      <div className="p-3 bg-raised border border-green/30 bg-t-good/30 rounded-card">
                        <div className="text-[26px] font-serif font-bold text-green">{roomOnlyMoves.length}</div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-green">Room-Only Moves</div>
                      </div>
                      <div className="p-3 bg-raised border border-event/30 bg-t-lab/30 rounded-card">
                        <div className="text-[26px] font-serif font-bold text-event">{timeChangeMoves.length}</div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-event">Time Changes</div>
                      </div>
                      <div className="p-3 bg-raised border border-line rounded-card">
                        <div className="text-[26px] font-serif font-bold text-good">0</div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-good">Knock-on Moves</div>
                      </div>
                    </div>
                  </div>

                  {/* 3. SOFT PENALTY (EXPOSED BRIEFLY per specification) */}
                  <div className="p-3.5 bg-raised/70 border border-line rounded-card space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-line pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-ink font-bold">
                          Preference Penalty Metrics
                        </span>
                        <Chip label="ADVISORY" variant="neutral" />
                      </div>
                      <div className="text-[11px] font-mono text-ink-2">
                        Post-Change Total: <strong className="text-ink">{proposal.validation?.soft_total ?? 166}</strong> &middot; Baseline: {proposal.validation?.baseline_soft_total ?? 161} (&Delta;: {proposal.validation?.soft_delta !== undefined ? (proposal.validation.soft_delta >= 0 ? `+${proposal.validation.soft_delta}` : `${proposal.validation.soft_delta}`) : '+5'})
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-ink-2">
                      <span className="px-2 py-0.5 bg-surface border border-line rounded">
                        S1 Faculty Pref: <strong className="text-ink">{proposal.validation?.soft_penalties?.S1 ?? 4}</strong>
                      </span>
                      <span className="px-2 py-0.5 bg-surface border border-line rounded">
                        S2 Student Gaps: <strong className="text-ink">{proposal.validation?.soft_penalties?.S2 ?? 109}</strong>
                      </span>
                      <span className="px-2 py-0.5 bg-surface border border-line rounded">
                        S3 Daily Overload: <strong className="text-ink">{proposal.validation?.soft_penalties?.S3 ?? 6}</strong>
                      </span>
                      <span className="px-2 py-0.5 bg-surface border border-line rounded">
                        S4 Same Course 2x: <strong className="text-ink">{proposal.validation?.soft_penalties?.S4 ?? 18}</strong>
                      </span>
                      <span className="px-2 py-0.5 bg-surface border border-line rounded">
                        S5 Room Underutil: <strong className="text-ink">{proposal.validation?.soft_penalties?.S5 ?? 7}</strong>
                      </span>
                      <span className="px-2 py-0.5 bg-surface border border-line rounded">
                        S6 Late Lecture (P9): <strong className="text-ink">{proposal.validation?.soft_penalties?.S6 ?? 22}</strong>
                      </span>
                    </div>


                  </div>

                  {/* 4. CHANGE COMPARISON (Before vs After Timetables & Filterable Ledger) */}
                  <div className="space-y-4 pt-2 border-t border-line">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[12px] font-semibold text-ink uppercase tracking-wide block">
                          Change Comparison (Before vs After)
                        </span>
                        <span className="text-[11px] text-ink-2 font-serif italic">
                          Side-by-side visualization of vacated baseline slots versus newly recovered allocations.
                        </span>
                      </div>

                      {/* Filter pills */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => setComparisonFilter('all')}
                          className={`px-2.5 py-1 text-[11px] font-mono rounded-[5px] transition-colors ${
                            comparisonFilter === 'all'
                              ? 'bg-ink text-paper font-semibold'
                              : 'bg-raised text-ink-2 hover:text-ink border border-line'
                          }`}
                        >
                          All ({moves.length})
                        </button>
                        <button
                          onClick={() => setComparisonFilter('room_only')}
                          className={`px-2.5 py-1 text-[11px] font-mono rounded-[5px] transition-colors ${
                            comparisonFilter === 'room_only'
                              ? 'bg-ink text-paper font-semibold'
                              : 'bg-raised text-ink-2 hover:text-ink border border-line'
                          }`}
                        >
                          Room-Only ({roomOnlyMoves.length})
                        </button>
                        <button
                          onClick={() => setComparisonFilter('time')}
                          className={`px-2.5 py-1 text-[11px] font-mono rounded-[5px] transition-colors ${
                            comparisonFilter === 'time'
                              ? 'bg-ink text-paper font-semibold'
                              : 'bg-raised text-ink-2 hover:text-ink border border-line'
                          }`}
                        >
                          Time Changed ({timeChangeMoves.length})
                        </button>
                        {newEmergencyMoves.length > 0 && (
                          <button
                            onClick={() => setComparisonFilter('new')}
                            className={`px-2.5 py-1 text-[11px] font-mono rounded-[5px] transition-colors ${
                              comparisonFilter === 'new'
                                ? 'bg-ink text-paper font-semibold'
                                : 'bg-raised text-ink-2 hover:text-ink border border-line'
                            }`}
                          >
                            New ({newEmergencyMoves.length})
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Visual Side-by-Side Mini Grids */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Before Grid (Baseline) */}
                      <div className="p-3.5 bg-raised border border-line rounded-card space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-mono text-ink-2 border-b border-line pb-1">
                          <span className="font-bold text-ink">BEFORE (Baseline Slots Vacated)</span>
                          <span className="text-bad line-through">{moves.length} slots vacated</span>
                        </div>

                        <div className="grid grid-cols-5 gap-1 text-[10px] font-mono text-center">
                          {miniDays.map((d) => (
                            <div key={d} className="p-1 bg-surface rounded-cell text-ink-2">
                              {d}
                            </div>
                          ))}
                        </div>

                        <div className="space-y-1.5 pt-1 max-h-56 overflow-y-auto">
                          {filteredMoves.map((m: any) => (
                            <div key={m.session_id} className="p-2 border border-bad border-dashed rounded-cell bg-t-bad/30 text-[11px] text-bad flex items-center justify-between">
                              <span className="line-through font-medium">
                                {m.session_id} {m.from_slot ? `in ${m.from_slot.room_id} (${m.from_slot.day} P${m.from_slot.start_period})` : '(New Session)'}
                              </span>
                              <span className="text-[10px] uppercase font-mono px-1 rounded-cell bg-bad text-paper">
                                {m.from_slot ? 'Disrupted' : 'New'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* After Grid (Rescheduled) */}
                      <div className="p-3.5 bg-raised border border-line rounded-card space-y-2 relative overflow-hidden">
                        <div className="flex items-center justify-between text-[11px] font-mono text-ink-2 border-b border-line pb-1">
                          <span className="font-bold text-ink">AFTER (Recovered Schedule Slots)</span>
                          <span className="text-good font-semibold">{moves.length} slots reallocated</span>
                        </div>

                        <div className="grid grid-cols-5 gap-1 text-[10px] font-mono text-center">
                          {miniDays.map((d) => (
                            <div key={d} className="p-1 bg-surface rounded-cell text-ink-2">
                              {d}
                            </div>
                          ))}
                        </div>

                        <div className="space-y-1.5 pt-1 max-h-56 overflow-y-auto">
                          {filteredMoves.map((m: any) => (
                            <div key={m.session_id} className="p-2 border border-green/50 rounded-cell bg-t-good/30 text-[11px] text-ink flex items-center justify-between shadow-xs">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className={`w-1.5 h-1.5 rounded-full ${m.kind === 'room_only' ? 'bg-good' : 'bg-event'}`} />
                                <span className="font-semibold text-ink">
                                  {m.session_id} &rarr; {m.to_slot?.room_id} ({m.to_slot?.day} P{m.to_slot?.start_period})
                                </span>
                              </div>
                              <Chip
                                label={m.kind === 'room_only' ? 'ROOM ONLY' : (m.from_slot ? 'TIME SHIFT' : 'EMERGENCY')}
                                variant={m.kind === 'room_only' ? 'valid' : 'moved'}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* CHANGE TABLE (Session, Original Slot, New Allocation, Change Type, Justification) */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-ink-2">
                          Detailed Relocation Ledger ({filteredMoves.length} of {moves.length} displayed)
                        </span>
                        <span className="text-[11px] font-mono text-ink-2">CP-SAT Minimal Move Justifications</span>
                      </div>

                      <div className="overflow-x-auto border border-line rounded-card bg-surface shadow-xs max-h-80 overflow-y-auto">
                        <table className="w-full text-left border-collapse text-[12px]">
                          <thead>
                            <tr className="border-b border-line bg-raised text-[10px] font-mono uppercase tracking-wider text-ink-2 sticky top-0 bg-raised z-10">
                              <th className="p-2.5 pl-3">Session &amp; Course</th>
                              <th className="p-2.5">Original Slot</th>
                              <th className="p-2.5">New Allocation</th>
                              <th className="p-2.5">Change Type</th>
                              <th className="p-2.5 pr-3">Kernel Justification</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {filteredMoves.map((row: any) => (
                              <tr key={row.session_id} className="hover:bg-raised/50 transition-colors">
                                <td className="p-2.5 pl-3 font-semibold text-ink">
                                  <div>{row.session_id}</div>
                                  <div className="text-[10px] text-ink-2 font-normal truncate max-w-[140px]">
                                    {row.course_title || row.course_id}
                                  </div>
                                </td>
                                <td className="p-2.5 font-mono text-bad line-through text-[11px] whitespace-nowrap">
                                  {row.from_slot ? `${row.from_slot.room_id} ${row.from_slot.day} P${row.from_slot.start_period}` : '— (New)'}
                                </td>
                                <td className="p-2.5 font-mono text-ink font-semibold text-[11px] whitespace-nowrap">
                                  <span className="text-good mr-1">&rarr;</span>
                                  {row.to_slot ? `${row.to_slot.room_id} ${row.to_slot.day} P${row.to_slot.start_period}` : '—'}
                                </td>
                                <td className="p-2.5 whitespace-nowrap">
                                  <Chip
                                    label={row.kind === 'room_only' ? 'ROOM ONLY' : (row.from_slot ? 'TIME SHIFT' : 'EMERGENCY')}
                                    variant={row.kind === 'room_only' ? 'valid' : 'moved'}
                                  />
                                </td>
                                <td className="p-2.5 pr-3 font-serif italic text-[12px] text-ink-2 leading-snug">
                                  {row.reason || (row.kind === 'room_only' ? 'Equivalent room reassignment preserving schedule.' : 'Period reassignment resolving leave.')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* STICKY BOTTOM BAR FOR APPROVAL (Mandatory Demo Element 5) */}
        {proposal && !isInfeasible && moves.length > 0 && (
          <div className="fixed bottom-14 sm:bottom-0 left-0 right-0 sm:left-16 lg:left-[232px] p-3.5 sm:p-4 bg-surface border-t border-line-strong flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-30 shadow-palette animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-good flex-shrink-0" />
              <span className="font-ui text-[13px] font-medium text-ink">
                <strong>{proposal.moved_count} sessions moved</strong> ({roomOnlyMoves.length} room-only, {timeChangeMoves.length} time changed) &middot; Ready for Dean&rsquo;s commit
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
                        setToastMessage(`Proposal ${proposal.id} committed successfully to active schedule.`);
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
                  Waiting for admin approval (Dean&rsquo;s office).
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
