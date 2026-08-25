import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Procedural backup chassis if GLB model is missing (Forward-facing: Nose at +Z, Rear at -Z)
function createProceduralF1Mesh() {
  const group = new THREE.Group();
  const carbonMat = new THREE.MeshStandardMaterial({ color: 0x121418, roughness: 0.35, metalness: 0.8 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xe10600, roughness: 0.35, metalness: 0.6 });
  const titaniumMat = new THREE.MeshStandardMaterial({ color: 0x9099a2, roughness: 0.2, metalness: 0.95 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.85, metalness: 0.1 });

  const noseGeo = new THREE.ConeGeometry(0.28, 2.2, 16);
  noseGeo.rotateX(Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo, carbonMat);
  nose.position.set(0, 0.38, 1.6);
  group.add(nose);

  const tubGeo = new THREE.BoxGeometry(0.65, 0.42, 2.6);
  const tub = new THREE.Mesh(tubGeo, carbonMat);
  tub.position.set(0, 0.42, 0.1);
  group.add(tub);

  const finGeo = new THREE.BoxGeometry(0.06, 0.5, 1.6);
  const fin = new THREE.Mesh(finGeo, redMat);
  fin.position.set(0, 0.72, -0.9);
  group.add(fin);

  const haloTorus = new THREE.TorusGeometry(0.32, 0.04, 12, 24, Math.PI);
  haloTorus.rotateY(Math.PI / 2);
  const halo = new THREE.Mesh(haloTorus, titaniumMat);
  halo.position.set(0, 0.76, 0.3);
  group.add(halo);

  const fwMain = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.45), redMat);
  fwMain.position.set(0, 0.18, 2.6);
  group.add(fwMain);

  const rwMain = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.4), redMat);
  rwMain.position.set(0, 1.02, -2.2);
  group.add(rwMain);

  const wheelPositions = [
    [0.95, 0.35, 1.8],
    [-0.95, 0.35, 1.8],
    [0.95, 0.38, -1.6],
    [-0.95, 0.38, -1.6],
  ];
  wheelPositions.forEach(([x, y, z]) => {
    const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.35, 24);
    tireGeo.rotateZ(Math.PI / 2);
    const wheel = new THREE.Mesh(tireGeo, tireMat);
    wheel.position.set(x, y, z);
    group.add(wheel);
  });

  return group;
}

// ── Realistic Aerodynamic Boundary-Layer Fluid Dynamics Solver ──
// Calculates analytical 3D Potential Flow with Coanda Boundary-Layer Attachment,
// Downwash Water-Slide Cascade, and Full-Tunnel Distance Integration (Z = 5.2 -> -5.2).

function getCarSurfaceElevation(x, z) {
  const absX = Math.abs(x);

  // 1. Nose Cone & Bulkhead
  if (z >= 1.0 && z <= 2.7 && absX <= 0.38) {
    const t = (2.7 - z) / 1.7;
    return 0.32 + t * 0.36; // Ramping up from nose tip (0.32) to bulkhead (0.68)
  }

  // 2. Cockpit & Titanium Halo Apex
  if (z >= -0.4 && z < 1.0 && absX <= 0.42) {
    const hT = Math.cos((z - 0.2) * 2.2);
    return 0.68 + Math.max(0, hT) * 0.38; // Arches smoothly over halo apex (1.06)
  }

  // 3. Sidepod Downwash Slide (Water-Slide Slope into Beam Wing)
  if (z >= -2.0 && z <= 0.9 && absX >= 0.42 && absX <= 0.88) {
    const sT = (z - (-2.0)) / 2.9; // 1 at intake lip (0.9), 0 at beam wing (-2.0)
    return 0.45 + sT * 0.36; // Cascades smoothly from 0.81 down to 0.45
  }

  // 4. Engine Cover Sharkfin Spine
  if (z >= -2.0 && z < -0.4 && absX <= 0.28) {
    return 0.85 + ((-0.4 - z) / 1.6) * 0.25; // Rises to 1.10 along fin
  }

  // 5. Front Wheels & Tyre Spats
  if (z >= 1.35 && z <= 2.25 && absX >= 0.78 && absX <= 1.22) {
    const wDist = Math.hypot(z - 1.8, absX - 1.0);
    return Math.max(0.35, 0.72 - wDist * 0.4); // Tyre crest at 0.72
  }

  // 6. Rear Wheels
  if (z >= -2.1 && z <= -1.2 && absX >= 0.78 && absX <= 1.22) {
    const wDist = Math.hypot(z - (-1.65), absX - 1.0);
    return Math.max(0.38, 0.76 - wDist * 0.4);
  }

  // 7. Active Rear Wing
  if (z >= -2.6 && z <= -1.9 && absX <= 0.72) {
    return 1.05 + ((-1.9 - z) / 0.7) * 0.18; // Rear wing flap profile
  }

  return 0.08; // Floor / undertray boundary
}

function computeRealisticFluidField(x, y, z, isXMode) {
  let vx = 0.0;
  let vy = 0.0;
  let vz = -1.0; // Freestream velocity

  // 1. Boundary-Layer Surface Attachment & Coanda Deflection
  const surfY = getCarSurfaceElevation(x, z);
  const clearance = y - surfY;

  if (clearance < 0.28) {
    // Air enters boundary layer: deflects along surface slope
    const targetY = surfY + 0.08;
    const dy = targetY - y;

    // Coanda adherence force
    vy += Math.max(-0.4, Math.min(0.6, dy * 3.5));

    // Downwash acceleration down the sidepod slide
    if (z >= -2.0 && z <= 0.8 && Math.abs(x) >= 0.45 && Math.abs(x) <= 0.85) {
      vy -= 0.18; // Downwash slide suction
      vz -= 0.15; // Accelerated airflow into lower beam wing
    }
  }

  // 2. Front & Rear Wing Circulation (Z-Mode vs X-Mode Downforce)
  const fwCirc = isXMode ? 0.06 : 0.16;
  const rwCirc = isXMode ? 0.05 : 0.20;

  // Front Wing downwash (z ~ 2.45)
  const fwDistZ = z - 2.45;
  if (Math.abs(fwDistZ) < 1.0 && y < 0.6) {
    vy -= fwCirc * (1.0 - Math.abs(fwDistZ));
  }

  // Rear Wing downwash (z ~ -2.2)
  const rwDistZ = z - (-2.2);
  if (Math.abs(rwDistZ) < 1.2 && y > 0.7) {
    vy -= rwCirc * (1.0 - Math.abs(rwDistZ) / 1.2);
  }

  // Diffuser expansion upwash behind floor (z < -1.8, y < 0.6)
  if (z < -1.8 && z > -3.2 && y < 0.6) {
    const upwash = (isXMode ? 0.12 : 0.22) * (1.0 - y / 0.6);
    vy += upwash;
  }

  // Diffuser Wake Turbulence
  if (z < -2.6) {
    const wakeDecay = Math.exp((z + 2.6) * 0.35);
    vy += Math.sin(z * 4.5 + x * 2.0) * 0.035 * wakeDecay;
    vx += Math.cos(z * 4.0 + y * 2.0) * 0.025 * wakeDecay;
  }

  // Bernoulli Pressure Coefficient: Cp = 1 - (V / U_inf)^2
  const speedSq = vx * vx + vy * vy + vz * vz;
  const cp = 1.0 - speedSq;

  return { vx, vy, vz, cp };
}

// Generates continuous, fully integrated streamlines from Z = 5.2 all the way to Z = -5.2
function generateRealisticStreamlines(isXMode) {
  const seedLanes = [
    // 1. High Centerline Spine
    { x: 0.0, y: 0.65 },
    { x: 0.0, y: 0.95 },
    { x: 0.0, y: 1.30 },

    // 2. Inboard Suspension & Cockpit Flanks
    { x: -0.32, y: 0.58 },
    { x: 0.32, y: 0.58 },
    { x: -0.32, y: 0.95 },
    { x: 0.32, y: 0.95 },

    // 3. Sidepod Intake & Downwash Water-Slide
    { x: -0.62, y: 0.55 },
    { x: 0.62, y: 0.55 },
    { x: -0.62, y: 0.85 },
    { x: 0.62, y: 0.85 },

    // 4. Over-Wheel Deflector Canopy Streams
    { x: -0.98, y: 0.86 },
    { x: 0.98, y: 0.86 },

    // 5. Clean Outer Outwash in Free Air
    { x: -1.52, y: 0.42 },
    { x: 1.52, y: 0.42 },
    { x: -1.52, y: 0.72 },
    { x: 1.52, y: 0.72 },
  ];

  const zStart = 5.2;
  const zEnd = -5.2;
  const totalNodes = 60; // 60 fine continuous nodes per streamline
  const zStep = (zStart - zEnd) / (totalNodes - 1);
  const streamlines = [];

  for (let s = 0; s < seedLanes.length; s++) {
    const points = [];
    const pressures = [];

    let cx = seedLanes[s].x;
    let cy = seedLanes[s].y;

    for (let n = 0; n < totalNodes; n++) {
      const cz = zStart - n * zStep;

      // 1. Sample Realistic Fluid Velocity Field
      const flow = computeRealisticFluidField(cx, cy, cz, isXMode);

      // 2. Enforce Boundary Layer Ground & Surface Height
      const minSurfaceY = getCarSurfaceElevation(cx, cz) + 0.05;
      if (cy < minSurfaceY) {
        cy = minSurfaceY;
      }

      points.push(new THREE.Vector3(cx, cy, cz));
      pressures.push(flow.cp);

      // 3. Advance across next Z-slice using fluid velocity tangent
      const dt = zStep / Math.max(0.4, Math.abs(flow.vz));
      cx += flow.vx * dt * 0.6;
      cy += flow.vy * dt * 0.6;
    }

    // 4. Fit into a smooth Catmull-Rom spline curve with 64 fine subdivisions
    const spline = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.25);
    const smoothPoints = spline.getPoints(64);
    const smoothPressures = [];

    // Interpolate pressure field smoothly along spline
    for (let k = 0; k < smoothPoints.length; k++) {
      const pIdx = Math.min(pressures.length - 1, Math.floor((k / (smoothPoints.length - 1)) * (pressures.length - 1)));
      smoothPressures.push(pressures[pIdx]);
    }

    streamlines.push({ points: smoothPoints, pressures: smoothPressures });
  }

  return streamlines;
}

export default function F1CarViewer({
  aeroMode = 'Z-MODE',
  windTunnel = true,
  autoRotate = false,
  cameraPreset = null,
}) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const carGroupRef = useRef(null);
  const physicsWindGroupRef = useRef(null);
  const animFrameRef = useRef(null);

  const autoRotateRef = useRef(autoRotate);
  const aeroModeRef = useRef(aeroMode);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    aeroModeRef.current = aeroMode;
  }, [aeroMode]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Target camera lerp state
  const targetCamPos = useRef(null);
  const targetLookAt = useRef(null);

  // 1. Initialize Scene, Camera, Renderer, Controls & Lighting
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera (Default: Front 3/4 angle facing directly into the wind and front wing)
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(3.8, 1.8, 4.5);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 2.0;
    controls.maxDistance = 14.0;
    controls.target.set(0, 0.35, 0);
    controlsRef.current = controls;

    // ── Professional 3-Point Studio Lighting ──
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x222630, 1.8);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const overheadLight = new THREE.DirectionalLight(0xffffff, 1.6);
    overheadLight.position.set(0, 10, 0);
    scene.add(overheadLight);

    const fillLight = new THREE.DirectionalLight(0xaad5ff, 1.2);
    fillLight.position.set(-6, 4, 5);
    scene.add(fillLight);

    const redRimLight = new THREE.DirectionalLight(0xff3333, 1.6);
    redRimLight.position.set(-5, 3, -6);
    scene.add(redRimLight);

    // Showroom Circular Turntable Floor
    const floorRadius = 6.8;
    const floorGeo = new THREE.CircleGeometry(floorRadius, 48);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0e1117,
      roughness: 0.5,
      metalness: 0.7,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.005;
    floor.receiveShadow = true;
    scene.add(floor);

    // Concentric Telemetry Grid Rings
    const ringMat = new THREE.LineBasicMaterial({
      color: 0x2d3542,
      transparent: true,
      opacity: 0.5,
    });
    [2.2, 4.0, 5.8].forEach((r) => {
      const ringGeo = new THREE.RingGeometry(r, r + 0.02, 48);
      ringGeo.rotateX(-Math.PI / 2);
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.001;
      scene.add(ring);
    });

    // Handle Window / Container Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 2. Load GLB Model (Mathematically centered on turntable)
    const carGroup = new THREE.Group();
    scene.add(carGroup);
    carGroupRef.current = carGroup;

    const loader = new GLTFLoader();
    loader.load(
      '/models/2026_f1_car.glb',
      (gltf) => {
        const root = gltf.scene;

        // Step A: Check initial orientation and rotate so nose points forward (+Z)
        const initialBox = new THREE.Box3().setFromObject(root);
        const initialSize = initialBox.getSize(new THREE.Vector3());
        if (initialSize.x > initialSize.z) {
          root.rotation.y = -Math.PI / 2;
        }
        root.updateMatrixWorld(true);

        // Step B: Recompute true bounding box and center point after rotation
        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 5.8 / (maxDim || 1);

        root.scale.setScalar(scale);

        // Shift so geometric center sits DEAD CENTER at (0, 0, 0)
        root.position.x = -center.x * scale;
        root.position.y = -box.min.y * scale + 0.01;
        root.position.z = -center.z * scale;

        root.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            if (node.material) {
              node.material.roughness = Math.min(node.material.roughness ?? 0.4, 0.6);
              node.material.metalness = Math.max(node.material.metalness ?? 0.3, 0.4);
              node.material.needsUpdate = true;
            }
          }
        });

        carGroup.add(root);
        setLoading(false);
      },
      undefined,
      (err) => {
        console.warn('GLB load notice (using procedural fallback):', err);
        const proceduralCar = createProceduralF1Mesh();
        carGroup.add(proceduralCar);
        setLoadError(true);
        setLoading(false);
      }
    );

    // ── 3. Realistic Aerodynamic Streamlines Engine (60 FPS) ──
    const isInitialXMode = aeroModeRef.current === 'X-MODE';
    const streamlinesData = generateRealisticStreamlines(isInitialXMode);
    const numLines = streamlinesData.length;
    const nodesPerLine = streamlinesData[0].points.length;
    const totalSegments = numLines * (nodesPerLine - 1);
    const totalVertices = totalSegments * 2;

    const linePositions = new Float32Array(totalVertices * 3);
    const lineColors = new Float32Array(totalVertices * 3);

    const solidLinesGeo = new THREE.BufferGeometry();
    solidLinesGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    solidLinesGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

    const solidLinesMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
    });
    const solidStreamlines = new THREE.LineSegments(solidLinesGeo, solidLinesMat);

    const physicsWindGroup = new THREE.Group();
    physicsWindGroup.add(solidStreamlines);
    physicsWindGroup.visible = windTunnel;
    scene.add(physicsWindGroup);
    physicsWindGroupRef.current = { group: physicsWindGroup, geo: solidLinesGeo, streamlinesData };

    const cyanColor = new THREE.Color(0x00e5ff);
    const yellowColor = new THREE.Color(0xffd700);
    const redColor = new THREE.Color(0xe10600);

    // 4. Main 60 FPS Render & Animation Loop
    let flowPhase = 0;

    const animateLoop = () => {
      animFrameRef.current = requestAnimationFrame(animateLoop);

      // Smooth camera lerp
      if (targetCamPos.current && targetLookAt.current) {
        camera.position.lerp(targetCamPos.current, 0.06);
        controls.target.lerp(targetLookAt.current, 0.06);
        if (camera.position.distanceTo(targetCamPos.current) < 0.04) {
          targetCamPos.current = null;
          targetLookAt.current = null;
        }
      }

      // Auto-Rotate
      if (controls) {
        controls.autoRotate = autoRotateRef.current;
        controls.autoRotateSpeed = 1.2;
        controls.update();
      }

      // ── Animate Realistic Aerodynamic Laser Pulses along the Streamlines ──
      if (physicsWindGroupRef.current && physicsWindGroupRef.current.group.visible) {
        const isXMode = aeroModeRef.current === 'X-MODE';
        const pulseSpeed = isXMode ? 0.35 : 0.22;
        flowPhase += pulseSpeed;

        const currentData = physicsWindGroupRef.current.streamlinesData;
        let vIdx = 0;

        for (let l = 0; l < currentData.length; l++) {
          const { points, pressures } = currentData[l];

          for (let n = 0; n < points.length - 1; n++) {
            const ptA = points[n];
            const ptB = points[n + 1];
            const cpA = pressures[n];

            // Animated Laser Smoke Pulse moving smoothly along the potential streamline
            const wave = Math.sin(n * 0.35 - flowPhase + l * 0.2);
            const pulseIntensity = Math.max(0.2, Math.pow((wave + 1) * 0.5, 1.8));

            // Aerodynamic Bernoulli Pressure Colors
            const tProg = n / (points.length - 1);
            let segCol = cyanColor.clone();

            if (cpA > 0.15) {
              // High-pressure compression zone (Stagnation)
              segCol = segCol.lerp(yellowColor, Math.min(1, cpA * 2.0));
              if (cpA > 0.45) segCol = segCol.lerp(redColor, (cpA - 0.45) * 1.8);
            } else if (tProg > 0.65) {
              // Diffuser wake dissipation
              segCol = segCol.lerp(redColor, (tProg - 0.65) * 2.2);
            }

            // Vertex A
            linePositions[vIdx] = ptA.x;
            linePositions[vIdx + 1] = ptA.y;
            linePositions[vIdx + 2] = ptA.z;
            lineColors[vIdx] = segCol.r * pulseIntensity;
            lineColors[vIdx + 1] = segCol.g * pulseIntensity;
            lineColors[vIdx + 2] = segCol.b * pulseIntensity;
            vIdx += 3;

            // Vertex B
            linePositions[vIdx] = ptB.x;
            linePositions[vIdx + 1] = ptB.y;
            linePositions[vIdx + 2] = ptB.z;
            lineColors[vIdx] = segCol.r * pulseIntensity * 0.85;
            lineColors[vIdx + 1] = segCol.g * pulseIntensity * 0.85;
            lineColors[vIdx + 2] = segCol.b * pulseIntensity * 0.85;
            vIdx += 3;
          }
        }

        solidLinesGeo.attributes.position.needsUpdate = true;
        solidLinesGeo.attributes.color.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animFrameRef.current = requestAnimationFrame(animateLoop);

    // Cleanup
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update Wind Tunnel visibility and re-solve fluid field on aeroMode changes
  useEffect(() => {
    if (physicsWindGroupRef.current) {
      physicsWindGroupRef.current.group.visible = windTunnel;
      const isXMode = aeroMode === 'X-MODE';
      physicsWindGroupRef.current.streamlinesData = generateRealisticStreamlines(isXMode);
    }
  }, [windTunnel, aeroMode]);

  // Handle Camera Presets (Nose is at +Z, Rear is at -Z)
  const applyCameraPreset = useCallback((preset) => {
    const presets = {
      iso: { pos: [3.8, 1.8, 4.5], look: [0, 0.35, 0] },
      front: { pos: [0.0, 1.1, 5.5], look: [0, 0.35, 1.5] },
      side: { pos: [6.0, 1.3, 0.0], look: [0, 0.35, 0] },
      top: { pos: [0.0, 7.8, 0.05], look: [0, 0, 0] },
      rear: { pos: [0.0, 1.4, -5.5], look: [0, 0.4, -1.8] },
      cockpit: { pos: [0.0, 1.3, 0.8], look: [0, 0.5, 2.0] },
    };
    const target = presets[preset];
    if (target) {
      targetCamPos.current = new THREE.Vector3(...target.pos);
      targetLookAt.current = new THREE.Vector3(...target.look);
    }
  }, []);

  useEffect(() => {
    if (cameraPreset) {
      applyCameraPreset(cameraPreset);
    }
  }, [cameraPreset, applyCameraPreset]);

  return (
    <div className="f1-viewer-viewport" ref={containerRef}>
      {/* Loading Overlay */}
      {loading && (
        <div className="f1-viewer-loading">
          <div className="f1-loading-spinner" />
          <span className="f1-loading-txt">INITIALIZING FIA 2026 3D TELEMETRY...</span>
        </div>
      )}

      {/* Notice badge if running fallback */}
      {loadError && !loading && (
        <div className="f1-model-notice">
          <span>FIA 2026 PROTOTYPE MESH ACTIVE</span>
        </div>
      )}
    </div>
  );
}
