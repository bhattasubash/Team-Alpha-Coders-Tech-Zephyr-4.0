'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import { SearchIcon, CloseIcon, NavRooms, NavDashboard, NavBookings } from './Icons';
import citData from '@/data/cit_public.json';
import scheduleData from '@/data/schedule.json';

function getInitialSessions(): any[] {
  try {
    const sessionCatalog = new Map<string, any>(
      (citData.sessions || []).map((s: any) => [s.id, s])
    );
    const courseCatalog = new Map<string, any>(
      (citData.courses || []).map((c: any) => [c.id, c])
    );
    const facultyCatalog = new Map<string, any>(
      (citData.faculty || []).map((f: any) => [f.id, f])
    );
    const roomCatalog = new Map<string, any>(
      (citData.rooms || []).map((r: any) => [r.id, r])
    );

    return ((scheduleData as any).sessions || []).map((s: any) => {
      const sId = s.session_id || s.id || '';
      const meta = sessionCatalog.get(sId) || {};
      const course = courseCatalog.get(meta.course_id);
      const fac = facultyCatalog.get(meta.faculty_id);
      const rm = roomCatalog.get(s.room_id);
      return {
        id: sId,
        sessionId: sId,
        courseId: meta.course_id || '',
        courseTitle: course?.name || meta.course_id || '',
        facultyId: meta.faculty_id || '',
        facultyName: fac?.name || meta.faculty_id || '',
        facultySurname: fac?.name ? fac.name.split(' ').slice(-1)[0] : '',
        roomId: s.room_id || '',
        roomName: rm?.name || s.room_id || '',
        day: s.day || 'MON',
        startPeriod: Number(s.start_period ?? 1),
        duration: Number(meta.duration || 1),
        kind: meta.kind || 'lecture',
        groups: Array.isArray(meta.groups) ? meta.groups : [],
      };
    });
  } catch {
    return [];
  }
}

function normalizeSession(s: any): any {
  if (!s) return null;
  const sId = s.id || s.sessionId || s.session_id || '';
  const cId = s.courseId || s.course_id || '';
  const cTitle = s.courseTitle || s.course_name || s.course_title || cId;
  const fId = s.facultyId || s.faculty_id || '';
  const fName = s.facultyName || s.faculty_name || fId;
  const rId = s.roomId || s.room_id || '';
  const rName = s.roomName || s.room_name || rId;
  const startP = Number(s.startPeriod ?? s.start_period ?? 1);
  const dur = Number(s.duration ?? 1);

  return {
    id: sId,
    sessionId: sId,
    courseId: cId,
    courseTitle: cTitle,
    facultyId: fId,
    facultyName: fName,
    facultySurname: s.facultySurname || s.faculty_surname || fName,
    roomId: rId,
    roomName: rName,
    day: s.day || 'MON',
    startPeriod: startP,
    duration: dur,
    kind: s.kind || 'lecture',
    state: s.state || 'lecture',
    groups: Array.isArray(s.groups) ? s.groups : [],
  };
}

export function CommandPalette() {
  const [rooms, setRooms] = useState<any[]>(() => citData.rooms || []);
  const [faculty, setFaculty] = useState<any[]>(() => citData.faculty || []);
  const [sessions, setSessions] = useState<any[]>(() => getInitialSessions());
  const { isPaletteOpen, setIsPaletteOpen, openDrawer } = useApp();
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    api
      .getMeta()
      .then((meta) => {
        if (Array.isArray(meta?.rooms) && meta.rooms.length > 0) setRooms(meta.rooms);
        if (Array.isArray(meta?.faculty) && meta.faculty.length > 0) setFaculty(meta.faculty);
      })
      .catch(() => {});

    api
      .getTimetableAll()
      .then((tt) => {
        if (Array.isArray(tt?.sessions) && tt.sessions.length > 0) {
          setSessions(tt.sessions.map(normalizeSession).filter(Boolean));
        }
      })
      .catch(() => {});
  }, []);

  if (!isPaletteOpen) return null;

  const q = (query || '').toLowerCase().trim();

  const filteredRooms = q
    ? rooms
        .filter((r) => {
          if (!r) return false;
          const id = String(r.id || '').toLowerCase();
          const name = String(r.name || '').toLowerCase();
          const building = String(r.building || '').toLowerCase();
          return id.includes(q) || name.includes(q) || building.includes(q);
        })
        .slice(0, 4)
    : rooms.slice(0, 3);

  const filteredFaculty = q
    ? faculty
        .filter((f) => {
          if (!f) return false;
          const id = String(f.id || '').toLowerCase();
          const name = String(f.name || '').toLowerCase();
          const dept = String(f.department || '').toLowerCase();
          return id.includes(q) || name.includes(q) || dept.includes(q);
        })
        .slice(0, 4)
    : faculty.slice(0, 3);

  const filteredSessions = q
    ? sessions
        .filter((s) => {
          if (!s) return false;
          const cId = String(s.courseId || s.course_id || '').toLowerCase();
          const cTitle = String(s.courseTitle || s.course_name || '').toLowerCase();
          const sId = String(s.sessionId || s.session_id || s.id || '').toLowerCase();
          const rId = String(s.roomId || s.room_id || '').toLowerCase();
          const fName = String(s.facultyName || s.faculty_name || '').toLowerCase();
          return (
            cId.includes(q) ||
            cTitle.includes(q) ||
            sId.includes(q) ||
            rId.includes(q) ||
            fName.includes(q)
          );
        })
        .slice(0, 6)
    : [];

  const isNaturalLanguageQuery =
    (q.includes('why') || q.includes('reason') || q.includes('how') || q.includes('explain')) &&
    sessions.length > 0;

  const nlSession = isNaturalLanguageQuery
    ? sessions.find((s) => {
        if (!s) return false;
        const c = String(s.courseId || s.course_id || '').toLowerCase();
        const r = String(s.roomId || s.room_id || '').toLowerCase();
        const parts = q.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
        return parts.some((p) => p && (c.includes(p) || r.includes(p)));
      }) || sessions[0]
    : null;

  const hasAnyResults =
    Boolean(isNaturalLanguageQuery && nlSession) ||
    filteredRooms.length > 0 ||
    filteredFaculty.length > 0 ||
    filteredSessions.length > 0;

  const handleSelect = (action: () => void) => {
    setIsPaletteOpen(false);
    setQuery('');
    action();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsPaletteOpen(false);
    } else if (e.key === 'Enter') {
      if (isNaturalLanguageQuery && nlSession) {
        handleSelect(() => openDrawer(nlSession));
      } else if (filteredSessions.length > 0) {
        handleSelect(() => openDrawer(filteredSessions[0]));
      } else if (filteredRooms.length > 0) {
        handleSelect(() => router.push('/rooms'));
      } else if (filteredFaculty.length > 0) {
        handleSelect(() => router.push('/timetable'));
      }
    }
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
            onKeyDown={handleKeyDown}
            placeholder="Search sessions, rooms, faculty, or ask 'Why is CS101 in CR-01?'"
            className="w-full bg-transparent border-none text-[14px] text-ink placeholder:text-ink-2/60 focus:outline-none"
          />
          <button
            onClick={() => setIsPaletteOpen(false)}
            className="p-1 text-ink-2 hover:text-ink rounded-cell"
            aria-label="Close search"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Results area */}
        <div className="max-h-[380px] overflow-y-auto p-3 space-y-4 font-ui">
          {/* Natural Language Query / Why Here explanation */}
          {isNaturalLanguageQuery && nlSession && (
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
                    Open deterministic trace for {nlSession.courseId || nlSession.course_id || 'Session'} in{' '}
                    {nlSession.roomId || nlSession.room_id || 'Venue'} ({nlSession.day}{' '}
                    P{nlSession.startPeriod ?? nlSession.start_period ?? 1})
                  </div>
                </div>
                <span className="text-[10px] bg-ink text-paper px-2 py-0.5 rounded-pill font-mono">
                  Kernel Trace
                </span>
              </button>
            </div>
          )}

          {/* Quick Navigation actions (always available when not searching specifically) */}
          {!q && (
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
          )}

          {/* Sessions matching query */}
          {filteredSessions.length > 0 && (
            <div>
              <div className="text-[11px] font-medium text-ink-2 uppercase tracking-wider px-2 mb-1">
                Sessions ({filteredSessions.length})
              </div>
              <div className="space-y-0.5">
                {filteredSessions.map((s, idx) => {
                  const sId = s.id || s.sessionId || s.session_id || `session-${idx}`;
                  const cId = s.courseId || s.course_id || 'Session';
                  const cTitle = s.courseTitle || s.course_name || cId;
                  const rId = s.roomId || s.room_id || '';
                  const pNum = s.startPeriod ?? s.start_period ?? 1;
                  return (
                    <button
                      key={sId}
                      onClick={() => handleSelect(() => openDrawer(s))}
                      className="w-full flex items-center justify-between px-2.5 py-2 text-left rounded-card hover:bg-surface text-ink text-[13px]"
                    >
                      <div>
                        <span className="font-medium">{cId}</span>
                        <span className="text-ink-2 text-[12px] ml-2">{cTitle}</span>
                        {s.facultyName && (
                          <span className="text-ink-2/70 text-[11px] ml-2 hidden sm:inline">
                            &middot; {s.facultyName}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-ink-2 font-mono">
                        {s.day} P{pNum} {rId ? `in ${rId}` : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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

          {/* Empty search state */}
          {q && !hasAnyResults && (
            <div className="p-8 text-center text-ink-2 space-y-1">
              <p className="text-[14px] font-medium text-ink">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-[12px] text-ink-2/80">
                Try searching by course code (e.g. CS101, MA101), venue (e.g. AUD, LH-1), or faculty name.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-line bg-surface flex items-center justify-between text-[11px] text-ink-2">
          <span>Tip: Press ESC to close &middot; &crarr; to select</span>
          <span>CIT Kernel Search</span>
        </div>
      </div>
    </div>
  );
}
