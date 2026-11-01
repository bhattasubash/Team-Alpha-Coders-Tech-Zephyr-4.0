export type Day = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';

export type Role = 'admin' | 'department_coordinator' | 'faculty' | 'club';

export interface UserAccount {
  email: string;
  name: string;
  role: Role;
  title: string;
}

export const DEMO_USERS: Record<string, UserAccount> = {
  admin: {
    email: 'admin@cit.edu',
    name: 'Dr. Suresh Patnaik',
    role: 'admin',
    title: "Dean's Office (Admin)",
  },
  department_coordinator: {
    email: 'coordinator@cit.edu',
    name: 'Prof. Minati Sen',
    role: 'department_coordinator',
    title: 'Department Coordinator (CSE)',
  },
  faculty: {
    email: 'faculty@cit.edu',
    name: 'Dr. K. S. Raman',
    role: 'faculty',
    title: 'Faculty Member (Physics & CS)',
  },
  club: {
    email: 'club@cit.edu',
    name: 'Rohan Jena',
    role: 'club',
    title: 'Spectra Fest Convener (Club)',
  },
  dean: {
    email: 'dean@cit.edu',
    name: 'Dr. Suresh Patnaik',
    role: 'admin',
    title: 'Dean of Academic Affairs',
  },
};

export interface PeriodInfo {
  id: number;
  start: string;
  end: string;
  teaching: boolean;
}

export interface Room {
  id: string;
  name: string;
  building: string;
  type: 'classroom' | 'lecture_hall' | 'auditorium' | 'seminar_hall' | 'lab' | 'open_air_theatre';
  capacity: number;
  features: string[];
  accessible: boolean;
  allowed_uses: string[];
}

export interface FacultyUnavailable {
  day: Day;
  periods: number[];
  reason: string;
}

export interface Faculty {
  id: string;
  name: string;
  department: string;
  max_hours_per_day: number;
  needs_accessible: boolean;
  unavailable: FacultyUnavailable[];
  preferences: string[];
}

export interface StudentGroup {
  id: string;
  name: string;
  year: number;
  department: string;
  size: number;
  needs_accessible: boolean;
}

export interface Course {
  id: string;
  title: string;
  department: string;
  year: number;
  lecture_hours: number;
  tutorial_hours: number;
  lab_blocks: number;
}

export interface BaseSession {
  id: string;
  course_id: string;
  kind: 'lecture' | 'tutorial' | 'lab';
  groups: string[];
  faculty_id: string;
  size: number;
  duration: number;
  room_types: string[];
  needs_accessible: boolean;
  basket_slot: string | null;
  fixed_slot: { day: Day; period: number } | null;
}

export type SessionCardState =
  | 'lecture'
  | 'tutorial'
  | 'lab'
  | 'basket'
  | 'combined'
  | 'fixed'
  | 'event'
  | 'closed'
  | 'moved'
  | 'removed'
  | 'violation';

export interface ScheduledSession {
  id: string;
  sessionId: string;
  courseId: string;
  courseTitle: string;
  facultyId: string;
  facultyName: string;
  facultySurname: string;
  groups: string[];
  roomId: string;
  roomName: string;
  day: Day;
  startPeriod: number;
  duration: number;
  kind: 'lecture' | 'tutorial' | 'lab' | 'event';
  state: SessionCardState;
  tag?: string;
  accessible?: boolean;
  ruleCode?: string;
  isDiffMoved?: boolean;
  oldSlot?: { day: Day; period: number; roomId: string };
  reason?: string;
  conflicting_bookings?: string[];
}

export interface BookingRequest {
  id: string;
  submitted_at: string;
  requester: string;
  role: Role;
  department: string | null;
  requested_category: 'institute_event' | 'guest_lecture' | 'department_event' | 'club_event';
  title: string;
  attendance: number;
  duration_periods: number;
  windows: Array<{ day: Day; from_period: number; to_period: number }>;
  room_types: string[];
  needs: string[];
  requested_room: string;
  mandatory_for_groups: string[];
  raw_text: string;
  status: 'approved' | 'rejected' | 'pending' | 'cancelled' | 'alternative_offered';
  assigned_room?: string;
  assigned_day?: Day;
  assigned_start_period?: number;
  assigned_end_period?: number;
  reason?: string;
  conflicting_bookings?: string[];
  priority_rank?: number;
  alternatives?: Array<{
    day: Day;
    startPeriod: number;
    endPeriod: number;
    roomId: string;
    roomName: string;
    reason: string;
  }>;
}

export interface Exam {
  id: string;
  course_ids: string[];
  groups: string[];
  size: number;
  duration_hours: number;
  day: Day;
  slot: 'AM' | 'PM';
  room_id: string;
  seated_count: number;
  capacity: number;
}

export interface RuleDefinition {
  code: string;
  name: string;
  category: 'hard' | 'soft' | 'booking' | 'exam';
  description: string;
  weight?: number;
}

export interface WhyHereTarget {
  id: string;
  title: string;
  subtitle: string;
  room: string;
  roomName: string;
  day: Day;
  startPeriod: number;
  duration?: number;
  status: 'valid' | 'placed' | 'rejected' | 'blocked' | 'violation';
  statusLabel: string;
  placedRow: {
    period: string;
    statusLabel: string;
    ruleCode: string;
    reason: string;
  };
  otherPeriodRows: Array<{
    period: string;
    statusLabel: string;
    ruleCode: string;
    reason: string;
  }>;
  whyThisRoom: string;
  plainLanguage: {
    heading: string;
    body: string;
  };
}
