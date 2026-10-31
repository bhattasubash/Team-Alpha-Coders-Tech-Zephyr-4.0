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
    const width = 80;
    const height = 80;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.4, 4.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Illumination tailored for textured 3D character
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(3, 4, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xea6df8, 1.2);
    fillLight.position.set(-3, -2, 3);
    scene.add(fillLight);

    const violetRimLight = new THREE.PointLight(0x7d5dff, 2.5, 10);
    violetRimLight.position.set(0, 3, -2);
    scene.add(violetRimLight);

    // Group to hold the loaded character model
    const characterGroup = new THREE.Group();
    scene.add(characterGroup);

    // Holographic Base Rings
    const ring1Geo = new THREE.TorusGeometry(1.4, 0.035, 16, 64);
    const ring1Mat = new THREE.MeshStandardMaterial({
      color: 0x7d5dff,
      emissive: 0x4b2aa6,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 2.3;
    ring1.position.y = -0.85;
    scene.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(1.6, 0.025, 16, 64);
    const ring2Mat = new THREE.MeshStandardMaterial({
      color: 0xea6df8,
      emissive: 0x9924a6,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = Math.PI / 2.1;
    ring2.position.y = -0.92;
    scene.add(ring2);

    // Fallback geometric core (visible while GLB loads)
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

        // Auto-center and normalize scale based on model bounding box
        const box = new THREE.Box3().setFromObject(loadedCharacter);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetScale = 2.1 / (maxDim || 1);

        loadedCharacter.scale.set(targetScale, targetScale, targetScale);
        loadedCharacter.position.set(
          -center.x * targetScale,
          -center.y * targetScale - 0.1,
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
              mat.roughness = Math.min(mat.roughness, 0.8);
            }
          }
        });

        characterGroup.add(loadedCharacter);
        setModelLoaded(true);
      },
      undefined,
      (err) => {
        console.warn('Could not load kuttta.glb, using holographic fallback:', err);
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
      const bobY = Math.sin(time * 0.0025) * 0.08;
      characterGroup.position.y = bobY;

      // Rotation & interaction
      if (loadedCharacter) {
        if (isHoveredRef.current) {
          characterGroup.rotation.y += delta * 1.8 * speed;
        } else {
          // Subtle idle sway around front orientation
          characterGroup.rotation.y += delta * 0.4;
        }
      } else if (fallbackMesh.visible) {
        fallbackMesh.rotation.y += delta * 0.9 * speed;
        fallbackMesh.rotation.x += delta * 0.5 * speed;
      }

      // Base rings rotation
      ring1.rotation.z += delta * 1.2 * speed;
      ring2.rotation.z -= delta * 0.9 * speed;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      fallbackGeo.dispose();
      fallbackMat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
    };
  }, [mounted]);

  if (!mounted || isAssistantOpen) return null;

  return (
    <aside
      aria-label="CIT 3D AI Scheduling Guide"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-3 select-none"
    >
      {/* Speech bubble / pill */}
      <div
        className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-pill bg-surface/90 backdrop-blur-md border border-violet/30 text-ink shadow-lg text-[12px] font-medium transition-all duration-300 pointer-events-none ${
          isHovered ? 'translate-x-0 opacity-100 scale-105' : 'translate-x-2 opacity-85'
        }`}
      >
        <SparklesIcon size={14} className="text-violet animate-pulse" />
        <span>Ask CIT Guide {modelLoaded ? '🐕' : '✨'}</span>
        <span className="text-[10px] text-ink-2 font-mono bg-raised px-1.5 py-0.5 rounded border border-line">
          AI
        </span>
      </div>

      {/* Floating 3D Character Button */}
      <button
        onClick={() => setIsAssistantOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative w-20 h-20 rounded-full flex items-center justify-center cursor-pointer group focus:outline-none"
        title="Open CIT AI Scheduling Assistant (Kutta Guide)"
        aria-label="Open CIT AI Scheduling Assistant"
      >
        {/* Luminous aura backdrop */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-tr from-violet via-pink to-green opacity-40 blur-md transition-all duration-300 ${
            isHovered ? 'scale-125 opacity-80 blur-xl' : 'scale-100'
          }`}
        />

        {/* Inner glass orb container housing the 3D character */}
        <div className="relative w-20 h-20 rounded-full border-2 border-violet/40 bg-surface/40 backdrop-blur-md overflow-hidden shadow-2xl flex items-center justify-center transition-all group-hover:border-violet">
          <canvas ref={canvasRef} className="w-20 h-20 pointer-events-none" />
        </div>

        {/* Floating badge */}
        <div className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-violet text-white text-[10px] font-bold flex items-center justify-center shadow-md border-2 border-surface">
          3D
        </div>
      </button>
    </aside>
  );
}
