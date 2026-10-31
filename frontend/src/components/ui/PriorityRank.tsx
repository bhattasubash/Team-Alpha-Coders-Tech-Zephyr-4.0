import React from 'react';

interface PriorityRankProps {
  rank: number; // 1 to 6
  name?: string;
  className?: string;
}

const DEFAULT_NAMES: Record<number, string> = {
  1: 'Exams',
  2: 'Regular session',
  3: 'Institute event',
  4: 'Guest lecture',
  5: 'Department event',
  6: 'Club event',
};

export function PriorityRank({ rank, name, className = '' }: PriorityRankProps) {
  const clampedRank = Math.max(1, Math.min(6, rank));
  const displayName = name || DEFAULT_NAMES[clampedRank] || `Rank ${clampedRank}`;

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {/* Six small bars side by side */}
      <div className="flex items-center gap-[3px]" title={`Priority Rank ${clampedRank} of 6`}>
        {[1, 2, 3, 4, 5, 6].map((i) => {
          const isFilled = i <= clampedRank;
          return (
            <span
              key={i}
              className={`block w-[3px] h-3 rounded-[1px] transition-colors ${
                isFilled ? 'bg-ink' : 'bg-line'
              }`}
            />
          );
        })}
      </div>
      <span className="text-[12px] font-medium text-ink-2 leading-none">{displayName}</span>
    </div>
  );
}
