import { useEffect, useRef, useState } from 'react';
import { createTimeline, stagger } from 'animejs';
import { getStandings } from '../api.js';
import { teamColor } from '../teamColors.js';
import useAnime from '../useAnime.js';
import BootTitle from './BootTitle.jsx';
import EraSeasonSelector from './EraSeasonSelector.jsx';
import TiltCard from './TiltCard.jsx';

function StartingLights({ onOut }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onOut();
      return;
    }
    const lights = el.querySelectorAll('.light');
    const tl = createTimeline({
      onComplete: onOut,
    });

    tl.add(lights, {
      opacity: [0.12, 1],
      duration: 160,
      delay: stagger(260),
      ease: 'outQuad',
    })
      .add(lights, {
        opacity: 0.12,
        duration: 200,
        delay: 800,
      })
      .add(el, {
        opacity: 0,
        duration: 240,
        delay: 100,
      });

    return () => tl.revert();
  }, [onOut]);
  return (
    <div className="lights" ref={ref} aria-label="Starting lights">
      {[0, 1, 2, 3, 4].map((i) => (
        <span className="light" key={i} />
      ))}
    </div>
  );
}

export default function Grid({ onOpenTeam, initialSeason = 'current' }) {
  const [season, setSeason] = useState(initialSeason);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [lightsOut, setLightsOut] = useState(false);

  useEffect(() => {
    setData(null);
    setError(null);
    setLightsOut(false);
    getStandings(season)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [season]);



  const gridRef = useAnime(
    {
      targets: '.team-card',
      opacity: [0, 1],
      y: [-70, 0],
      scale: [0.94, 1],
      delay: stagger(42, { from: 'center' }),
      ease: 'outBack',
      duration: 700,
    },
    [data, lightsOut]
  );

  return (
    <section className="grid-view">
      <header className="hero">
        <div className="hero-top">
          <p className="eyebrow">
            {data ? `${data.season} SEASON · ROUND ${data.round}` : 'LOADING THE GRID…'}
          </p>
          <EraSeasonSelector season={season} onSelectSeason={setSeason} />
        </div>
        <BootTitle>THE GRID</BootTitle>
        <p className="hero-sub">Constructors Championship. Tap a team to open its garage.</p>
      </header>

      {error && <p className="error">{error} — refresh to retry.</p>}

      {data && !lightsOut && <StartingLights onOut={() => setLightsOut(true)} />}

      <div className="grid" ref={gridRef}>
        {data?.standings.map((t, i) => {
          const color = teamColor(t.Constructor.constructorId);
          return (
            <TiltCard
              key={t.Constructor.constructorId}
              className="team-card-tilt"
              style={{ '--accent': color }}
              onClick={() => onOpenTeam(t.Constructor.constructorId, t)}
            >
              <div className="team-card">
                <span className="card-pos" style={{ color }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="card-name">{t.Constructor.name}</span>
                <span className="card-meta">
                  <span className="card-points">{t.points} PTS</span>
                  <span className="card-wins">{t.wins} WINS</span>
                </span>
                <span className="card-flag">{t.Constructor.nationality}</span>
              </div>
            </TiltCard>
          );
        })}
      </div>
    </section>
  );
}