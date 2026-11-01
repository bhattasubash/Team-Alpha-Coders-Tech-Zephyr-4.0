'use client';

import React from 'react';

/**
 * AppBackground component
 * Provides a subtle, premium pastel atmospheric watercolor wash primarily in the top-right
 * corner of the application content area. Smoothly masked with radial gradient falloff to blend
 * seamlessly into the cream/off-white (and dark teal) base interface without hard edges.
 */
export function AppBackground() {
  return (
    <div
      aria-hidden="true"
      className="app-pastel-bg"
    />
  );
}
