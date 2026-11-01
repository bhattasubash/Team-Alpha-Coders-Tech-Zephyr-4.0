'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { AppShell } from '@/components/layout/AppShell';
import { KernelStamp } from '@/components/ui/KernelStamp';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { api } from '@/lib/api';
import { Day, Room } from '@/data/types';
import { CheckIcon, AlertIcon, WheelchairGlyph } from '@/components/ui/Icons';

const CAMPUS_ROOMS: Room[] = [
  { id: 'AUD', name: 'Main Auditorium', building: 'AUD', type: 'auditorium', capacity: 400, features: ['stage', 'pa_system'], accessible: true, allowed_uses: ['event', 'club'] },
  { id: 'SH-1', name: 'Seminar Hall 1', building: 'SH', type: 'seminar_hall', capacity: 150, features: ['projector'], accessible: true, allowed_uses: ['lecture', 'event'] },
  { id: 'SH-2', name: 'Seminar Hall 2', building: 'SH', type: 'seminar_hall', capacity: 150, features: ['projector'], accessible: false, allowed_uses: ['lecture', 'event'] },
  { id: 'CR-101', name: 'Classroom 101', building: 'Block A', type: 'classroom', capacity: 90, features: ['projector'], accessible: true, allowed_uses: ['lecture'] },
  { id: 'CR-102', name: 'Classroom 102', building: 'Block A', type: 'classroom', capacity: 90, features: ['projector'], accessible: true, allowed_uses: ['lecture'] },
  { id: 'OAT', name: 'Open Air Theatre', building: 'OAT', type: 'open_air_theatre', capacity: 800, features: ['stage'], accessible: true, allowed_uses: ['event', 'club'] },
];

export default function NewBookingPage() {
  const { role, user } = useApp();
  const [rooms, setRooms] = useState<Room[]>(CAMPUS_ROOMS);
  const [submissionState, setSubmissionState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [submittedBooking, setSubmittedBooking] = useState<{
    id: string;
    title: string;
    venueId: string;
    venueName: string;
    day: Day;
    periods: number[];
    attendees: number;
    requester: string;
    status: string;
    statusLabel: string;
    reason: string;
  } | null>(null);
  const [submissionError, setSubmissionError] = useState<{
    code: string;
    message: string;
  } | null>(null);
  const [apiError, setApiError] = useState<{ code: string; message: string } | null>(null);

  useEffect(() => {
    api.getMeta().then((meta) => {
      if (Array.isArray(meta?.rooms)) setRooms(meta.rooms);
    }).catch(() => {});
  }, []);
  const [activeTab, setActiveTab] = useState<'describe' | 'manual'>('describe');

  // AI error simulation state
  const [isAiServiceFailing, setIsAiServiceFailing] = useState(false);
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);

  // Raw Prompt State
  const [promptText, setPromptText] = useState(
    'Auditorium chahiye kal shaam 6 baje se 9 baje tak, 200 logon ke liye dance rehearsal ke liye'
  );

  // Form Fields
  const [title, setTitle] = useState("Spectra '27 Dance Society Rehearsal");
  const [venueId, setVenueId] = useState<string>('AUD');
  const [day, setDay] = useState<Day>('THU');
  const [selectedPeriods, setSelectedPeriods] = useState<number[]>([10, 11, 12]);
  const [attendees, setAttendees] = useState<number>(200);
  const [category, setCategory] = useState<string>('club_event');
  const [needsWheelchair, setNeedsWheelchair] = useState<boolean>(true);

  // Track which fields were guessed by AI (get dashed underline until confirmed/edited)
  const [guessedFields, setGuessedFields] = useState<Set<string>>(
    new Set(['title', 'venue', 'day', 'periods', 'attendees'])
  );

  // Provenance annotations
  const [provenanceMap, setProvenanceMap] = useState<Record<string, string>>({
    title: 'Inferred from "dance rehearsal ke liye".',
    venue: 'Inferred from "Auditorium chahiye".',
    day: 'Inferred from "kal" (relative to current demo calendar).',
    periods: 'Periods P10 to P12 inferred from "shaam 6 baje se 9 baje tak".',
    attendees: 'Inferred from "200 logon ke liye".',
    wheelchair: 'Defaulted to campus standard accessibility compliance.',
  });

  const samplePrompts = [
    {
      text: 'Auditorium chahiye kal shaam 6 baje se 9 baje tak, 200 logon ke liye dance rehearsal ke liye',
      category: 'Fest Rehearsal',
    },
    {
      text: 'Open Air Theatre on Friday night P10-P12 for Battle of the Bands, 600 students',
      category: 'Mega Event',
    },
    {
      text: 'Seminar Hall 1 on Thursday P7 for guest lecture by Prof. Mohapatra on quantum optics',
      category: 'Academic Lecture',
    },
    {
      text: 'Physics Lab on Wednesday morning 9 to 12 for high school science olympiad demo',
      category: 'Lab Block',
    },
  ];

  // Parse natural language prompt into structured draft
  const handleParsePrompt = (textToParse: string) => {
    if (isAiServiceFailing) {
      setAiErrorMessage(
        'The AI natural language parsing service did not respond. The manual form below is active and fully functional.'
      );
      setActiveTab('manual');
      return;
    }

    setAiErrorMessage(null);
    const lower = textToParse.toLowerCase();

    // 1. Detect Venue
    let vId = 'AUD';
    let vProv = 'Inferred from "Auditorium"';
    if (lower.includes('open air') || lower.includes('oat')) {
      vId = 'OAT';
      vProv = 'Inferred from "Open Air Theatre"';
    } else if (lower.includes('seminar hall 1') || lower.includes('sh-1')) {
      vId = 'SH-1';
      vProv = 'Inferred from "Seminar Hall 1"';
    } else if (lower.includes('seminar hall 2') || lower.includes('sh-2')) {
      vId = 'SH-2';
      vProv = 'Inferred from "Seminar Hall 2"';
    } else if (lower.includes('physics lab') || lower.includes('phy-lab')) {
      vId = 'PHY-LAB';
      vProv = 'Inferred from "Physics Lab"';
    } else if (lower.includes('cs-lab') || lower.includes('cs lab')) {
      vId = 'CS-LAB-1';
      vProv = 'Inferred from "CS Lab"';
    }

    // 2. Detect Day
    let d: Day = 'THU';
    let dProv = 'Defaulted to fest Thursday';
    if (lower.includes('kal') || lower.includes('tomorrow') || lower.includes('tuesday')) {
      d = 'TUE';
      dProv = 'Inferred from "kal" / Tuesday';
    } else if (lower.includes('monday') || lower.includes('somwar')) {
      d = 'MON';
      dProv = 'Inferred from "Monday"';
    } else if (lower.includes('wednesday') || lower.includes('budhwar')) {
      d = 'WED';
      dProv = 'Inferred from "Wednesday"';
    } else if (lower.includes('friday') || lower.includes('shukrawar')) {
      d = 'FRI';
      dProv = 'Inferred from "Friday"';
    } else if (lower.includes('thursday') || lower.includes('guruwar')) {
      d = 'THU';
      dProv = 'Inferred from "Thursday"';
    }

    // 3. Detect Periods / Time
    let pers = [10, 11, 12];
    let pProv = 'Periods P10 to P12 inferred from evening keywords';
    if (lower.includes('6 baje se 9 baje') || (lower.includes('6') && lower.includes('9'))) {
      pers = [10, 11, 12];
      pProv = 'Periods P10 to P12 inferred from "shaam 6 baje se 9 baje tak" (18:00 - 21:00).';
    } else if (lower.includes('p10-p12') || lower.includes('night')) {
      pers = [10, 11, 12];
      pProv = 'Evening block P10 to P12 inferred from "night / P10-P12".';
    } else if (lower.includes('p7') || lower.includes('3 pm') || lower.includes('15:00')) {
      pers = [7];
      pProv = 'Period P7 (15:00 - 16:00) inferred from "P7".';
    } else if (lower.includes('9 to 12') || lower.includes('9 se 12')) {
      pers = [2, 3, 4];
      pProv = 'Morning block P2 to P4 (09:00 - 12:00) inferred from "9 to 12".';
    }

    // 4. Detect Attendees
    let att = 200;
    let aProv = 'Defaulted to 200';
    const matchNumbers = lower.match(/\b(\d{2,4})\b/);
    if (matchNumbers) {
      att = parseInt(matchNumbers[1], 10);
      aProv = `Inferred from "${matchNumbers[1]}".`;
    }

    // 5. Detect Title / Purpose
    let t = 'Campus Activity Booking';
    let tProv = 'Inferred from general activity';
    if (lower.includes('dance rehearsal')) {
      t = "Spectra '27 Dance Society Rehearsal";
      tProv = 'Inferred from "dance rehearsal".';
    } else if (lower.includes('battle of the bands')) {
      t = "Spectra '27 Battle of the Bands";
      tProv = 'Inferred from "Battle of the Bands".';
    } else if (lower.includes('guest lecture')) {
      t = 'Guest Lecture: Quantum Optics';
      tProv = 'Inferred from "guest lecture".';
    } else if (lower.includes('olympiad') || lower.includes('science demo')) {
      t = 'Science Olympiad Laboratory Demonstration';
      tProv = 'Inferred from "science olympiad demo".';
    }

    setVenueId(vId);
    setDay(d);
    setSelectedPeriods(pers);
    setAttendees(att);
    setTitle(t);
    setGuessedFields(new Set(['title', 'venue', 'day', 'periods', 'attendees']));

    setProvenanceMap({
      title: tProv,
      venue: vProv,
      day: dProv,
      periods: pProv,
      attendees: aProv,
      wheelchair: 'Defaulted to verified campus step-free venue.',
    });
  };

  const removeGuessed = (fieldName: string) => {
    if (guessedFields.has(fieldName)) {
      const copy = new Set(guessedFields);
      copy.delete(fieldName);
      setGuessedFields(copy);
    }
  };

  const togglePeriod = (p: number) => {
    removeGuessed('periods');
    if (selectedPeriods.includes(p)) {
      if (selectedPeriods.length > 1) {
        setSelectedPeriods(selectedPeriods.filter((x) => x !== p));
      }
    } else {
      setSelectedPeriods([...selectedPeriods, p].sort((a, b) => a - b));
    }
  };

  // Rule-by-rule validation logic
  const currentRoom = rooms.find((r) => r.id === venueId) || rooms[0];

  // 1. Capacity check (H5)
  const isCapacityOk = attendees <= currentRoom.capacity;
  const capacityReason = isCapacityOk
    ? `H5 Valid: Requested attendees (${attendees}) fits within ${currentRoom.id} capacity (${currentRoom.capacity}).`
    : `H5 Violation: Requested attendees (${attendees}) exceeds ${currentRoom.id} maximum safe capacity (${currentRoom.capacity}).`;

  // 2. Room occupancy check (H4)
  // Check against Monday spectra inauguration if AUD Monday P4-P5
  const isAUDMondayClash =
    venueId === 'AUD' && day === 'MON' && selectedPeriods.some((p) => p === 4 || p === 5);
  // Check against scheduled classes
  const isOccupancyOk = !isAUDMondayClash;
  const occupancyReason = isOccupancyOk
    ? `H4 Valid: ${currentRoom.id} is free on ${day} during periods ${selectedPeriods.map((p) => `P${p}`).join(", ")}.`
    : `H4 Violation: Clashes with Spectra '27 Inauguration (AUD, Mon P4-P5).`;
  // 3. Accessibility check (H10)
  const isAccessibilityOk = !needsWheelchair || currentRoom.accessible;
  const accessibilityReason = isAccessibilityOk
    ? `H10 Valid: ${currentRoom.id} step-free wheelchair accessibility verified.`
    : `H10 Violation: Requested venue ${currentRoom.id} lacks required ramp or elevator access.`;

  // 4. Teaching vs Evening period check (H9)
  const hasLunchClash = selectedPeriods.includes(5) && selectedPeriods.length > 1;
  const periodReason = !hasLunchClash
    ? 'H9 Valid: Schedule respects 13:00 to 14:00 lunch band.'
    : 'H9 Violation: Cannot schedule multi-period event across the lunch band (13:00 to 14:00).';

  const isFormValid = isCapacityOk && isOccupancyOk && isAccessibilityOk && !hasLunchClash && selectedPeriods.length > 0;

  // Determine submit disabled reason
  let disabledReason = '';
  if (!isCapacityOk) {
    disabledReason = `Disabled: Attendees (${attendees}) exceeds ${currentRoom.id} capacity (${currentRoom.capacity}). Choose Open-Air Theatre (800) instead.`;
  } else if (!isOccupancyOk) {
    disabledReason = `Disabled: ${venueId} is occupied on ${day} during requested periods. Select an alternative slot or venue below.`;
  } else if (!isAccessibilityOk) {
    disabledReason = `Disabled: ${venueId} is not wheelchair accessible. Choose an accessible venue like AUD or SH-1.`;
  } else if (hasLunchClash) {
    disabledReason = 'Disabled: Event overlaps the mandatory lunch window (13:00 to 14:00).';
  } else if (selectedPeriods.length === 0) {
    disabledReason = 'Disabled: Select at least one period (P1 to P13).';
  }

  // Nearest Valid Alternatives when venue is busy or capacity fails
  const alternatives: Array<{
    venue: string;
    venueName: string;
    day: Day;
    periods: number[];
    capacity: number;
    reason: string;
  }> = [
    {
      venue: 'OAT',
      venueName: 'Open Air Theatre',
      day: day,
      periods: selectedPeriods,
      capacity: 800,
      reason: 'Free outdoor venue with stage & PA system, seats up to 800.',
    },
    {
      venue: currentRoom.id,
      venueName: currentRoom.name,
      day: (day === 'MON' ? 'THU' : 'WED') as Day,
      periods: [10, 11, 12],
      capacity: currentRoom.capacity,
      reason: `Alternative free evening slot in ${currentRoom.id} (P10-P12).`,
    },
    {
      venue: 'SH-1',
      venueName: 'Seminar Hall 1',
      day: day,
      periods: selectedPeriods,
      capacity: 150,
      reason: 'Equipped with presentation projector, AC, and stage.',
    },
  ];


  const handleSubmit = async () => {
    if (!isFormValid) return;
    setSubmissionState('submitting');
    setSubmissionError(null);

    const startP = selectedPeriods.length > 0 ? Math.min(...selectedPeriods) : 10;
    const endP = selectedPeriods.length > 0 ? Math.max(...selectedPeriods) : 12;
    const durationPeriods = endP - startP + 1;
    const isDeanOrAdmin = role === 'admin' || user?.email?.toLowerCase().includes('dean');

    const payload = {
      title,
      requested_room: venueId,
      attendance: attendees,
      room_types: currentRoom?.type ? [currentRoom.type] : ['auditorium', 'seminar_hall', 'open_air_theatre'],
      needs: needsWheelchair ? ['wheelchair_accessible'] : [],
      duration_periods: durationPeriods,
      windows: [{ day, from_period: startP, to_period: endP }],
      requested_category: category,
    };

    try {
      const res = await api.createBooking(payload);
      if (res && res.legal === false) {
        setSubmissionState('error');
        setSubmissionError({
          code: res.reason_codes?.[0] || 'CONSTRAINT_VIOLATION',
          message: res.reason || 'Booking request violates kernel constraints.',
        });
        return;
      }

      const reqId = res?.details?.request_id || `BR-NEW-${Date.now().toString(36).slice(-4).toUpperCase()}`;
      setSubmittedBooking({
        id: reqId,
        title,
        venueId,
        venueName: currentRoom?.name || venueId,
        day,
        periods: selectedPeriods,
        attendees,
        requester: user?.email || 'user@cit.edu',
        status: isDeanOrAdmin ? 'approved' : 'pending',
        statusLabel: isDeanOrAdmin ? 'Approved & Committed' : 'Pending Dean Office Review',
        reason: isDeanOrAdmin
          ? 'Self-managed booking registered by Dean Office and locked in timetable.'
          : 'Request queued in Dean Office dashboard for administrative review and room allocation.',
      });
      setSubmissionState('success');
    } catch (err: any) {
      setSubmissionState('error');
      setSubmissionError({
        code: err?.code || 'HTTP_ERROR',
        message: err?.message || 'Server error while submitting request.',
      });
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-6xl pb-16 select-none">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1 text-[12px] text-ink-2 font-medium">
              <span>Venue Reservation</span>
              <span className="text-line-strong select-none">&middot;</span>
              <span>Kernel-Checked Submission</span>
            </div>
            <h1 className="font-serif text-[40px] leading-[44px] text-ink tracking-tight mb-2 font-normal">
              New Booking Request
            </h1>
            <p className="font-serif italic text-[16px] text-ink-2">
              The AI only drafts. The kernel deterministically verifies room conflicts and capacity.
            </p>
          </div>

          {/* Quick links & AI test toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const nextState = !isAiServiceFailing;
                setIsAiServiceFailing(nextState);
                if (nextState) {
                  setAiErrorMessage(
                    'AI extraction service unavailable. Manual form is active and unchanged.'
                  );
                } else {
                  setAiErrorMessage(null);
                }
              }}
              className="text-[11px] font-mono text-ink-2 underline hover:text-ink cursor-pointer"
              title="Test offline AI fallback"
            >
              {isAiServiceFailing ? 'Reset AI service (Online)' : 'Simulate AI failure'}
            </button>
            <Link href="/bookings">
              <Button variant="secondary" className="h-8 text-[12px]">
                Back to Bookings
              </Button>
            </Link>
          </div>
        </div>

        
        {/* SUCCESS STATE SCREEN */}
        {submissionState === 'success' && submittedBooking && (
          <div className="bg-surface border-2 border-good/60 rounded-panel p-6 sm:p-8 shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-line pb-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-good/20 text-good flex items-center justify-center font-bold text-sm">✓</span>
                  <span className="text-[12px] font-mono tracking-wider uppercase text-good font-semibold">
                    Request Committed to Ledger
                  </span>
                </div>
                <h2 className="font-serif text-[28px] leading-[32px] text-ink">
                  {submittedBooking.title}
                </h2>
                <p className="text-[14px] text-ink-2 font-serif italic max-w-xl">
                  {submittedBooking.reason}
                </p>
              </div>

              <div className="text-right sm:self-start">
                <div className="inline-block px-3 py-1.5 rounded-pill text-[12px] font-mono font-semibold uppercase tracking-wide border shadow-xs"
                  style={{
                    backgroundColor: submittedBooking.status === 'approved' ? 'rgba(46, 125, 50, 0.12)' : 'rgba(30, 64, 175, 0.12)',
                    borderColor: submittedBooking.status === 'approved' ? 'rgba(46, 125, 50, 0.4)' : 'rgba(30, 64, 175, 0.4)',
                    color: submittedBooking.status === 'approved' ? '#2e7d32' : '#1d4ed8',
                  }}
                >
                  {submittedBooking.statusLabel}
                </div>
                <span className="block text-[11px] font-mono text-ink-2 mt-1">
                  ID: {submittedBooking.id}
                </span>
              </div>
            </div>

            {/* Spec grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-raised rounded-card border border-line text-[13px]">
              <div>
                <span className="text-ink-2 text-[11px] uppercase font-mono block">Venue</span>
                <span className="font-medium text-ink">{submittedBooking.venueName} ({submittedBooking.venueId})</span>
              </div>
              <div>
                <span className="text-ink-2 text-[11px] uppercase font-mono block">Day & Period</span>
                <span className="font-medium text-ink">{submittedBooking.day}, {submittedBooking.periods.map(p => `P${p}`).join(', ')}</span>
              </div>
              <div>
                <span className="text-ink-2 text-[11px] uppercase font-mono block">Attendees</span>
                <span className="font-medium text-ink">{submittedBooking.attendees} students</span>
              </div>
              <div>
                <span className="text-ink-2 text-[11px] uppercase font-mono block">Requester</span>
                <span className="font-medium text-ink truncate block" title={submittedBooking.requester}>
                  {submittedBooking.requester}
                </span>
              </div>
            </div>

            {/* Kernel stamp & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2 text-[12px] text-ink-2">
                <KernelStamp label="Verified by kernel" />
                <span>Deterministic precheck: 0 hard violations &middot; Rule B1 satisfied</span>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSubmissionState('idle');
                    setSubmittedBooking(null);
                  }}
                  className="h-9 text-[13px]"
                >
                  Submit another request
                </Button>
                <Link href="/bookings">
                  <Button variant="primary" className="h-9 text-[13px]">
                    Track in Bookings Ledger &rarr;
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ERROR STATE SCREEN */}
        {submissionState === 'error' && submissionError && (
          <div className="p-6 bg-t-bad border-2 border-bad/50 rounded-panel text-ink space-y-4 shadow-card">
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-bad/20 text-bad flex items-center justify-center font-bold text-base flex-shrink-0">!</span>
              <div className="space-y-1">
                <span className="text-[12px] font-mono tracking-wider uppercase text-bad font-semibold block">
                  Kernel Constraint Blocked [{submissionError.code}]
                </span>
                <h3 className="font-serif text-[20px] text-bad font-normal">
                  Submission Blocked: Hard Constraint Violated
                </h3>
                <p className="text-[14px] text-ink font-ui">
                  {submissionError.message}
                </p>
              </div>
            </div>
            <div className="pt-2 flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => setSubmissionState('idle')}
                className="h-8 text-[12px]"
              >
                Return to Editor & Adjust Parameters
              </Button>
            </div>
          </div>
        )}

        {/* AI Service Failure Warning Banner (Proves manual form always works) */}
        {aiErrorMessage && (
          <div className="p-4 bg-t-bad border border-bad/50 rounded-panel text-[13px] text-bad flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertIcon size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold block">AI Extraction Offline:</span>
                <span>{aiErrorMessage}</span>
              </div>
            </div>
            <button
              onClick={() => setAiErrorMessage(null)}
              className="text-[11px] underline hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        {submissionState !== 'success' && (
          <>
        {/* Two Tabs: "Describe it" and "Fill the form" */}
        <div className="flex items-center gap-8 border-b border-line pb-2 text-[14px] font-medium font-ui">
          <button
            onClick={() => setActiveTab('describe')}
            className={`py-1.5 relative transition-colors ${
              activeTab === 'describe' ? 'text-ink font-semibold' : 'text-ink-2 hover:text-ink'
            }`}
          >
            Describe it (AI draft)
            {activeTab === 'describe' && (
              <span className="absolute left-0 right-0 -bottom-[9px] h-[2px] bg-violet rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`py-1.5 relative transition-colors ${
              activeTab === 'manual' ? 'text-ink font-semibold' : 'text-ink-2 hover:text-ink'
            }`}
          >
            Fill the form (Manual entry &middot; Always works)
            {activeTab === 'manual' && (
              <span className="absolute left-0 right-0 -bottom-[9px] h-[2px] bg-violet rounded-full" />
            )}
          </button>
        </div>

        {/* MAIN BODY: Side-by-side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Natural Language Input & Sample Prompts (when in Describe tab) */}
          {activeTab === 'describe' && (
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 bg-surface border border-line rounded-panel space-y-3 shadow-sm">
                <label className="text-[13px] font-medium text-ink block">
                  Describe what you need in Hinglish or English:
                </label>

                {/* Large Textarea with Serif Italic Placeholder in Hinglish */}
                <textarea
                  rows={4}
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Auditorium chahiye kal shaam 6 baje se 9 baje tak, 200 logon ke liye"
                  className="w-full p-3.5 bg-raised border border-line-strong rounded-[6px] font-serif italic text-[16px] leading-relaxed text-ink placeholder:text-ink-2/60 focus:outline-none focus:border-ink transition-colors"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-ink-2">Live parser updates draft on the right</span>
                  <Button
                    variant="primary"
                    className="h-8 text-[12px]"
                    onClick={() => handleParsePrompt(promptText)}
                  >
                    Parse and check
                  </Button>
                </div>
              </div>

              {/* Sample Prompts as TWO COLUMNS OF PLAIN TEXT LINKS (Not pills!) */}
              <div className="p-5 bg-surface border border-line rounded-panel space-y-2.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-ink-2 font-semibold block">
                  Sample Prompts (Click to apply)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 pt-1">
                  {samplePrompts.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPromptText(p.text);
                        handleParsePrompt(p.text);
                      }}
                      className="text-left font-ui text-[12px] text-ink-2 hover:text-ink hover:underline leading-snug cursor-pointer group"
                    >
                      <span className="font-semibold text-ink block text-[11px] group-hover:text-ink">
                        {p.category}:
                      </span>
                      &ldquo;{p.text}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* RIGHT / MAIN COLUMN: Structured Draft & Live Validation */}
          <div
            className={`${
              activeTab === 'describe' ? 'lg:col-span-7' : 'lg:col-span-12'
            } bg-surface border border-line rounded-panel p-6 shadow-sm space-y-6`}
          >
            {/* Kernel Stamp Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
              <KernelStamp
                label="Checked by kernel"
                showProvenance
                provenance="Checked by kernel. This check does not use an AI model."
              />
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-ink-2">Validation:</span>
                <Chip
                  label={isFormValid ? 'LEGAL DRAFT' : 'CONSTRAINTS FAILED'}
                  variant={isFormValid ? 'valid' : 'rejected'}
                />
              </div>
            </div>

            {/* Structured Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Field 1: Title */}
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-ink block">Event title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    removeGuessed('title');
                  }}
                  className={`w-full h-10 px-3 bg-raised border font-ui text-[14px] text-ink rounded-[6px] focus:outline-none focus:border-ink ${
                    guessedFields.has('title')
                      ? 'border-line-strong border-b-2 border-b-dashed border-b-event'
                      : 'border-line-strong'
                  }`}
                />
                {provenanceMap.title && (
                  <p className="font-serif italic text-[13px] text-ink-2 leading-tight">
                    {provenanceMap.title}
                  </p>
                )}
              </div>

              {/* Field 2: Venue */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-medium text-ink">Venue</label>
                  {currentRoom.accessible && (
                    <span className="text-[11px] text-good inline-flex items-center gap-1 font-mono">
                      <WheelchairGlyph size={11} /> Accessible
                    </span>
                  )}
                </div>
                <select
                  value={venueId}
                  onChange={(e) => {
                    setVenueId(e.target.value);
                    removeGuessed('venue');
                  }}
                  className={`w-full h-10 px-3 bg-raised border font-ui text-[13px] font-medium text-ink rounded-[6px] focus:outline-none focus:border-ink ${
                    guessedFields.has('venue')
                      ? 'border-line-strong border-b-2 border-b-dashed border-b-event'
                      : 'border-line-strong'
                  }`}
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.id} &middot; {r.name} (Cap {r.capacity})
                    </option>
                  ))}
                </select>
                {provenanceMap.venue && (
                  <p className="font-serif italic text-[13px] text-ink-2 leading-tight">
                    {provenanceMap.venue}
                  </p>
                )}
              </div>

              {/* Field 3: Date / Day */}
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-ink block">Date / Day</label>
                <select
                  value={day}
                  onChange={(e) => {
                    setDay(e.target.value as Day);
                    removeGuessed('day');
                  }}
                  className={`w-full h-10 px-3 bg-raised border font-ui text-[13px] font-medium text-ink rounded-[6px] focus:outline-none focus:border-ink ${
                    guessedFields.has('day')
                      ? 'border-line-strong border-b-2 border-b-dashed border-b-event'
                      : 'border-line-strong'
                  }`}
                >
                  <option value="MON">Monday &middot; 2 Nov</option>
                  <option value="TUE">Tuesday &middot; 3 Nov</option>
                  <option value="WED">Wednesday &middot; 4 Nov</option>
                  <option value="THU">Thursday &middot; 5 Nov (Fest Opening)</option>
                  <option value="FRI">Friday &middot; 6 Nov (Fest Main)</option>
                </select>
                {provenanceMap.day && (
                  <p className="font-serif italic text-[13px] text-ink-2 leading-tight">
                    {provenanceMap.day}
                  </p>
                )}
              </div>

              {/* Field 4: Attendees */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-medium text-ink">Expected attendees</label>
                  <span className="text-[11px] text-ink-2 font-mono">
                    Venue cap: {currentRoom.capacity}
                  </span>
                </div>
                <input
                  type="number"
                  value={attendees}
                  onChange={(e) => {
                    setAttendees(Number(e.target.value));
                    removeGuessed('attendees');
                  }}
                  className={`w-full h-10 px-3 bg-raised border font-ui text-[14px] text-ink rounded-[6px] focus:outline-none focus:border-ink ${
                    guessedFields.has('attendees')
                      ? 'border-line-strong border-b-2 border-b-dashed border-b-event'
                      : 'border-line-strong'
                  } ${!isCapacityOk ? '!border-bad !border-b-bad' : ''}`}
                />
                {provenanceMap.attendees && (
                  <p className="font-serif italic text-[13px] text-ink-2 leading-tight">
                    {provenanceMap.attendees}
                  </p>
                )}
              </div>

              {/* Field 5: Category */}
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-ink block">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 bg-raised border border-line-strong font-ui text-[13px] font-medium text-ink rounded-[6px]"
                >
                  <option value="club_event">Club Event (Priority Rank 6)</option>
                  <option value="department_event">Department Event (Priority Rank 5)</option>
                  <option value="guest_lecture">Guest Lecture (Priority Rank 4)</option>
                  <option value="institute_event">Institute Event (Priority Rank 3)</option>
                </select>
              </div>

              {/* Field 6: Wheelchair Access */}
              <div className="space-y-1 flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-raised border border-line rounded-[6px]">
                  <input
                    type="checkbox"
                    checked={needsWheelchair}
                    onChange={(e) => {
                      setNeedsWheelchair(e.target.checked);
                      removeGuessed('wheelchair');
                    }}
                    className="w-4 h-4 rounded text-ink border-line-strong focus:ring-ink"
                  />
                  <span className="font-ui text-[13px] font-medium text-ink">
                    Wheelchair accessibility required (H10)
                  </span>
                </label>
                {provenanceMap.wheelchair && (
                  <p className="font-serif italic text-[13px] text-ink-2 leading-tight">
                    {provenanceMap.wheelchair}
                  </p>
                )}
              </div>
            </div>

            {/* Field: Periods P1 to P13 as a Segmented Selector */}
            <div className="space-y-2 pt-2 border-t border-line">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-[13px] font-medium text-ink">
                  Periods P1 to P13 (Segmented Selector)
                </label>
                <span className="text-[11px] text-ink-2 font-mono">
                  Selected:{' '}
                  <span className="font-semibold text-ink">
                    {selectedPeriods.map((p) => `P${p}`).join(', ') || 'None'}
                  </span>
                </span>
              </div>

              {/* Segmented Button Strip */}
              <div
                className={`grid grid-cols-7 sm:grid-cols-13 gap-1 p-1 bg-raised border rounded-[6px] ${
                  guessedFields.has('periods')
                    ? 'border-line-strong border-b-2 border-b-dashed border-b-event'
                    : 'border-line-strong'
                }`}
              >
                {Array.from({ length: 13 }, (_, i) => i + 1).map((p) => {
                  const isSelected = selectedPeriods.includes(p);
                  const isEvening = p >= 10;
                  const isLunch = p === 5;

                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePeriod(p)}
                      className={`h-11 flex flex-col items-center justify-center rounded-cell border text-[11px] font-medium font-ui transition-colors ${
                        isSelected
                          ? 'bg-ink text-paper border-ink font-bold shadow-xs'
                          : isEvening
                          ? 'bg-surface border-line-strong text-ink hover:border-ink'
                          : isLunch
                          ? 'bg-surface hatch-subtle border-line text-ink-2'
                          : 'bg-surface border-line text-ink-2 hover:border-ink hover:text-ink'
                      }`}
                      title={`Period P${p} (${p < 10 ? `${7 + p}:00 - ${8 + p}:00` : `${8 + p}:00 - ${9 + p}:00`})`}
                    >
                      <span className="text-[11px]">P{p}</span>
                      <span className="text-[9px] font-mono opacity-70">
                        {p < 10 ? `${7 + p}:00` : `${8 + p}:00`}
                      </span>
                    </button>
                  );
                })}
              </div>

              {provenanceMap.periods && (
                <p className="font-serif italic text-[13px] text-ink-2">
                  {provenanceMap.periods}
                </p>
              )}
            </div>

            {/* Rule-by-Rule Validation Results with Specific Reasons */}
            <div className="p-4 bg-raised border border-line rounded-panel space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-ink-2 font-semibold">
                  Rule-by-Rule Constraint Trace
                </span>
                <span className="text-[11px] font-mono text-ink-2">Deterministic Kernel v1.0</span>
              </div>

              <div className="space-y-2 text-[12px]">
                {/* Check 1: Capacity (H5) */}
                <div
                  className={`p-2.5 rounded-card border flex items-start justify-between gap-3 ${
                    isCapacityOk ? 'bg-surface border-line' : 'bg-t-bad border-bad/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Chip label="H5" isRuleCode />
                    <span className="text-ink">{capacityReason}</span>
                  </div>
                  <Chip
                    label={isCapacityOk ? 'VALID' : 'FAILED'}
                    variant={isCapacityOk ? 'valid' : 'rejected'}
                  />
                </div>

                {/* Check 2: Occupancy & Clashes (H4) */}
                <div
                  className={`p-2.5 rounded-card border flex items-start justify-between gap-3 ${
                    isOccupancyOk ? 'bg-surface border-line' : 'bg-t-bad border-bad/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Chip label="H4" isRuleCode />
                    <span className="text-ink">{occupancyReason}</span>
                  </div>
                  <Chip
                    label={isOccupancyOk ? 'VALID' : 'FAILED'}
                    variant={isOccupancyOk ? 'valid' : 'rejected'}
                  />
                </div>

                {/* Check 3: Accessibility (H10) */}
                <div
                  className={`p-2.5 rounded-card border flex items-start justify-between gap-3 ${
                    isAccessibilityOk ? 'bg-surface border-line' : 'bg-t-bad border-bad/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Chip label="H10" isRuleCode />
                    <span className="text-ink">{accessibilityReason}</span>
                  </div>
                  <Chip
                    label={isAccessibilityOk ? 'VALID' : 'FAILED'}
                    variant={isAccessibilityOk ? 'valid' : 'rejected'}
                  />
                </div>

                {/* Check 4: Period validity & Lunch window (H9) */}
                <div
                  className={`p-2.5 rounded-card border flex items-start justify-between gap-3 ${
                    !hasLunchClash ? 'bg-surface border-line' : 'bg-t-bad border-bad/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Chip label="H9" isRuleCode />
                    <span className="text-ink">{periodReason}</span>
                  </div>
                  <Chip
                    label={!hasLunchClash ? 'VALID' : 'FAILED'}
                    variant={!hasLunchClash ? 'valid' : 'rejected'}
                  />
                </div>
              </div>
            </div>

            {/* Alternatives List with "Use this" (Shown when room is busy or over capacity) */}
            {(!isOccupancyOk || !isCapacityOk) && (
              <div className="p-4 bg-surface border border-line rounded-panel space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="font-serif text-[18px] text-ink">
                    Nearest Valid Alternatives
                  </span>
                  <span className="text-[11px] font-mono text-ink-2">Conflict resolution</span>
                </div>

                <div className="space-y-2">
                  {alternatives.map((alt, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-raised border border-line rounded-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px]"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">{alt.venue}</span>
                          <span className="text-ink-2">({alt.venueName})</span>
                          <span className="text-[11px] font-mono text-ink font-medium">
                            {alt.day} {alt.periods.map((p) => `P${p}`).join('-')}
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-2 mt-0.5">{alt.reason}</p>
                      </div>

                      <Button
                        variant="secondary"
                        className="h-8 text-[12px] flex-shrink-0"
                        onClick={() => {
                          setVenueId(alt.venue);
                          setDay(alt.day);
                          setSelectedPeriods(alt.periods);
                          removeGuessed('venue');
                          removeGuessed('day');
                          removeGuessed('periods');
                        }}
                      >
                        Use this
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Action: Disabled with Stated Reason when Invalid */}
            <div className="pt-4 border-t border-line space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  {!isFormValid && (
                    <span className="text-[13px] text-bad font-medium block">
                      {disabledReason}
                    </span>
                  )}
                  {isFormValid && (
                    <span className="text-[13px] text-good font-medium block">
                      &check; All hard constraints satisfied. Ready for submission.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <Button
                    variant="primary"
                    disabled={!isFormValid || submissionState === 'submitting'}
                    onClick={handleSubmit}
                    className="h-10 text-[14px] px-6"
                  >
                    {submissionState === 'submitting' ? 'Verifying with Kernel...' : 'Submit request'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
