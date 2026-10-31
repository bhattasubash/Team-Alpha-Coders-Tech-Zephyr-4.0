'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Drawer } from '@/components/ui/Drawer';
import { Chip } from '@/components/ui/Chip';
import { KernelStamp } from '@/components/ui/KernelStamp';
import { ROOMS_BY_ID } from '@/data/mockData';

export function WhyHereDrawer() {
  const { drawerTarget, closeDrawer } = useApp();
  const [viewMode, setViewMode] = useState<'trace' | 'plain'>('trace');

  if (!drawerTarget) return null;

  const room = ROOMS_BY_ID.get(drawerTarget.room);

  // Footer toggle: Rule trace (default) vs Plain language
  const footerToggle = (
    <div className="flex items-center justify-between w-full font-ui">
      <div className="flex items-center gap-1.5 text-[11px] text-ink-2">
        <span className="w-1.5 h-1.5 rounded-full bg-good" />
        <span>Solver Mode</span>
      </div>

      <div
        role="group"
        aria-label="Explanation view mode"
        className="inline-flex items-center border border-line-strong rounded-[6px] p-0.5 bg-raised text-[12px] font-medium"
      >
        <button
          onClick={() => setViewMode('trace')}
          className={`px-3 py-1 rounded-[4px] transition-colors ${
            viewMode === 'trace'
              ? 'bg-surface text-ink font-semibold shadow-sm'
              : 'text-ink-2 hover:text-ink'
          }`}
        >
          Rule trace
        </button>
        <button
          onClick={() => setViewMode('plain')}
          className={`px-3 py-1 rounded-[4px] transition-colors ${
            viewMode === 'plain'
              ? 'bg-surface text-ink font-semibold shadow-sm'
              : 'text-ink-2 hover:text-ink'
          }`}
        >
          Plain language
        </button>
      </div>
    </div>
  );

  return (
    <Drawer
      isOpen={!!drawerTarget}
      onClose={closeDrawer}
      title={drawerTarget.title}
      subtitle={drawerTarget.subtitle}
      footer={footerToggle}
    >
      <div className="space-y-6 font-ui">
        {/* Top: Kernel Stamp & Status */}
        <div className="flex items-center justify-between pb-4 border-b border-line">
          <KernelStamp
            label="Checked by kernel"
            showProvenance
            provenance="Constraint satisfaction verification (CP-SAT v9.8)."
          />
          <div className="flex items-center gap-1.5">
            <Chip
              label={drawerTarget.statusLabel}
              variant={drawerTarget.status === 'violation' || drawerTarget.status === 'rejected' ? 'rejected' : 'valid'}
            />
          </div>
        </div>

        {/* View Mode 1: Rule Trace (Deterministic Ledger) */}
        {viewMode === 'trace' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-ink uppercase tracking-wider">
                Period Placement Ledger
              </span>
              <span className="text-[11px] font-mono text-ink-2">
                1 placed &middot; {drawerTarget.otherPeriodRows.length} blocked
              </span>
            </div>

            <div className="space-y-2">
              {/* TOP ROW: "Placed here" in GREEN WASH */}
              <div className="p-3.5 rounded-card border bg-t-good border-good text-ink transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-ink text-[13px]">
                    {drawerTarget.placedRow.period}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {drawerTarget.placedRow.ruleCode && (
                      <Chip label={drawerTarget.placedRow.ruleCode} isRuleCode />
                    )}
                    <Chip label="Placed here" variant="valid" />
                  </div>
                </div>
                <p className="text-[12px] text-ink/90 leading-snug mt-1">
                  {drawerTarget.placedRow.reason}
                </p>
              </div>

              {/* THEN ONE ROW PER OTHER PERIOD with "Blocked" chip, rule-code chip, and one sentence of reason */}
              {drawerTarget.otherPeriodRows.map((row, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-card border bg-surface border-line text-ink-2 transition-colors hover:border-line-strong"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-ink text-[13px]">
                      {row.period}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Chip label={row.ruleCode} isRuleCode />
                      <Chip label="Blocked" variant="rejected" />
                    </div>
                  </div>
                  <p className="text-[12px] text-ink-2 leading-snug mt-1">
                    {row.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* View Mode 2: Plain Language AI Paraphrase */
          <div className="space-y-4">
            <div className="text-[12px] font-semibold text-ink uppercase tracking-wider">
              Natural Language Explanation
            </div>

            <div className="p-4 bg-surface border border-line rounded-card text-ink space-y-3">
              <p className="font-serif italic text-[16px] leading-[1.55] text-ink max-w-[62ch]">
                {drawerTarget.plainLanguage.heading}
              </p>
              <p className="font-serif italic text-[14px] leading-[1.55] text-ink-2 max-w-[62ch]">
                {drawerTarget.plainLanguage.body}
              </p>

              {/* Mandatory label per DESIGN.md */}
              <div className="pt-3 border-t border-line text-[11px] text-ink-2 italic font-serif">
                Paraphrase by AI. The trace above is the source of truth.
              </div>
            </div>
          </div>
        )}

        {/* Section: Why this room (short serif italic sentence, max 62ch) */}
        <div className="pt-4 border-t border-line space-y-1.5">
          <span className="text-[11px] font-mono uppercase text-ink-2 tracking-wider block">
            Why this room:
          </span>
          <p className="font-serif italic text-[16px] leading-[1.55] text-ink max-w-[62ch]">
            &ldquo;{drawerTarget.whyThisRoom}&rdquo;
          </p>
        </div>

        {/* Venue & Capacity Reference Card */}
        <div className="p-3.5 bg-raised border border-line rounded-card text-[12px] text-ink-2 space-y-2 font-mono">
          <div className="flex justify-between items-center text-ink">
            <span className="font-semibold">{drawerTarget.room}</span>
            <span>{room?.name || 'Academic Venue'}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-line text-[11px]">
            <span>Capacity (Normal / Exam):</span>
            <span className="font-semibold text-ink">
              {room?.capacity || 120} / {Math.floor((room?.capacity || 120) / 2)} seats
            </span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span>Wheelchair Accessibility:</span>
            <span className={room?.accessible !== false ? 'text-good font-semibold' : 'text-ink-2'}>
              {room?.accessible !== false ? 'Ramp & Lift Accessible' : 'Stairs Only'}
            </span>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
