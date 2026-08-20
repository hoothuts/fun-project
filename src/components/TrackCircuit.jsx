import { useEffect, useRef, useState } from 'react';
import { animate, svg } from 'animejs';

const D =
  'M 40 190 L 150 190 C 150 176 162 172 174 180 C 184 187 196 191 208 183 ' +
  'C 218 176 230 176 236 184 L 330 190 C 415 190 448 145 420 90 C 402 55 355 48 305 52 ' +
  'L 150 52 C 90 52 55 82 60 130 C 63 168 75 188 40 190 Z';

const lapMs = (line) => {
  const len = line.getTotalLength ? line.getTotalLength() : 0;
  return Math.min(Math.max(Math.round(len / 0.12), 4000), 20000);
};

function trackBBox(d) {
  const toks = d.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
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
  const [state, setState] = useState(() => initState(file));
  const [track, setTrack] = useState(null);

  useEffect(() => {
    setState(initState(file));
    setTrack(null);
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
        const path = doc.querySelector('#track');
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

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const trackEl = host.querySelector('#track');
    const carEl = host.querySelector('.car');
    if (!trackEl || !carEl) return;
    const { translateX, translateY, rotate } = svg.createMotionPath(trackEl);
    const anims = [
      animate(svg.createDrawable(trackEl), {
        draw: ['0 0', '0 1'],
        duration: 1600,
        ease: 'inOutCubic',
      }),
      animate(carEl, {
        translateX,
        translateY,
        rotate,
        duration: lapMs(trackEl),
        ease: 'linear',
        loop: true,
      }),
    ];
    return () => anims.forEach((a) => a.revert());
  }, [state, track]);

  if (state === 'img') {
    return (
      <img
        className="circuit circuit-img"
        src={`/circuit/${encodeURIComponent(file)}`}
        alt=""
        aria-hidden="true"
      />
    );
  }

  if (state === 'loading') return null;

  const stroke = track ? Math.max(track.bb.w, track.bb.h) / 140 : 12;
  const viewBox = track
    ? `${track.bb.x - stroke} ${track.bb.y - stroke} ${track.bb.w + stroke * 2} ${track.bb.h + stroke * 2}`
    : '0 0 480 220';

  return (
    <div className="circuit" ref={ref} aria-hidden="true">
      <svg viewBox={viewBox}>
        <path id="track" d={track ? track.d : D} strokeWidth={stroke} />
      </svg>
      <div className="car" />
    </div>
  );
}
