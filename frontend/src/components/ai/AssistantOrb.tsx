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
    // Viewport scaled (+5% more on top of prior +10%)
    const width = 102;
    const height = 118;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.22, 4.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // High exposure and rich contrast tone mapping for vivid 3D character pop
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.38;

    // High-visibility illumination: removes muddiness, boosts contrast & highlights
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.2);
    scene.add(ambientLight);

    // Frontal fill light directly facing character face and chest
    const frontLight = new THREE.DirectionalLight(0xffffff, 1.8);
    frontLight.position.set(0, 1.5, 4);
    scene.add(frontLight);

    // Key light for crisp specular definition and contrast
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.8);
    keyLight.position.set(3, 4, 3.5);
    scene.add(keyLight);

    // Lateral fill light for aesthetic dimension
    const fillLight = new THREE.DirectionalLight(0xf5d0fe, 1.2);
    fillLight.position.set(-3, -1, 2.5);
    scene.add(fillLight);

    // Top rim highlight for edge pop
    const rimLight = new THREE.PointLight(0xa78bfa, 2.4, 10);
    rimLight.position.set(0, 3, -1.8);
    scene.add(rimLight);

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

        // Auto-center and normalize scale (+5% larger: 2.31 * 1.05 = 2.43)
        const box = new THREE.Box3().setFromObject(loadedCharacter);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetScale = 2.43 / (maxDim || 1);

        loadedCharacter.scale.set(targetScale, targetScale, targetScale);
        loadedCharacter.position.set(
          -center.x * targetScale,
          -center.y * targetScale - 0.05,
          -center.z * targetScale
        );

        // Enhance texture vibrancy and contrast
        loadedCharacter.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            if (mesh.material) {
              const mat = mesh.material as THREE.MeshStandardMaterial;
              if (mat.isMeshStandardMaterial) {
                mat.roughness = 0.52;
                mat.metalness = 0.06;
                if (mat.map) {
                  mat.map.colorSpace = THREE.SRGBColorSpace;
                }
              }
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
      {/* Floating 3D Character Button */}
      <button
        onClick={() => setIsAssistantOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative flex flex-col items-center justify-end cursor-pointer group focus:outline-none transition-transform duration-300 hover:scale-105"
        title="Open CIT AI Scheduling Assistant"
        aria-label="Open CIT AI Scheduling Assistant"
      >
        {/* Interactive tooltip placed directly ABOVE character */}
        <div
          className="absolute bottom-[102%] left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-all duration-200 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-surface/95 backdrop-blur-md border border-violet/30 text-ink shadow-elevated text-[11px] font-medium whitespace-nowrap z-50 mb-1"
        >
          <SparklesIcon size={12} className="text-violet animate-pulse" />
          <span>Ask CIT Guide</span>
          <span className="text-[9px] text-ink-2 font-mono bg-raised px-1 py-0.2 rounded border border-line">
            AI
          </span>
        </div>

        {/* 3D Character Canvas (boosted exposure, higher contrast & +5% size) */}
        <canvas
          ref={canvasRef}
          className="w-[102px] h-[118px] pointer-events-none drop-shadow-sm transition-transform duration-300 filter contrast-[1.12] brightness-[1.14]"
        />

        {/* Subtle organic contact shadow under character feet */}
        <div
          className="w-16 h-2.5 rounded-[50%] bg-ink/15 dark:bg-black/40 blur-[2px] transition-all duration-300 group-hover:w-18 group-hover:bg-violet/30 group-hover:blur-[3px] -mt-2 pointer-events-none"
        />
      </button>
    </aside>
  );
}
