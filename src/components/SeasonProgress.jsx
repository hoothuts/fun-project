import { useEffect, useState, useMemo } from 'react';
import { getSchedule } from '../api.js';

export default function SeasonProgress({ season = 'current', races = null }) {
  const [scheduleData, setScheduleData] = useState(races);
  const [hoveredRound, setHoveredRound] = useState(null);

  useEffect(() => {
    if (races && races.length > 0) {
      setScheduleData(races);
      return;
    }
    let active = true;
    getSchedule(season)
      .then((res) => {
        if (active) setScheduleData(res);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [season, races]);

  const stats = useMemo(() => {
    if (!scheduleData || scheduleData.length === 0) return null;
    const total = scheduleData.length;
    const completedRaces = scheduleData.filter((r) => r.winner);
    const completed = completedRaces.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const nextRace = scheduleData.find((r) => !r.winner);
    const isConcluded = completed === total;

    return {
      total,
      completed,
      percentage,
      nextRace,
      isConcluded,
    };
  }, [scheduleData]);

  if (!stats) return null;

  const { total, completed, percentage, nextRace } = stats;

  return (
    <div className="telemetry-progress-line" aria-label="Championship season progress">
      {/* Left: Round 12 / 23 */}
      <div className="telemetry-left">
        <span className="telemetry-round-tag">ROUND</span>
        <span className="telemetry-round-val">
          <strong>{completed}</strong> / {total}
        </span>
      </div>

      {/* Center: ─────| 53% |───── */}
      <div className="telemetry-center-track-wrap">
        <div className="telemetry-track-line">
          <div
            className="telemetry-fill-bar"
            style={{ width: `${Math.max(percentage, total > 0 ? (completed / total) * 100 : 0)}%` }}
          />

          <div className="telemetry-ticks-layer">
            {scheduleData.map((r, i) => {
              const isPassed = Boolean(r.winner);
              const isNext = nextRace && nextRace.round === r.round;
              return (
                <button
                  key={r.round || i}
                  type="button"
                  className={`telemetry-tick ${isPassed ? 'is-passed' : ''} ${isNext ? 'is-next' : ''}`}
                  style={{ left: `${((i + 0.5) / total) * 100}%` }}
                  onMouseEnter={() => setHoveredRound(r)}
                  onMouseLeave={() => setHoveredRound(null)}
                  title={`Rnd ${r.round}: ${r.raceName} ${r.winner ? `(Winner: ${r.winner.driver})` : '(Upcoming)'}`}
                />
              );
            })}
          </div>

          <div
            className="telemetry-pct-badge"
            style={{
              left: `${percentage}%`,
              transform: `translate(-${percentage}%, -50%)`,
            }}
          >
            <span className="pct-bracket">[</span>
            <span className="pct-number">{percentage}%</span>
            <span className="pct-bracket">]</span>
          </div>
        </div>

        {hoveredRound && (
          <div className="telemetry-tooltip">
            <span className="tooltip-round">RND {hoveredRound.round}</span>
            <span className="tooltip-name">{hoveredRound.raceName}</span>
            {hoveredRound.winner ? (
              <span className="tooltip-winner">🏆 {hoveredRound.winner.driver}</span>
            ) : (
              <span className="tooltip-upcoming">📅 {hoveredRound.date}</span>
            )}
          </div>
        )}
      </div>

      {/* Right: Upcoming : Italian Grand Prix */}
      <div className="telemetry-right">
        {nextRace ? (
          <div className="telemetry-upcoming-block">
            <span className="telemetry-upcoming-tag">UPCOMING:</span>
            <span className="telemetry-upcoming-name" title={`${nextRace.raceName} (${nextRace.date})`}>
              {nextRace.raceName}
            </span>
          </div>
        ) : (
          <div className="telemetry-concluded-block">
            <span className="telemetry-concluded-tag">🏁 SEASON COMPLETE</span>
          </div>
        )}
      </div>
    </div>
  );
}
