'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useApp } from '@/context/AppContext';
import { SparklesIcon } from '@/components/ui/Icons';

export function AssistantOrb() {
  const { isAssistantOpen, setIsAssistantOpen } = useApp();
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
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
    // Scaled viewport (+10% character size)
    const width = 96;
    const height = 110;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.25, 4.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Illumination tailored for the textured 3D character
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(3, 4, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xea6df8, 1.0);
    fillLight.position.set(-3, -2, 3);
    scene.add(fillLight);

    const violetRimLight = new THREE.PointLight(0x7d5dff, 2.2, 10);
    violetRimLight.position.set(0, 3, -2);
    scene.add(violetRimLight);

    // Group to hold the loaded character model
    const characterGroup = new THREE.Group();
    scene.add(characterGroup);

    // Fallback geometric core (only visible while GLB loads)
    const fallbackGeo = new THREE.IcosahedronGeometry(0.8, 1);
    const fallbackMat = new THREE.MeshStandardMaterial({
      color: 0x7d5dff,
      emissive: 0x3d1f99,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });
    const fallbackMesh = new THREE.Mesh(fallbackGeo, fallbackMat);
    scene.add(fallbackMesh);

    // Load kuttta textured.glb
    const loader = new GLTFLoader();
    let loadedCharacter: THREE.Object3D | null = null;

    loader.load(
      '/models/assistant.glb',
      (gltf) => {
        fallbackMesh.visible = false;
        loadedCharacter = gltf.scene;

        // Auto-center and normalize scale (+10% scale: 2.1 * 1.1 = 2.31)
        const box = new THREE.Box3().setFromObject(loadedCharacter);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetScale = 2.31 / (maxDim || 1);

        loadedCharacter.scale.set(targetScale, targetScale, targetScale);
        loadedCharacter.position.set(
          -center.x * targetScale,
          -center.y * targetScale - 0.06,
          -center.z * targetScale
        );

        // Enhance materials
        loadedCharacter.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            if (mesh.material && (mesh.material as any).isMeshStandardMaterial) {
              const mat = mesh.material as THREE.MeshStandardMaterial;
              mat.roughness = Math.min(mat.roughness, 0.85);
            }
          }
        });

        characterGroup.add(loadedCharacter);
        setModelLoaded(true);
      },
      undefined,
      (err) => {
        console.warn('Could not load kuttta.glb, using fallback:', err);
        fallbackMesh.visible = true;
      }
    );

    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      const speed = isHoveredRef.current ? 2.5 : 1.0;

      // Gentle floating bob
      const bobY = Math.sin(time * 0.0025) * 0.06;
      characterGroup.position.y = bobY;

      // Rotation & interaction
      if (loadedCharacter) {
        if (isHoveredRef.current) {
          characterGroup.rotation.y += delta * 1.8 * speed;
        } else {
          // Subtle idle sway around front orientation
          characterGroup.rotation.y += delta * 0.45;
        }
      } else if (fallbackMesh.visible) {
        fallbackMesh.rotation.y += delta * 0.9 * speed;
        fallbackMesh.rotation.x += delta * 0.5 * speed;
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      fallbackGeo.dispose();
      fallbackMat.dispose();
    };
  }, [mounted]);

  if (!mounted || isAssistantOpen) return null;

  return (
    <aside
      aria-label="CIT 3D AI Scheduling Guide"
      className="fixed bottom-4 right-5 z-40 select-none"
    >
      {/* Floating 3D Character Button (No circular boundaries or badges) */}
      <button
        onClick={() => setIsAssistantOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative flex flex-col items-center justify-end cursor-pointer group focus:outline-none transition-transform duration-300 hover:scale-105"
        title="Open CIT AI Scheduling Assistant"
        aria-label="Open CIT AI Scheduling Assistant"
      >
        {/* Interactive tooltip placed directly ABOVE the character so it never obscures timetable cells */}
        <div
          className="absolute bottom-[102%] left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-all duration-200 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-surface/95 backdrop-blur-md border border-violet/30 text-ink shadow-elevated text-[11px] font-medium whitespace-nowrap z-50 mb-1"
        >
          <SparklesIcon size={12} className="text-violet animate-pulse" />
          <span>Ask CIT Guide</span>
          <span className="text-[9px] text-ink-2 font-mono bg-raised px-1 py-0.2 rounded border border-line">
            AI
          </span>
        </div>

        {/* 3D Character Canvas (transparent background, 10% larger, no circular frame) */}
        <canvas
          ref={canvasRef}
          className="w-[96px] h-[110px] pointer-events-none drop-shadow-sm transition-transform duration-300"
        />

        {/* Subtle organic contact shadow under character feet */}
        <div
          className="w-14 h-2.5 rounded-[50%] bg-ink/15 dark:bg-black/40 blur-[2px] transition-all duration-300 group-hover:w-16 group-hover:bg-violet/30 group-hover:blur-[3px] -mt-2 pointer-events-none"
        />
      </button>
    </aside>
  );
}
