import { useEffect, useMemo, useState } from 'react';
import { getCircuitHistory } from '../api.js';
import { circuitMap, circuitMeta } from '../circuitMaps.js';
import { circuitBios } from '../circuitBios.js';
import useAnime from '../useAnime.js';
import BootTitle from './BootTitle.jsx';
import TrackCircuit from './TrackCircuit.jsx';
import ScrambleNumber from './ScrambleNumber.jsx';
import IdentityBackdrop from './IdentityBackdrop.jsx';

const timeMs = (t) => {
  if (!t) return Infinity;
  const [m, s] = t.split(':');
  return +m * 60000 + +s * 1000;
};

const top = (m) => [...m.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 3);

export default function CircuitDetail({ circuit, onBack, onOpenDriver, onOpenTeam }) {
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(null);

  const meta = circuitMeta[circuit.circuitId];
  const layouts = useMemo(() => meta?.layouts || [], [meta]);
  const [selectedLayout, setSelectedLayout] = useState(null);

  const bio = circuitBios[circuit.circuitId] || null;

  useEffect(() => {
    setSelectedLayout(meta?.defaultLayout || (layouts[layouts.length - 1]?.id ?? null));
  }, [circuit.circuitId, meta, layouts]);

  const activeFile = selectedLayout ? `${selectedLayout}.svg` : circuitMap[circuit.circuitId];

  useEffect(() => {
    setHistory(null);
    getCircuitHistory(circuit.circuitId)
      .then(setHistory)
      .catch((e) => setError(e.message));
  }, [circuit.circuitId]);

  const stats = useMemo(() => {
    if (!history) return null;
    const years = history.map((r) => +r.season);
    let lapRecord = null;
    const dwins = new Map();
    const cwins = new Map();
    for (const r of history) {
      if (r.fastest && timeMs(r.fastest.time) < timeMs(lapRecord?.time)) {
        lapRecord = { ...r.fastest, year: r.season };
      }
      if (!r.winner) continue;
      const dKey = r.winner.name;
      const cKey = r.winner.constructor;
      dwins.set(dKey, { count: (dwins.get(dKey)?.count || 0) + 1, id: r.winner.driverId });
      cwins.set(cKey, { count: (cwins.get(cKey)?.count || 0) + 1, id: r.winner.constructorId });
    }

    const firstRace = history[0];
    const firstWinner = firstRace?.winner
      ? { name: firstRace.winner.name, season: firstRace.season, constructor: firstRace.winner.constructor }
      : null;

    return {
      first: Math.min(...years),
      last: Math.max(...years),
      count: history.length,
      lapRecord,
      firstWinner,
      drivers: top(dwins),
      teams: top(cwins),
    };
  }, [history]);

  const listRef = useAnime(
    {
      targets: '.race-row',
      opacity: [0, 1],
      x: [-14, 0],
      delay: (el, i) => i * 18,
      ease: 'outCubic',
      duration: 350,
    },
    [history]
  );

  const loc = circuit.Location?.locality ?? '—';
  const country = circuit.Location?.country ?? '—';

  return (
    <section className="detail circuit-detail-page">
      <IdentityBackdrop
        type="circuit"
        circuitId={circuit.circuitId}
        lat={circuit.Location?.lat}
        long={circuit.Location?.long}
      />

      <button className="back" onClick={onBack}>
        ← THE TRACKS
      </button>

      {error && <p className="error">{error} — refresh to retry.</p>}

      {/* 2-Column Telemetry Cockpit Grid */}
      <div className="circuit-hero-grid">
        <div className="circuit-info-col">
          <header className="detail-header">
            <p className="eyebrow">{stats ? `FIRST GP ${stats.first} · ${loc}, ${country}` : 'LOADING…'}</p>
            <BootTitle>{circuit.circuitName}</BootTitle>
            <p className="detail-meta">
              <span className="stat">
                <ScrambleNumber value={stats?.first} delay={150} /> FIRST GP
              </span>
              <span className="stat">
                <ScrambleNumber value={stats?.count} delay={250} /> GPs
              </span>
              <span className="stat">
                <ScrambleNumber value={stats?.last} delay={350} /> LAST GP
              </span>
              <span className="stat stat-fl">
                <span className="stat-fl-pill">FL</span>
                <strong>{stats?.lapRecord?.time ?? '–'}</strong> LAP RECORD
              </span>
            </p>
          </header>

          {/* Circuit Heritage & Technical Specs Lore Card */}
          <div className="circuit-lore-card">
            <div className="lore-header">
              <span className="lore-tag">CIRCUIT PROFILE</span>
              {bio?.type && <span className="lore-type">{bio.type}</span>}
            </div>

            {bio?.lore && <p className="lore-text">{bio.lore}</p>}

            <div className="circuit-specs-grid">
              {bio?.length && (
                <div className="spec-item">
                  <span className="spec-label">LENGTH</span>
                  <span className="spec-value">{bio.length}</span>
                </div>
              )}
              {bio?.turns && (
                <div className="spec-item">
                  <span className="spec-label">TURNS</span>
                  <span className="spec-value">{bio.turns} CORNERS</span>
                </div>
              )}
              {bio?.direction && (
                <div className="spec-item">
                  <span className="spec-label">DIRECTION</span>
                  <span className="spec-value">{bio.direction.toUpperCase()}</span>
                </div>
              )}
              {stats?.firstWinner && (
                <div className="spec-item">
                  <span className="spec-label">INAUGURAL WIN</span>
                  <span className="spec-value">{stats.firstWinner.name} ({stats.firstWinner.season})</span>
                </div>
              )}
            </div>

            {layouts.length > 1 && (
              <div className="layout-switcher">
                <span className="layout-switcher-label">TRACK LAYOUTS</span>
                <div className="layout-switcher-pills">
                  {layouts.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      className={`layout-pill ${selectedLayout === l.id ? 'is-active' : ''}`}
                      onClick={() => setSelectedLayout(l.id)}
                    >
                      <span className="layout-pill-seasons">{l.seasons}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3D Telemetry Radar Dial Column */}
        <div className="circuit-radar-col">
          <TrackCircuit file={activeFile} />
        </div>
      </div>

      <h2 className="section-title">MOST WINS</h2>
      <div className="winners">
        <div className="winner-col">
          <h3 className="winner-label">DRIVERS</h3>
          {stats?.drivers.map(([name, obj]) => (
            <div
              className="winner-row clickable-row"
              key={name}
              onClick={() => obj.id && onOpenDriver && onOpenDriver(obj.id)}
            >
              <span className="winner-name">{name}</span>
              <span className="winner-count">{obj.count}</span>
            </div>
          ))}
        </div>
        <div className="winner-col">
          <h3 className="winner-label">CONSTRUCTORS</h3>
          {stats?.teams.map(([name, obj]) => (
            <div
              className="winner-row clickable-row"
              key={name}
              onClick={() => obj.id && onOpenTeam && onOpenTeam(obj.id)}
            >
              <span className="winner-name">{name}</span>
              <span className="winner-count">{obj.count}</span>
            </div>
          ))}
        </div>
      </div>

      <h2 className="section-title">RACE LOG</h2>
      {history?.length === 0 && <p className="error">Never hosted a race.</p>}
      <div className="race-log" ref={listRef}>
        {history
          ?.slice()
          .reverse()
          .map((r) => (
            <div className="race-row" key={`${r.season}-${r.raceName}`}>
              <span className="race-year">{r.season}</span>
              <span className="race-name">{r.raceName}</span>
              <span className="race-winner">
                {r.winner ? (
                  <button
                    className="race-link-btn"
                    onClick={() => r.winner.driverId && onOpenDriver && onOpenDriver(r.winner.driverId)}
                  >
                    {r.winner.name}
                  </button>
                ) : (
                  '—'
                )}
              </span>
              <span className="race-fl">
                {r.fastest?.name ? (
                  <button
                    className="race-link-btn race-fl-badge"
                    onClick={() => r.fastest.driverId && onOpenDriver && onOpenDriver(r.fastest.driverId)}
                  >
                    <span className="fl-tag">FL</span>
                    <span className="fl-driver">{r.fastest.name}</span>
                    <span className="fl-time">{r.fastest.time}</span>
                  </button>
                ) : (
                  '—'
                )}
              </span>
            </div>
          ))}
      </div>
    </section>
  );
}