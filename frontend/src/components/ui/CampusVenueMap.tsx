'use client';

import React from 'react';
import Image from 'next/image';

interface CampusVenueMapProps {
  className?: string;
  compact?: boolean;
}

export function CampusVenueMap({ className = '' }: CampusVenueMapProps) {
  return (
    <div className={`relative rounded-panel overflow-hidden border border-line bg-[#0E1F21] ${className}`}>
      <Image
        src="/images/campus-venue-map.png"
        alt="CIT Campus Isometric Venue Map"
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover object-center"
        priority
      />
    </div>
  );
}
