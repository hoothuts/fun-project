import { useEffect, useRef, useState } from 'react';
import { animate, svg } from 'animejs';

const D =
  'M 100,200 C 100,100 200,50 300,50 C 400,50 480,120 480,180 C 480,240 420,220 380,240 C 340,260 300,280 260,250 C 220,220 180,240 140,240 C 100,240 100,200 100,200 Z';

const parsePath = (svgText) => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const path = doc.querySelector('path');
    if (!path) return null;
    const d = path.getAttribute('d');
    if (!d) return null;
    const transform = path.getAttribute('transform') || '';

    const svgEl = doc.querySelector('svg');
    const vb = svgEl?.getAttribute('viewBox');
    let bb = null;
    if (vb) {
      const parts = vb.trim().split(/[\s,]+/).map(Number);
      if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
        bb = { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
      }
    }
    return { d, transform, bb: bb || { x: 0, y: 0, w: 500, h: 500 } };
  } catch {
    return null;
  }
};

const lapMs = (pathEl) => {
  try {
    const len = pathEl.getTotalLength();
    return Math.min(Math.max(len * 6.5, 4500), 12000);
  } catch {
    return 7000;
  }
};

export default function TrackCircuit({ file }) {
  const [track, setTrack] = useState(null);
  const [state, setState] = useState('loading');
  const ref = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setState('loading');

    fetch(`/circuit/${encodeURIComponent(file)}`)
      .then((res) => {
        if (!res.ok) throw new Error('not found');
        return res.text();
      })
      .then((svgText) => {
        if (cancelled) return;
        const parsed = parsePath(svgText);
        if (parsed) {
          setTrack(parsed);
          setState('svg');
        } else {
          setState('img');
        }
      })
      .catch(() => {
        if (!cancelled) setState('img');
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

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

    // 3. Smooth slow 360-degree rotation of the circuit:
    const rotateAnim = animate(host, {
      rotate: [0, 360],
      duration: 35000,
      ease: 'linear',
      loop: true,
    });

    return () => {
      drawAnim.revert();
      if (carAnim) carAnim.revert();
      rotateAnim.revert();
    };
  }, [state, track]);

  if (state === 'img') {
    return (
      <div className="circuit-3d-stage" aria-hidden="true">
        <div className="circuit-rotator" ref={ref}>
          <img
            className="circuit-img"
            src={`/circuit/${encodeURIComponent(file)}`}
            alt=""
          />
        </div>
      </div>
    );
  }

  const maxDim = track ? Math.max(track.bb.w, track.bb.h) : 480;
  const stroke = track ? Math.max(maxDim / 80, 8) : 10;
  const pad = stroke * 2.2;
  const totalSize = maxDim + pad * 2;
  const cx = track ? track.bb.x + track.bb.w / 2 : 250;
  const cy = track ? track.bb.y + track.bb.h / 2 : 250;
  const vbX = cx - totalSize / 2;
  const vbY = cy - totalSize / 2;
  const viewBox = `${vbX} ${vbY} ${totalSize} ${totalSize}`;

  const carLen = stroke * 3.6;
  const carWid = stroke * 1.9;
  const pathData = track ? track.d : D;

  return (
    <div className="circuit-3d-stage" aria-hidden="true">
      <div className="circuit-rotator" ref={ref}>
        <svg viewBox={viewBox} className="track-svg">
          <g transform={track?.transform || undefined}>
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
          </g>
        </svg>
      </div>
    </div>
  );
}
