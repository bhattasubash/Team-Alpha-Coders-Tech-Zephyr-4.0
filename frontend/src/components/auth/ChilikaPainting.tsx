'use client';

import React from 'react';

export function ChilikaPainting({ className = '' }: { className?: string }) {
  return (
    <div className={`relative w-full h-full bg-[#0E1F21] overflow-hidden select-none ${className}`}>
      {/* Architectural Line-Art Landscape of Chilika Lagoon Campus */}
      <svg
        className="w-full h-full text-[#EDEBE0]"
        viewBox="0 0 520 600"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Subtle water hatch pattern */}
          <pattern id="waterHatch" width="8" height="8" patternTransform="rotate(25)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#1C3739" strokeWidth="1" />
          </pattern>
          {/* Sunrise gradient on the lagoon */}
          <radialGradient id="sunGlow" cx="65%" cy="32%" r="45%">
            <stop offset="0%" stopColor="#FBE64D" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#2F7A78" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#0E1F21" stopOpacity="0.0" />
          </radialGradient>
        </defs>

        {/* Ambient background wash */}
        <rect width="520" height="600" fill="url(#sunGlow)" />

        {/* Low Sun over Chilika Lagoon */}
        <circle cx="360" cy="180" r="38" stroke="#FBE64D" strokeWidth="1.5" fill="rgba(251, 230, 77, 0.12)" />
        <circle cx="360" cy="180" r="54" stroke="#FBE64D" strokeWidth="1" strokeDasharray="3 4" opacity="0.4" />

        {/* Distant Hills of the Eastern Ghats along Chilika */}
        <path
          d="M 0 250 Q 80 215 170 230 T 340 220 T 520 240 L 520 310 L 0 310 Z"
          fill="#12292B"
          stroke="#2B4547"
          strokeWidth="1.25"
        />
        <path
          d="M 0 270 Q 110 245 220 255 T 410 250 T 520 265 L 520 320 L 0 320 Z"
          fill="#152C2E"
          stroke="#3E5E60"
          strokeWidth="1"
        />

        {/* CIT Campus Architectural Silhouette (Auditorium dome, Academic Block, Observation Pier) */}
        <g id="campus-silhouette" opacity="0.95">
          {/* Academic Block Tower */}
          <rect x="70" y="220" width="45" height="70" fill="#1C3739" stroke="#EDEBE0" strokeWidth="1.25" />
          <line x1="70" y1="235" x2="115" y2="235" stroke="#3E5E60" strokeWidth="1" />
          <line x1="70" y1="250" x2="115" y2="250" stroke="#3E5E60" strokeWidth="1" />
          <line x1="70" y1="265" x2="115" y2="265" stroke="#3E5E60" strokeWidth="1" />
          <line x1="92" y1="205" x2="92" y2="220" stroke="#EDEBE0" strokeWidth="1.5" />

          {/* Main Auditorium Curved Tier Profile */}
          <path
            d="M 130 290 L 130 245 Q 170 215 210 245 L 210 290 Z"
            fill="#152C2E"
            stroke="#EDEBE0"
            strokeWidth="1.5"
          />
          <path d="M 145 245 Q 170 228 195 245" stroke="#FBE64D" strokeWidth="1.25" fill="none" />

          {/* Seminar Hall & Labs wing */}
          <rect x="225" y="250" width="60" height="40" fill="#1C3739" stroke="#EDEBE0" strokeWidth="1.25" />
          <line x1="225" y1="265" x2="285" y2="265" stroke="#3E5E60" strokeWidth="1" />

          {/* Coastal Trees / Casuarina Grove */}
          <g stroke="#63CC79" strokeWidth="1.25" fill="#1C3739">
            <path d="M 305 290 L 312 255 L 319 290 Z" />
            <path d="M 318 290 L 324 250 L 330 290 Z" />
            <path d="M 328 290 L 335 258 L 342 290 Z" />
          </g>

          {/* Jetty / Lake Observation Pier into the Lagoon */}
          <line x1="40" y1="290" x2="480" y2="290" stroke="#EDEBE0" strokeWidth="1.5" />
          <line x1="360" y1="290" x2="410" y2="330" stroke="#EDEBE0" strokeWidth="1.5" />
          <line x1="410" y1="330" x2="450" y2="330" stroke="#EDEBE0" strokeWidth="1.5" />
        </g>

        {/* Chilika Water Ground */}
        <rect x="0" y="290" width="520" height="310" fill="url(#waterHatch)" />

        {/* Stylized Undulating Wave Lines (Chilika Coastal Waters) */}
        <path
          d="M 10 320 Q 140 305 260 325 T 510 315"
          stroke="#2F7A78"
          strokeWidth="1.25"
        />
        <path
          d="M 20 350 Q 150 335 290 355 T 500 345"
          stroke="#3E5E60"
          strokeWidth="1"
          strokeDasharray="6 4"
        />
        <path
          d="M 0 385 Q 160 370 320 390 T 520 380"
          stroke="#2F7A78"
          strokeWidth="1.25"
        />
        <path
          d="M 30 425 Q 180 410 340 430 T 490 420"
          stroke="#1C3739"
          strokeWidth="1"
        />
        <path
          d="M 10 470 Q 150 455 300 475 T 510 460"
          stroke="#2F7A78"
          strokeWidth="1.25"
        />
        <path
          d="M 0 520 Q 170 500 350 525 T 520 515"
          stroke="#3E5E60"
          strokeWidth="1.25"
        />

        {/* Migratory Flamingos of Chilika Lagoon (Silhouette V-formations) */}
        <g stroke="#EDEBE0" strokeWidth="1.25" fill="none" opacity="0.8">
          <path d="M 180 130 Q 185 125 190 130 Q 195 125 200 130" />
          <path d="M 205 122 Q 210 117 215 122 Q 220 117 225 122" />
          <path d="M 230 132 Q 235 127 240 132 Q 245 127 250 132" />
          <path d="M 215 142 Q 220 137 225 142 Q 230 137 235 142" />
        </g>

        {/* Shoreline contour */}
        <path
          d="M 0 580 Q 160 565 340 585 T 520 575"
          stroke="#EDEBE0"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}