'use client';

import React from 'react';
import Image from 'next/image';

interface CampusVenueMapProps {
  className?: string;
  compact?: boolean;
}

export function CampusVenueMap({ className = '' }: CampusVenueMapProps) {
  return (
    <div className={`relative bg-transparent ${className}`}>
      <Image
        src="/images/campus-venue-map.png"
        alt="CIT Campus Isometric Venue Map"
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-contain object-center"
        priority
      />
    </div>
  );
}
