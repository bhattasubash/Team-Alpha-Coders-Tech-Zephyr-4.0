import React from 'react';

interface KernelStampProps {
  label?: string;
  provenance?: string;
  className?: string;
  showProvenance?: boolean;
}

export function KernelStamp({
  label = 'Policy verified',
  provenance = 'Verified against institutional scheduling policies (H1–H14).',
  className = '',
  showProvenance = false,
}: KernelStampProps) {
  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <div className="inline-flex items-center gap-1.5 self-start">
        {/* Bordered label with double hingula red rule */}
        <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium tracking-tight text-bad bg-t-bad rounded-cell border border-bad outline outline-1 outline-bad outline-offset-1 select-none">
          {label}
        </span>
      </div>
      {showProvenance && provenance && (
        <p className="font-serif italic text-[13px] text-ink-2 leading-tight">
          {provenance}
        </p>
      )}
    </div>
  );
}
