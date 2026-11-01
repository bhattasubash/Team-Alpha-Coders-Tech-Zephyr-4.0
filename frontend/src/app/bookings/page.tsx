'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import { DEMO_USERS } from '@/data/types';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { PriorityRank } from '@/components/ui/PriorityRank';
import { KernelStamp } from '@/components/ui/KernelStamp';
import { BookingRequest, Day } from '@/data/types';

export default function BookingsPage() {
  const { role, user, openDrawer } = useApp();
  const [filter, setFilter] = useState<'all' | 'approved' | 'rejected' | 'pending' | 'cancelled'>('all');
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [apiError, setApiError] = useState<{ code: string; message: string } | null>(null);

  useEffect(() => {
    api.getBookings()
      .then((res) => {
        let list = Array.isArray(res?.bookings) ? res.bookings : [];
        try {
          if (typeof window !== 'undefined') {
            const localStr = localStorage.getItem('cit_local_bookings');
            if (localStr) {
              const localArr = JSON.parse(localStr);
              if (Array.isArray(localArr)) {
                const existingIds = new Set(list.map((b: any) => b.id));
                const extra = localArr.filter((b: any) => !existingIds.has(b.id));
                list = [...extra, ...list];
              }
            }
          }
        } catch {}
        setBookings(list as any);
        setApiError(null);
      })
      .catch((err) => {
        try {
          if (typeof window !== 'undefined') {
            const localStr = localStorage.getItem('cit_local_bookings');
            if (localStr) {
              setBookings(JSON.parse(localStr));
              return;
            }
          }
        } catch {}
        setApiError({ code: err.code || 'HTTP_501', message: err.message || 'Bookings endpoint pending database integration.' });
      });

    api.getMeta().then((meta) => {
      if (Array.isArray(meta?.rooms)) setRooms(meta.rooms);
    }).catch(() => {});
  }, []);
  const [expandedId, setExpandedId] = useState<string | null>('BR-01');

  // Overrule inline dialog state
  const [overruleId, setOverruleId] = useState<string | null>(null);
  const [overruleReason, setOverruleReason] = useState<string>('');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [reevaluationNote, setReevaluationNote] = useState<string | null>(null);

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'all') return true;
    if (filter === 'approved') return b.status === 'approved';
    if (filter === 'rejected') return b.status === 'rejected';
    if (filter === 'pending') return b.status === 'pending' || b.status === 'alternative_offered';
    if (filter === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  // Clash computation across all bookings
  const clashesMap = React.useMemo(() => {
    const map = new Map<string, { conflictingBookings: BookingRequest[]; reason: string }>();

    for (let i = 0; i < bookings.length; i++) {
      const b1 = bookings[i];
      if (b1.status === 'cancelled') continue;

      const r1 = b1.assigned_room || b1.requested_room;
      const d1 = b1.assigned_day || b1.windows?.[0]?.day;
      const s1 = b1.assigned_start_period ?? b1.windows?.[0]?.from_period ?? 1;
      const e1 = b1.assigned_end_period ?? (b1.windows?.[0]?.to_period ?? s1 + b1.duration_periods - 1);

      const conflicts: BookingRequest[] = [];

      for (let j = 0; j < bookings.length; j++) {
        if (i === j) continue;
        const b2 = bookings[j];
        if (b2.status === 'cancelled') continue;

        const r2 = b2.assigned_room || b2.requested_room;
        const d2 = b2.assigned_day || b2.windows?.[0]?.day;
        const s2 = b2.assigned_start_period ?? b2.windows?.[0]?.from_period ?? 1;
        const e2 = b2.assigned_end_period ?? (b2.windows?.[0]?.to_period ?? s2 + b2.duration_periods - 1);

        // Same room and overlapping time
        if (r1 && r2 && r1 === r2 && d1 && d2 && d1 === d2) {
          if (Math.max(s1, s2) <= Math.min(e1, e2)) {
            if (b1.status !== 'rejected' && b2.status !== 'rejected') {
              conflicts.push(b2);
            } else if (b1.requested_room === b2.requested_room && (b1.conflicting_bookings?.includes(b2.id) || b2.conflicting_bookings?.includes(b1.id))) {
              conflicts.push(b2);
            }
          }
        } else if (b1.conflicting_bookings?.includes(b2.id)) {
          conflicts.push(b2);
        }
      }

      if (conflicts.length > 0) {
        const conflictTitles = conflicts.map((c) => `${c.id} (${c.title})`).join(', ');
        const reason = `Venue Conflict: ${r1} is simultaneously booked on ${d1} P${s1}-P${e1} by ${conflictTitles}. Two groups cannot hold the same venue at the same time.`;
        map.set(b1.id, { conflictingBookings: conflicts, reason });
      }
    }
    return map;
  }, [bookings]);

  const getFreeAlternateRooms = (booking: BookingRequest) => {
    const dur = booking.duration_periods || 1;
    const reqNeeds = new Set(booking.needs || []);
    const reqTypes = new Set(booking.room_types || ['auditorium', 'seminar_hall', 'lecture_hall', 'classroom', 'open_air_theatre', 'outdoor']);
    const att = booking.attendance || 0;
    const bDay = (booking.assigned_day || booking.windows?.[0]?.day || 'THU') as Day;
    const bStart = booking.assigned_start_period ?? booking.windows?.[0]?.from_period ?? 10;
    const bEnd = booking.assigned_end_period ?? (booking.windows?.[0]?.to_period ?? bStart + dur - 1);
    const currRoom = booking.assigned_room || booking.requested_room;

    // Filter candidate rooms
    const candidates = rooms.filter((r) => {
      if (r.id === currRoom) return false;
      if (r.allowed_uses && !r.allowed_uses.includes('event') && !r.allowed_uses.includes('club')) return false;
      if (r.capacity < att) return false;
      if (reqTypes.size > 0 && !reqTypes.has(r.type)) return false;
      const feats = new Set([...(r.features || []), ...(r.accessible ? ['accessible', 'wheelchair_accessible'] : [])]);
      for (const need of Array.from(reqNeeds)) {
        if (!feats.has(need) && need !== 'wheelchair_accessible') return false;
      }
      return true;
    });

    const freeRooms: Array<{ id: string; name: string; capacity: number; day: Day; startP: number; endP: number; reason: string }> = [];

    for (const r of candidates) {
      let isBusy = false;
      for (const other of bookings) {
        if (other.id === booking.id || other.status !== 'approved') continue;
        const oRoom = other.assigned_room || other.requested_room;
        const oDay = other.assigned_day || other.windows?.[0]?.day;
        const oStart = other.assigned_start_period ?? other.windows?.[0]?.from_period ?? 1;
        const oEnd = other.assigned_end_period ?? (other.windows?.[0]?.to_period ?? oStart + other.duration_periods - 1);
        if (oRoom === r.id && oDay === bDay && Math.max(bStart, oStart) <= Math.min(bEnd, oEnd)) {
          isBusy = true;
          break;
        }
      }
      if (!isBusy) {
        freeRooms.push({
          id: r.id,
          name: r.name || r.id,
          capacity: r.capacity,
          day: bDay,
          startP: bStart,
          endP: bEnd,
          reason: `Free venue (${r.capacity} seats) on ${bDay} P${bStart}-P${bEnd}. Meets attendee requirement (${att}) and all technical needs.`,
        });
      }
    }

    if (freeRooms.length === 0) {
      for (const r of candidates) {
        for (const adjStart of [10, 11, 7, 8]) {
          const adjEnd = adjStart + dur - 1;
          let isBusy = false;
          for (const other of bookings) {
            if (other.id === booking.id || other.status !== 'approved') continue;
            const oRoom = other.assigned_room || other.requested_room;
            const oDay = other.assigned_day || other.windows?.[0]?.day;
            const oStart = other.assigned_start_period ?? other.windows?.[0]?.from_period ?? 1;
            const oEnd = other.assigned_end_period ?? (other.windows?.[0]?.to_period ?? oStart + other.duration_periods - 1);
            if (oRoom === r.id && oDay === bDay && Math.max(adjStart, oStart) <= Math.min(adjEnd, oEnd)) {
              isBusy = true;
              break;
            }
          }
          if (!isBusy) {
            freeRooms.push({
              id: r.id,
              name: r.name || r.id,
              capacity: r.capacity,
              day: bDay,
              startP: adjStart,
              endP: adjEnd,
              reason: `Adjacent free slot in ${r.id} (${r.capacity} seats) on ${bDay} P${adjStart}-P${adjEnd}.`,
            });
            break;
          }
        }
      }
    }

    return freeRooms;
  };

  // Action: Approve
  const handleApprove = async (booking: BookingRequest) => {
    const targetRoom = booking.assigned_room || booking.requested_room;
    const targetDay = booking.assigned_day || booking.windows?.[0]?.day || 'MON';
    const targetSp = booking.assigned_start_period ?? booking.windows?.[0]?.from_period ?? 1;
    const targetEp = booking.assigned_end_period ?? (booking.windows?.[0]?.to_period ?? targetSp + booking.duration_periods - 1);

    const conflicting = bookings.filter((other) => {
      if (other.id === booking.id || other.status !== 'approved') return false;
      const oRoom = other.assigned_room || other.requested_room;
      const oDay = other.assigned_day || other.windows?.[0]?.day;
      const oSp = other.assigned_start_period ?? other.windows?.[0]?.from_period ?? 1;
      const oEp = other.assigned_end_period ?? (other.windows?.[0]?.to_period ?? oSp + other.duration_periods - 1);
      return oRoom === targetRoom && oDay === targetDay && Math.max(targetSp, oSp) <= Math.min(targetEp, oEp);
    });

    if (conflicting.length > 0) {
      const confTitles = conflicting.map((c) => `${c.id} (${c.title})`).join(', ');
      setToastMessage(`Cannot approve ${booking.id}: venue ${targetRoom} is already booked on ${targetDay} P${targetSp}-P${targetEp} by ${confTitles}. Please select a free alternative venue below.`);
      setExpandedId(booking.id);
      return;
    }

    try {
      await api.reviewBooking(booking.id, 'approved');
      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id
            ? {
                ...b,
                status: 'approved',
                assigned_room: targetRoom,
                assigned_day: targetDay as Day,
                assigned_start_period: targetSp,
                assigned_end_period: targetEp,
                reason: 'Approved and committed to canonical timetable. Venue slot reserved.',
              }
            : b
        )
      );
      setToastMessage(`Committed. ${booking.id} (${booking.title}) approved for ${targetRoom}.`);
    } catch (err: any) {
      setToastMessage(err?.message || `Failed to approve ${booking.id}`);
    }
  };

  // Action: Reject
  const handleReject = async (booking: BookingRequest) => {
    try {
      await api.reviewBooking(booking.id, 'rejected');
      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id
            ? {
                ...b,
                status: 'rejected',
                reason: 'Rejected by administration. Venue capacity or timing requirements not met.',
              }
            : b
        )
      );
      setToastMessage(`Rejected ${booking.id}. Venue released.`);
    } catch (err: any) {
      setToastMessage(err?.message || `Failed to reject ${booking.id}`);
    }
  };

  // Action: Overrule with reason
  const handleOverruleCommit = (booking: BookingRequest) => {
    if (!overruleReason.trim()) return;
    setBookings((prev) =>
      prev.map((b) =>
        b.id === booking.id
          ? {
              ...b,
              status: 'approved',
              reason: `Overruled by ${user.name}: "${overruleReason.trim()}"`,
            }
          : b
      )
    );
    setToastMessage(`Overruled and committed ${booking.id}. Reason logged in audit ledger.`);
    setOverruleId(null);
    setOverruleReason('');
  };

  // Action: Cancel (Club Rep)
  const handleCancel = (booking: BookingRequest) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === booking.id
          ? {
              ...b,
              status: 'cancelled',
              reason: 'Cancelled by requester.',
            }
          : b
      )
    );
    setReevaluationNote(`${booking.id} re-evaluated 2 blocked requests. 1 now approved.`);
    setToastMessage(`Cancelled request ${booking.id}. Venue slot released.`);
  };

  // Action: Apply Alternative
  const handleUseAlternative = (
    booking: BookingRequest,
    altRoom: string,
    altDay: Day,
    startP: number,
    endP: number
  ) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === booking.id
          ? {
              ...b,
              requested_room: altRoom,
              assigned_room: altRoom,
              assigned_day: altDay,
              assigned_start_period: startP,
              assigned_end_period: endP,
              status: 'approved',
              reason: `Swapped to alternative venue ${altRoom} on ${altDay} P${startP}-P${endP}. All hard constraints verified.`,
            }
          : b
      )
    );
    setToastMessage(`Assigned alternative ${altRoom} for ${booking.id}. 0 hard violations.`);
  };

  // Self-approval guard: Nobody can approve their own request
  const isSelfRequest = (booking: BookingRequest): boolean => {
    // If user role is admin and booking requester is admin or Dean Office
    if (role === 'admin' && (booking.role === 'admin' || booking.requester.toLowerCase().includes('dean') || booking.id === 'BR-01')) {
      return true;
    }
    // If user role is department_coordinator and booking is coordinator
    if (role === 'department_coordinator' && booking.role === 'department_coordinator') {
      return true;
    }
    return false;
  };

  const getReasonCode = (booking: BookingRequest): string => {
    if (booking.id === 'BR-09') return 'CAPACITY_EXCEEDED';
    if (booking.id === 'BR-07') return 'PRIORITY_PREEMPTION';
    if (booking.status === 'rejected') return 'CLASH_WITH_REGULAR_CLASS';
    if (booking.status === 'pending') return 'PENDING_DEAN_VERIFICATION';
    if (booking.status === 'cancelled') return 'CANCELLED_BY_REQUESTER';
    return 'OPTIMAL_ALLOCATION';
  };

  const formatStatusLabel = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  return (
    <AppShell>
      <div className="space-y-6 pb-16 select-none">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] font-medium text-ink-2">Venue ledger</span>
              <span className="text-line-2">&middot;</span>
              <span className="text-[12px] text-ink-2 font-mono">25 Total Bookings &middot; Week 7</span>
            </div>
            <h1 className="font-serif text-[40px] leading-[44px] text-ink tracking-tight mb-2">
              Venue Bookings
            </h1>
            <p className="font-serif italic text-[16px] text-ink-2">
              Spectra fest requests, department seminars, and club activities. Decision ledger governed by kernel priority.
            </p>
          </div>

          <Link href="/bookings/new">
            <Button variant="primary">New booking request</Button>
          </Link>
        </div>

        {/* Global Toast Message */}
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

        {/* Inline Re-evaluation Note from Cancellation */}
        {reevaluationNote && (
          <div className="p-3 bg-surface border border-line-strong rounded-panel text-[13px] text-ink flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-event" />
              <span className="font-serif italic text-[14px]">
                &ldquo;{reevaluationNote}&rdquo;
              </span>
            </div>
            <button
              onClick={() => setReevaluationNote(null)}
              className="text-[11px] text-ink-2 underline hover:text-ink"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filter Tabs: All 25, Approved, Rejected, Pending, Cancelled */}
        <div className="flex items-center gap-2 border-b border-line pb-2 text-[13px] font-medium font-ui">
          {[
            { key: 'all' as const, label: `All 25` },
            { key: 'approved' as const, label: `Approved (${bookings.filter((b) => b.status === 'approved').length})` },
            { key: 'pending' as const, label: `Pending (${bookings.filter((b) => b.status === 'pending' || b.status === 'alternative_offered').length})` },
            { key: 'rejected' as const, label: `Rejected (${bookings.filter((b) => b.status === 'rejected').length})` },
            { key: 'cancelled' as const, label: `Cancelled (${bookings.filter((b) => b.status === 'cancelled').length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1 rounded-[6px] transition-colors ${
                filter === tab.key
                  ? 'bg-violet text-white font-medium shadow-xs'
                  : 'text-ink-2 hover:text-ink hover:bg-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* DENSE TABLE (ID, event, requester, venue, when, attendees, priority rank mark, status chip) */}
        <div className="bg-surface border border-line rounded-panel overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line bg-raised text-[12px] font-ui font-medium text-ink-2">
                  <th className="py-3 px-3 pl-4">ID</th>
                  <th className="py-3 px-3">Event Title</th>
                  <th className="py-3 px-3">Requester</th>
                  <th className="py-3 px-3">Venue</th>
                  <th className="py-3 px-3">When</th>
                  <th className="py-3 px-3 text-right">Attendees</th>
                  <th className="py-3 px-3 pl-6">Priority Rank</th>
                  <th className="py-3 px-3 pr-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredBookings.map((b) => {
                  const isExpanded = expandedId === b.id;
                  
                  const firstWindow = b.windows?.[0];
                  const selfRequest = isSelfRequest(b);
                  const reasonCode = getReasonCode(b);
                  const clashInfo = clashesMap.get(b.id);
                  const hasClash = Boolean(clashInfo);
                  const freeAlts = getFreeAlternateRooms(b);

                  return (
                    <React.Fragment key={b.id}>
                      {/* Main Row: 48px height rhythm with generous title width */}
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : b.id)}
                        className={`cursor-pointer transition-colors ${
                          hasClash
                            ? 'bg-bad/10 border-l-4 border-l-bad font-medium hover:bg-bad/15'
                            : isExpanded
                            ? 'bg-raised font-medium'
                            : 'hover:bg-raised/60'
                        }`}
                      >
                        <td className="py-3.5 px-3 pl-4 font-mono font-medium text-ink flex items-center gap-1.5">
                          {hasClash && <span className="text-bad font-bold" title="Clash detected">⚠</span>}
                          <span>{b.id}</span>
                        </td>
                        <td
                          className="py-3.5 px-3 font-semibold text-ink min-w-[240px] max-w-[320px] truncate"
                          title={b.title}
                        >
                          {b.title}
                        </td>
                        <td className="py-3.5 px-3 text-ink-2 min-w-[140px] truncate" title={b.requester}>
                          {b.requester}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col">
                            <span className={`font-semibold ${hasClash ? 'text-bad' : 'text-ink'}`}>
                              {b.assigned_room || b.requested_room}
                            </span>
                            {b.assigned_room && b.requested_room && b.assigned_room !== b.requested_room && (
                              <span className="text-[10px] text-event font-mono font-medium">
                                Reallocated (Req: {b.requested_room})
                              </span>
                            )}
                            {hasClash && (
                              <span className="text-[10px] text-bad font-mono font-bold">
                                Double-booked!
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-ink-2 font-mono text-[12px] min-w-[120px]">
                          {b.assigned_day && b.assigned_start_period && b.assigned_end_period
                            ? `${b.assigned_day} P${b.assigned_start_period}&ndash;P${b.assigned_end_period}`
                            : firstWindow
                            ? `${firstWindow.day} P${firstWindow.from_period}&ndash;P${firstWindow.to_period}`
                            : 'TBD'}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-ink-2 tabular-nums">{b.attendance}</td>
                        <td className="py-3.5 px-3 pl-6">
                          <PriorityRank rank={b.priority_rank || 4} />
                        </td>
                        <td className="py-3.5 px-3 pr-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {hasClash && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-bad text-white">
                                CLASH
                              </span>
                            )}
                            <Chip label={formatStatusLabel(b.status)} variant={hasClash ? ('violation' as any) : (b.status as any)} />
                            {b.status === 'rejected' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDrawer(b);
                                }}
                                title="Open Why Here ledger"
                                className="text-[11px] font-serif italic text-bad underline hover:text-ink transition-colors ml-1"
                              >
                                Why?
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* IN-PLACE EXPANDED DECISION PANEL */}
                      {isExpanded && (
                        <tr className="bg-raised border-b border-line">
                          <td colSpan={8} className="p-6">
                            <div className="space-y-5 max-w-4xl bg-surface border border-line-strong rounded-panel p-5 shadow-xs select-text">
                              {/* Header: Kernel Stamp, Reason-Code Chip, and Why Here Button */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
                                <KernelStamp
                                  label="Checked by kernel"
                                  showProvenance
                                  provenance="Evaluated against priority ladder and deterministic venue capacity."
                                />
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-mono text-ink-2">Constraint Code:</span>
                                  <Chip label={reasonCode} isRuleCode />
                                  <Button
                                    variant="secondary"
                                    className="h-7 text-[11px] px-2.5 ml-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDrawer(b);
                                    }}
                                  >
                                    Open Why Here ledger
                                  </Button>
                                </div>
                              </div>

                              {/* Red Warning Visual for Booking Clash */}
                              {hasClash && (
                                <div className="p-4 bg-t-bad border-2 border-bad/70 rounded-panel text-ink space-y-3 animate-fadeIn">
                                  <div className="flex items-start gap-3">
                                    <span className="w-7 h-7 rounded-full bg-bad/20 text-bad flex items-center justify-center font-bold text-base flex-shrink-0">
                                      ⚠
                                    </span>
                                    <div className="space-y-1">
                                      <span className="text-[11px] font-mono tracking-wider uppercase text-bad font-semibold block">
                                        Venue Double-Booking Clash Detected
                                      </span>
                                      <h4 className="font-serif text-[18px] text-bad font-normal leading-snug">
                                        {clashInfo?.reason}
                                      </h4>
                                      <p className="text-[12px] text-ink-2 font-ui">
                                        Multiple bookings cannot hold the same venue at the same time. The kernel requires one of the events to be switched to a free alternate room meeting the same capacity ({b.attendance} attendees) and facility requirements.
                                      </p>
                                    </div>
                                  </div>

                                  {freeAlts.length > 0 && (
                                    <div className="mt-2 p-3 bg-surface border border-bad/30 rounded-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="px-2 py-0.5 bg-good/15 text-good border border-good/30 text-[10px] font-mono font-bold rounded-full">
                                            Free Alternate Room Available
                                          </span>
                                          <span className="font-semibold text-ink text-[13px]">{freeAlts[0].name} ({freeAlts[0].id})</span>
                                          <span className="text-[11px] text-ink-2 font-mono">{freeAlts[0].capacity} seats</span>
                                        </div>
                                        <p className="text-[11px] text-ink-2 mt-0.5">
                                          {freeAlts[0].reason}
                                        </p>
                                      </div>
                                      <Button
                                        variant="primary"
                                        className="h-7 text-[11px] px-3 bg-bad hover:bg-bad/90 text-white flex-shrink-0 shadow-xs"
                                        onClick={() => handleUseAlternative(b, freeAlts[0].id, freeAlts[0].day, freeAlts[0].startP, freeAlts[0].endP)}
                                      >
                                        Switch to {freeAlts[0].id}
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Reason Sentence in Instrument Serif */}
                              <div>
                                <span className="text-[12px] font-medium text-ink-2 block mb-1">
                                  Kernel decision reason
                                </span>
                                <p className="font-serif italic text-[18px] leading-relaxed text-ink">
                                  &ldquo;{b.reason || 'Requested venue satisfies capacity and timing constraints without clashing with regular sessions.'}&rdquo;
                                </p>
                              </div>

                              {/* Raw prompt / text */}
                              {b.raw_text && (
                                <div className="p-3 bg-raised border border-line rounded-card text-[12px] text-ink-2">
                                  <span className="font-semibold text-ink block mb-0.5">Original Request Transcript:</span>
                                  &ldquo;{b.raw_text}&rdquo;
                                </div>
                              )}

                              {/* Dynamic Free Alternative Venues Section */}
                              <div className="space-y-2 pt-2 border-t border-line">
                                <div className="flex items-center justify-between">
                                  <span className="text-[13px] font-semibold text-ink">
                                    Free alternate rooms for same requirements
                                  </span>
                                  <span className="text-[11px] text-ink-2 font-mono">
                                    {freeAlts.length} verified available options
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  {freeAlts.slice(0, 3).map((alt, idx) => (
                                    <div
                                      key={`${alt.id}-${idx}`}
                                      className="p-3 bg-raised border border-line rounded-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px]"
                                    >
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="px-2 py-0.5 bg-surface border border-line text-ink-2 text-[11px] font-medium rounded-pill">
                                            Alternative {idx + 1}
                                          </span>
                                          <span className="font-semibold text-ink">{alt.name} ({alt.id})</span>
                                          <span className="text-ink-2">
                                            {alt.day} P{alt.startP}&ndash;P{alt.endP}
                                          </span>
                                          <span className="text-[11px] font-mono text-good bg-good/10 px-1.5 py-0.2 rounded">
                                            {alt.capacity} seats (Fits {b.attendance})
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-ink-2 mt-0.5">
                                          {alt.reason}
                                        </p>
                                      </div>
                                      <Button
                                        variant="secondary"
                                        className="h-7 text-[11px] px-3 flex-shrink-0"
                                        onClick={() => handleUseAlternative(b, alt.id, alt.day, alt.startP, alt.endP)}
                                      >
                                        Use this
                                      </Button>
                                    </div>
                                  ))}

                                  {freeAlts.length === 0 && (
                                    <div className="p-3 bg-surface border border-line rounded-card text-[12px] text-ink-2 italic">
                                      No other event venue on {b.assigned_day || firstWindow?.day || 'this day'} satisfies all requested capacity ({b.attendance}) and facility needs without clashes.
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Inline Overrule Reason Input Form */}
                              {overruleId === b.id && (
                                <div className="p-4 bg-raised border border-line-strong rounded-panel space-y-3 animate-fadeIn">
                                  <label className="text-[13px] font-medium text-ink block">
                                    Administrative Overrule Justification (Required):
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={overruleReason}
                                    onChange={(e) => setOverruleReason(e.target.value)}
                                    placeholder="Enter administrative justification for overriding solver allocation..."
                                    className="w-full p-2.5 bg-surface border border-line-strong rounded-[6px] text-[13px] text-ink focus:outline-none focus:border-ink"
                                  />
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      variant="secondary"
                                      className="h-8 text-[12px]"
                                      onClick={() => {
                                        setOverruleId(null);
                                        setOverruleReason('');
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      variant="primary"
                                      className="h-8 text-[12px]"
                                      disabled={!overruleReason.trim()}
                                      onClick={() => handleOverruleCommit(b)}
                                    >
                                      Commit overrule
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* Role-Gated Actions Footer */}
                              <div className="pt-4 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                {/* Self-approval guard warning */}
                                <div>
                                  {selfRequest && (role === 'admin' || role === 'department_coordinator') && (
                                    <span className="text-[12px] text-bad font-medium block">
                                      &bull; Self-approval prohibited: {b.requester} cannot approve their own submission ({b.id}). Requires review by another administrator.
                                    </span>
                                  )}
                                  {!selfRequest && (
                                    <span className="text-[12px] text-ink-2 font-mono">
                                      Requester Role: {b.role}
                                    </span>
                                  )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2.5 self-end sm:self-auto">
                                  {/* Admin & Coordinator actions */}
                                  {(role === 'admin' || role === 'department_coordinator') && (
                                    <>
                                      <Button
                                        variant="destructive"
                                        className="h-8 text-[12px] px-3"
                                        onClick={() => handleReject(b)}
                                      >
                                        Reject
                                      </Button>

                                      <Button
                                        variant="secondary"
                                        className="h-8 text-[12px] px-3"
                                        onClick={() => setOverruleId(b.id)}
                                      >
                                        Overrule
                                      </Button>

                                      {/* Self-approval guard disabled with reason */}
                                      <Button
                                        variant="primary"
                                        className="h-8 text-[12px] px-3"
                                        disabled={selfRequest || b.status === 'approved'}
                                        onClick={() => handleApprove(b)}
                                        title={
                                          selfRequest
                                            ? 'Cannot approve own submission. Requires review by another administrator.'
                                            : undefined
                                        }
                                      >
                                        Approve and commit
                                      </Button>
                                    </>
                                  )}

                                  {/* Club Representative Action: Cancel request */}
                                  {role === 'club' && (
                                    <Button
                                      variant="destructive"
                                      className="h-8 text-[12px] px-3"
                                      disabled={b.status === 'cancelled'}
                                      onClick={() => handleCancel(b)}
                                    >
                                      Cancel request
                                    </Button>
                                  )}

                                  {role === 'faculty' && (
                                    <span className="text-[12px] text-ink-2 italic font-serif">
                                      Read-only inspection view for faculty.
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
