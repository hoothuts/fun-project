import { useEffect, useState } from 'react';
import { stagger } from 'animejs';
import { getDriverDetail } from '../api.js';
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

export default function DriverDetail({ driverId, onBack, onOpenTeam }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    setError(null);
    getDriverDetail(driverId)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [driverId]);

  const listRef = useAnime(
    {
      targets: '.race-row',
      opacity: [0, 1],
      x: [-16, 0],
      delay: stagger(25),
      ease: 'outCubic',
      duration: 350,
    },
    [data]
  );

  const driver = data?.driver;
  const latestConstructor = data?.recentResults?.[0]?.constructorId;
  const accent = teamColor(latestConstructor);
  const driverFullName = driver ? `${driver.givenName} ${driver.familyName}` : 'DRIVER';

  return (
    <section className="detail">
      <IdentityBackdrop
        type="driver"
        number={driver?.permanentNumber}
        code={driver?.code}
        accentColor={accent}
      />

      <button className="back" onClick={onBack}>
        ← BACK
      </button>

      <header className="detail-header">
        <p className="eyebrow" style={{ color: accent }}>
          {driver
            ? `#${driver.permanentNumber || driver.code || '—'} · ${driver.nationality}`
            : 'LOADING DRIVER PROFILE…'}
        </p>
        <BootTitle style={{ color: accent }}>
          {driverFullName}
        </BootTitle>
        <p className="detail-meta">
          <span className="stat">
            <ScrambleNumber value={data?.totalRaces} delay={200} /> GRAND PRIX
          </span>
          <span className="stat">
            <ScrambleNumber value={data?.totalWins} delay={250} /> WINS
          </span>
          <span className="stat">
            <ScrambleNumber value={data?.podiums} delay={300} /> PODIUMS
          </span>
          <span className="stat">
            <ScrambleNumber value={data?.points} delay={350} /> CAREER PTS
          </span>
          <span className="stat">
            <strong>{data?.bestFinish ?? '–'}</strong> BEST FINISH
          </span>
          {driver?.dateOfBirth && (
            <span className="stat">
              <ScrambleNumber value={ageOf(driver.dateOfBirth)} delay={400} /> YEARS OLD
            </span>
          )}
        </p>
      </header>

      {error && <p className="error">{error} — refresh to retry.</p>}

      <h2 className="section-title">RECENT GRAND PRIX RESULTS</h2>
      {data?.recentResults?.length === 0 && <p className="error">No race results recorded.</p>}
      <div className="race-log" ref={listRef}>
        {data?.recentResults?.map((r) => {
          const tColor = teamColor(r.constructorId);
          return (
            <div className="race-row" key={`${r.season}-${r.round}-${r.raceName}`}>
              <span className="race-year">{r.season}</span>
              <span className="race-name">{r.raceName}</span>
              <button
                className="race-team-tag"
                style={{ '--accent': tColor }}
                onClick={() => r.constructorId && onOpenTeam(r.constructorId)}
              >
                <span className="team-dot" style={{ background: tColor }} />
                {r.constructor}
              </button>
              <span className="race-pos-finish" style={{ color: r.position === '1' ? 'var(--red)' : 'inherit' }}>
                P{r.position}
              </span>
              <span className="race-points">{r.points > 0 ? `+${r.points} PTS` : '0 PTS'}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
