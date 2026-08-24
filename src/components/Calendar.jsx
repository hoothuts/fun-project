import { useEffect, useState } from 'react';
import { stagger } from 'animejs';
import { getSchedule } from '../api.js';
import { teamColor } from '../teamColors.js';
import useAnime from '../useAnime.js';
import BootTitle from './BootTitle.jsx';
import EraSeasonSelector from './EraSeasonSelector.jsx';
import RaceResultsDrawer from './RaceResultsDrawer.jsx';
import SeasonProgress from './SeasonProgress.jsx';

const formatDate = (dStr) => {
  if (!dStr) return '—';
  const d = new Date(dStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function Calendar({ onOpenRace, onOpenCircuit, onOpenDriver, onOpenTeam, initialSeason = 'current' }) {
  const [season, setSeason] = useState(initialSeason);
  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedRound, setExpandedRound] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setExpandedRound(null);
    getSchedule(season)
      .then((res) => {
        setSchedule(res);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [season]);

  const listRef = useAnime(
    {
      targets: '.cal-card',
      opacity: [0, 1],
      x: [-20, 0],
      delay: stagger(25),
      ease: 'outCubic',
      duration: 400,
    },
    [schedule]
  );

  const toggleRound = (roundKey) => {
    setExpandedRound((prev) => (prev === roundKey ? null : roundKey));
  };

  return (
    <section className="calendar-view">
      <header className="hero">
        <div className="hero-top">
          <p className="eyebrow">
            {schedule?.length ? `${season.toUpperCase()} CALENDAR · ${schedule.length} ROUNDS` : 'LOADING CALENDAR…'}
          </p>
          <EraSeasonSelector season={season} onSelectSeason={setSeason} />
        </div>
        <BootTitle>SCHEDULE</BootTitle>
        <p className="hero-sub">Grand Prix dates, circuits, and race winners. Click a race name to view full classification.</p>
        <SeasonProgress season={season} races={schedule} />
      </header>

      {error && <p className="error">{error} — refresh to retry.</p>}
      {loading && !schedule && <p className="loading-state">Loading championship calendar…</p>}

      <div className="cal-list" ref={listRef}>
        {schedule?.map((r) => {
          const roundKey = `${r.season}-${r.round}`;
          const isExpanded = expandedRound === roundKey;
          const isUpcoming = !r.winner;
          const tColor = r.winner?.constructorId ? teamColor(r.winner.constructorId) : 'inherit';

          return (
            <div
              className={`cal-card ${isExpanded ? 'is-expanded' : ''}`}
              key={roundKey}
              onClick={() => toggleRound(roundKey)}
              role="button"
              tabIndex={0}
              aria-expanded={isExpanded}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleRound(roundKey);
                }
              }}
            >
              <div className="cal-card-summary">
                <div className="cal-round-badge">
                  <span className="round-lbl">RND</span>
                  <span className="round-num">{String(r.round).padStart(2, '0')}</span>
                </div>

                <div className="cal-main">
                  <div className="cal-header-row">
                    <button
                      className="cal-race-title-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenRace) onOpenRace(r.season, r.round);
                      }}
                      title={`View ${r.raceName} full race results & classification`}
                    >
                      <h3 className="cal-race-name">{r.raceName}</h3>
                      <span className="race-view-arrow">→</span>
                    </button>
                    <span className="cal-date">{formatDate(r.date)}</span>
                  </div>

                  <button
                    className="cal-circuit-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (r.circuit) onOpenCircuit(r.circuit);
                    }}
                  >
                    <span className="circuit-name">{r.circuit.circuitName}</span>
                    <span className="circuit-loc">
                      {r.circuit.Location?.locality}, {r.circuit.Location?.country}
                    </span>
                    <span className="circuit-go">VIEW TRACK →</span>
                  </button>
                </div>

                <div className="cal-result">
                  {r.winner ? (
                    <div className="cal-winner-info">
                      <span className="winner-tag">WINNER</span>
                      <button
                        className="winner-driver-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (r.winner.driverId) onOpenDriver(r.winner.driverId);
                        }}
                      >
                        {r.winner.driver}
                      </button>
                      <button
                        className="winner-team-btn"
                        style={{ '--accent': tColor }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (r.winner.constructorId) onOpenTeam(r.winner.constructorId);
                        }}
                      >
                        <span className="team-dot" style={{ background: tColor }} />
                        {r.winner.constructor}
                      </button>
                    </div>
                  ) : (
                    <div className="cal-upcoming">
                      <span className="upcoming-badge">UPCOMING</span>
                    </div>
                  )}

                  <div className="cal-toggle-indicator">
                    <span className="toggle-btn-text">
                      {isExpanded ? 'CLOSE ▴' : 'RESULTS ▾'}
                    </span>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <RaceResultsDrawer
                  season={r.season}
                  round={r.round}
                  isUpcoming={isUpcoming}
                  circuit={r.circuit}
                  onOpenCircuit={onOpenCircuit}
                  onOpenDriver={onOpenDriver}
                  onOpenTeam={onOpenTeam}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
