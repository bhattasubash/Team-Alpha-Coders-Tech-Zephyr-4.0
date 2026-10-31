import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  message = 'No requests match this filter.',
  actionLabel = 'Clear filters',
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-surface border border-line rounded-panel max-w-md mx-auto ${className}`}
    >
      {/* Hand-drawn style isometric building icon from map vocabulary */}
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-ink-2 mb-3 opacity-70"
      >
        <path d="M24 6L8 15V33L24 42L40 33V15L24 6Z" />
        <path d="M24 24V42" />
        <path d="M24 24L8 15" />
        <path d="M24 24L40 15" />
        <path d="M16 19.5V28.5" />
        <path d="M32 19.5V28.5" />
      </svg>

      <p className="text-[14px] text-ink-2 mb-4 leading-normal">{message}</p>

      {actionLabel && (
        <Button variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
