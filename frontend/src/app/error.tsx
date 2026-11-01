'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected client-side errors for diagnostics
    console.error('Captured client error boundary exception:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 text-center font-ui">
      <div className="max-w-md w-full bg-raised border border-line-strong rounded-panel p-6 shadow-sm space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold text-[22px]">
          !
        </div>
        <div>
          <h2 className="text-[17px] font-semibold text-ink">Application View Error</h2>
          <p className="text-[13px] text-ink-2 mt-1">
            An unexpected client-side error occurred. The constraint kernel and data persist safely.
          </p>
        </div>
        {error?.message && (
          <div className="p-3 bg-surface border border-line rounded-card text-left font-mono text-[11px] text-ink-2 overflow-x-auto max-h-24">
            {error.message}
          </div>
        )}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-violet text-paper font-semibold text-[13px] rounded-[6px] hover:bg-violet/90 transition-colors shadow-sm"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-surface border border-line text-ink font-semibold text-[13px] rounded-[6px] hover:bg-raised transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
