import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-mesh text-ink flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-md p-8 glass-panel rounded-panel space-y-4 shadow-xl">
        <span className="text-[12px] font-mono text-violet bg-violet/15 px-2.5 py-1 rounded-pill border border-violet/30">
          Error 404
        </span>
        <h1 className="font-serif text-[42px] leading-tight text-ink">
          Page Not Found
        </h1>
        <p className="font-serif italic text-[16px] text-ink-2">
          The requested schedule route or session view could not be resolved by the institutional directory.
        </p>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-4 py-2 bg-violet hover:bg-violet/90 text-white rounded-[6px] text-[13px] font-medium transition-all shadow-sm hover:glow-violet"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
