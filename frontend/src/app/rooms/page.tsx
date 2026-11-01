'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';
import { Chip } from '@/components/ui/Chip';
import { WheelchairGlyph } from '@/components/ui/Icons';
import { CampusVenueMap } from '@/components/ui/CampusVenueMap';
import { Day, Room } from '@/data/types';

const CAMPUS_ROOMS: Room[] = [
  { id: 'LH-1', name: 'Lecture Hall 1', building: 'LH_COMPLEX', type: 'lecture_hall', capacity: 180, features: ['projector', 'pa_system'], accessible: true, allowed_uses: ['lecture', 'exam'] },
  { id: 'LH-2', name: 'Lecture Hall 2', building: 'LH_COMPLEX', type: 'lecture_hall', capacity: 180, features: ['projector', 'pa_system'], accessible: true, allowed_uses: ['lecture', 'exam'] },
  { id: 'LH-3', name: 'Lecture Hall 3', building: 'LH_COMPLEX', type: 'lecture_hall', capacity: 120, features: ['projector'], accessible: true, allowed_uses: ['lecture', 'exam'] },
  { id: 'LH-4', name: 'Lecture Hall 4', building: 'LH_COMPLEX', type: 'lecture_hall', capacity: 120, features: ['projector'], accessible: false, allowed_uses: ['lecture', 'exam'] },
  { id: 'CR-101', name: 'Classroom 101', building: 'BLOCK_A', type: 'classroom', capacity: 90, features: ['projector'], accessible: true, allowed_uses: ['lecture'] },
  { id: 'CR-102', name: 'Classroom 102', building: 'BLOCK_A', type: 'classroom', capacity: 90, features: ['projector'], accessible: true, allowed_uses: ['lecture'] },
  { id: 'CR-103', name: 'Classroom 103', building: 'BLOCK_A', type: 'classroom', capacity: 90, features: ['projector'], accessible: true, allowed_uses: ['lecture'] },
  { id: 'CR-201', name: 'Classroom 201', building: 'BLOCK_B', type: 'classroom', capacity: 90, features: ['projector'], accessible: true, allowed_uses: ['lecture'] },
  { id: 'CR-202', name: 'Classroom 202', building: 'BLOCK_B', type: 'classroom', capacity: 90, features: ['projector'], accessible: true, allowed_uses: ['lecture'] },
  { id: 'CS-LAB-1', name: 'Computer Lab 1', building: 'LABS', type: 'lab', capacity: 60, features: ['computers'], accessible: true, allowed_uses: ['lab'] },
  { id: 'CS-LAB-2', name: 'Computer Lab 2', building: 'LABS', type: 'lab', capacity: 60, features: ['computers'], accessible: true, allowed_uses: ['lab'] },
  { id: 'PHY-LAB', name: 'Physics Lab', building: 'LABS', type: 'lab', capacity: 45, features: ['special_equipment'], accessible: true, allowed_uses: ['lab'] },
  { id: 'SH-1', name: 'Seminar Hall 1', building: 'SH_HALLS', type: 'seminar_hall', capacity: 150, features: ['projector', 'pa_system'], accessible: true, allowed_uses: ['seminar', 'event'] },
  { id: 'SH-2', name: 'Seminar Hall 2', building: 'SH_HALLS', type: 'seminar_hall', capacity: 150, features: ['projector'], accessible: false, allowed_uses: ['seminar', 'event'] },
  { id: 'AUD', name: 'Main Auditorium', building: 'AUD', type: 'auditorium', capacity: 400, features: ['stage', 'pa_system'], accessible: true, allowed_uses: ['event'] },
  { id: 'OAT', name: 'Open-Air Theatre', building: 'OAT', type: 'open_air_theatre', capacity: 800, features: ['stage'], accessible: true, allowed_uses: ['event'] },
];

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>(CAMPUS_ROOMS);
  const [freeRooms, setFreeRooms] = useState<string[]>([]);
  const [apiError, setApiError] = useState<{ code: string; message: string } | null>(null);
  const [selectedDay, setSelectedDay] = useState<Day>('THU');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(6);
  const [minCapacity, setMinCapacity] = useState<number>(0);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('LH-1');
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null);
  const [mapView, setMapView] = useState<'realistic' | 'schematic'>('realistic');

  const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  useEffect(() => {
    api.getFreeRooms(selectedDay, selectedPeriod, 1)
      .then((res) => {
        if (Array.isArray(res?.free_rooms)) setFreeRooms(res.free_rooms);
        setApiError(null);
      })
      .catch((err) => {
        setApiError({ code: err.code || 'HTTP_501', message: err.message || 'Free rooms search pending timetable integration.' });
      });
  }, [selectedDay, selectedPeriod]);

  // Map building to corresponding room IDs in dataset
  const buildingRooms: Record<string, string[]> = {
    AUD: ['AUD'],
    LH_COMPLEX: ['LH-1', 'LH-2', 'LH-3', 'LH-4', 'LH-5', 'LH-6'],
    BLOCK_A: ['CR-101', 'CR-102', 'CR-103', 'CR-104', 'CR-105'],
    BLOCK_B: ['CR-201', 'CR-202', 'CR-203', 'CR-204', 'CR-205'],
    SH_HALLS: ['SH-1', 'SH-2'],
    LABS: ['CS-LAB-1', 'CS-LAB-2', 'ELEC-LAB-1', 'ELEC-LAB-2', 'PHY-LAB'],
    WORKSHOPS: ['MECH-WS', 'CIVIL-LAB'],
    OAT: ['OAT'],
  };

  type RoomStatusResult =
    | { status: 'FREE'; label: string; session?: any }
    | { status: 'OCCUPIED'; label: string; session?: any }
    | { status: 'MAINTENANCE'; label: string; session?: any };

  // Helper to determine occupancy at day + period
  const getRoomStatus = (roomId: string, day: Day, period: number): RoomStatusResult => {
    if (freeRooms.includes(roomId)) {
      return { status: 'FREE', label: 'Available' };
    }
    // Known maintenance / closure windows
    if (roomId === 'LH-4' && day === 'THU') {
      return { status: 'MAINTENANCE', label: 'HVAC repair window' };
    }
    if (roomId === 'CR-103' && day === 'FRI' && period >= 6) {
      return { status: 'MAINTENANCE', label: 'Electrical rewiring' };
    }

    return { status: 'OCCUPIED', label: 'Scheduled' };
  };

  // Finder filter
  const filteredRooms = rooms.filter((r) => {
    if (minCapacity > 0 && r.capacity < minCapacity) return false;
    if (selectedType !== 'ALL' && r.type !== selectedType) return false;
    return true;
  });

  // Check building status for map rendering
  const getBuildingState = (bKey: string) => {
    const rIds = buildingRooms[bKey] || [];
    const roomsInBuilding = rooms.filter((r) => rIds.includes(r.id));
    const matchingRooms = filteredRooms.filter((r) => rIds.includes(r.id));

    // Is any room in this building under maintenance?
    const hasMaintenance = roomsInBuilding.some(
      (r) => getRoomStatus(r.id, selectedDay, selectedPeriod).status === 'MAINTENANCE'
    );

    // Is any matching room free?
    const hasFreeMatch = matchingRooms.some(
      (r) => getRoomStatus(r.id, selectedDay, selectedPeriod).status === 'FREE'
    );

    // Are all rooms busy?
    const isAllBusy = roomsInBuilding.every(
      (r) => getRoomStatus(r.id, selectedDay, selectedPeriod).status === 'OCCUPIED'
    );

    // Is OAT during an evening event?
    const isSpectraEvent = bKey === 'OAT' && selectedPeriod >= 8;

    return {
      hasMaintenance,
      hasFreeMatch,
      isAllBusy,
      isSpectraEvent,
      totalRooms: roomsInBuilding.length,
      freeMatchesCount: matchingRooms.filter(
        (r) => getRoomStatus(r.id, selectedDay, selectedPeriod).status === 'FREE'
      ).length,
    };
  };

  // Calculate heatmap utilisation & under 40% count across the 27 rooms * 9 periods for the selected day
  let under40Count = 0;
  const roomLoadMatrix: Record<string, Record<number, { load: number; isClosed: boolean; isOccupied: boolean; label: string }>> = {};

  rooms.forEach((r, rIdx) => {
    roomLoadMatrix[r.id] = {};
    periods.forEach((p) => {
      const st = getRoomStatus(r.id, selectedDay, p);
      if (st.status === 'MAINTENANCE') {
        roomLoadMatrix[r.id][p] = { load: 0, isClosed: true, isOccupied: false, label: 'Maintenance' };
      } else if (st.status === 'OCCUPIED') {
        // Realistic student group size vs room capacity
        const groupCount = st.session?.groups.length || 1;
        const studentCount = groupCount * 45;
        const load = Math.min(100, Math.round((studentCount / r.capacity) * 100));
        if (load < 40 && load > 0) under40Count++;
        roomLoadMatrix[r.id][p] = { load, isClosed: false, isOccupied: true, label: `${st.label} (${load}%)` };
      } else {
        roomLoadMatrix[r.id][p] = { load: 0, isClosed: false, isOccupied: false, label: 'Free' };
      }
    });
  });

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || rooms[0];

  return (
    <AppShell>
      <div className="space-y-8 max-w-7xl font-ui">
        {/* Title & Introduction */}
        <div className="border-b border-line pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-[40px] leading-[44px] text-ink tracking-tight mb-1">
              Venues &amp; Room Explorer
            </h1>
            <p className="font-serif italic text-[16px] text-ink-2">
              Campus venues, room capacities, live occupancy, and accessibility information.
            </p>
          </div>

          <div className="text-[12px] font-mono text-ink-2 bg-surface px-3 py-1.5 rounded-card border border-line">
            Active slot: <span className="text-ink font-semibold">{selectedDay} Period P{selectedPeriod}</span> ({7 + selectedPeriod}:00 - {8 + selectedPeriod}:00)
          </div>
        </div>

        {/* TOP: Inline Finder (Day, Period, Minimum Capacity, Type) */}
        <div className="p-4 bg-surface border border-line rounded-panel flex flex-wrap items-center gap-4 text-[13px]">
          <div className="flex items-center gap-2">
            <label className="text-ink-2 font-medium">Day:</label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value as Day)}
              className="bg-raised border border-line-strong hover:border-ink rounded-[6px] px-2.5 py-1 text-[12px] font-medium text-ink focus:outline-none transition-colors"
            >
              <option value="MON">Monday</option>
              <option value="TUE">Tuesday</option>
              <option value="WED">Wednesday</option>
              <option value="THU">Thursday</option>
              <option value="FRI">Friday</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-ink-2 font-medium">Period:</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(Number(e.target.value))}
              className="bg-raised border border-line-strong hover:border-ink rounded-[6px] px-2.5 py-1 text-[12px] font-medium text-ink focus:outline-none transition-colors"
            >
              {periods.map((p) => (
                <option key={p} value={p}>
                  P{p} ({7 + p}:00 - {8 + p}:00)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-ink-2 font-medium">Min capacity:</label>
            <input
              type="number"
              value={minCapacity || ''}
              placeholder="e.g. 100"
              onChange={(e) => setMinCapacity(Number(e.target.value) || 0)}
              className="w-24 h-7 px-2.5 bg-raised border border-line-strong hover:border-ink rounded-[6px] text-[12px] text-ink font-mono focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-ink-2 font-medium">Type:</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-raised border border-line-strong hover:border-ink rounded-[6px] px-2.5 py-1 text-[12px] font-medium text-ink focus:outline-none transition-colors"
            >
              <option value="ALL">All Types</option>
              <option value="classroom">Classroom</option>
              <option value="lecture_hall">Lecture Hall</option>
              <option value="auditorium">Auditorium</option>
              <option value="seminar_hall">Seminar Hall</option>
              <option value="lab">Laboratories</option>
              <option value="workshop">Workshops</option>
              <option value="open_air_theatre">Open Air Theatre</option>
            </select>
          </div>

          <div className="ml-auto text-[12px] text-ink-2">
            Matches: <span className="font-semibold text-ink">{filteredRooms.length}</span> of {rooms.length} venues
          </div>
        </div>

        {/* TWO-COLUMN: Result List on Left + Isometric Campus Map on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Result List on the left (5 cols) */}
          <div className="lg:col-span-5 bg-surface border border-line rounded-panel p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <h2 className="font-serif text-[22px] text-ink">
                Venue Status at {selectedDay} P{selectedPeriod}
              </h2>
              <span className="text-[11px] text-ink-2 font-mono">
                {filteredRooms.filter((r) => getRoomStatus(r.id, selectedDay, selectedPeriod).status === 'FREE').length} free
              </span>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {filteredRooms.map((r) => {
                const info = getRoomStatus(r.id, selectedDay, selectedPeriod);
                const isSelected = selectedRoomId === r.id;

                let borderStyle = 'border-line hover:border-ink';
                if (isSelected) borderStyle = 'border-violet bg-raised ring-1 ring-violet shadow-xs';

                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRoomId(r.id)}
                    className={`p-3 rounded-card border transition-all cursor-pointer flex items-center justify-between ${
                      info.status === 'MAINTENANCE'
                        ? 'bg-surface hatch border-line-strong opacity-80'
                        : isSelected
                        ? 'bg-raised'
                        : 'bg-surface hover:bg-raised'
                    } ${borderStyle}`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[13px] text-ink">{r.id}</span>
                        <span className="text-[12px] text-ink-2">({r.name})</span>
                        {r.accessible && (
                          <span title="Wheelchair accessible">
                            <WheelchairGlyph size={13} className="text-good" />
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-ink-2 mt-0.5">
                        {r.building} &middot; Capacity {r.capacity} &middot; {r.type.replace('_', ' ')}
                      </div>
                    </div>

                    <div>
                      {info.status === 'MAINTENANCE' ? (
                        <Chip label="Maintenance" variant="rejected" />
                      ) : info.status === 'OCCUPIED' ? (
                        <Chip label="Occupied" variant="pending" />
                      ) : (
                        <Chip label="Available" variant="valid" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Isometric Campus Line-Art Map on the right (7 cols) */}
          <div className="lg:col-span-7 glass-panel rounded-panel p-5 space-y-3 shadow-card">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <div>
                <h2 className="font-serif text-[22px] text-ink">Campus Isometric Wayfinder</h2>
                <p className="font-serif italic text-[14px] text-ink-2">
                  Line-art ink strokes on paper. Matches highlighted with leaf wash, busy venues line-only, closed ones hatched.
                </p>
              </div>
              <div className="inline-flex items-center bg-raised border border-line rounded-[6px] p-0.5 text-[11px] font-medium font-ui">
                <button
                  type="button"
                  onClick={() => setMapView('realistic')}
                  className={`px-2.5 py-1 rounded-[4px] transition-all ${
                    mapView === 'realistic'
                      ? 'bg-surface text-ink font-semibold shadow-xs'
                      : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  3D Masterplan
                </button>
                <button
                  type="button"
                  onClick={() => setMapView('schematic')}
                  className={`px-2.5 py-1 rounded-[4px] transition-all ${
                    mapView === 'schematic'
                      ? 'bg-surface text-ink font-semibold shadow-xs'
                      : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  Schematic
                </button>
              </div>
            </div>

            {mapView === 'realistic' ? (
              <CampusVenueMap className="w-full h-[380px]" />
            ) : (
            /* SVG Line Map Canvas */
            <div className="relative w-full h-[360px] bg-paper border border-line-strong/50 rounded-card p-4 overflow-hidden select-none flex items-center justify-center">
              <svg
                className="w-full h-full text-ink relative z-0"
                viewBox="0 0 600 360"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
              >
                <defs>
                  {/* Diagonal hatch pattern for closed / maintenance venues */}
                  <pattern
                    id="map-hatch"
                    width="6"
                    height="6"
                    patternTransform="rotate(45)"
                    patternUnits="userSpaceOnUse"
                  >
                    <line x1="0" y1="0" x2="0" y2="6" stroke="var(--line-strong)" strokeWidth="1.25" />
                  </pattern>
                </defs>

                {/* Chilika lagoon shore line (dashed ink stroke) */}
                <path
                  d="M 10 305 Q 180 265 340 295 T 590 275"
                  stroke="var(--line-strong)"
                  strokeWidth="1.5"
                  strokeDasharray="4 6"
                />
                <text x="440" y="330" fill="var(--ink-2)" fontSize="11" fontFamily="var(--font-display)" fontStyle="italic">
                  Chilika Lagoon Shore
                </text>

                {/* Building 1: Main Auditorium (AUD) */}
                {(() => {
                  const state = getBuildingState('AUD');
                  const isHovered = hoveredBuilding === 'AUD';
                  const isSelected = selectedRoomId === 'AUD';

                  let fillVal = 'none'; // busy = line-only
                  let strokeVal = 'currentColor';
                  if (state.hasMaintenance) fillVal = 'url(#map-hatch)';
                  else if (state.hasFreeMatch) fillVal = 'var(--t-good)';

                  if (state.hasFreeMatch) strokeVal = 'var(--good)';
                  if (isSelected) strokeVal = 'var(--violet)';

                  return (
                    <g
                      id="AUD"
                      onMouseEnter={() => setHoveredBuilding('AUD')}
                      onMouseLeave={() => setHoveredBuilding(null)}
                      onClick={() => setSelectedRoomId('AUD')}
                      className="cursor-pointer group"
                    >
                      <polygon
                        points="140,70 210,110 140,150 70,110"
                        stroke={strokeVal}
                        strokeWidth={isSelected || isHovered ? 2 : 1.5}
                        fill={fillVal}
                        className="transition-all"
                      />
                      <line x1="140" y1="150" x2="140" y2="195" stroke={strokeVal} />
                      <line x1="210" y1="110" x2="210" y2="155" stroke={strokeVal} />
                      <line x1="70" y1="110" x2="70" y2="155" stroke={strokeVal} />
                      <polygon points="140,195 210,155 210,155 140,150" stroke={strokeVal} fill={fillVal === 'none' ? 'none' : 'var(--paper)'} />
                      <polygon points="140,195 70,155 70,155 140,150" stroke={strokeVal} fill={fillVal === 'none' ? 'none' : 'var(--paper)'} />
                    </g>
                  );
                })()}

                {/* Building 2: Lecture Complex (LH-1 to LH-6) */}
                {(() => {
                  const state = getBuildingState('LH_COMPLEX');
                  const isHovered = hoveredBuilding === 'LH_COMPLEX';
                  const isSelected = selectedRoomId.startsWith('LH');

                  let fillVal = 'none'; // busy = line-only
                  let strokeVal = 'currentColor';
                  if (state.hasMaintenance && selectedRoomId === 'LH-4') fillVal = 'url(#map-hatch)';
                  else if (state.hasFreeMatch) fillVal = 'var(--t-good)';

                  if (state.hasFreeMatch) strokeVal = 'var(--good)';
                  if (isSelected) strokeVal = 'var(--violet)';

                  return (
                    <g
                      id="LH_COMPLEX"
                      onMouseEnter={() => setHoveredBuilding('LH_COMPLEX')}
                      onMouseLeave={() => setHoveredBuilding(null)}
                      onClick={() => setSelectedRoomId('LH-1')}
                      className="cursor-pointer group"
                    >
                      <polygon
                        points="370,50 440,85 370,120 300,85"
                        stroke={strokeVal}
                        strokeWidth={isSelected || isHovered ? 2 : 1.5}
                        fill={fillVal}
                        className="transition-all"
                      />
                      <line x1="370" y1="120" x2="370" y2="160" stroke={strokeVal} />
                      <line x1="440" y1="85" x2="440" y2="125" stroke={strokeVal} />
                      <line x1="300" y1="85" x2="300" y2="125" stroke={strokeVal} />
                      <polygon points="370,160 440,125 440,125 370,120" stroke={strokeVal} fill={fillVal === 'none' ? 'none' : 'var(--paper)'} />
                      <polygon points="370,160 300,125 300,125 370,120" stroke={strokeVal} fill={fillVal === 'none' ? 'none' : 'var(--paper)'} />
                    </g>
                  );
                })()}

                {/* Building 3: Seminar Halls (SH-1, SH-2) */}
                {(() => {
                  const state = getBuildingState('SH_HALLS');
                  const isHovered = hoveredBuilding === 'SH_HALLS';
                  const isSelected = selectedRoomId.startsWith('SH');

                  let fillVal = 'none'; // busy = line-only
                  let strokeVal = 'currentColor';
                  if (state.hasFreeMatch) fillVal = 'var(--t-good)';
                  if (state.hasFreeMatch) strokeVal = 'var(--good)';
                  if (isSelected) strokeVal = 'var(--violet)';

                  return (
                    <g
                      id="SH_HALLS"
                      onMouseEnter={() => setHoveredBuilding('SH_HALLS')}
                      onMouseLeave={() => setHoveredBuilding(null)}
                      onClick={() => setSelectedRoomId('SH-1')}
                      className="cursor-pointer group"
                    >
                      <polygon
                        points="260,130 320,160 260,190 200,160"
                        stroke={strokeVal}
                        strokeWidth={isSelected || isHovered ? 2 : 1.5}
                        fill={fillVal}
                        className="transition-all"
                      />
                      <line x1="260" y1="190" x2="260" y2="225" stroke={strokeVal} />
                      <line x1="320" y1="160" x2="320" y2="195" stroke={strokeVal} />
                      <line x1="200" y1="160" x2="200" y2="195" stroke={strokeVal} />
                    </g>
                  );
                })()}

                {/* Building 4: Laboratories Complex (CS, Elec & Physics Labs) */}
                {(() => {
                  const state = getBuildingState('LABS');
                  const isHovered = hoveredBuilding === 'LABS';
                  const isSelected = selectedRoomId.includes('LAB');

                  let fillVal = 'none'; // busy = line-only
                  let strokeVal = 'currentColor';
                  if (state.hasFreeMatch) fillVal = 'var(--t-good)';
                  if (state.hasFreeMatch) strokeVal = 'var(--good)';
                  if (isSelected) strokeVal = 'var(--violet)';

                  return (
                    <g
                      id="LABS"
                      onMouseEnter={() => setHoveredBuilding('LABS')}
                      onMouseLeave={() => setHoveredBuilding(null)}
                      onClick={() => setSelectedRoomId('CS-LAB-1')}
                      className="cursor-pointer group"
                    >
                      <polygon
                        points="140,210 200,240 140,270 80,240"
                        stroke={strokeVal}
                        strokeWidth={isSelected || isHovered ? 2 : 1.5}
                        fill={fillVal}
                        className="transition-all"
                      />
                      <line x1="140" y1="270" x2="140" y2="300" stroke={strokeVal} />
                      <line x1="200" y1="240" x2="200" y2="270" stroke={strokeVal} />
                      <line x1="80" y1="240" x2="80" y2="270" stroke={strokeVal} />
                    </g>
                  );
                })()}

                {/* Building 5: Open Air Theatre tiers (OAT) */}
                {(() => {
                  const state = getBuildingState('OAT');
                  const isHovered = hoveredBuilding === 'OAT';
                  const isSelected = selectedRoomId === 'OAT';

                  let fillVal = 'none';
                  let strokeVal = 'currentColor';
                  if (state.isSpectraEvent) {
                    fillVal = 'var(--yellow)';
                    strokeVal = 'var(--ink)';
                  } else if (state.hasFreeMatch) {
                    fillVal = 'var(--t-good)';
                    strokeVal = 'var(--good)';
                  }
                  if (isSelected) strokeVal = 'var(--violet)';

                  return (
                    <g
                      id="OAT"
                      onMouseEnter={() => setHoveredBuilding('OAT')}
                      onMouseLeave={() => setHoveredBuilding(null)}
                      onClick={() => setSelectedRoomId('OAT')}
                      className="cursor-pointer group"
                    >
                      <path
                        d="M 450 180 Q 510 195 530 250"
                        stroke={strokeVal}
                        strokeWidth={isSelected || isHovered ? 2.5 : 1.75}
                        fill={fillVal}
                      />
                      <path
                        d="M 460 170 Q 525 185 545 240"
                        stroke={strokeVal}
                        strokeWidth={isSelected || isHovered ? 2.5 : 1.75}
                        fill={fillVal}
                      />
                      <path
                        d="M 470 160 Q 540 175 560 230"
                        stroke={strokeVal}
                        strokeWidth={isSelected || isHovered ? 2.5 : 1.75}
                        fill={fillVal}
                      />
                    </g>
                  );
                })()}
              </svg>

              {/* INK LABEL TAGS ON HOVER & SELECTION */}
              {/* Tag 1: Main Auditorium */}
              {(hoveredBuilding === 'AUD' || selectedRoomId === 'AUD') && (
                <div className="absolute top-12 left-16 px-3 py-1.5 bg-raised text-ink text-[12px] font-medium rounded-card shadow-sm animate-fade-in pointer-events-none z-10 border border-line-strong">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${selectedRoomId === 'AUD' ? 'bg-violet' : 'bg-good'}`} />
                    <span className="font-semibold">AUD &middot; Main Auditorium</span>
                    <span className="text-[11px] text-ink-2 font-mono">Cap 500</span>
                  </div>
                  <span className="text-[11px] text-ink-2 font-mono block mt-0.5">
                    {getRoomStatus('AUD', selectedDay, selectedPeriod).status === 'FREE' ? 'Available' : 'Occupied'} at P{selectedPeriod}
                  </span>
                </div>
              )}

              {/* Tag 2: Lecture Complex */}
              {(hoveredBuilding === 'LH_COMPLEX' || selectedRoomId.startsWith('LH')) && (
                <div className="absolute top-8 right-28 px-3 py-1.5 bg-raised text-ink text-[12px] font-medium rounded-card shadow-sm animate-fade-in pointer-events-none z-10 border border-line-strong">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${selectedRoomId.startsWith('LH') ? 'bg-violet' : 'bg-good'}`} />
                    <span className="font-semibold">LH Complex (LH-1 to LH-6)</span>
                  </div>
                  <span className="text-[11px] text-ink-2 font-mono block mt-0.5">
                    {getBuildingState('LH_COMPLEX').freeMatchesCount} of 6 lecture halls available
                  </span>
                </div>
              )}

              {/* Tag 3: Seminar Halls */}
              {(hoveredBuilding === 'SH_HALLS' || selectedRoomId.startsWith('SH')) && (
                <div className="absolute top-32 left-44 px-3 py-1.5 bg-raised text-ink text-[12px] font-medium rounded-card shadow-sm animate-fade-in pointer-events-none z-10 border border-line-strong">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${selectedRoomId.startsWith('SH') ? 'bg-violet' : 'bg-good'}`} />
                    <span className="font-semibold">SH-1 &amp; SH-2 (Seminar Complex)</span>
                  </div>
                  <span className="text-[11px] text-ink-2 font-mono block mt-0.5">
                    Acoustically isolated colloquium halls &middot; Cap 150-180
                  </span>
                </div>
              )}

              {/* Tag 4: Laboratories */}
              {(hoveredBuilding === 'LABS' || selectedRoomId.includes('LAB')) && (
                <div className="absolute bottom-14 left-16 px-3 py-1.5 bg-raised text-ink text-[12px] font-medium rounded-card shadow-sm animate-fade-in pointer-events-none z-10 border border-line-strong">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${selectedRoomId.includes('LAB') ? 'bg-violet' : 'bg-good'}`} />
                    <span className="font-semibold">CS-LAB, ELEC-LAB &amp; PHY-LAB</span>
                  </div>
                  <span className="text-[11px] text-ink-2 font-mono block mt-0.5">
                    Specialized engineering laboratory suites
                  </span>
                </div>
              )}

              {/* Tag 5: Open Air Theatre */}
              {(hoveredBuilding === 'OAT' || selectedRoomId === 'OAT') && (
                <div className="absolute bottom-20 right-10 px-3 py-1.5 bg-raised text-ink text-[12px] font-medium rounded-card shadow-sm animate-fade-in pointer-events-none z-10 border border-line-strong">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${selectedRoomId === 'OAT' ? 'bg-violet' : 'bg-yellow'}`} />
                    <span className="font-semibold">OAT (Open Air Amphitheatre &middot; Cap 800)</span>
                  </div>
                  <span className="text-[11px] text-ink-2 font-mono block mt-0.5">
                    Spectra festival performance stage
                  </span>
                </div>
              )}

              {/* BOXED LEGEND (Bottom-Right) */}
              <div className="absolute bottom-3 right-3 p-2.5 bg-surface/95 border border-line rounded-card text-[11px] space-y-1.5 select-none font-ui shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-cell bg-t-good border border-good" />
                  <span className="text-ink">Match (Leaf wash)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-cell bg-surface border border-line-strong" />
                  <span className="text-ink">Busy venue (Line-only)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-cell hatch border border-line-strong" />
                  <span className="text-ink">Closed (Hatched)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-cell bg-event" />
                  <span className="text-ink">Spectra event (Haritala)</span>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>

        {/* BELOW SECTION 1: 27 ROOMS x 9 PERIODS HEATMAP */}
        <div className="p-6 bg-surface border border-line rounded-panel space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
            <div>
              <h2 className="font-serif text-[26px] leading-[30px] text-ink">
                Room Utilisation Matrix: {selectedDay} (All 27 Campus Venues)
              </h2>
              <p className="font-serif italic text-[14px] text-ink-2 mt-0.5">
                Single-hue lagoon ramp for 0 to 90%. Over 90% shifts to hingula red. Maintenance hatched grey. Dotted texture for sessions under 40% capacity.
              </p>
            </div>

            {/* DYNAMIC LEGEND & UNDER 40% COUNT */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink-2 font-mono">
              <span className="flex items-center gap-1.5" title="Under 40% seat occupancy">
                <span className="w-3 h-3 rounded-cell dots-pattern border border-line-strong" />
                <span className="font-semibold text-ink">&lt;40% Dotted ({under40Count} sessions under 40% capacity)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-cell bg-t-tutorial border border-tutorial/50" />
                <span>40-70% Lagoon tint</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-cell bg-tutorial text-paper" />
                <span>70-90% Lagoon solid</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-cell bg-coral text-ink font-semibold" />
                <span>&gt;90% Overload</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-cell hatch border border-line-strong" />
                <span>Maintenance</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[760px] space-y-1.5">
              {/* Header row: P1 to P9 */}
              <div className="grid grid-cols-[130px_repeat(9,1fr)] gap-1.5 text-center text-[11px] font-mono text-ink-2 pb-1 border-b border-line">
                <span className="text-left font-medium">Venue ID</span>
                {periods.map((p) => (
                  <span key={p} className={p === selectedPeriod ? 'font-bold text-ink underline' : ''}>
                    P{p} ({7 + p}:00)
                  </span>
                ))}
              </div>

              {/* All 27 Room Rows */}
              {rooms.map((r) => {
                const isSelected = selectedRoomId === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRoomId(r.id)}
                    className={`grid grid-cols-[130px_repeat(9,1fr)] gap-1.5 items-center cursor-pointer rounded-cell px-1 transition-colors ${
                      isSelected ? 'bg-raised font-semibold' : 'hover:bg-raised/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink font-ui truncate">
                      <span className="truncate">{r.id}</span>
                      {r.accessible && <WheelchairGlyph size={11} className="text-good shrink-0" />}
                    </div>

                    {periods.map((p) => {
                      const cell = roomLoadMatrix[r.id][p];
                      let cellStyle = 'bg-surface border border-line text-ink-2';

                      if (cell.isClosed) {
                        cellStyle = 'hatch border-line-strong text-transparent';
                      } else if (cell.load > 90) {
                        cellStyle = 'bg-coral text-ink font-semibold';
                      } else if (cell.load >= 70) {
                        cellStyle = 'bg-tutorial text-white font-medium';
                      } else if (cell.load >= 40) {
                        cellStyle = 'bg-t-tutorial border border-tutorial/60 text-ink font-medium';
                      } else if (cell.load > 0) {
                        // DOTTED TEXTURE FOR UNDER 40% SESSIONS
                        cellStyle = 'dots-pattern bg-t-tutorial/40 border border-line-strong text-ink font-medium';
                      }

                      return (
                        <div
                          key={p}
                          title={`${r.id} at P${p}: ${cell.label}`}
                          className={`h-8 rounded-[3px] flex items-center justify-center text-[11px] font-mono transition-colors ${cellStyle}`}
                        >
                          {!cell.isClosed && cell.load > 0 ? `${cell.load}%` : ''}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* BELOW SECTION 2: ROOM TABLE (Capacity, Type, Features, Accessibility) */}
        <div className="p-6 bg-surface border border-line rounded-panel space-y-4">
          <div className="border-b border-line pb-3">
            <h2 className="font-serif text-[26px] leading-[30px] text-ink">
              Campus Venue Specifications
            </h2>
            <p className="font-serif italic text-[14px] text-ink-2 mt-0.5">
              Accredited seat counts, exam halving ratings (CR-101: 90 normal / 45 exam), and mobility accessibility markers.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] font-ui border-collapse">
              <thead>
                <tr className="border-b border-line text-ink-2 text-[12px] font-ui font-medium">
                  <th className="py-3 px-2 font-medium">Room ID</th>
                  <th className="py-3 px-2 font-medium">Venue Name</th>
                  <th className="py-3 px-2 font-medium">Building</th>
                  <th className="py-3 px-2 font-medium">Type</th>
                  <th className="py-3 px-2 font-medium">Capacity (Normal / Exam)</th>
                  <th className="py-3 px-2 font-medium">Features</th>
                  <th className="py-3 px-2 font-medium">Accessibility</th>
                  <th className="py-3 px-2 font-medium text-right">Status @ P{selectedPeriod}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredRooms.map((r) => {
                  const status = getRoomStatus(r.id, selectedDay, selectedPeriod);
                  const isSelected = selectedRoomId === r.id;

                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedRoomId(r.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-raised font-medium' : 'hover:bg-raised/60'
                      }`}
                    >
                      <td className="py-3 px-2 font-semibold text-ink font-mono text-[13px]">{r.id}</td>
                      <td className="py-3 px-2 text-ink font-medium">{r.name}</td>
                      <td className="py-3 px-2 text-ink-2">{r.building}</td>
                      <td className="py-3 px-2">
                        <span className="capitalize text-[12px] text-ink-2 bg-raised px-2.5 py-0.5 rounded-pill border border-line">
                          {r.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-mono text-[13px] text-ink">
                        {r.capacity} normal / <span className="text-ink-2">{Math.floor(r.capacity / 2)} exam</span>
                      </td>
                      <td className="py-3 px-2 text-[12px] text-ink-2">
                        {r.features.join(', ') || 'Standard lecture equipment'}
                      </td>
                      <td className="py-3 px-2">
                        {r.accessible ? (
                          <span className="flex items-center gap-1.5 text-[12px] text-good font-medium">
                            <WheelchairGlyph size={13} />
                            <span>Ramp &amp; lift accessible</span>
                          </span>
                        ) : (
                          <span className="text-[12px] text-ink-2/60">Stairs only</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {status.status === 'MAINTENANCE' ? (
                          <Chip label="Maintenance" variant="rejected" />
                        ) : status.status === 'OCCUPIED' ? (
                          <Chip label="Occupied" variant="pending" />
                        ) : (
                          <Chip label="Available" variant="valid" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
