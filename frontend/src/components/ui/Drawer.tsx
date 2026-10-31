'use client';

import React, { useEffect } from 'react';
import { CloseIcon } from './Icons';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Drawer({ isOpen, onClose, title, subtitle, children, footer }: DrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Scrim: ink at 30% */}
      <div
        className="fixed inset-0 bg-[#12292B]/30 transition-opacity duration-180"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Surface: 480px, elevated with shadow, slide 180ms */}
      <div className="relative w-full max-w-[480px] h-full bg-raised shadow-drawer flex flex-col z-10 animate-drawer-slide border-l border-line-strong select-text">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-line bg-surface">
          <div>
            {title && (
              <h2 className="font-serif text-[26px] leading-[30px] text-ink font-normal">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="font-serif italic text-[15px] text-ink-2 mt-1 leading-snug">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-card hover:bg-raised text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink transition-colors"
            aria-label="Close drawer"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="p-4 bg-surface border-t border-line flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
