'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Role } from '@/data/types';
import { api } from '@/lib/api';
import { CitCampusIllustration } from '@/components/auth/CitCampusIllustration';

/**
 * Concentric C Monogram Logo for Chilika Institute
 */
function CITMonogram({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" strokeWidth="1.8" />
      <path
        d="M15 8.5C14.2 7.6 13.1 7 12 7C9.24 7 7 9.24 7 12C7 14.76 9.24 17 12 17C13.1 17 14.2 16.4 15 15.5"
        strokeWidth="1.8"
      />
      <path
        d="M14 10.5C13.5 10 12.8 9.5 12 9.5C10.6 9.5 9.5 10.6 9.5 12C9.5 13.4 10.6 14.5 12 14.5C12.8 14.5 13.5 14 14 13.5"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { setRole } = useApp();

  const [email, setEmail] = useState('admin@cit.edu');
  const [password, setPassword] = useState('admin123');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Demo accounts exactly matching approved visual reference
  const demoAccounts: {
    roleKey: Role;
    title: string;
    email: string;
    pass: string;
  }[] = [
    {
      roleKey: 'admin',
      title: "Admin, Dean's office",
      email: 'admin@cit.edu',
      pass: 'admin123',
    },
    {
      roleKey: 'department_coordinator',
      title: 'Department coordinator',
      email: 'coordinator@cit.edu',
      pass: 'coord123',
    },
    {
      roleKey: 'faculty',
      title: 'Faculty member',
      email: 'faculty@cit.edu',
      pass: 'faculty123',
    },
    {
      roleKey: 'club',
      title: 'Club representative',
      email: 'club@cit.edu',
      pass: 'club123',
    },
    {
      roleKey: 'admin',
      title: 'Dean of Academic Affairs',
      email: 'dean@cit.edu',
      pass: 'dean123',
    },
  ];

  // Populates credentials and selects role
  const handleSelectRole = (acc: typeof demoAccounts[0]) => {
    setEmail(acc.email);
    setPassword(acc.pass);
    setEmailError('');
    setPasswordError('');
    setFormError('');
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setPasswordError('');
    setFormError('');

    let hasError = false;
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setEmailError('Email is required.');
      hasError = true;
    } else if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setEmailError('Enter a valid institute email address (e.g. admin@cit.edu).');
      hasError = true;
    }

    if (!password) {
      setPasswordError('Password is required.');
      hasError = true;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      hasError = true;
    }

    if (hasError) return;

    setIsSubmitting(true);
    try {
      const res = await api.login(cleanEmail, password);
      const me = await api.getMe().catch(() => null);
      setRole((me?.role as Role) || (res.role as Role) || 'faculty');
      router.push('/dashboard');
    } catch (err: any) {
      // Demo fallback check
      const matched = demoAccounts.find(
        (a) => a.email.toLowerCase() === cleanEmail.toLowerCase() && a.pass === password
      );
      if (matched) {
        setRole(matched.roleKey);
        router.push('/dashboard');
      } else {
        setFormError(err.message || 'Invalid credentials. Select a demo role above.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EDE9EE] flex items-center justify-center p-4 sm:p-6 lg:p-8 select-none relative overflow-x-hidden font-ui">
      {/* Centred Card Container (Matching reference rounded proportions) */}
      <div className="w-full max-w-[1040px] md:h-[580px] bg-white rounded-[20px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.08)] grid grid-cols-1 md:grid-cols-2 relative z-10 border border-black/[0.04]">
        
        {/* =========================================================================
            LEFT PANEL: ILLUSTRATION & PASTEL GRADIENT BACKGROUND
            ========================================================================= */}
        <div className="relative h-[320px] md:h-full overflow-hidden flex flex-col justify-between p-6 sm:p-8 lg:p-10 bg-transparent">
          
          {/* Background Layer: EXACTLY 80% Opacity */}
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              backgroundImage: "url('/images/pastel-gradient-texture.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              opacity: 0.80,
            }}
          />

          {/* Foreground Illustration (100% Opacity) */}
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center p-2 sm:p-4">
            <CitCampusIllustration className="w-full h-full" />
          </div>

          {/* Top spacer to balance layout */}
          <div className="relative z-20" />

          {/* Foreground Footer Info (100% Opacity) */}
          <div className="relative z-20 mt-auto pt-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-white">
                <CITMonogram size={20} className="text-white" />
                <span className="text-[14px] sm:text-[15px] font-semibold tracking-tight text-white font-ui">
                  Chilika Institute
                </span>
              </div>
              <span className="px-3 py-1 text-[11px] font-medium text-white bg-white/10 backdrop-blur-xs rounded-full border border-white/60">
                Week 7 &middot; Spectra & Midsem
              </span>
            </div>

            <p className="mt-3 text-[12.5px] sm:text-[13.5px] font-normal italic text-white/95 leading-relaxed max-w-sm">
              A unified platform to manage timetables, venue bookings and campus events across CIT.
            </p>
          </div>
        </div>

        {/* =========================================================================
            RIGHT PANEL: APPROVED SIGN-IN FORM
            ========================================================================= */}
        <div className="p-8 sm:p-10 lg:p-11 flex flex-col justify-between bg-white text-[#111827]">
          <div>
            {/* Header: CIT Monogram, "Sign in to", and Main Headline */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <CITMonogram size={17} className="text-[#5B3DF5]" />
                <span className="text-[13px] font-normal text-[#6B7280]">
                  Sign in to
                </span>
              </div>

              <h1 className="font-['Instrument_Serif',Georgia,serif] text-[38px] sm:text-[44px] lg:text-[48px] leading-[1.05] text-[#111827] tracking-tight font-normal">
                Every session in its place.
              </h1>
            </div>

            {/* Subtitle to Demo Cards: 8px */}
            <div className="mt-2 mb-2">
              <span className="text-[12px] font-normal text-[#6B7280] block">
                Select demo role for evaluation:
              </span>
            </div>

            {/* Demo Role Selection Cards: 8px gap */}
            <div className="grid grid-cols-2 gap-2 mb-3.5">
              {demoAccounts.map((account) => {
                const isSelected = email === account.email;
                return (
                  <button
                    key={account.title}
                    type="button"
                    onClick={() => handleSelectRole(account)}
                    className={`w-full px-3 py-2 border rounded-[8px] text-left transition-all duration-150 flex flex-col justify-center cursor-pointer ${
                      isSelected
                        ? 'bg-[#F3F4F6] border-[#6366F1] shadow-xs'
                        : 'bg-[#F9FAFB] hover:bg-white border-[#E5E7EB] hover:border-[#D1D5DB]'
                    }`}
                  >
                    <span className="text-[12px] font-semibold text-[#111827] truncate leading-tight">
                      {account.title}
                    </span>
                    <span className="text-[11px] text-[#6B7280] truncate leading-tight mt-0.5">
                      {account.email}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Divider: "or sign in manually" */}
            <div className="relative my-3.5 flex items-center justify-center">
              <div className="w-full border-t border-[#E5E7EB]" />
              <span className="absolute bg-white px-2.5 text-[11px] text-[#9CA3AF] font-normal">
                or sign in manually
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleManualSubmit}>
              {/* Email Field Group */}
              <div>
                <label className="text-[12.5px] font-medium text-[#111827] block mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                    setFormError('');
                  }}
                  placeholder="admin@cit.edu"
                  className={`w-full h-10 px-3.5 rounded-[8px] border text-[13.5px] text-[#111827] bg-white transition-all outline-none ${
                    emailError
                      ? 'border-red-400 focus:ring-1 focus:ring-red-400'
                      : 'border-[#D1D5DB] focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]'
                  }`}
                />
                {emailError && (
                  <p className="text-[11px] text-red-500 mt-1">{emailError}</p>
                )}
              </div>

              {/* Field Group to Next Label: 20px spacing */}
              <div className="mt-5">
                <label className="text-[12.5px] font-medium text-[#111827] block mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                    setFormError('');
                  }}
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                  className={`w-full h-10 px-3.5 rounded-[8px] border text-[13.5px] text-[#111827] bg-white transition-all outline-none ${
                    passwordError
                      ? 'border-red-400 focus:ring-1 focus:ring-red-400'
                      : 'border-[#818CF8] ring-2 ring-[#6366F1]/20 focus:border-[#6366F1]'
                  }`}
                />
                {passwordError && (
                  <p className="text-[11px] text-red-500 mt-1">{passwordError}</p>
                )}
              </div>

              {formError && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-[6px] text-[12px] text-red-600 font-medium">
                  {formError}
                </div>
              )}

              {/* Last Input to Primary Button: 24px spacing */}
              <div className="mt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-[42px] bg-[#5338ED] hover:bg-[#472FD6] active:bg-[#3D25BE] text-white font-medium text-[14px] rounded-[8px] shadow-xs transition-colors flex items-center justify-center cursor-pointer disabled:opacity-70"
                >
                  {isSubmitting ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </form>
          </div>

          {/* Footer: Kernel v1.0 (Right aligned, strictly NO status dot or extra links) */}
          <div className="mt-6 text-right">
            <span className="text-[11px] text-[#9CA3AF] font-sans font-normal">
              Kernel v1.0
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
