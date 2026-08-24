import { useEffect, useState } from 'react';
import { stagger } from 'animejs';
import { getRaceResults } from '../api.js';
import { teamColor } from '../teamColors.js';
import useAnime from '../useAnime.js';

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

export default function RaceResultsDrawer({
  season,
  round,
  isUpcoming,
  circuit,
  onOpenCircuit,
  onOpenDriver,
  onOpenTeam,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!isUpcoming);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isUpcoming) return;
    setLoading(true);
    setError(null);
    getRaceResults(season, round)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || 'Failed to load race results');
        setLoading(false);
      });
  }, [season, round, isUpcoming]);

  const listRef = useAnime(
    {
      targets: '.cal-res-row',
      opacity: [0, 1],
      x: [-12, 0],
      delay: stagger(15),
      ease: 'outCubic',
      duration: 300,
    },
    [data]
  );

  if (loading) {
    return (
      <div className="cal-results-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="cal-drawer-loading">
          <span className="drawer-spinner" />
          <span>LOADING RACE TELEMETRY & CLASSIFICATION…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cal-results-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="cal-drawer-error"><p>{error}</p></div>
      </div>
    );
  }

  if (isUpcoming) {
    return (
      <div className="cal-results-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="cal-drawer-upcoming">
          <div className="upcoming-info-box">
            <span className="upcoming-tag">SESSION PENDING</span>
            <h4>GRAND PRIX NOT YET CONTESTED</h4>
            <p className="upcoming-desc">
              Classification and telemetry will be available immediately following the race.
            </p>
            {circuit && (
              <button className="drawer-track-btn" onClick={() => onOpenCircuit(circuit)}>
                INSPECT {circuit.circuitName.toUpperCase()} TELEMETRY & LAYOUT →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const results = data?.results || [];
  const top3 = results.slice(0, 3);
  const fl = results.find((r) => r.isFastestLap);

  return (
    <div className="cal-results-drawer" onClick={(e) => e.stopPropagation()}>
      <div className="cal-drawer-content" ref={listRef}>
        {/* Top 3 Podium & Fastest Lap Highlights */}
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

        {/* Classification Table */}
        <div className="cal-table-wrap">
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
                <div className="cal-res-row" key={`${r.position}-${r.driverId || r.number}`}>
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

        {circuit && (
          <div className="cal-drawer-footer">
            <button className="drawer-track-btn" onClick={() => onOpenCircuit(circuit)}>
              INSPECT {circuit.circuitName.toUpperCase()} TELEMETRY & 3D TRACK LAYOUT →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
