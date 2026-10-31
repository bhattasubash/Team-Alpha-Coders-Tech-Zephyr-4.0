'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useApp } from '@/context/AppContext';
import { SparklesIcon } from '@/components/ui/Icons';

export function AssistantOrb() {
  const { isAssistantOpen, setIsAssistantOpen } = useApp();
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isHoveredRef = useRef(false);

  useEffect(() => {
    isHoveredRef.current = isHovered;
  }, [isHovered]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const width = 64;
    const height = 64;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 4.8;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const pinkLight = new THREE.PointLight(0xea6df8, 2, 20);
    pinkLight.position.set(4, 4, 4);
    scene.add(pinkLight);

    const violetLight = new THREE.PointLight(0x7d5dff, 2, 20);
    violetLight.position.set(-4, -4, 4);
    scene.add(violetLight);

    // Central Core Orb
    const coreGeo = new THREE.IcosahedronGeometry(1.0, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x7d5dff,
      emissive: 0x3d1f99,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core);

    // Inner Wireframe
    const wireGeo = new THREE.IcosahedronGeometry(1.25, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x9b82ff,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    const wire = new THREE.Mesh(wireGeo, wireMat);
    scene.add(wire);

    // Orbit Ring 1 (Pink)
    const ring1Geo = new THREE.TorusGeometry(1.6, 0.045, 16, 48);
    const ring1Mat = new THREE.MeshStandardMaterial({
      color: 0xea6df8,
      emissive: 0x9924a6,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    scene.add(ring1);

    // Orbit Ring 2 (Emerald)
    const ring2Geo = new THREE.TorusGeometry(1.75, 0.035, 16, 48);
    const ring2Mat = new THREE.MeshStandardMaterial({
      color: 0x63cc79,
      emissive: 0x1f7331,
      emissiveIntensity: 0.7,
      roughness: 0.3,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = Math.PI / 3;
    scene.add(ring2);

    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      const speed = isHoveredRef.current ? 3.0 : 1.0;

      core.rotation.y += delta * 0.9 * speed;
      core.rotation.x += delta * 0.5 * speed;

      wire.rotation.y -= delta * 0.4 * speed;
      wire.rotation.z += delta * 0.3 * speed;

      ring1.rotation.z += delta * 1.4 * speed;
      ring1.rotation.x += delta * 0.6 * speed;

      ring2.rotation.y += delta * 1.1 * speed;
      ring2.rotation.z -= delta * 0.8 * speed;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
    };
  }, [mounted]);

  if (!mounted || isAssistantOpen) return null;

  return (
    <aside
      aria-label="CIT AI Scheduling Assistant"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-3 select-none"
    >
      {/* Speech bubble / pill */}
      <div
        className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-pill bg-surface/90 backdrop-blur-md border border-violet/30 text-ink shadow-lg text-[12px] font-medium transition-all duration-300 pointer-events-none ${
          isHovered ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-80'
        }`}
      >
        <SparklesIcon size={14} className="text-violet animate-pulse" />
        <span>Ask CIT Assistant</span>
        <span className="text-[10px] text-ink-2 font-mono bg-raised px-1.5 py-0.5 rounded border border-line">
          AI
        </span>
      </div>

      {/* Floating 3D Orb Button */}
      <button
        onClick={() => setIsAssistantOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative w-16 h-16 rounded-full flex items-center justify-center cursor-pointer group focus:outline-none"
        title="Open AI Scheduling Assistant"
        aria-label="Open AI Scheduling Assistant"
      >
        {/* Glow backdrop ring */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-tr from-violet via-pink to-green opacity-40 blur-md transition-all duration-300 ${
            isHovered ? 'scale-125 opacity-75 blur-lg' : 'scale-100'
          }`}
        />

        {/* Inner glass orb container with 3D WebGL Canvas */}
        <div className="relative w-16 h-16 rounded-full border border-violet/40 bg-surface/40 backdrop-blur-md overflow-hidden shadow-xl flex items-center justify-center">
          <canvas ref={canvasRef} className="w-16 h-16 pointer-events-none" />
        </div>

        {/* Small floating badge */}
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-violet text-white text-[9px] font-bold flex items-center justify-center shadow-md border-2 border-surface">
          ✨
        </div>
      </button>
    </aside>
  );
}
