'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';

export function JudgeTour() {
  const { isTourOpen, setIsTourOpen, tourStep, setTourStep } = useApp();
  const router = useRouter();

  if (!isTourOpen) return null;

  const steps = [
    {
      step: 1,
      title: 'Task 1: Find a free room at Thursday P6',
      description:
        'Use the top finder row and isometric wayfinder map to locate an accessible lecture hall or classroom free at Thursday Period P6.',
      route: '/rooms',
      buttonLabel: 'Go to Rooms & Venues',
      positionClasses: 'top-24 left-1/2 -translate-x-1/2 sm:left-64 sm:translate-x-0',
    },
    {
      step: 2,
      title: 'Task 2: Simulate minimal-move schedule disruption',
      description:
        'Review how the CP-SAT constraint kernel calculates the minimum possible schedule moves (3 sessions) when Dr. Raman is on leave.',
      route: '/disruption',
      buttonLabel: 'Go to Disruption Solver',
      positionClasses: 'top-32 left-1/2 -translate-x-1/2 sm:left-72 sm:translate-x-0',
    },
    {
      step: 3,
      title: 'Task 3: Run official validator and inspect 10,000 fuzzing proof',
      description:
        'Audit zero hard violations, explore soft penalty horizontal bars, and verify 80+ blocked red-team attack vectors.',
      route: '/admin/proof',
      buttonLabel: 'Go to Validator Proof',
      positionClasses: 'top-28 right-8 left-auto',
    },
  ];

  const currentStep = steps[tourStep - 1] || steps[0];

  const handleNext = () => {
    if (tourStep < 3) {
      const next = tourStep + 1;
      setTourStep(next);
      router.push(steps[next - 1].route);
    } else {
      setIsTourOpen(false);
    }
  };

  const handleSkip = () => {
    setIsTourOpen(false);
  };

  const handleGoToRoute = () => {
    router.push(currentStep.route);
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none">
      {/* Translucent Backdrop */}
      <div
        className="fixed inset-0 bg-[#12292B]/25 pointer-events-auto transition-opacity"
        onClick={handleSkip}
      />

      {/* Coach Mark Card: ink tooltip with paper text, radius 6 */}
      <div
        className={`fixed z-50 pointer-events-auto w-[90vw] max-w-[420px] bg-ink text-paper border border-line-strong rounded-[6px] shadow-2xl p-5 font-ui transition-all duration-200 animate-fade-in ${currentStep.positionClasses}`}
      >
        {/* Header: Task Name + Progress */}
        <div className="flex items-center justify-between border-b border-paper/20 pb-2 mb-3">
          <span className="font-serif italic text-[16px] text-paper">
            Judge Evaluation Tour
          </span>
          <span className="text-[12px] font-mono text-paper/70 font-semibold">
            {currentStep.step} of 3
          </span>
        </div>

        {/* Task Title in semi-bold */}
        <h4 className="font-semibold text-[15px] text-paper mb-2 leading-snug">
          {currentStep.title}
        </h4>

        {/* Description */}
        <p className="text-[13px] text-paper/85 leading-relaxed mb-4">
          {currentStep.description}
        </p>

        {/* Action Route Button */}
        <button
          onClick={handleGoToRoute}
          className="w-full mb-4 py-2 px-3 bg-paper text-ink hover:bg-surface text-[12px] font-semibold rounded-[4px] transition-colors flex items-center justify-center gap-2"
        >
          <span>{currentStep.buttonLabel}</span>
          <span className="text-[11px] opacity-70">&rarr;</span>
        </button>

        {/* Footer: Skip Tour always visible bottom-left, Next button on right */}
        <div className="flex items-center justify-between pt-2 border-t border-paper/20 text-[12px]">
          <button
            onClick={handleSkip}
            className="text-paper/70 hover:text-paper underline underline-offset-2 transition-colors font-medium"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-2">
            {tourStep > 1 && (
              <button
                onClick={() => {
                  const prev = tourStep - 1;
                  setTourStep(prev);
                  router.push(steps[prev - 1].route);
                }}
                className="px-2.5 py-1 text-paper/80 hover:text-paper font-medium transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-3 py-1 bg-paper/20 hover:bg-paper/30 text-paper font-semibold rounded-[4px] transition-colors"
            >
              {tourStep === 3 ? 'Finish tour' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
