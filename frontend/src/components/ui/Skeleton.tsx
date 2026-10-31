import React from 'react';

export function GridSkeleton({ rows = 9, cols = 5 }: { rows?: number; cols?: number }) {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  return (
    <div className="w-full border border-line rounded-panel bg-surface p-4 overflow-hidden animate-slow-pulse select-none">
      {/* Day headers */}
      <div className="grid grid-cols-6 gap-2 mb-3 pb-2 border-b border-line">
        <div className="h-6 w-12 bg-line/40 rounded-cell" />
        {dayNames.slice(0, cols).map((d, i) => (
          <div key={i} className="h-6 bg-line/40 rounded-cell" />
        ))}
      </div>
      {/* Period rows */}
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="grid grid-cols-6 gap-2 items-center">
            <div className="h-10 w-10 bg-line/30 rounded-cell" />
            {Array.from({ length: cols }).map((_, cIdx) => (
              <div
                key={cIdx}
                className="h-14 bg-raised/70 border border-line/40 rounded-card p-2"
              >
                <div className="h-3 w-12 bg-line/40 rounded-cell mb-1.5" />
                <div className="h-2 w-3/4 bg-line/20 rounded-cell mb-1" />
                <div className="h-2 w-1/2 bg-line/20 rounded-cell" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function RowSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full border border-line rounded-panel bg-surface divide-y divide-line overflow-hidden animate-slow-pulse select-none">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-4 bg-line/40 rounded-cell" />
            <div className="w-48 h-4 bg-line/30 rounded-cell" />
            <div className="w-24 h-4 bg-line/20 rounded-cell hidden sm:block" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-20 h-5 bg-line/30 rounded-pill" />
            <div className="w-16 h-4 bg-line/20 rounded-cell" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 animate-slow-pulse select-none">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 bg-surface border border-line rounded-panel">
          <div className="h-4 w-16 bg-line/40 rounded-cell mb-2" />
          <div className="h-8 w-24 bg-line/30 rounded-cell mb-3" />
          <div className="h-3 w-36 bg-line/20 rounded-cell" />
        </div>
      ))}
    </div>
  );
}
