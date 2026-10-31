'use client';

import React from 'react';
import { SessionCardState, ScheduledSession } from '@/data/types';
import { WheelchairGlyph, PinGlyph } from './Icons';

interface SessionCardProps {
  session?: Partial<ScheduledSession>;
  state?: SessionCardState;
  onClick?: () => void;
  className?: string;
  isDiffPulse?: boolean;
}

export function SessionCard({
  session,
  state: stateProp,
  onClick,
  className = '',
  isDiffPulse = false,
}: SessionCardProps) {
  const state: SessionCardState = stateProp || session?.state || 'lecture';
  const raw = session as any;
  const courseCode = session?.courseId || raw?.course_id || 'CS101';
  const title = session?.courseTitle || raw?.course_name || raw?.course_id || 'Intro to Computing';
  const faculty = session?.facultySurname || session?.facultyName || raw?.faculty_name || raw?.faculty_id || 'Dr. Raman';
  const roomId = session?.roomId || raw?.room_id || 'CR-01';
  const accessible = session?.accessible ?? false;
  const tag = session?.tag;
  const ruleCode = session?.ruleCode;

  // State-specific styling: Quiet neutral paper foundation + 3px semantic left indicator
  let containerClasses = 'relative rounded-card transition-colors duration-120 p-2 select-none text-left w-full';
  let borderStyle: React.CSSProperties = {
    borderColor: 'var(--line)',
    borderWidth: '1px',
    borderStyle: 'solid',
  };
  let bgStyle: React.CSSProperties = {
    backgroundColor: 'var(--raised)',
    color: 'var(--ink)',
  };

  switch (state) {
    case 'lecture':
      bgStyle = { backgroundColor: 'var(--raised)', color: 'var(--ink)' };
      borderStyle = {
        borderTop: '1px solid var(--line)',
        borderRight: '1px solid var(--line)',
        borderBottom: '1px solid var(--line)',
        borderLeft: '3px solid var(--violet)',
      };
      break;

    case 'tutorial':
      bgStyle = { backgroundColor: 'var(--raised)', color: 'var(--ink)' };
      borderStyle = {
        borderTop: '1px solid var(--line)',
        borderRight: '1px solid var(--line)',
        borderBottom: '1px solid var(--line)',
        borderLeft: '3px solid var(--tutorial)',
      };
      break;

    case 'lab':
      bgStyle = { backgroundColor: 'var(--raised)', color: 'var(--ink)' };
      borderStyle = {
        borderTop: '1px solid var(--line)',
        borderRight: '1px solid var(--line)',
        borderBottom: '1px solid var(--line)',
        borderLeft: '3px solid var(--yellow)',
      };
      break;

    case 'basket':
      bgStyle = { backgroundColor: 'var(--raised)', color: 'var(--ink)' };
      borderStyle = {
        borderTop: '1px dashed var(--line-strong)',
        borderRight: '1px dashed var(--line-strong)',
        borderBottom: '1px dashed var(--line-strong)',
        borderLeft: '3px solid var(--violet)',
      };
      break;

    case 'combined':
      bgStyle = { backgroundColor: 'var(--raised)', color: 'var(--ink)' };
      borderStyle = {
        borderTop: '1px solid var(--line)',
        borderRight: '1px solid var(--line)',
        borderBottom: '1px solid var(--line)',
        borderLeft: '3px solid var(--violet)',
        boxShadow: '2px 2px 0 0 var(--line-strong)',
      };
      break;

    case 'fixed':
      bgStyle = { backgroundColor: 'var(--raised)', color: 'var(--ink)' };
      borderStyle = {
        borderTop: '1px solid var(--line)',
        borderRight: '1px solid var(--line)',
        borderBottom: '1px solid var(--line)',
        borderLeft: '3px solid var(--ink)',
      };
      break;

    case 'event':
      bgStyle = { backgroundColor: 'var(--event)', color: 'var(--ink)' };
      borderStyle = { borderColor: 'rgba(18, 41, 43, 0.2)', borderWidth: '1px', borderStyle: 'solid' };
      break;

    case 'closed':
      bgStyle = { backgroundColor: 'var(--surface)', color: 'var(--ink-2)' };
      containerClasses += ' hatch';
      borderStyle = { borderColor: 'var(--line-strong)', borderWidth: '1px', borderStyle: 'solid' };
      break;

    case 'moved':
      bgStyle = { backgroundColor: 'var(--t-violet)', color: 'var(--ink)' };
      borderStyle = { borderColor: 'var(--violet)', borderWidth: '1.5px', borderStyle: 'solid' };
      if (isDiffPulse) containerClasses += ' animate-pulse-twice';
      break;

    case 'removed':
      bgStyle = { backgroundColor: 'transparent', color: 'var(--ink-2)' };
      borderStyle = { borderColor: 'var(--bad)', borderWidth: '1px', borderStyle: 'dashed' };
      containerClasses += ' line-through opacity-75';
      break;

    case 'violation':
      bgStyle = { backgroundColor: 'var(--t-bad)', color: 'var(--ink)' };
      borderStyle = { borderColor: 'var(--bad)', borderWidth: '1.5px', borderStyle: 'solid' };
      break;
  }

  const defaultTag = () => {
    switch (state) {
      case 'lecture': return 'L';
      case 'tutorial': return 'T';
      case 'lab': return 'Lab 3h';
      case 'basket': return tag || 'Basket';
      case 'combined': return tag || 'x3 groups';
      case 'fixed': return null;
      case 'event': return 'Event';
      case 'closed': return 'Closed';
      case 'moved': return 'Moved';
      case 'removed': return 'Removed';
      case 'violation': return ruleCode || 'H2';
      default: return 'L';
    }
  };

  const renderedTag = tag || defaultTag();

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`${containerClasses} hover:!border-violet hover:shadow-[0_4px_14px_rgba(125,93,255,0.18)] hover:-translate-y-[1px] transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet ${className}`}
      style={{ ...bgStyle, ...borderStyle }}
    >
      {/* Top row: Course Code + Corner Tag / Pin */}
      <div className="flex items-start justify-between gap-1 leading-none mb-1">
        <span className="font-medium text-[12px] tracking-tight">{courseCode}</span>
        <div className="flex items-center gap-1">
          {state === 'fixed' && <PinGlyph size={11} className="text-ink" />}
          {state === 'violation' && (
            <span className="px-1 py-[1px] text-[10px] font-semibold bg-bad text-raised rounded-cell leading-none">
              {renderedTag}
            </span>
          )}
          {state !== 'violation' && renderedTag && (
            <span
              className={`text-[10px] font-medium px-1 py-[1px] rounded-cell leading-none ${
                state === 'event'
                  ? 'bg-ink text-paper'
                  : 'bg-surface/80 border border-line-strong/40 text-ink-2'
              }`}
            >
              {renderedTag}
            </span>
          )}
        </div>
      </div>

      {/* Middle row: Short Title */}
      <div className="text-[11px] font-normal leading-[14px] truncate opacity-90 mb-1" title={title}>
        {title}
      </div>

      {/* Bottom row: Faculty surname + Room ID + Accessible glyph */}
      <div className="flex items-center justify-between text-[11px] leading-none opacity-80 pt-0.5 border-t border-current/10">
        <span className="truncate max-w-[65%]">{faculty}</span>
        <div className="flex items-center gap-1">
          <span>{roomId}</span>
          {accessible && <WheelchairGlyph size={12} className="inline opacity-90" />}
        </div>
      </div>
    </div>
  );
}
