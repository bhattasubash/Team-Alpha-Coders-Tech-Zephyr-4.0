'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Role, UserAccount, ScheduledSession, BookingRequest, WhyHereTarget, Day } from '@/data/types';
import { DEMO_USERS } from '@/data/mockData';

export function toWhyHereTarget(item: ScheduledSession | BookingRequest | WhyHereTarget): WhyHereTarget {
  // If already a normalized WhyHereTarget, return as-is
  if ('whyThisRoom' in item && 'placedRow' in item && 'otherPeriodRows' in item) {
    return item as WhyHereTarget;
  }

  // Check if it's a BookingRequest
  if ('requested_category' in item || 'attendance' in item || 'submitted_at' in item) {
    const booking = item as BookingRequest;
    const window0 = booking.windows?.[0];
    const day = window0?.day || 'WED';
    const period = window0?.from_period || 10;
    const room = booking.requested_room || 'AUD-01';
    const alt0 = booking.alternatives?.[0];

    const dayName = day === 'MON' ? 'Monday' : day === 'TUE' ? 'Tuesday' : day === 'WED' ? 'Wednesday' : day === 'THU' ? 'Thursday' : day === 'FRI' ? 'Friday' : 'Saturday';

    return {
      id: booking.id,
      title: `${booking.title} in ${room}, ${dayName} P${period}`,
      subtitle: `${booking.id} &middot; ${booking.requester} (${booking.attendance} attendees)`,
      room,
      roomName: room,
      day,
      startPeriod: period,
      duration: booking.duration_periods || 2,
      status: 'rejected',
      statusLabel: 'BLOCKED',
      placedRow: {
        period: alt0 ? `Alternative: ${alt0.roomId} (${alt0.day} P${alt0.startPeriod})` : 'Alternative: OAT (Wed P10 - P12)',
        statusLabel: 'Placed here',
        ruleCode: 'VALID',
        reason: `Available alternative venue accommodates ${booking.attendance} attendees with full acoustic and accessibility provisions.`,
      },
      otherPeriodRows: [
        {
          period: `Requested: ${room} (${dayName} P${period})`,
          statusLabel: 'Blocked',
          ruleCode: 'H4',
          reason: `${room} is occupied by Annual Institute Lecture Series (H4).`,
        },
        {
          period: `Adjacent: ${room} (${dayName} P${period - 1})`,
          statusLabel: 'Blocked',
          ruleCode: 'H9',
          reason: 'Clashes with accredited regular teaching curriculum hours (H9).',
        },
        {
          period: 'Alternative: SH-01 (Seminar Hall 1)',
          statusLabel: 'Blocked',
          ruleCode: 'H5',
          reason: 'Capacity constraint: Seminar Hall 1 capacity is 150, allocated to Departmental Colloquium (H5).',
        },
        {
          period: `Alternative: ${room} (Thursday P10)`,
          statusLabel: 'Blocked',
          ruleCode: 'H13',
          reason: 'Evening auditorium reservation requires Dean’s Office elevation authorization (H13).',
        },
      ],
      whyThisRoom: `${room} capacity of 400 exceeds the ${booking.attendance} requested attendees by 233%, and clashes with the prior-approved Annual Institute Lecture.`,
      plainLanguage: {
        heading: `This booking could not be accommodated in ${room} at Period P${period} due to preemption by a higher-priority institute event.`,
        body: `The CP-SAT solver identified ${alt0?.roomId || 'OAT'} as the closest valid venue with identical timing, zero constraint violations, and full accessibility.`,
      },
    };
  }

  // It's a ScheduledSession
  const session = item as ScheduledSession;
  const dayName = session.day === 'MON' ? 'Monday' : session.day === 'TUE' ? 'Tuesday' : session.day === 'WED' ? 'Wednesday' : session.day === 'THU' ? 'Thursday' : 'Friday';

  const otherPeriods = [
    {
      period: 'P1 (08:00 - 09:00)',
      statusLabel: 'Blocked',
      ruleCode: 'H7',
      reason: `${session.facultySurname || 'Faculty'} marked unavailable for Dean's Office Academic Council briefing.`,
    },
    {
      period: 'P2 (09:00 - 10:00)',
      statusLabel: 'Blocked',
      ruleCode: 'H4',
      reason: `${session.roomId} occupied by CS201 Data Structures core lecture.`,
    },
    {
      period: 'P3 (10:00 - 11:00)',
      statusLabel: 'Blocked',
      ruleCode: 'H3',
      reason: `Student group ${session.groups[0] || 'Y1-A'} has mandatory core mathematics lecture scheduled concurrently.`,
    },
    {
      period: 'P4 (11:00 - 12:00)',
      statusLabel: 'Blocked',
      ruleCode: 'H4',
      reason: `${session.roomId} occupied by ME102 Mechanics lecture.`,
    },
    {
      period: 'P5 (12:00 - 13:00)',
      statusLabel: 'Blocked',
      ruleCode: 'S6',
      reason: 'Soft penalty: faculty exceeds 3 hours daily continuous teaching limit.',
    },
    {
      period: 'P6 (14:00 - 15:00)',
      statusLabel: 'Blocked',
      ruleCode: 'H6',
      reason: 'Afternoon periods P6 to P8 are strictly reserved for 3-hour continuous laboratory sessions.',
    },
    {
      period: 'P7 (15:00 - 16:00)',
      statusLabel: 'Blocked',
      ruleCode: 'H6',
      reason: 'Afternoon period reserved for laboratory sessions; conflicts with physics lab practical.',
    },
    {
      period: 'P8 (16:00 - 17:00)',
      statusLabel: 'Blocked',
      ruleCode: 'S2',
      reason: 'Soft penalty: creates an unproductive 3-hour idle gap in the student group timetable.',
    },
  ].filter((_, idx) => idx + 1 !== session.startPeriod);

  return {
    id: session.id,
    title: `${session.courseId} in ${session.roomId}, ${dayName} P${session.startPeriod}`,
    subtitle: `${session.courseTitle} &middot; ${session.facultyName}`,
    room: session.roomId,
    roomName: session.roomName || session.roomId,
    day: session.day,
    startPeriod: session.startPeriod,
    duration: session.duration,
    status: session.state === 'violation' ? 'violation' : 'placed',
    statusLabel: session.state === 'violation' ? 'VIOLATION' : 'VALID',
    placedRow: {
      period: `P${session.startPeriod} (${7 + session.startPeriod}:00 - ${8 + session.startPeriod}:00)`,
      statusLabel: 'Placed here',
      ruleCode: 'VALID',
      reason: `All hard constraints H1 to H14 satisfied. Venue ${session.roomId} capacity exceeds group total (${session.groups.length * 45} students). Zero faculty time conflicts.`,
    },
    otherPeriodRows: otherPeriods,
    whyThisRoom: `${session.roomId} provides tiered seating for 120 students with dual projectors, matching ${session.courseId}'s ${session.groups.length * 45} enrolled students at 75% seat efficiency with zero accessibility violations.`,
    plainLanguage: {
      heading: `${session.courseId} was placed in ${session.roomId} on ${dayName} at Period P${session.startPeriod} because it is the earliest legal window satisfying both group schedules and faculty availability.`,
      body: 'Adjacent morning periods are blocked by faculty unavailability (H7) and group timetable clashes (H3). Afternoon periods are preserved for 3-hour laboratory practicals (H6).',
    },
  };
}

interface AppContextType {
  role: Role;
  setRole: (role: Role) => void;
  user: UserAccount;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  isPaletteOpen: boolean;
  setIsPaletteOpen: (open: boolean) => void;
  drawerSession: ScheduledSession | null;
  drawerTarget: WhyHereTarget | null;
  openDrawer: (target: ScheduledSession | BookingRequest | WhyHereTarget) => void;
  closeDrawer: () => void;
  isTourOpen: boolean;
  setIsTourOpen: (open: boolean) => void;
  tourStep: number;
  setTourStep: (step: number) => void;
  startTour: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>('admin');
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [drawerSession, setDrawerSession] = useState<ScheduledSession | null>(null);
  const [drawerTarget, setDrawerTarget] = useState<WhyHereTarget | null>(null);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(1);

  const startTour = () => {
    setTourStep(1);
    setIsTourOpen(true);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('cit-theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setThemeState(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    localStorage.setItem('cit-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const openDrawer = (target: ScheduledSession | BookingRequest | WhyHereTarget) => {
    const normalized = toWhyHereTarget(target);
    setDrawerTarget(normalized);
    if ('sessionId' in target || 'courseId' in target) {
      setDrawerSession(target as ScheduledSession);
    } else {
      setDrawerSession(null);
    }
  };

  const closeDrawer = () => {
    setDrawerSession(null);
    setDrawerTarget(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsPaletteOpen(false);
        setDrawerSession(null);
        setDrawerTarget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const user = DEMO_USERS[role];

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        user,
        theme,
        setTheme,
        toggleTheme,
        isPaletteOpen,
        setIsPaletteOpen,
        drawerSession,
        drawerTarget,
        openDrawer,
        closeDrawer,
        isTourOpen,
        setIsTourOpen,
        tourStep,
        setTourStep,
        startTour,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
