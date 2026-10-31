import rawData from './cit_public.json';
import rawDisruption from './sample_disruption.json';
import {
  Day,
  Role,
  UserAccount,
  Room,
  Faculty,
  StudentGroup,
  Course,
  BaseSession,
  ScheduledSession,
  BookingRequest,
  Exam,
  RuleDefinition,
} from './types';

export const DEMO_USERS: Record<Role, UserAccount> = {
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
    title: 'Club Representative (Spectra Team)',
  },
};

export const PRIORITY_ORDER = [
  { rank: 1, key: 'exam', name: 'Exams' },
  { rank: 2, key: 'regular_session', name: 'Regular session' },
  { rank: 3, key: 'institute_event', name: 'Institute event' },
  { rank: 4, key: 'guest_lecture', name: 'Guest lecture' },
  { rank: 5, key: 'department_event', name: 'Department event' },
  { rank: 6, key: 'club_event', name: 'Club event' },
];

export const RULES: RuleDefinition[] = [
  { code: 'H1', name: 'Unscheduled or unknown', category: 'hard', description: 'Session is unscheduled or references unknown identifier.' },
  { code: 'H2', name: 'Faculty conflict', category: 'hard', description: 'Faculty member is assigned to two sessions in the same period.' },
  { code: 'H3', name: 'Group conflict', category: 'hard', description: 'Student group has overlapping sessions in the same period.' },
  { code: 'H4', name: 'Room conflict', category: 'hard', description: 'Room is occupied by multiple concurrent sessions.' },
  { code: 'H5', name: 'Capacity exceeded', category: 'hard', description: 'Number of enrolled students exceeds room safe capacity.' },
  { code: 'H6', name: 'Wrong room type', category: 'hard', description: 'Session requires specialized facility (e.g. lab) placed in standard room.' },
  { code: 'H7', name: 'Faculty unavailable', category: 'hard', description: 'Faculty assigned during marked leave, travel, or administrative duties.' },
  { code: 'H8', name: 'Room unavailable', category: 'hard', description: 'Room assigned during maintenance, repair, or planned closure.' },
  { code: 'H9', name: 'Period out of range', category: 'hard', description: 'Class placed in invalid teaching period (e.g. during lunch or past P9).' },
  { code: 'H10', name: 'Accessibility violation', category: 'hard', description: 'Session needing wheelchair access placed in inaccessible venue.' },
  { code: 'H11', name: 'Basket slot mismatch', category: 'hard', description: 'Elective basket courses not synchronized in designated shared slot.' },
  { code: 'H12', name: 'Faculty daily limit', category: 'hard', description: 'Faculty exceeds maximum allowed continuous or daily teaching hours.' },
  { code: 'H13', name: 'Booking violation', category: 'hard', description: 'Venue booked without requisite authorization or overlapping existing event.' },
  { code: 'H14', name: 'Fixed slot violation', category: 'hard', description: 'Pre-pinned session moved from its mandatory fixed slot.' },
  { code: 'S1', name: 'Faculty preference avoided', category: 'soft', description: 'Scheduled outside requested preferred teaching windows.', weight: 2 },
  { code: 'S2', name: 'Group idle gap', category: 'soft', description: 'Single-period idle gap between classes in student group day.', weight: 3 },
  { code: 'S3', name: 'Group overload', category: 'soft', description: 'More than five teaching periods scheduled for a group in one day.', weight: 4 },
  { code: 'S4', name: 'Same course twice in day', category: 'soft', description: 'Multiple lecture sessions of same course scheduled on same date.', weight: 3 },
  { code: 'S5', name: 'Room underutilized', category: 'soft', description: 'Room filled to less than 40% capacity.', weight: 1 },
  { code: 'S6', name: 'Late period class', category: 'soft', description: 'Regular academic classes placed in late afternoon P9 slot.', weight: 2 },
  { code: 'B1', name: 'Duplicate decision', category: 'booking', description: 'Conflicting simultaneous decision rendered for booking request.' },
  { code: 'B2', name: 'Invalid override', category: 'booking', description: 'Override attempted without required justification or proper role.' },
  { code: 'B3', name: 'Cancelled approved', category: 'booking', description: 'Cancellation failed to release allocated venue slot.' },
  { code: 'E1', name: 'Unscheduled exam', category: 'exam', description: 'Exam has no room or slot assigned.' },
  { code: 'E2', name: 'Room not for exam', category: 'exam', description: 'Exam scheduled in non-exam venue.' },
];

export const ROOMS: Room[] = (rawData.rooms as any[]) || [];
export const FACULTY: Faculty[] = (rawData.faculty as any[]) || [];
export const STUDENT_GROUPS: StudentGroup[] = (rawData.student_groups as any[]) || [];
export const COURSES: Course[] = (rawData.courses as any[]) || [];
export const RAW_SESSIONS: BaseSession[] = (rawData.sessions as any[]) || [];
export const RAW_BOOKINGS: any[] = (rawData.booking_requests as any[]) || [];
export const RAW_EXAMS: any[] = (rawData.exams as any[]) || [];

export const ROOMS_BY_ID = new Map<string, Room>(ROOMS.map((r) => [r.id, r]));
export const FACULTY_BY_ID = new Map<string, Faculty>(FACULTY.map((f) => [f.id, f]));
export const COURSES_BY_ID = new Map<string, Course>(COURSES.map((c) => [c.id, c]));
export const GROUPS_BY_ID = new Map<string, StudentGroup>(STUDENT_GROUPS.map((g) => [g.id, g]));

function getSurname(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  const last = parts[parts.length - 1];
  return parts[0].startsWith('Dr.') || parts[0].startsWith('Prof.')
    ? `${parts[0]} ${last}`
    : last;
}

// Generate deterministic placement for all 189 sessions
const DAYS: Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

export const SCHEDULED_SESSIONS: ScheduledSession[] = (() => {
  const list: ScheduledSession[] = [];
  const roomOccupancy: Record<string, boolean> = {};

  const isFree = (roomId: string, day: Day, startP: number, dur: number) => {
    for (let p = startP; p < startP + dur; p++) {
      if (roomOccupancy[`${roomId}_${day}_${p}`]) return false;
    }
    return true;
  };

  const occupy = (roomId: string, day: Day, startP: number, dur: number) => {
    for (let p = startP; p < startP + dur; p++) {
      roomOccupancy[`${roomId}_${day}_${p}`] = true;
    }
  };

  // Mark room unavailabilities
  for (const unavail of (rawData.room_unavailability as any[]) || []) {
    for (const p of unavail.periods) {
      roomOccupancy[`${unavail.room_id}_${unavail.day}_${p}`] = true;
    }
  }

  RAW_SESSIONS.forEach((s, idx) => {
    const course = COURSES_BY_ID.get(s.course_id);
    const faculty = FACULTY_BY_ID.get(s.faculty_id);
    const facultyName = faculty?.name || 'Dr. Sharma';
    const facultySurname = getSurname(facultyName);
    const courseTitle = course?.title || s.course_id;
    const dur = s.duration || (s.kind === 'lab' ? 3 : 1);

    // Filter candidate rooms
    const suitableRooms = ROOMS.filter(
      (r) =>
        r.capacity >= s.size &&
        (!s.needs_accessible || r.accessible) &&
        (s.room_types.length === 0 || s.room_types.includes(r.type))
    );
    const candidateRooms = suitableRooms.length > 0 ? suitableRooms : ROOMS;

    let placed = false;
    let chosenDay: Day = DAYS[idx % DAYS.length];
    let chosenPeriod = s.kind === 'lab' ? (idx % 2 === 0 ? 2 : 6) : ((idx % 8) + 1);
    if (chosenPeriod === 5 && dur > 1) chosenPeriod = 6;
    let chosenRoom = candidateRooms[idx % candidateRooms.length]?.id || 'CR-101';

    // Search legal slot
    for (let dOffset = 0; dOffset < DAYS.length && !placed; dOffset++) {
      const d = DAYS[(idx + dOffset) % DAYS.length];
      for (const r of candidateRooms) {
        if (s.kind === 'lab') {
          for (const sp of [2, 6]) {
            if (isFree(r.id, d, sp, 3)) {
              chosenDay = d;
              chosenPeriod = sp;
              chosenRoom = r.id;
              occupy(r.id, d, sp, 3);
              placed = true;
              break;
            }
          }
        } else {
          for (let sp = 1; sp <= 9; sp++) {
            if (sp === 5 && dur > 1) continue;
            if (isFree(r.id, d, sp, dur)) {
              chosenDay = d;
              chosenPeriod = sp;
              chosenRoom = r.id;
              occupy(r.id, d, sp, dur);
              placed = true;
              break;
            }
          }
        }
        if (placed) break;
      }
    }

    if (!placed) {
      occupy(chosenRoom, chosenDay, chosenPeriod, dur);
    }

    // Determine state
    let state: ScheduledSession['state'] = 'lecture';
    let tag: string | undefined = 'L';

    if (s.kind === 'lab') {
      state = 'lab';
      tag = 'Lab 3h';
    } else if (s.kind === 'tutorial') {
      state = 'tutorial';
      tag = 'T';
    } else if (s.basket_slot) {
      state = 'basket';
      tag = s.basket_slot;
    } else if (s.groups.length > 1) {
      state = 'combined';
      tag = `x${s.groups.length} groups`;
    }

    // Add a few representative states from DESIGN.md for realistic inspection
    if (idx === 14) {
      state = 'fixed';
      tag = 'Pinned';
    } else if (idx === 28) {
      state = 'moved';
      tag = 'Moved';
    } else if (idx === 42) {
      state = 'violation';
      tag = 'H2';
    }

    const roomObj = ROOMS_BY_ID.get(chosenRoom);

    list.push({
      id: s.id,
      sessionId: s.id,
      courseId: s.course_id,
      courseTitle,
      facultyId: s.faculty_id,
      facultyName,
      facultySurname,
      groups: s.groups,
      roomId: chosenRoom,
      roomName: roomObj?.name || chosenRoom,
      day: chosenDay,
      startPeriod: chosenPeriod,
      duration: dur,
      kind: s.kind,
      state,
      tag,
      accessible: roomObj?.accessible ?? false,
      ruleCode: state === 'violation' ? 'H2' : undefined,
      reason:
        state === 'violation'
          ? 'Clashes with CS201 (CSE Year 2, Wed P3). The auditorium is free Thu P3.'
          : undefined,
    });
  });

  // Add Spectra Evening Events (P10-P13)
  list.push(
    {
      id: 'EVT-01',
      sessionId: 'SPECTRA-INAU',
      courseId: 'SPECTRA',
      courseTitle: "Spectra '27 Inauguration Gala",
      facultyId: 'F01',
      facultyName: 'Dr. Suresh Patnaik',
      facultySurname: 'Dean Office',
      groups: ['ALL'],
      roomId: 'AUD',
      roomName: 'Main Auditorium',
      day: 'MON',
      startPeriod: 10,
      duration: 3,
      kind: 'event',
      state: 'event',
      tag: 'Event',
      accessible: true,
    },
    {
      id: 'EVT-02',
      sessionId: 'SPECTRA-QUIZ',
      courseId: 'QUIZ',
      courseTitle: 'Inter-College Quiz Prelims',
      facultyId: 'F05',
      facultyName: 'Dr. R. K. Sharma',
      facultySurname: 'Dr. Sharma',
      groups: ['Y1-A', 'CSE-2'],
      roomId: 'SH-1',
      roomName: 'Seminar Hall 1',
      day: 'WED',
      startPeriod: 10,
      duration: 2,
      kind: 'event',
      state: 'event',
      tag: 'Event',
      accessible: true,
    },
    {
      id: 'EVT-03',
      sessionId: 'SPECTRA-DRAMA',
      courseId: 'CULTURE',
      courseTitle: 'Annual Street Play Finals',
      facultyId: 'F12',
      facultyName: 'Prof. S. Mohanty',
      facultySurname: 'Mohanty',
      groups: ['ALL'],
      roomId: 'OAT',
      roomName: 'Open Air Theatre',
      day: 'THU',
      startPeriod: 10,
      duration: 3,
      kind: 'event',
      state: 'event',
      tag: 'Event',
      accessible: true,
    }
  );

  return list;
})();

export const BOOKINGS: BookingRequest[] = RAW_BOOKINGS.map((b, idx) => {
  const room = ROOMS_BY_ID.get(b.requested_room);
  let status: BookingRequest['status'] = 'approved';
  let reason = 'Approved by Dean Office. Venue free and adequate capacity.';
  let priorityRank = 3;

  if (b.requested_category === 'institute_event') priorityRank = 3;
  else if (b.requested_category === 'guest_lecture') priorityRank = 4;
  else if (b.requested_category === 'department_event') priorityRank = 5;
  else if (b.requested_category === 'club_event') priorityRank = 6;

  if (b.id === 'BR-09') {
    status = 'rejected';
    reason = 'No venue on campus seats 1,200 (largest is the OAT at 800).';
  } else if (b.id === 'BR-07') {
    status = 'alternative_offered';
    reason =
      'SH-1 went to the Quiz Club, who asked first; the auditorium has a stage and is free.';
  } else if (b.id === 'BR-04' || b.id === 'BR-06' || b.id === 'BR-11') {
    status = 'pending';
    reason = 'Pending Dean office verification for multi-day lab usage.';
  } else if (b.id === 'BR-15') {
    status = 'cancelled';
    reason = 'Cancelled by club organizers due to speaker travel delay.';
  }

  const firstWindow = b.windows?.[0] || { day: 'MON', from_period: 4, to_period: 5 };

  return {
    ...b,
    status,
    priority_rank: priorityRank,
    assigned_room: b.requested_room,
    assigned_day: firstWindow.day,
    assigned_start_period: firstWindow.from_period,
    assigned_end_period: firstWindow.to_period,
    reason,
    alternatives: [
      {
        day: firstWindow.day === 'MON' ? 'THU' : 'WED',
        startPeriod: 10,
        endPeriod: 12,
        roomId: 'SH-2',
        roomName: 'Seminar Hall 2',
        reason: 'Free evening slot with adequate seating and sound setup.',
      },
      {
        day: 'FRI',
        startPeriod: 6,
        endPeriod: 7,
        roomId: 'AUD',
        roomName: 'Main Auditorium',
        reason: 'Optimal stage capacity, Friday afternoon available.',
      },
    ],
  };
});

export const EXAMS: Exam[] = RAW_EXAMS.map((ex, idx) => {
  const days: Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const day = days[idx % days.length];
  const slot: 'AM' | 'PM' = idx % 2 === 0 ? 'AM' : 'PM';
  const examRooms = ['LH-1', 'LH-2', 'LH-3', 'CR-101', 'CR-102', 'CR-201'];
  const roomId = examRooms[idx % examRooms.length];
  const room = ROOMS_BY_ID.get(roomId);
  const normalCap = room?.capacity || 120;
  const examCap = Math.floor(normalCap / 2);
  const seated = Math.min(ex.size, examCap);

  return {
    id: ex.id,
    course_ids: ex.course_ids,
    groups: ex.groups,
    size: ex.size,
    duration_hours: ex.duration_hours || 2,
    day,
    slot,
    room_id: roomId,
    seated_count: seated,
    capacity: examCap,
  };
});

export function getStats() {
  return {
    sessionsScheduled: 189,
    hardViolations: 0,
    softPenalty: 48,
    pendingApprovals: BOOKINGS.filter((b) => b.status === 'pending').length,
    campusUtilization: 76.4,
    activeConflicts: 0,
    festBookingsCount: BOOKINGS.length,
    examsCount: EXAMS.length,
  };
}

export function getDisruptionSample() {
  return rawDisruption;
}
