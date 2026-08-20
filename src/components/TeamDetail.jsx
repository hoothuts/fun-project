import { useEffect, useState } from 'react';
import { animate, stagger } from 'animejs';
import { getTeamDrivers, getTeamHistory, getDriverStandings } from '../api.js';
import { teamColor } from '../teamColors.js';
import useAnime from '../useAnime.js';
import BootTitle from './BootTitle.jsx';
import ScrambleNumber from './ScrambleNumber.jsx';
import IdentityBackdrop from './IdentityBackdrop.jsx';

const ageOf = (dob) => {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  return now.getFullYear() - d.getFullYear() - (now < new Date(now.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
};

const fmt = (n) => (n === undefined || n === null ? '–' : n);

export default function TeamDetail({ team, onBack, onOpenDriver }) {
  const teamId = typeof team === 'string' ? team : team?.Constructor?.constructorId;
  const teamName = typeof team === 'string' ? team.replace(/_/g, ' ').toUpperCase() : team?.Constructor?.name;
  const [drivers, setDrivers] = useState(null);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(null);
  const accent = teamColor(teamId);

  useEffect(() => {
    if (!teamId) return;
    setError(null);
    Promise.all([
      getTeamDrivers(teamId),
      getTeamHistory(teamId),
      getDriverStandings('current').catch(() => ({ standings: [] })),
    ])
      .then(([dList, h, dsData]) => {
        const standingsMap = new Map(
          (dsData.standings || []).map((s) => [
            s.Driver.driverId,
            {
              points: +s.points || 0,
              pos: +s.position || 999,
              wins: +s.wins || 0,
            },
          ])
        );

        const sorted = (dList || []).slice().sort((a, b) => {
          const sa = standingsMap.get(a.driverId) || { points: -1, pos: 999 };
          const sb = standingsMap.get(b.driverId) || { points: -1, pos: 999 };
          if (sa.points !== sb.points) return sb.points - sa.points;
          return sa.pos - sb.pos;
        });

        const driversWithRole = sorted.map((d, index) => {
          let role = 'DEVELOPMENT / RESERVE';
          if (index === 0) role = 'NO. 1 DRIVER';
          else if (index === 1) role = 'NO. 2 DRIVER';
          return {
            ...d,
            role,
            standing: standingsMap.get(d.driverId) || null,
          };
        });

        setDrivers(driversWithRole);
        setHistory(h);
      })
      .catch((e) => setError(e.message));
  }, [teamId]);

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

  const currentStanding = history?.[0];
  const maxPoints = history ? Math.max(...history.map((s) => +s.points || 0), 1) : 1;
  const totalWins = history ? history.reduce((acc, s) => acc + (+s.wins || 0), 0) : 0;
  const pointsVal = currentStanding?.points ?? team?.points;
  const winsVal = currentStanding?.wins ?? team?.wins ?? totalWins;

  return (
    <section className="detail">
      <IdentityBackdrop
        type="team"
        teamId={teamId}
        teamName={teamName}
        accentColor={accent}
      />

      <button className="back" onClick={onBack}>
        ← BACK
      </button>

      <header className="detail-header">
        <p className="eyebrow" style={{ color: accent }}>
          {currentStanding
            ? `P${currentStanding.position} IN ${currentStanding.season} STANDINGS`
            : team?.position === '1'
            ? 'CURRENT CHAMPIONS'
            : team?.position
            ? `P${team.position} IN THE STANDINGS`
            : 'CONSTRUCTOR GARAGE'}
        </p>
        <BootTitle style={{ color: accent }}>{teamName}</BootTitle>
        <p className="detail-meta">
          <span className="stat">
            <ScrambleNumber value={pointsVal} delay={200} /> PTS
          </span>
          <span className="stat">
            <ScrambleNumber value={winsVal} delay={300} /> WINS
          </span>
          {team?.Constructor?.nationality && (
            <span className="stat">{team.Constructor.nationality}</span>
          )}
          {history?.length > 0 && (
            <span className="stat">
              <ScrambleNumber value={history.length} delay={400} /> SEASONS
            </span>
          )}
        </p>
      </header>

      {error && <p className="error">{error} — refresh to retry.</p>}

      <h2 className="section-title">DRIVERS</h2>
      {drivers?.length === 0 && <p className="error">No active drivers listed for this season.</p>}
      <div className="drivers" ref={driversRef}>
        {drivers?.map((d) => (
          <button
            className="driver-card"
            key={d.driverId}
            onClick={() => onOpenDriver && onOpenDriver(d.driverId)}
          >
            <span className="driver-num" style={{ color: accent }}>
              {d.permanentNumber || d.code || '—'}
            </span>
            <div className="driver-info">
              <span
                className={`driver-role-tag ${
                  d.role === 'NO. 1 DRIVER'
                    ? 'primary'
                    : d.role === 'NO. 2 DRIVER'
                    ? 'secondary'
                    : 'reserve'
                }`}
                style={{ '--accent': accent }}
              >
                {d.role}
              </span>
              <span className="driver-name">
                {d.givenName} {d.familyName}
              </span>
              <span className="driver-code">{d.code || d.nationality}</span>
              <span className="driver-dob">
                {d.dateOfBirth
                  ? `${d.nationality} · ${ageOf(d.dateOfBirth)} yrs`
                  : 'Development driver'}
              </span>
            </div>
            <span className="driver-card-go">→</span>
          </button>
        ))}
      </div>

      <h2 className="section-title">SEASON BY SEASON</h2>
      {history?.length === 0 && <p className="error">No recorded history in archive.</p>}
      <div className="history" ref={histRef}>
        {history?.map((s) => (
          <div className="hist-row" key={s.season}>
            <span className="hist-year">{s.season}</span>
            <span className="hist-bar">
              <span
                className="hist-fill"
                style={{
                  width: `${((+s.points || 0) / maxPoints) * 100}%`,
                  background: accent,
                }}
              />
            </span>
            <span className="hist-pos" style={{ color: accent }}>
              P{fmt(s.positionText || s.position)}
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