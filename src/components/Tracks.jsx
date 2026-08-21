import { useEffect, useMemo, useState } from 'react';
import { stagger } from 'animejs';
import { getCircuits } from '../api.js';
import useAnime from '../useAnime.js';
import BootTitle from './BootTitle.jsx';
import TrackCircuit from './TrackCircuit.jsx';
import { circuitMap } from '../circuitMaps.js';

export default function Tracks({ onOpenCircuit }) {
  const [circuits, setCircuits] = useState(null);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    getCircuits().then(setCircuits).catch((e) => setError(e.message));
  }, []);

  const groups = useMemo(() => {
    if (!circuits) return null;
    const q = filter.trim().toLowerCase();
    const map = new Map();
    for (const c of circuits) {
      const hay = `${c.circuitName} ${c.Location?.locality} ${c.Location?.country}`.toLowerCase();
      if (q && !hay.includes(q)) continue;
      const key = c.Location?.country || 'Unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    }
    return [...map.entries()];
  }, [circuits, filter]);

  const ref = useAnime(
    {
      targets: '.track-row',
      opacity: [0, 1],
      x: [-18, 0],
      delay: stagger(20),
      ease: 'outCubic',
      duration: 400,
    },
    [groups]
  );

  return (
    <section className="tracks-view">
      <header className="tracks-hero-grid">
        <div className="tracks-hero-info">
          <p className="eyebrow">{circuits ? 'SILVERSTONE 1950 — TODAY' : 'LOADING CIRCUITS…'}</p>
          <BootTitle>CIRCUITS</BootTitle>
          <p className="hero-sub">
            {circuits
              ? `All ${circuits.length} tracks to ever host a Formula 1 Grand Prix.`
              : 'Every track that has hosted a Grand Prix.'}
          </p>
          <input
            className="filter"
            type="search"
            placeholder="Filter by name, city or country…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        <div className="tracks-hero-preview">
          <TrackCircuit file={circuitMap.silverstone || 'silverstone-8.svg'} />
        </div>
      </header>

      {error && <p className="error">{error} — refresh to retry.</p>}

      <div className="track-list" ref={ref}>
        {groups?.map(([country, list]) => (
          <div className="track-group" key={country}>
            <h2 className="group-title">{country.toUpperCase()}</h2>
            {list.map((c) => (
              <button
                className="track-row"
                key={c.circuitId}
                onClick={() => onOpenCircuit(c)}
              >
                <span className="track-name">{c.circuitName}</span>
                <span className="track-loc">{c.Location?.locality ?? '—'}</span>
                <span className="track-go">→</span>
              </button>
            ))}
          </div>
        ))}
        {groups?.length === 0 && <p className="error">No circuits match that filter.</p>}
      </div>
    </section>
  );
}