import React from 'react';
import { Button } from './Button';
import { AlertIcon } from './Icons';

interface ErrorStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Operation failed',
  message = 'The solver did not respond within 30 s. The timetable was not changed. Try again or use the manual form.',
  actionLabel = 'Try again',
  onAction,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-start p-5 bg-t-bad/60 border border-bad/50 rounded-panel max-w-lg select-none ${className}`}
    >
      <div className="flex items-center gap-2 mb-2 text-bad">
        <AlertIcon size={18} />
        <span className="font-ui font-medium text-[14px] leading-tight text-bad">
          {title}
        </span>
      </div>

      <p className="text-[13px] text-ink mb-4 leading-relaxed">{message}</p>

      {actionLabel && (
        <Button variant="secondary" onClick={onAction} className="border-bad text-bad hover:bg-t-bad">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
