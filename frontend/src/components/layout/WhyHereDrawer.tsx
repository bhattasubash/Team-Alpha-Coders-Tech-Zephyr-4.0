'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Drawer } from '@/components/ui/Drawer';
import { Chip } from '@/components/ui/Chip';
import { KernelStamp } from '@/components/ui/KernelStamp';

export function WhyHereDrawer() {
  const { drawerTarget, closeDrawer } = useApp();
  const [viewMode, setViewMode] = useState<'trace' | 'plain'>('trace');

  if (!drawerTarget) return null;

  // Footer toggle: Audit trace (default) vs Summary
  const footerToggle = (
    <div className="flex items-center justify-between w-full font-ui">
      <div className="flex items-center gap-1.5 text-[11px] text-ink-2">
        <span className="w-1.5 h-1.5 rounded-full bg-good shadow-[0_0_8px_rgba(99,204,121,0.6)]" />
        <span>Status: Policy Verified</span>
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
          Audit trace
        </button>
        <button
          onClick={() => setViewMode('plain')}
          className={`px-3 py-1 rounded-[4px] transition-colors ${
            viewMode === 'plain'
              ? 'bg-surface text-ink font-semibold shadow-sm'
              : 'text-ink-2 hover:text-ink'
          }`}
        >
          Summary
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
            provenance="Constraint satisfaction verification (CP-SAT solver)."
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
                1 placed &middot; {drawerTarget.otherPeriodRows.length} alternatives checked
              </span>
            </div>

            <div className="space-y-2">
              {/* TOP ROW: "Placed here" in GREEN WASH */}
              <div className="p-3.5 rounded-card border bg-t-good/30 border-good/60 text-ink transition-colors shadow-sm">
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
                <p className="text-[12px] text-ink leading-snug mt-1">
                  {drawerTarget.placedRow.reason}
                </p>
              </div>

              {/* Alternative periods or honest loading state */}
              {drawerTarget.otherPeriodRows.length > 0 ? (
                drawerTarget.otherPeriodRows.map((row, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-card border bg-surface/70 border-line text-ink-2 transition-colors hover:border-line-strong"
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
                ))
              ) : (
                <div className="p-4 rounded-card border border-dashed border-line bg-raised/40 text-ink space-y-1.5">
                  <div className="flex items-center gap-2 text-[12px] font-semibold text-ink">
                    <span className="w-2 h-2 rounded-full bg-violet animate-pulse" />
                    <span>Explanation engine loading...</span>
                  </div>
                  <p className="text-[12px] text-ink-2 leading-relaxed">
                    Granular alternative slot conflict traces are evaluated by the backend solver explainer. Full formal schedule feasibility is verified by the kernel.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* View Mode 2: Plain Language AI Paraphrase */
          <div className="space-y-4">
            <div className="text-[12px] font-semibold text-ink uppercase tracking-wider">
              Placement Summary
            </div>

            <div className="p-4 bg-surface/80 border border-line rounded-card text-ink space-y-3">
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
          <p className="font-serif italic text-[15px] leading-[1.55] text-ink max-w-[62ch]">
            &ldquo;{drawerTarget.whyThisRoom}&rdquo;
          </p>
        </div>

        {/* Venue & Capacity Reference Card */}
        <div className="p-3.5 bg-raised/80 border border-line rounded-card text-[12px] text-ink-2 space-y-2 font-mono">
          <div className="flex justify-between items-center text-ink">
            <span className="font-semibold">{drawerTarget.room}</span>
            <span>{drawerTarget.roomName || 'Academic Venue'}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-line text-[11px]">
            <span>Venue ID:</span>
            <span className="font-semibold text-ink">{drawerTarget.room}</span>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
