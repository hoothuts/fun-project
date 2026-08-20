import { useEffect, useState } from 'react';
import { animate, scrambleText, stagger } from 'animejs';
import { getTeamDrivers, getTeamHistory } from '../api.js';
import { teamColor } from '../teamColors.js';
import useAnime from '../useAnime.js';
import BootTitle from './BootTitle.jsx';

const ageOf = (dob) => {
  const d = new Date(dob);
  const now = new Date();
  return now.getFullYear() - d.getFullYear() - (now < new Date(now.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
};

const fmt = (n) => (n === undefined || n === null ? '–' : n);

export default function TeamDetail({ team, onBack }) {
  const [drivers, setDrivers] = useState(null);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(null);
  const accent = teamColor(team.Constructor.constructorId);

  useEffect(() => {
    Promise.all([
      getTeamDrivers(team.Constructor.constructorId),
      getTeamHistory(team.Constructor.constructorId),
    ])
      .then(([d, h]) => {
        setDrivers(d);
        setHistory(h);
      })
      .catch((e) => setError(e.message));
  }, [team.Constructor.constructorId]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    animate('.stat strong', {
      textContent: scrambleText({ chars: 'numbers', duration: 1200 }),
      delay: 350,
    });
  }, [team]);

  useEffect(() => {
    if (!drivers || !driversRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    animate(driversRef.current.querySelectorAll('.driver-num'), {
      textContent: scrambleText({ chars: 'numbers', duration: 800 }),
      delay: stagger(120),
    });
  }, [drivers, driversRef]);

  useEffect(() => {
    if (!history || !histRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const fills = histRef.current.querySelectorAll('.hist-fill');
    const widths = [...fills].map((el) => el.style.width);
    animate(fills, {
      width: (el, i) => [0, widths[i]],
      duration: 950,
      delay: stagger(45),
      ease: 'outCubic',
    });
  }, [history, histRef]);

  const driversRef = useAnime(
    {
      targets: '.driver-card',
      opacity: [0, 1],
      x: [-24, 0],
      delay: stagger(90),
      ease: 'outCubic',
      duration: 500,
    },
    [drivers]
  );

  const histRef = useAnime(
    {
      targets: '.hist-row',
      opacity: [0, 1],
      delay: stagger(35),
      ease: 'outCubic',
      duration: 450,
    },
    [history]
  );

  const maxPoints = history ? Math.max(...history.map((s) => +s.points || 0), 1) : 1;

  return (
    <section className="detail">
      <button className="back" onClick={onBack}>
        ← THE GRID
      </button>

      <header className="detail-header">
        <p className="eyebrow" style={{ color: accent }}>
          {team.position === '1' ? 'CURRENT CHAMPIONS' : `P${team.position} IN THE STANDINGS`}
        </p>
        <BootTitle style={{ color: accent }}>{team.Constructor.name}</BootTitle>
        <p className="detail-meta">
          <span className="stat">
            <strong>{team.points}</strong> PTS
          </span>
          <span className="stat">
            <strong>{team.wins}</strong> WINS
          </span>
          <span className="stat">{team.Constructor.nationality}</span>
        </p>
      </header>

      {error && <p className="error">{error} — refresh to retry.</p>}

      <h2 className="section-title">DRIVERS</h2>
      <div className="drivers" ref={driversRef}>
        {drivers?.map((d) => (
          <div className="driver-card" key={d.driverId}>
            <span className="driver-num" style={{ color: accent }}>
              {d.permanentNumber || '—'}
            </span>
            <div className="driver-info">
              <span className="driver-name">{d.givenName} {d.familyName}</span>
              <span className="driver-code">{d.code || d.nationality}</span>
              <span className="driver-dob">{d.dateOfBirth ? `${d.nationality} · ${ageOf(d.dateOfBirth)}` : 'Development driver'}</span>
            </div>
          </div>
        ))}
      </div>

      <h2 className="section-title">SEASON BY SEASON</h2>
      {history?.length === 0 && <p className="error">Too new for the history books.</p>}
      <div className="history" ref={histRef}>
        {history?.map((s) => (
          <div className="hist-row" key={s.season}>
            <span className="hist-year">{s.season}</span>
            <span className="hist-bar">
              <span
                className="hist-fill"
                style={{ width: `${((+s.points || 0) / maxPoints) * 100}%`, background: accent }}
              />
            </span>
            <span className="hist-pos" style={{ color: accent }}>
              P{fmt(s.positionText)}
            </span>
            <span className="hist-nums">
              {fmt(s.points)} PTS · {fmt(s.wins)} WINS
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}