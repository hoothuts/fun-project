import { useEffect, useState } from 'react';
import { stagger } from 'animejs';
import { getRaceResults } from '../api.js';
import { teamColor } from '../teamColors.js';
import useAnime from '../useAnime.js';
import BootTitle from './BootTitle.jsx';

const formatDate = (dStr) => {
  if (!dStr) return '—';
  const d = new Date(dStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getPosBadgeClass = (pos, points, status) => {
  if (pos === '1') return 'pos-p1';
  if (pos === '2') return 'pos-p2';
  if (pos === '3') return 'pos-p3';
  if (+points > 0) return 'pos-pts';
  if (status !== 'Finished' && !status?.startsWith('+')) return 'pos-dnf';
  return 'pos-classified';
};

const formatDelta = (delta) => {
  if (delta === null || delta === undefined) return null;
  if (delta > 0) return { label: `▲ +${delta}`, cls: 'delta-gain' };
  if (delta < 0) return { label: `▼ ${delta}`, cls: 'delta-loss' };
  return { label: '— 0', cls: 'delta-even' };
};

export default function RaceDetail({
  season,
  round,
  onBack,
  onOpenDriver,
  onOpenTeam,
  onOpenCircuit,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getRaceResults(season, round)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || 'Failed to load Grand Prix race results');
        setLoading(false);
      });
  }, [season, round]);

  const listRef = useAnime(
    {
      targets: '.race-res-row',
      opacity: [0, 1],
      x: [-15, 0],
      delay: stagger(15),
      ease: 'outCubic',
      duration: 350,
    },
    [data]
  );

  const results = data?.results || [];
  const top3 = results.slice(0, 3);
  const winner = results[0];
  const fl = results.find((r) => r.isFastestLap);
  const winnerColor = winner?.constructorId ? teamColor(winner.constructorId) : 'inherit';

  return (
    <section className="detail race-detail-view">
      <button className="back" onClick={onBack}>
        ← BACK TO SCHEDULE
      </button>

      <header className="detail-header">
        <p className="eyebrow" style={{ color: winnerColor !== 'inherit' ? winnerColor : 'var(--red)' }}>
          {season} FORMULA 1 WORLD CHAMPIONSHIP · ROUND {round}
        </p>
        <BootTitle>
          {data?.raceName || 'GRAND PRIX RESULTS'}
        </BootTitle>

        <p className="detail-meta">
          {data?.date && (
            <span className="stat">
              <strong>{formatDate(data.date)}</strong> DATE
            </span>
          )}
          {data?.circuit && (
            <span className="stat">
              <button
                className="meta-link-btn"
                onClick={() => onOpenCircuit(data.circuit)}
                title="Inspect circuit layout and telemetry"
              >
                {data.circuit.circuitName} ({data.circuit.Location?.locality}, {data.circuit.Location?.country}) →
              </button>
            </span>
          )}
          {winner && (
            <span className="stat">
              <strong style={{ color: winnerColor }}>{winner.driver}</strong> WINNER
            </span>
          )}
          {fl?.fastestLap?.time && (
            <span className="stat">
              <strong style={{ color: 'var(--purple)' }}>{fl.fastestLap.time}</strong> FAST LAP ({fl.driverCode || fl.driver})
            </span>
          )}
        </p>
      </header>

      {error && <p className="error">{error} — refresh to retry.</p>}
      {loading && <p className="loading-state">Loading Grand Prix classification & telemetry…</p>}

      {!loading && !error && data?.isUpcoming && (
        <div className="cal-drawer-upcoming race-detail-upcoming">
          <div className="upcoming-info-box">
            <span className="upcoming-tag">SESSION PENDING</span>
            <h4>GRAND PRIX NOT YET CONTESTED</h4>
            <p className="upcoming-desc">
              Official race results, lap times, points, and telemetry will be available immediately following the conclusion of this Grand Prix.
            </p>
            {data.circuit && (
              <button className="drawer-track-btn" onClick={() => onOpenCircuit(data.circuit)}>
                INSPECT {data.circuit.circuitName.toUpperCase()} TELEMETRY & 3D TRACK LAYOUT →
              </button>
            )}
          </div>
        </div>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="race-detail-body" ref={listRef}>
          {/* Podium showcase */}
          <div className="cal-podium-strip">
            {top3.map((res, i) => {
              const tColor = teamColor(res.constructorId);
              const rankLabel = i === 0 ? 'WINNER · P1' : `PODIUM · P${i + 1}`;
              return (
                <div key={res.driverId || i} className={`podium-card podium-p${i + 1}`}>
                  <div className="podium-card-top">
                    <span className="podium-rank-tag">{rankLabel}</span>
                    <span className="podium-time">{res.time || (i === 0 ? 'FINISHED' : res.status)}</span>
                  </div>
                  <button className="podium-driver-name" onClick={() => res.driverId && onOpenDriver(res.driverId)}>
                    #{res.number || '—'} {res.driver}
                  </button>
                  <button
                    className="podium-team-tag"
                    style={{ '--accent': tColor }}
                    onClick={() => res.constructorId && onOpenTeam(res.constructorId)}
                  >
                    <span className="team-dot" style={{ background: tColor }} />
                    {res.constructor}
                  </button>
                </div>
              );
            })}

            {fl && (
              <div className="podium-card podium-fl">
                <div className="podium-card-top">
                  <span className="fl-purple-tag">FASTEST LAP · 1 PT</span>
                  <span className="podium-time">{fl.fastestLap?.time || '—'}</span>
                </div>
                <button className="podium-driver-name" onClick={() => fl.driverId && onOpenDriver(fl.driverId)}>
                  #{fl.number || '—'} {fl.driver}
                </button>
                <div className="fl-speed-info">
                  Lap {fl.fastestLap?.lap || '—'}{fl.fastestLap?.speed ? ` · ${fl.fastestLap.speed} km/h` : ''}
                </div>
              </div>
            )}
          </div>

          {/* Full Classification Timing Board */}
          <h2 className="section-title">FULL RACE CLASSIFICATION</h2>
          <div className="cal-table-wrap race-detail-table">
            <div className="cal-table-header">
              <span className="th-col th-pos">POS</span>
              <span className="th-col th-num">NO</span>
              <span className="th-col th-driver">DRIVER</span>
              <span className="th-col th-team">CONSTRUCTOR</span>
              <span className="th-col th-grid">GRID / DELTA</span>
              <span className="th-col th-laps">LAPS</span>
              <span className="th-col th-time">TIME / STATUS</span>
              <span className="th-col th-pts">PTS</span>
            </div>

            <div className="cal-table-body">
              {results.map((r) => {
                const tColor = teamColor(r.constructorId);
                const isDnf = r.status !== 'Finished' && !r.status?.startsWith('+');
                const delta = formatDelta(r.gridDelta);

                return (
                  <div className="cal-res-row race-res-row" key={`${r.position}-${r.driverId || r.number}`}>
                    <div className="td-col td-pos">
                      <span className={`res-pos-badge ${getPosBadgeClass(r.position, r.points, r.status)}`}>
                        {r.position.startsWith('P') ? r.position : `P${r.position}`}
                      </span>
                    </div>

                    <div className="td-col td-num">
                      <span className="driver-car-num">#{r.number || '—'}</span>
                    </div>

                    <div className="td-col td-driver">
                      <button
                        className="res-driver-btn"
                        onClick={() => r.driverId && onOpenDriver(r.driverId)}
                        title={`View ${r.driver}'s bio`}
                      >
                        <span className="res-driver-name">{r.driver}</span>
                        {r.driverCode && <span className="res-driver-code">{r.driverCode}</span>}
                      </button>
                    </div>

                    <div className="td-col td-team">
                      <button
                        className="res-team-btn"
                        style={{ '--accent': tColor }}
                        onClick={() => r.constructorId && onOpenTeam(r.constructorId)}
                      >
                        <span className="team-dot" style={{ background: tColor }} />
                        <span className="res-team-name">{r.constructor}</span>
                      </button>
                    </div>

                    <div className="td-col td-grid">
                      <span className="grid-start">P{r.grid || '—'}</span>
                      {delta && <span className={`delta-badge ${delta.cls}`}>{delta.label}</span>}
                    </div>

                    <div className="td-col td-laps">{r.laps || '—'}</div>

                    <div className="td-col td-time">
                      <span className={`time-text ${isDnf ? 'is-dnf' : ''}`}>
                        {r.time || r.status || '—'}
                      </span>
                      {r.isFastestLap && (
                        <span className="fl-badge" title={`Fastest Lap: ${r.fastestLap?.time || ''}`}>
                          FL
                        </span>
                      )}
                    </div>

                    <div className="td-col td-pts">
                      <span className={`pts-val ${+r.points > 0 ? 'has-pts' : ''}`}>
                        {+r.points > 0 ? `+${r.points}` : '0'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {data.circuit && (
            <div className="cal-drawer-footer" style={{ marginTop: '1.5rem' }}>
              <button className="drawer-track-btn" onClick={() => onOpenCircuit(data.circuit)}>
                INSPECT {data.circuit.circuitName.toUpperCase()} TELEMETRY & 3D TRACK LAYOUT →
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
