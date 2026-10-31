'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { WheelchairGlyph, CloseIcon } from './Icons';

interface Hotspot {
  id: string;
  name: string;
  shortName: string;
  top: string;
  left: string;
  capacity: number;
  type: string;
  status: 'available' | 'event' | 'lecture';
  statusLabel: string;
  accessible: boolean;
  desc: string;
}

const VENUE_HOTSPOTS: Hotspot[] = [
  {
    id: 'AUD',
    name: 'Main Auditorium (AUD-01)',
    shortName: 'AUD',
    top: '38%',
    left: '28%',
    capacity: 400,
    type: 'Auditorium',
    status: 'event',
    statusLabel: 'Spectra Opening',
    accessible: true,
    desc: 'Tiered acoustic auditorium equipped for inaugurations and institute ceremonies.',
  },
  {
    id: 'SH-1',
    name: 'Seminar Halls (SH-1 & SH-2)',
    shortName: 'SH-1 / SH-2',
    top: '28%',
    left: '60%',
    capacity: 150,
    type: 'Seminar Hall',
    status: 'available',
    statusLabel: 'Available',
    accessible: true,
    desc: 'Dual seminar halls for departmental guest lectures and council presentations.',
  },
  {
    id: 'OAT',
    name: 'Open-Air Theatre (OAT)',
    shortName: 'OAT',
    top: '68%',
    left: '74%',
    capacity: 800,
    type: 'Open-Air Theatre',
    status: 'event',
    statusLabel: 'Spectra Fest Mainstage',
    accessible: true,
    desc: 'Amphitheatre venue with acoustic shell for Spectra cultural competitions.',
  },
  {
    id: 'LH-1',
    name: 'Lecture Hall Complex (LH-1 - LH-4)',
    shortName: 'LH Complex',
    top: '52%',
    left: '42%',
    capacity: 180,
    type: 'Lecture Hall',
    status: 'lecture',
    statusLabel: 'Core Classes',
    accessible: true,
    desc: 'Tiered gallery seating with dual projection for core engineering cohorts.',
  },
];

interface CampusVenueMapProps {
  className?: string;
  compact?: boolean;
}

export function CampusVenueMap({ className = '', compact = false }: CampusVenueMapProps) {
  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className={`relative rounded-panel overflow-hidden border border-line select-none group ${className}`}>
      {/* Background Isometric Image */}
      <div className="relative w-full h-full overflow-hidden bg-[#0e1f21]">
        <Image
          src="/images/campus-venue-map.png"
          alt="CIT Campus Isometric Venue Map"
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
          priority
        />

        {/* Subtle Vignette Overlay for dark/light integration */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />

        {/* Hotspot Pins */}
        {VENUE_HOTSPOTS.map((spot) => {
          const isSelected = activeHotspot?.id === spot.id;
          const statusColors = {
            available: 'bg-green border-white text-ink shadow-[0_0_10px_#63CC79]',
            event: 'bg-yellow border-black text-ink shadow-[0_0_10px_#FBE64D]',
            lecture: 'bg-violet border-white text-white shadow-[0_0_10px_#7D5DFF]',
          }[spot.status];

          return (
            <div
              key={spot.id}
              style={{ top: spot.top, left: spot.left }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
            >
              <button
                type="button"
                onClick={() => setActiveHotspot(spot)}
                onMouseEnter={() => setActiveHotspot(spot)}
                className={`relative px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight border flex items-center gap-1.5 transition-all cursor-pointer transform hover:scale-110 active:scale-95 ${statusColors} ${
                  isSelected ? 'scale-110 ring-2 ring-white' : ''
                }`}
                title={`${spot.name} - ${spot.statusLabel}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                <span>{spot.shortName}</span>
              </button>

              {/* Hover Tooltip / Detail Popover */}
              {isSelected && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-surface/95 backdrop-blur-md border border-violet/30 rounded-card shadow-xl text-left z-30 pointer-events-auto">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-ink text-[12px] truncate">
                      {spot.name}
                    </span>
                    {spot.accessible && (
                      <span title="Wheelchair Accessible">
                        <WheelchairGlyph size={12} className="text-good" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-ink-2 mb-1.5">
                    <span>Capacity: {spot.capacity}</span>
                    <span className="font-medium text-violet">{spot.statusLabel}</span>
                  </div>
                  <p className="text-[10px] text-ink-2 leading-snug line-clamp-2">
                    {spot.desc}
                  </p>
                  <div className="mt-2 pt-1.5 border-t border-line flex justify-between items-center text-[10px]">
                    <Link
                      href="/rooms"
                      className="text-violet hover:underline font-semibold"
                    >
                      View schedule &rarr;
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveHotspot(null);
                      }}
                      className="text-ink-2 hover:text-ink"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Top Overlay Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
          <span className="px-2 py-0.5 rounded-[4px] bg-black/60 backdrop-blur-sm border border-white/20 text-white text-[10px] font-mono tracking-wider">
            CIT Campus Isometric Map
          </span>
        </div>

        {/* Bottom Expand / Rooms Link Controls */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-2.5 py-1 rounded-[6px] bg-surface/90 hover:bg-surface text-ink text-[11px] font-medium border border-line shadow-sm backdrop-blur-sm transition-all hover:glow-violet flex items-center gap-1.5"
          >
            <span>Expand Map</span>
            <span>⛶</span>
          </button>
          <Link
            href="/rooms"
            className="px-2.5 py-1 rounded-[6px] bg-violet hover:bg-violet/90 text-white text-[11px] font-medium shadow-sm transition-all hover:glow-violet"
          >
            All Venues
          </Link>
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-5xl bg-surface border border-line rounded-panel overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-line bg-raised/80">
              <div>
                <h3 className="font-serif text-[24px] text-ink">
                  Chilika Institute of Technology — Campus Venue Master
                </h3>
                <p className="text-[12px] text-ink-2 font-serif italic">
                  High-resolution isometric masterplan of 27 academic and festival venues during Spectra Week.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-card hover:bg-surface text-ink-2 hover:text-ink transition-colors"
                aria-label="Close map"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            {/* Modal Body with Map Image */}
            <div className="relative flex-1 overflow-auto bg-[#0a1718] p-2 flex items-center justify-center">
              <Image
                src="/images/campus-venue-map.png"
                alt="Enlarged Campus Isometric Venue Map"
                width={1586}
                height={992}
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            </div>

            {/* Modal Footer with Venue Stats */}
            <div className="p-4 bg-raised/80 border-t border-line flex flex-wrap items-center justify-between gap-3 text-[12px]">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-ink">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet" />
                  <span>Academic Complexes</span>
                </span>
                <span className="flex items-center gap-1.5 text-ink">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow" />
                  <span>Spectra Venues (AUD, OAT)</span>
                </span>
                <span className="flex items-center gap-1.5 text-ink">
                  <span className="w-2.5 h-2.5 rounded-full bg-green" />
                  <span>Available Venues</span>
                </span>
              </div>
              <Link
                href="/rooms"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 bg-violet text-white rounded-[6px] font-medium text-[12px] hover:bg-violet/90 transition-all shadow-xs"
              >
                Open Room Allocation Explorer
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
