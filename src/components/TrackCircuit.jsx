import { useEffect, useRef, useState, useCallback } from 'react';
import { animate, svg } from 'animejs';

const D =
  'M 40 190 L 150 190 C 150 176 162 172 174 180 C 184 187 196 191 208 183 ' +
  'C 218 176 230 176 236 184 L 330 190 C 415 190 448 145 420 90 C 402 55 355 48 305 52 ' +
  'L 150 52 C 90 52 55 82 60 130 C 63 168 75 188 40 190 Z';

const lapMs = (line) => {
  const len = line?.getTotalLength ? line.getTotalLength() : 0;
  return Math.min(Math.max(Math.round(len / 0.18), 4000), 12000);
};

function trackBBox(d) {
  const toks = d.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
  if (!toks) return null;
  let i = 0;
  let x = 0;
  let y = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let cmd = 'M';
  const num = () => parseFloat(toks[i++]);
  const keep = (px, py) => {
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  };
  while (i < toks.length) {
    const t = toks[i];
    if (/[a-zA-Z]/.test(t)) {
      cmd = t;
      i++;
      continue;
    }
    const r = cmd === cmd.toLowerCase();
    switch (cmd.toUpperCase()) {
      case 'M':
      case 'L':
        x = r ? x + num() : num();
        y = r ? y + num() : num();
        keep(x, y);
        break;
      case 'H':
        x = r ? x + num() : num();
        keep(x, y);
        break;
      case 'V':
        y = r ? y + num() : num();
        keep(x, y);
        break;
      case 'C': {
        const c1x = num(); const c1y = num();
        const c2x = num(); const c2y = num();
        keep(r ? x + c1x : c1x, r ? y + c1y : c1y);
        keep(r ? x + c2x : c2x, r ? y + c2y : c2y);
        x = r ? x + num() : num();
        y = r ? y + num() : num();
        keep(x, y);
        break;
      }
      case 'S':
      case 'Q': {
        const c1x = num(); const c1y = num();
        keep(r ? x + c1x : c1x, r ? y + c1y : c1y);
        x = r ? x + num() : num();
        y = r ? y + num() : num();
        keep(x, y);
        break;
      }
      case 'T':
        x = r ? x + num() : num();
        y = r ? y + num() : num();
        keep(x, y);
        break;
      case 'A':
        num(); num(); num(); num(); num();
        x = r ? x + num() : num();
        y = r ? y + num() : num();
        keep(x, y);
        break;
      default:
        i++;
        break;
    }
  }
  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function initState(file) {
  if (!file) return 'fallback';
  if (file.endsWith('.png')) return 'img';
  return 'loading';
}

export default function TrackCircuit({ file }) {
  const ref = useRef(null);
  const dialRef = useRef(null);
  const [state, setState] = useState(() => initState(file));
  const [track, setTrack] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startAngle: 0, initialRotation: 0 });

  useEffect(() => {
    setState(initState(file));
    setTrack(null);
    setRotation(0);
  }, [file]);

  useEffect(() => {
    if (!file || !file.endsWith('.svg')) return;
    let live = true;
    fetch(`/circuit/${encodeURIComponent(file)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (!live) return;
        const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
        const path = doc.querySelector('#track') || doc.querySelector('path');
        const d = path?.getAttribute('d');
        const bb = d && trackBBox(d);
        if (!bb || bb.w <= 0 || bb.h <= 0) {
          setState('fallback');
          return;
        }
        setTrack({ d, bb });
        setState('svg');
      })
      .catch(() => live && setState('fallback'));
    return () => {
      live = false;
    };
  }, [file]);

  // Pointer drag rotation handler
  const handlePointerDown = (e) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

    dragStartRef.current = { startAngle, initialRotation: rotation };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    const delta = currentAngle - dragStartRef.current.startAngle;
    let newRot = Math.round((dragStartRef.current.initialRotation + delta) % 360);
    if (newRot < 0) newRot += 360;
    setRotation(newRot);
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const resetRotation = useCallback((e) => {
    e.stopPropagation();
    setRotation(0);
  }, []);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;

    const trackPath = host.querySelector('#track');
    const carEl = host.querySelector('.car');
    if (!trackPath || !carEl) return;

    const duration = lapMs(trackPath);

    // 1. Line-drawing tracing animation on active neon layer:
    const drawAnim = animate(svg.createDrawable(trackPath), {
      draw: ['0 0', '0 1'],
      ease: 'linear',
      duration,
      loop: true,
    });

    // 2. Motion path animation driving the car along the circuit:
    const motion = svg.createMotionPath(trackPath);
    const carAnim = motion
      ? animate(carEl, {
          ease: 'linear',
          duration,
          loop: true,
          ...motion,
        })
      : null;

    return () => {
      drawAnim.revert();
      if (carAnim) carAnim.revert();
    };
  }, [state, track]);

  if (state === 'img') {
    return (
      <div className="circuit" aria-hidden="true">
        <img
          className="circuit-img"
          src={`/circuit/${encodeURIComponent(file)}`}
          alt=""
        />
      </div>
    );
  }

  if (state === 'loading') return null;

  const stroke = track ? Math.max(track.bb.w, track.bb.h) / 110 : 10;
  const padding = stroke * 3.5;
  const viewBox = track
    ? `${track.bb.x - padding} ${track.bb.y - padding} ${track.bb.w + padding * 2} ${track.bb.h + padding * 2}`
    : '-20 -20 520 260';

  const carLen = stroke * 3.5;
  const carWid = stroke * 1.8;
  const pathData = track ? track.d : D;

  return (
    <div className="circuit-radar-container" aria-hidden="true">
      <div
        className={`circuit-radar-dial ${isDragging ? 'is-dragging' : ''}`}
        ref={dialRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Outer Telemetry Bezel Rings */}
        <div className="radar-bezel" />
        <div className="radar-ticks" />

        {/* Compass Cardinal Points */}
        <span className="radar-cardinal n">N</span>
        <span className="radar-cardinal e">E</span>
        <span className="radar-cardinal s">S</span>
        <span className="radar-cardinal w">W</span>

        {/* Rotating Track Stage */}
        <div
          className="radar-rotator"
          ref={ref}
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <svg viewBox={viewBox} className="track-svg">
            <defs>
              <pattern
                id="radar-grid"
                width="24"
                height="24"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="12" cy="12" r="1" fill="rgba(225, 6, 0, 0.18)" />
              </pattern>
            </defs>

            {/* Dot Matrix Background Grid */}
            <rect
              x={track ? track.bb.x - padding : -50}
              y={track ? track.bb.y - padding : -50}
              width={track ? track.bb.w + padding * 2 : 600}
              height={track ? track.bb.h + padding * 2 : 350}
              fill="url(#radar-grid)"
            />

            {/* Layer 1: Dimmed static track base outline */}
            <path
              className="track-base"
              d={pathData}
              strokeWidth={stroke}
            />

            {/* Layer 2: Glowing red active stroke */}
            <path
              id="track"
              className="track-active"
              d={pathData}
              strokeWidth={stroke}
            />

            {/* Capsule car navigating the track */}
            <g className="car">
              <rect
                x={-carLen / 2}
                y={-carWid / 2}
                width={carLen}
                height={carWid}
                rx={carWid / 2}
                fill="#ffffff"
              />
              <circle cx={carLen / 4} cy="0" r={carWid / 3.5} fill="var(--red)" />
            </g>
          </svg>
        </div>

        {/* HUD Overlay controls */}
        <div className="radar-hud">
          <span className="radar-azimuth">{String(rotation).padStart(3, '0')}° AZ</span>
          <button
            type="button"
            className="radar-reset-btn"
            onClick={resetRotation}
            title="Reset rotation to 0°"
          >
            ↺ 0°
          </button>
        </div>
      </div>
      <p className="radar-hint">DRAG DIAL TO ROTATE CIRCUIT</p>
    </div>
  );
}
