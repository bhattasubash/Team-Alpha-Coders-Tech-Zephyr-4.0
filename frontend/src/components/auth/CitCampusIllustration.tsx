'use client';

import React from 'react';

/**
 * CitCampusIllustration
 * 
 * Replicates the approved white line-art illustration panel:
 * - Semicircular dashed connecting path arching over the CIT building
 * - Five scheduling-related floating icon badges:
 *   1. Clock
 *   2. Location Pin
 *   3. Calendar (apex)
 *   4. Classroom Display / Computer
 *   5. People / Users Group
 * - Central neoclassical CIT institutional building with "CIT" pediment, 4 columns, wings & windows
 * - Stylized scalloped cloud-canopy trees on both flanks
 * - Layered landscape contour wave curves along the base
 * 
 * Rendered strictly with pure white (#FFFFFF) outlines and subtle luminous white fills at 100% opacity.
 */
export function CitCampusIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 620"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-full select-none ${className}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Soft white gradient for contour ground layer */}
        <linearGradient id="citContourGlow" x1="260" y1="340" x2="260" y2="440" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
          <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
        </linearGradient>

        {/* Tree canopy subtle radial fill */}
        <radialGradient id="canopyFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.14" />
        </radialGradient>
      </defs>

      {/* =========================================================================
          1. DASHED CONNECTING ARC
          ========================================================================= */}
      <path
        d="M 98 255 C 105 140, 180 115, 260 115 C 340 115, 415 140, 422 255"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeDasharray="5 5"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* Connection Anchor Dots along Arc */}
      <circle cx="104" cy="242" r="2.5" fill="#FFFFFF" />
      <circle cx="160" cy="168" r="2.5" fill="#FFFFFF" />
      <circle cx="260" cy="115" r="2.5" fill="#FFFFFF" />
      <circle cx="360" cy="168" r="2.5" fill="#FFFFFF" />
      <circle cx="416" cy="242" r="2.5" fill="#FFFFFF" />

      {/* =========================================================================
          2. FIVE FLOATING SCHEDULING ICON BADGES
          ========================================================================= */}

      {/* 2.1 Clock Badge (Left) */}
      <g transform="translate(82, 220)">
        <rect
          width="44"
          height="44"
          rx="10"
          fill="rgba(255, 255, 255, 0.20)"
          stroke="#FFFFFF"
          strokeWidth="1.5"
        />
        {/* Clock Face */}
        <circle cx="22" cy="22" r="10.5" stroke="#FFFFFF" strokeWidth="1.4" />
        <polyline
          points="22 16 22 22 26 22"
          stroke="#FFFFFF"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="22" cy="22" r="1" fill="#FFFFFF" />
      </g>

      {/* 2.2 Location Pin Badge (Upper Left) */}
      <g transform="translate(138, 146)">
        <rect
          width="44"
          height="44"
          rx="10"
          fill="rgba(255, 255, 255, 0.20)"
          stroke="#FFFFFF"
          strokeWidth="1.5"
        />
        {/* Map Pin */}
        <path
          d="M 22 12 C 18 12 15 15 15 19 C 15 24 22 32 22 32 C 22 32 29 24 29 19 C 29 15 26 12 22 12 Z"
          stroke="#FFFFFF"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <circle cx="22" cy="19" r="3" stroke="#FFFFFF" strokeWidth="1.2" fill="rgba(255, 255, 255, 0.3)" />
      </g>

      {/* 2.3 Calendar Badge (Top Center Apex) */}
      <g transform="translate(238, 93)">
        <rect
          width="44"
          height="44"
          rx="10"
          fill="rgba(255, 255, 255, 0.20)"
          stroke="#FFFFFF"
          strokeWidth="1.5"
        />
        {/* Calendar Body */}
        <rect
          x="12"
          y="14"
          width="20"
          height="18"
          rx="2.5"
          stroke="#FFFFFF"
          strokeWidth="1.4"
        />
        <line x1="12" y1="20" x2="32" y2="20" stroke="#FFFFFF" strokeWidth="1.2" />
        {/* Calendar Binder Rings */}
        <line x1="17" y1="11" x2="17" y2="15" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="27" y1="11" x2="27" y2="15" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
        {/* Date Matrix Dots/Squares */}
        <rect x="15" y="23" width="2" height="2" rx="0.5" fill="#FFFFFF" />
        <rect x="21" y="23" width="2" height="2" rx="0.5" fill="#FFFFFF" />
        <rect x="27" y="23" width="2" height="2" rx="0.5" fill="#FFFFFF" />
        <rect x="15" y="27" width="2" height="2" rx="0.5" fill="#FFFFFF" />
        <rect x="21" y="27" width="2" height="2" rx="0.5" fill="#FFFFFF" />
        <rect x="27" y="27" width="2" height="2" rx="0.5" fill="#FFFFFF" />
      </g>

      {/* 2.4 Computer / Classroom Display Badge (Upper Right) */}
      <g transform="translate(338, 146)">
        <rect
          width="44"
          height="44"
          rx="10"
          fill="rgba(255, 255, 255, 0.20)"
          stroke="#FFFFFF"
          strokeWidth="1.5"
        />
        {/* Screen */}
        <rect
          x="12"
          y="13"
          width="20"
          height="14"
          rx="2"
          stroke="#FFFFFF"
          strokeWidth="1.4"
        />
        <line x1="15" y1="23" x2="29" y2="23" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.6" />
        {/* Stand */}
        <line x1="22" y1="27" x2="22" y2="31" stroke="#FFFFFF" strokeWidth="1.4" />
        <line x1="17" y1="31" x2="27" y2="31" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
      </g>

      {/* 2.5 People / Group Badge (Right) */}
      <g transform="translate(394, 220)">
        <rect
          width="44"
          height="44"
          rx="10"
          fill="rgba(255, 255, 255, 0.20)"
          stroke="#FFFFFF"
          strokeWidth="1.5"
        />
        {/* Center Figure */}
        <circle cx="22" cy="17" r="3.2" stroke="#FFFFFF" strokeWidth="1.3" />
        <path
          d="M 16 30 C 16 26.2 18.5 24 22 24 C 25.5 24 28 26.2 28 30"
          stroke="#FFFFFF"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        {/* Left Shoulder Figure */}
        <circle cx="15" cy="18.5" r="2.4" stroke="#FFFFFF" strokeWidth="1.1" />
        <path
          d="M 11 29 C 11 26.8 12.8 25.2 15 25"
          stroke="#FFFFFF"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        {/* Right Shoulder Figure */}
        <circle cx="29" cy="18.5" r="2.4" stroke="#FFFFFF" strokeWidth="1.1" />
        <path
          d="M 33 29 C 33 26.8 31.2 25.2 29 25"
          stroke="#FFFFFF"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
      </g>

      {/* =========================================================================
          3. TREES (FLANKING THE BUILDING)
          ========================================================================= */}

      {/* Left Trees Cluster */}
      <g id="left-trees">
        {/* Left Tree 3 (Outer) */}
        <path
          d="M 72 315 L 72 355"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M 64 312 C 58 310, 56 300, 60 294 C 57 286, 64 280, 72 282 C 77 277, 86 280, 86 288 C 91 292, 89 302, 83 306 C 85 312, 75 316, 70 312 Z"
          fill="url(#canopyFill)"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Left Tree 2 (Middle, Taller) */}
        <path
          d="M 98 305 L 98 350"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M 88 302 C 81 299, 79 288, 84 280 C 81 270, 90 262, 100 264 C 107 258, 118 261, 118 271 C 124 276, 122 288, 115 293 C 117 301, 105 306, 98 302 Z"
          fill="url(#canopyFill)"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Left Tree 1 (Inner, Near Wing) */}
        <path
          d="M 124 310 L 124 345"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M 116 308 C 110 306, 108 296, 112 290 C 109 282, 116 276, 124 278 C 129 273, 138 276, 138 284 C 143 288, 141 298, 135 302 C 137 308, 127 312, 122 308 Z"
          fill="url(#canopyFill)"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </g>

      {/* Right Trees Cluster */}
      <g id="right-trees">
        {/* Right Tree 1 (Inner, Near Wing) */}
        <path
          d="M 396 310 L 396 345"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M 388 308 C 382 306, 380 296, 384 290 C 381 282, 388 276, 396 278 C 401 273, 410 276, 410 284 C 415 288, 413 298, 407 302 C 409 308, 399 312, 394 308 Z"
          fill="url(#canopyFill)"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Right Tree 2 (Middle, Taller) */}
        <path
          d="M 422 305 L 422 350"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M 412 302 C 405 299, 403 288, 408 280 C 405 270, 414 262, 424 264 C 431 258, 442 261, 442 271 C 448 276, 446 288, 439 293 C 441 301, 429 306, 422 302 Z"
          fill="url(#canopyFill)"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Right Tree 3 (Outer) */}
        <path
          d="M 448 315 L 448 355"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M 440 312 C 434 310, 432 300, 436 294 C 433 286, 440 280, 448 282 C 453 277, 462 280, 462 288 C 467 292, 465 302, 459 306 C 461 312, 451 316, 446 312 Z"
          fill="url(#canopyFill)"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </g>

      {/* =========================================================================
          4. CIT NEOCLASSICAL INSTITUTIONAL BUILDING
          ========================================================================= */}
      <g id="cit-building">
        {/* 4.1 Left Wing Body */}
        <rect
          x="142"
          y="272"
          width="74"
          height="54"
          fill="rgba(255, 255, 255, 0.12)"
          stroke="#FFFFFF"
          strokeWidth="1.5"
        />
        {/* Left Wing Roof Balustrade */}
        <rect
          x="140"
          y="267"
          width="78"
          height="5"
          fill="rgba(255, 255, 255, 0.20)"
          stroke="#FFFFFF"
          strokeWidth="1.4"
        />
        <line x1="142" y1="299" x2="216" y2="299" stroke="#FFFFFF" strokeWidth="1" opacity="0.6" />

        {/* Left Wing Upper Story Windows (3) */}
        <g stroke="#FFFFFF" strokeWidth="1.2">
          {/* Window 1 */}
          <rect x="150" y="276" width="14" height="18" rx="1" fill="rgba(255, 255, 255, 0.16)" />
          <line x1="157" y1="276" x2="157" y2="294" />
          <line x1="150" y1="285" x2="164" y2="285" />
          {/* Window 2 */}
          <rect x="172" y="276" width="14" height="18" rx="1" fill="rgba(255, 255, 255, 0.16)" />
          <line x1="179" y1="276" x2="179" y2="294" />
          <line x1="172" y1="285" x2="186" y2="285" />
          {/* Window 3 */}
          <rect x="194" y="276" width="14" height="18" rx="1" fill="rgba(255, 255, 255, 0.16)" />
          <line x1="201" y1="276" x2="201" y2="294" />
          <line x1="194" y1="285" x2="208" y2="285" />
        </g>

        {/* Left Wing Lower Story Windows (3) */}
        <g stroke="#FFFFFF" strokeWidth="1.2">
          {/* Window 4 */}
          <rect x="150" y="303" width="14" height="18" rx="1" fill="rgba(255, 255, 255, 0.16)" />
          <line x1="157" y1="303" x2="157" y2="321" />
          <line x1="150" y1="312" x2="164" y2="312" />
          {/* Window 5 */}
          <rect x="172" y="303" width="14" height="18" rx="1" fill="rgba(255, 255, 255, 0.16)" />
          <line x1="179" y1="303" x2="179" y2="321" />
          <line x1="172" y1="312" x2="186" y2="312" />
          {/* Window 6 */}
          <rect x="194" y="303" width="14" height="18" rx="1" fill="rgba(255, 255, 255, 0.16)" />
          <line x1="201" y1="303" x2="201" y2="321" />
          <line x1="194" y1="312" x2="208" y2="312" />
        </g>

        {/* 4.2 Right Wing Body */}
        <rect
          x="304"
          y="272"
          width="74"
          height="54"
          fill="rgba(255, 255, 255, 0.12)"
          stroke="#FFFFFF"
          strokeWidth="1.5"
        />
        {/* Right Wing Roof Balustrade */}
        <rect
          x="302"
          y="267"
          width="78"
          height="5"
          fill="rgba(255, 255, 255, 0.20)"
          stroke="#FFFFFF"
          strokeWidth="1.4"
        />
        <line x1="304" y1="299" x2="378" y2="299" stroke="#FFFFFF" strokeWidth="1" opacity="0.6" />

        {/* Right Wing Upper Story Windows (3) */}
        <g stroke="#FFFFFF" strokeWidth="1.2">
          {/* Window 1 */}
          <rect x="312" y="276" width="14" height="18" rx="1" fill="rgba(255, 255, 255, 0.16)" />
          <line x1="319" y1="276" x2="319" y2="294" />
          <line x1="312" y1="285" x2="326" y2="285" />
          {/* Window 2 */}
          <rect x="334" y="276" width="14" height="18" rx="1" fill="rgba(255, 255, 255, 0.16)" />
          <line x1="341" y1="276" x2="341" y2="294" />
          <line x1="334" y1="285" x2="348" y2="285" />
          {/* Window 3 */}
          <rect x="356" y="276" width="14" height="18" rx="1" fill="rgba(255, 255, 255, 0.16)" />
          <line x1="363" y1="276" x2="363" y2="294" />
          <line x1="356" y1="285" x2="370" y2="285" />
        </g>

        {/* Right Wing Lower Story Windows (3) */}
        <g stroke="#FFFFFF" strokeWidth="1.2">
          {/* Window 4 */}
          <rect x="312" y="303" width="14" height="18" rx="1" fill="rgba(255, 255, 255, 0.16)" />
          <line x1="319" y1="303" x2="319" y2="321" />
          <line x1="312" y1="312" x2="326" y2="312" />
          {/* Window 5 */}
          <rect x="334" y="303" width="14" height="18" rx="1" fill="rgba(255, 255, 255, 0.16)" />
          <line x1="341" y1="303" x2="341" y2="321" />
          <line x1="334" y1="312" x2="348" y2="312" />
          {/* Window 6 */}
          <rect x="356" y="303" width="14" height="18" rx="1" fill="rgba(255, 255, 255, 0.16)" />
          <line x1="363" y1="303" x2="363" y2="321" />
          <line x1="356" y1="312" x2="370" y2="312" />
        </g>

        {/* 4.3 Center Portico & Entrance Hall */}
        {/* Background wall of portico */}
        <rect
          x="214"
          y="262"
          width="92"
          height="64"
          fill="rgba(255, 255, 255, 0.16)"
          stroke="#FFFFFF"
          strokeWidth="1.5"
        />

        {/* Portico Doors between columns */}
        {/* Left Portal */}
        <rect x="228" y="280" width="14" height="46" rx="2" fill="rgba(255, 255, 255, 0.20)" stroke="#FFFFFF" strokeWidth="1.2" />
        <line x1="228" y1="294" x2="242" y2="294" stroke="#FFFFFF" strokeWidth="1" opacity="0.6" />

        {/* Center Arched Entrance Portal */}
        <path
          d="M 252 326 L 252 284 C 252 278, 268 278, 268 284 L 268 326 Z"
          fill="rgba(255, 255, 255, 0.24)"
          stroke="#FFFFFF"
          strokeWidth="1.3"
        />
        <line x1="260" y1="280" x2="260" y2="326" stroke="#FFFFFF" strokeWidth="1.2" />

        {/* Right Portal */}
        <rect x="278" y="280" width="14" height="46" rx="2" fill="rgba(255, 255, 255, 0.20)" stroke="#FFFFFF" strokeWidth="1.2" />
        <line x1="278" y1="294" x2="292" y2="294" stroke="#FFFFFF" strokeWidth="1" opacity="0.6" />

        {/* 4 Classical Columns */}
        {/* Column 1 */}
        <rect x="219" y="264" width="8" height="4" fill="#FFFFFF" rx="0.5" />
        <line x1="223" y1="268" x2="223" y2="324" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="square" />
        <rect x="219" y="322" width="8" height="4" fill="#FFFFFF" rx="0.5" />

        {/* Column 2 */}
        <rect x="245" y="264" width="8" height="4" fill="#FFFFFF" rx="0.5" />
        <line x1="249" y1="268" x2="249" y2="324" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="square" />
        <rect x="245" y="322" width="8" height="4" fill="#FFFFFF" rx="0.5" />

        {/* Column 3 */}
        <rect x="267" y="264" width="8" height="4" fill="#FFFFFF" rx="0.5" />
        <line x1="271" y1="268" x2="271" y2="324" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="square" />
        <rect x="267" y="322" width="8" height="4" fill="#FFFFFF" rx="0.5" />

        {/* Column 4 */}
        <rect x="293" y="264" width="8" height="4" fill="#FFFFFF" rx="0.5" />
        <line x1="297" y1="268" x2="297" y2="324" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="square" />
        <rect x="293" y="322" width="8" height="4" fill="#FFFFFF" rx="0.5" />

        {/* Entablature beam over columns */}
        <rect
          x="212"
          y="258"
          width="96"
          height="6"
          fill="rgba(255, 255, 255, 0.25)"
          stroke="#FFFFFF"
          strokeWidth="1.5"
        />

        {/* Triangular Pediment with "CIT" */}
        <polygon
          points="260,226 210,258 310,258"
          fill="rgba(255, 255, 255, 0.22)"
          stroke="#FFFFFF"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        {/* Inner pediment trim line */}
        <polygon
          points="260,233 218,255 302,255"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1"
          opacity="0.7"
        />
        {/* "CIT" Institutional Monogram */}
        <text
          x="260"
          y="251"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="11.5"
          fontWeight="700"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="2.5"
        >
          CIT
        </text>

        {/* 4.4 Tiered Base Steps (Stylobate) */}
        {/* Step 1 */}
        <rect
          x="134"
          y="326"
          width="252"
          height="5"
          fill="rgba(255, 255, 255, 0.20)"
          stroke="#FFFFFF"
          strokeWidth="1.4"
        />
        {/* Step 2 */}
        <rect
          x="122"
          y="331"
          width="276"
          height="5"
          fill="rgba(255, 255, 255, 0.22)"
          stroke="#FFFFFF"
          strokeWidth="1.4"
        />
        {/* Step 3 */}
        <rect
          x="108"
          y="336"
          width="304"
          height="5"
          fill="rgba(255, 255, 255, 0.25)"
          stroke="#FFFFFF"
          strokeWidth="1.4"
        />
      </g>

      {/* =========================================================================
          5. LAYERED LANDSCAPE CONTOUR WAVES
          ========================================================================= */}
      <g id="landscape-contours">
        {/* Upper Contour Layer with Glow */}
        <path
          d="M 0 348 Q 130 338 260 342 T 520 340 L 520 450 L 0 450 Z"
          fill="url(#citContourGlow)"
        />
        <path
          d="M 0 348 Q 130 338 260 342 T 520 340"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2"
        />

        {/* Contour Wave 2 */}
        <path
          d="M 0 366 Q 140 380 280 358 T 520 368"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.5"
        />

        {/* Contour Wave 3 */}
        <path
          d="M 0 384 Q 120 364 240 388 T 520 376"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.3"
          opacity="0.9"
        />

        {/* Contour Wave 4 */}
        <path
          d="M 0 406 Q 160 426 320 396 T 520 412"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.4"
          opacity="0.85"
        />

        {/* Contour Wave 5 */}
        <path
          d="M 0 430 Q 130 410 260 438 T 520 422"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          opacity="0.75"
        />
      </g>
    </svg>
  );
}
