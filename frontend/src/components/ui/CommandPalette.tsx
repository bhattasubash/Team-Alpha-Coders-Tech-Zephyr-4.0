'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import { useEffect } from 'react';
import { SearchIcon, CloseIcon, NavRooms, NavDashboard, NavBookings } from './Icons';
import { useRouter } from 'next/navigation';

export function CommandPalette() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    api.getMeta().then((meta) => {
      if (meta?.rooms) setRooms(meta.rooms);
      if (meta?.faculty) setFaculty(meta.faculty);
    }).catch(() => {});
    api.getTimetableAll().then((tt) => {
      if (tt?.sessions) setSessions(tt.sessions);
    }).catch(() => {});
  }, []);
  const { isPaletteOpen, setIsPaletteOpen, openDrawer } = useApp();
  const [query, setQuery] = useState('');
  const router = useRouter();

  if (!isPaletteOpen) return null;

  const q = query.toLowerCase().trim();

  const filteredRooms = q
    ? rooms.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.building.toLowerCase().includes(q)
      ).slice(0, 4)
    : rooms.slice(0, 3);

  const filteredFaculty = q
    ? faculty.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.department.toLowerCase().includes(q) ||
          f.id.toLowerCase().includes(q)
      ).slice(0, 4)
    : faculty.slice(0, 3);

  const filteredSessions = q
    ? sessions.filter(
        (s) =>
          s.courseId.toLowerCase().includes(q) ||
          s.courseTitle.toLowerCase().includes(q) ||
          s.sessionId.toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const isNaturalLanguageQuery = q.includes('why') || q.includes('reason') || q.includes('how');
  const nlSession =
    sessions.find((s) => {
      const c = s.courseId.toLowerCase();
      const parts = q.replace(/[^a-z0-9]/g, ' ').split(/\s+/);
      return parts.some((p) => p && c.includes(p));
    }) || sessions[0];

  const handleSelect = (action: () => void) => {
    setIsPaletteOpen(false);
    setQuery('');
    action();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div
        className="fixed inset-0 bg-[#12292B]/40"
        onClick={() => setIsPaletteOpen(false)}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-[640px] bg-raised border border-line-strong rounded-panel shadow-palette overflow-hidden z-10 animate-drawer-slide">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-line bg-surface">
          <SearchIcon size={18} className="text-ink-2" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sessions, rooms, faculty, or ask 'Why is CS101 in CR-01?'"
            className="w-full bg-transparent border-none text-[14px] text-ink placeholder:text-ink-2/60 focus:outline-none"
          />
          <button
            onClick={() => setIsPaletteOpen(false)}
            className="p-1 text-ink-2 hover:text-ink rounded-cell"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Results area */}
        <div className="max-h-[380px] overflow-y-auto p-3 space-y-4 font-ui">
          {/* Natural Language Query / Why Here explanation */}
          {isNaturalLanguageQuery && (
            <div>
              <div className="text-[11px] font-medium text-ink-2 uppercase tracking-wider px-2 mb-1">
                Explain Placement
              </div>
              <button
                onClick={() => handleSelect(() => openDrawer(nlSession))}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left rounded-card bg-surface hover:bg-raised text-ink text-[13px] border border-line transition-colors"
              >
                <div>
                  <div className="font-serif italic text-[15px] text-ink">
                    &ldquo;{query}&rdquo;
                  </div>
                  <div className="text-[11px] text-ink-2 mt-0.5">
                    Open deterministic trace for {nlSession.courseId} in {nlSession.roomId} ({nlSession.day} P{nlSession.startPeriod})
                  </div>
                </div>
                <span className="text-[10px] bg-ink text-paper px-2 py-0.5 rounded-pill font-mono">
                  Kernel Trace
                </span>
              </button>
            </div>
          )}

          {/* Quick Navigation actions */}
          <div>
            <div className="text-[11px] font-medium text-ink-2 uppercase tracking-wider px-2 mb-1">
              Quick Actions
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => handleSelect(() => router.push('/timetable'))}
                className="w-full flex items-center gap-3 px-2.5 py-2 text-left rounded-card hover:bg-surface text-ink text-[13px]"
              >
                <NavDashboard size={15} className="text-ink-2" />
                <span>Open Timetable grid</span>
              </button>
              <button
                onClick={() => handleSelect(() => router.push('/bookings/new'))}
                className="w-full flex items-center gap-3 px-2.5 py-2 text-left rounded-card hover:bg-surface text-ink text-[13px]"
              >
                <NavBookings size={15} className="text-ink-2" />
                <span>Draft new booking request</span>
              </button>
            </div>
          </div>

          {/* Rooms */}
          {filteredRooms.length > 0 && (
            <div>
              <div className="text-[11px] font-medium text-ink-2 uppercase tracking-wider px-2 mb-1">
                Rooms & Venues
              </div>
              <div className="space-y-0.5">
                {filteredRooms.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleSelect(() => router.push('/rooms'))}
                    className="w-full flex items-center justify-between px-2.5 py-2 text-left rounded-card hover:bg-surface text-ink text-[13px]"
                  >
                    <div className="flex items-center gap-2">
                      <NavRooms size={14} className="text-ink-2" />
                      <span className="font-medium">{r.id}</span>
                      <span className="text-ink-2 text-[12px]">{r.name}</span>
                    </div>
                    <span className="text-[11px] text-ink-2">Cap {r.capacity}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Faculty */}
          {filteredFaculty.length > 0 && (
            <div>
              <div className="text-[11px] font-medium text-ink-2 uppercase tracking-wider px-2 mb-1">
                Faculty
              </div>
              <div className="space-y-0.5">
                {filteredFaculty.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleSelect(() => router.push('/timetable'))}
                    className="w-full flex items-center justify-between px-2.5 py-2 text-left rounded-card hover:bg-surface text-ink text-[13px]"
                  >
                    <div>
                      <span className="font-medium">{f.name}</span>
                      <span className="text-ink-2 text-[12px] ml-2">Dept: {f.department}</span>
                    </div>
                    <span className="text-[11px] text-ink-2 font-mono">{f.id}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sessions matching query */}
          {filteredSessions.length > 0 && (
            <div>
              <div className="text-[11px] font-medium text-ink-2 uppercase tracking-wider px-2 mb-1">
                Sessions
              </div>
              <div className="space-y-0.5">
                {filteredSessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelect(() => openDrawer(s))}
                    className="w-full flex items-center justify-between px-2.5 py-2 text-left rounded-card hover:bg-surface text-ink text-[13px]"
                  >
                    <div>
                      <span className="font-medium">{s.courseId}</span>
                      <span className="text-ink-2 text-[12px] ml-2">{s.courseTitle}</span>
                    </div>
                    <span className="text-[11px] text-ink-2">
                      {s.day} P{s.startPeriod} in {s.roomId}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-line bg-surface flex items-center justify-between text-[11px] text-ink-2">
          <span>Tip: Press ESC to close</span>
          <span>CIT Kernel Search</span>
        </div>
      </div>
    </div>
  );
}
