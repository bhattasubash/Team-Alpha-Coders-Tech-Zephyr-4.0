import React from 'react';

type ChipVariant =
  | 'approved'
  | 'valid'
  | 'rejected'
  | 'failed'
  | 'pending'
  | 'cancelled'
  | 'moved'
  | 'event'
  | 'neutral'
  | 'rule';

interface ChipProps {
  label: string;
  variant?: ChipVariant;
  isRuleCode?: boolean;
  className?: string;
  title?: string;
}

export function Chip({
  label,
  variant = 'neutral',
  isRuleCode = false,
  className = '',
  title,
}: ChipProps) {
  // Rule codes get square corners (2px) to distinguish from status pills
  if (isRuleCode || variant === 'rule') {
    const isHard = label.startsWith('H');
    const isSoft = label.startsWith('S');
    const bg = isHard
      ? 'bg-t-bad text-ink border-bad font-semibold'
      : isSoft
      ? 'bg-surface text-ink-2 border-line-strong'
      : 'bg-surface text-ink-2 border-line-strong';

    return (
      <span
        title={title || label}
        className={`inline-flex items-center justify-center font-medium font-ui text-[11px] leading-none px-1.5 py-0.5 rounded-cell border tabular-nums select-none ${bg} ${className}`}
      >
        {label}
      </span>
    );
  }

  // Status chips: full pill (rounded-pill), 22-24px height, 1px border, tinted fill
  let styleClasses = 'bg-surface text-ink-2 border-line';

  switch (variant) {
    case 'approved':
    case 'valid':
      styleClasses = 'bg-t-good text-ink border-good/60 font-medium';
      break;
    case 'rejected':
    case 'failed':
      styleClasses = 'bg-t-bad text-ink border-bad/60 font-medium';
      break;
    case 'pending':
      styleClasses = 'bg-t-event text-ink border-yellow/60 font-medium';
      break;
    case 'cancelled':
      styleClasses = 'bg-surface text-ink-2 border-line line-through opacity-80';
      break;
    case 'moved':
      styleClasses = 'bg-t-event text-ink border-yellow/60 font-medium';
      break;
    case 'event':
      styleClasses = 'bg-yellow text-ink border-ink/20 font-semibold';
      break;
    case 'neutral':
    default:
      styleClasses = 'bg-surface text-ink-2 border-line';
      break;
  }

  return (
    <span
      title={title}
      className={`inline-flex items-center justify-center h-6 px-2.5 rounded-pill border text-[11px] font-medium leading-none select-none transition-colors ${styleClasses} ${className}`}
    >
      {label}
    </span>
  );
}
