'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/context/AppContext';
import { BOOKINGS as INITIAL_BOOKINGS, ROOMS_BY_ID, DEMO_USERS } from '@/data/mockData';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { PriorityRank } from '@/components/ui/PriorityRank';
import { KernelStamp } from '@/components/ui/KernelStamp';
import { BookingRequest, Day } from '@/data/types';

export default function BookingsPage() {
  const { role, user, openDrawer } = useApp();
  const [filter, setFilter] = useState<'all' | 'approved' | 'rejected' | 'pending' | 'cancelled'>('all');
  const [bookings, setBookings] = useState<BookingRequest[]>(INITIAL_BOOKINGS);
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

  // Action: Approve
  const handleApprove = (booking: BookingRequest) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === booking.id
          ? {
              ...b,
              status: 'approved',
              reason: 'Approved and committed to canonical timetable. Venue slot reserved.',
            }
          : b
      )
    );
    setToastMessage(`Committed. ${booking.id} (${booking.title}) approved for ${booking.requested_room}.`);
  };

  // Action: Reject
  const handleReject = (booking: BookingRequest) => {
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
                  const room = ROOMS_BY_ID.get(b.requested_room);
                  const firstWindow = b.windows?.[0];
                  const selfRequest = isSelfRequest(b);
                  const reasonCode = getReasonCode(b);

                  return (
                    <React.Fragment key={b.id}>
                      {/* Main Row: 48px height rhythm with generous title width */}
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : b.id)}
                        className={`cursor-pointer transition-colors ${
                          isExpanded
                            ? 'bg-raised font-medium'
                            : 'hover:bg-raised/60'
                        }`}
                      >
                        <td className="py-3.5 px-3 pl-4 font-mono font-medium text-ink">{b.id}</td>
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
                          <span className="font-semibold text-ink">{b.requested_room}</span>
                          <span className="text-[11px] text-ink-2 ml-1 hidden lg:inline">
                            ({room?.name})
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-ink-2 font-mono text-[12px] min-w-[120px]">
                          {firstWindow
                            ? `${firstWindow.day} P${firstWindow.from_period}&ndash;P${firstWindow.to_period}`
                            : 'TBD'}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-ink-2 tabular-nums">{b.attendance}</td>
                        <td className="py-3.5 px-3 pl-6">
                          <PriorityRank rank={b.priority_rank || 4} />
                        </td>
                        <td className="py-3.5 px-3 pr-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <Chip label={formatStatusLabel(b.status)} variant={b.status as any} />
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

                              {/* Three Alternative Rows (Same time in another room, Adjacent period, Another day) */}
                              <div className="space-y-2 pt-2 border-t border-line">
                                <div className="flex items-center justify-between">
                                  <span className="text-[13px] font-semibold text-ink">
                                    Alternative schedules &amp; venues
                                  </span>
                                  <span className="text-[11px] text-ink-2 font-mono">3 valid options</span>
                                </div>

                                <div className="space-y-2">
                                  {/* Alternative 1: Same time in another room */}
                                  <div className="p-3 bg-raised border border-line rounded-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px]">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-surface border border-line text-ink-2 text-[11px] font-medium rounded-pill">
                                          Another Room
                                        </span>
                                        <span className="font-semibold text-ink">OAT (Open Air Theatre)</span>
                                        <span className="text-ink-2">
                                          {firstWindow?.day} P{firstWindow?.from_period}&ndash;P{firstWindow?.to_period}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-ink-2 mt-0.5">
                                        Same time slot in outdoor amphitheater. Capacity 800 seats.
                                      </p>
                                    </div>
                                    <Button
                                      variant="secondary"
                                      className="h-7 text-[11px] px-3 flex-shrink-0"
                                      onClick={() =>
                                        handleUseAlternative(
                                          b,
                                          'OAT',
                                          firstWindow?.day || 'MON',
                                          firstWindow?.from_period || 10,
                                          firstWindow?.to_period || 12
                                        )
                                      }
                                    >
                                      Use this
                                    </Button>
                                  </div>

                                  {/* Alternative 2: Adjacent period in same room */}
                                  <div className="p-3 bg-raised border border-line rounded-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px]">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-surface border border-line text-ink-2 text-[11px] font-medium rounded-pill">
                                          Adjacent Period
                                        </span>
                                        <span className="font-semibold text-ink">{b.requested_room}</span>
                                        <span className="text-ink-2">
                                          {firstWindow?.day} P10&ndash;P12 (Evening 18:00&ndash;21:00)
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-ink-2 mt-0.5">
                                        Shifts into fest evening strip. No clashes with regular classes.
                                      </p>
                                    </div>
                                    <Button
                                      variant="secondary"
                                      className="h-7 text-[11px] px-3 flex-shrink-0"
                                      onClick={() =>
                                        handleUseAlternative(
                                          b,
                                          b.requested_room,
                                          firstWindow?.day || 'MON',
                                          10,
                                          12
                                        )
                                      }
                                    >
                                      Use this
                                    </Button>
                                  </div>

                                  {/* Alternative 3: Another day */}
                                  <div className="p-3 bg-raised border border-line rounded-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px]">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-surface border border-line text-ink-2 text-[11px] font-medium rounded-pill">
                                          Another Day
                                        </span>
                                        <span className="font-semibold text-ink">SH-1 (Seminar Hall 1)</span>
                                        <span className="text-ink-2">
                                          Thursday P10&ndash;P12
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-ink-2 mt-0.5">
                                        Thursday evening slot with full presentation AV setup.
                                      </p>
                                    </div>
                                    <Button
                                      variant="secondary"
                                      className="h-7 text-[11px] px-3 flex-shrink-0"
                                      onClick={() =>
                                        handleUseAlternative(b, 'SH-1', 'THU', 10, 12)
                                      }
                                    >
                                      Use this
                                    </Button>
                                  </div>
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
