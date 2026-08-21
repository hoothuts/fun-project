import { useEffect, useState } from 'react';
import { stagger } from 'animejs';
import { getDriverStandings } from '../api.js';
import { teamColor } from '../teamColors.js';
import useAnime from '../useAnime.js';
import BootTitle from './BootTitle.jsx';
import EraSeasonSelector from './EraSeasonSelector.jsx';
import TiltCard from './TiltCard.jsx';

export default function Drivers({ onOpenDriver, onOpenTeam, initialSeason = 'current' }) {
  const [season, setSeason] = useState(initialSeason);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getDriverStandings(season)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [season]);



  const listRef = useAnime(
    {
      targets: '.driver-standings-card',
      opacity: [0, 1],
      y: [-30, 0],
      scale: [0.96, 1],
      delay: stagger(30),
      ease: 'outBack',
      duration: 500,
    },
    [data]
  );

  return (
    <section className="drivers-view">
      <header className="hero">
        <div className="hero-top">
          <p className="eyebrow">
            {data ? `${data.season} DRIVERS CHAMPIONSHIP · ROUND ${data.round}` : 'LOADING STANDINGS…'}
          </p>
          <EraSeasonSelector season={season} onSelectSeason={setSeason} />
        </div>
        <BootTitle>DRIVERS</BootTitle>
        <p className="hero-sub">World Championship Standings. Tap a driver for career stats.</p>
      </header>

      {error && <p className="error">{error} — refresh to retry.</p>}
      {loading && !data && <p className="loading-state">Fetching driver standings…</p>}

      <div className="grid driver-grid" ref={listRef}>
        {data?.standings.map((d, i) => {
          const team = d.Constructors?.[0];
          const color = teamColor(team?.constructorId);
          return (
            <TiltCard
              key={d.Driver.driverId}
              className="driver-card-tilt"
              style={{ '--accent': color }}
              onClick={() => onOpenDriver(d.Driver.driverId)}
            >
              <div className="driver-standings-card">
                <div className="card-top">
                  <span className="card-pos" style={{ color }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="driver-badge-num" style={{ color }}>
                    #{d.Driver.permanentNumber || d.Driver.code || '—'}
                  </span>
                </div>

                <div className="card-driver-body">
                  <span className="driver-first-name">{d.Driver.givenName}</span>
                  <span className="card-name">{d.Driver.familyName}</span>
                  {team && (
                    <button
                      className="team-tag"
                      style={{ '--accent': color }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenTeam(team.constructorId);
                      }}
                    >
                      <span className="team-dot" style={{ background: color }} />
                      {team.name}
                    </button>
                  )}
                </div>

                <div className="card-meta">
                  <span className="card-points">{d.points} PTS</span>
                  <span className="card-wins">{d.wins} WINS</span>
                </div>
                <span className="card-flag">{d.Driver.nationality}</span>
              </div>
            </TiltCard>
          );
        })}
      </div>
    </section>
  );
}
