import { useState, useEffect, useMemo } from 'react';
import { getDriverDetail } from '../api.js';
import { allDrivers } from '../f1SearchIndex.js';
import { teamColor } from '../teamColors.js';
import useAnime from '../useAnime.js';
import BootTitle from './BootTitle.jsx';
import IdentityBackdrop from './IdentityBackdrop.jsx';

const ICONIC_RIVALRIES = [
  { label: 'Verstappen vs Norris', d1: 'max_verstappen', d2: 'norris', era: 'Ground Effect' },
  { label: 'Hamilton vs Verstappen', d1: 'hamilton', d2: 'max_verstappen', era: '2021 Clash' },
  { label: 'Senna vs Prost', d1: 'senna', d2: 'prost', era: 'Turbo Era' },
  { label: 'Schumacher vs Alonso', d1: 'michael_schumacher', d2: 'alonso', era: 'V10 Era' },
  { label: 'Leclerc vs Sainz', d1: 'leclerc', d2: 'sainz', era: 'Scuderia Duel' },
  { label: 'Vettel vs Alonso', d1: 'vettel', d2: 'alonso', era: 'V8 Era' },
  { label: 'Vettel vs Webber', d1: 'vettel', d2: 'webber', era: 'Multi-21' },
  { label: 'Hunt vs Lauda', d1: 'hunt', d2: 'lauda', era: '1976 Classic' },
  { label: 'Mansell vs Piquet', d1: 'mansell', d2: 'piquet', era: 'Williams War' },
];

export default function CompareView({
  d1: initialD1 = 'max_verstappen',
  d2: initialD2 = 'norris',
  onOpenDriver,
  onOpenTeam,
}) {
  const [d1Id, setD1Id] = useState(initialD1);
  const [d2Id, setD2Id] = useState(initialD2);

  const [d1Data, setD1Data] = useState(null);
  const [d2Data, setD2Data] = useState(null);
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);

  const [query1, setQuery1] = useState('');
  const [query2, setQuery2] = useState('');
  const [isSearching1, setIsSearching1] = useState(false);
  const [isSearching2, setIsSearching2] = useState(false);

  useEffect(() => {
    if (initialD1) setD1Id(initialD1);
  }, [initialD1]);

  useEffect(() => {
    if (initialD2) setD2Id(initialD2);
  }, [initialD2]);

  // Sync hash route when drivers change
  const selectDrivers = (newD1, newD2) => {
    setD1Id(newD1);
    setD2Id(newD2);
    window.location.hash = `compare/${newD1}/${newD2}`;
  };

  // Load Driver 1
  useEffect(() => {
    if (!d1Id) return;
    let active = true;
    setLoading1(true);
    setD1Data(null);
    getDriverDetail(d1Id)
      .then((res) => {
        if (active) {
          setD1Data(res);
          setLoading1(false);
        }
      })
      .catch((err) => {
        console.error(`Failed to load driver 1 (${d1Id}):`, err);
        if (active) setLoading1(false);
      });
    return () => {
      active = false;
    };
  }, [d1Id]);

  // Load Driver 2
  useEffect(() => {
    if (!d2Id) return;
    let active = true;
    setLoading2(true);
    setD2Data(null);
    getDriverDetail(d2Id)
      .then((res) => {
        if (active) {
          setD2Data(res);
          setLoading2(false);
        }
      })
      .catch((err) => {
        console.error(`Failed to load driver 2 (${d2Id}):`, err);
        if (active) setLoading2(false);
      });
    return () => {
      active = false;
    };
  }, [d2Id]);

  const listRef = useAnime(
    {
      targets: '.arena-stat-row',
      opacity: [0, 1],
      y: [12, 0],
      delay: (el, i) => i * 30,
      ease: 'outCubic',
      duration: 350,
    },
    [d1Data, d2Data]
  );

  const filtered1 = useMemo(() => {
    if (!query1.trim()) return [];
    const q = query1.toLowerCase();
    return allDrivers.filter((d) => d.id !== d2Id && d.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query1, d2Id]);

  const filtered2 = useMemo(() => {
    if (!query2.trim()) return [];
    const q = query2.toLowerCase();
    return allDrivers.filter((d) => d.id !== d1Id && d.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query2, d1Id]);

  const handleSwap = () => {
    selectDrivers(d2Id, d1Id);
  };

  const dr1 = d1Data?.driver;
  const dr2 = d2Data?.driver;

  const d1Color = teamColor(d1Data?.recentResults?.[0]?.constructorId) || 'var(--red)';
  const d2Color = teamColor(d2Data?.recentResults?.[0]?.constructorId) || 'var(--purple)';

  // Comparison metrics
  const d1Wins = d1Data?.totalWins || 0;
  const d2Wins = d2Data?.totalWins || 0;

  const d1Races = d1Data?.totalRaces || 0;
  const d2Races = d2Data?.totalRaces || 0;

  const d1Podiums = d1Data?.podiums || 0;
  const d2Podiums = d2Data?.podiums || 0;

  const d1Points = d1Data?.points || 0;
  const d2Points = d2Data?.points || 0;

  const d1WinRate = d1Races > 0 ? ((d1Wins / d1Races) * 100).toFixed(1) : '0.0';
  const d2WinRate = d2Races > 0 ? ((d2Wins / d2Races) * 100).toFixed(1) : '0.0';

  const d1PodiumRate = d1Races > 0 ? ((d1Podiums / d1Races) * 100).toFixed(1) : '0.0';
  const d2PodiumRate = d2Races > 0 ? ((d2Podiums / d2Races) * 100).toFixed(1) : '0.0';

  const stats = [
    { label: 'CAREER WINS', v1: d1Wins, v2: d2Wins, max: Math.max(d1Wins, d2Wins, 1) },
    { label: 'WIN RATE %', v1: parseFloat(d1WinRate), v2: parseFloat(d2WinRate), format: (v) => `${v}%`, max: Math.max(parseFloat(d1WinRate), parseFloat(d2WinRate), 1) },
    { label: 'PODIUM FINISHES', v1: d1Podiums, v2: d2Podiums, max: Math.max(d1Podiums, d2Podiums, 1) },
    { label: 'PODIUM RATE %', v1: parseFloat(d1PodiumRate), v2: parseFloat(d2PodiumRate), format: (v) => `${v}%`, max: Math.max(parseFloat(d1PodiumRate), parseFloat(d2PodiumRate), 1) },
    { label: 'CAREER POINTS', v1: d1Points, v2: d2Points, max: Math.max(d1Points, d2Points, 1) },
    { label: 'GRAND PRIX ENTRIES', v1: d1Races, v2: d2Races, max: Math.max(d1Races, d2Races, 1) },
    { label: 'BEST CAREER FINISH', v1: d1Data?.bestFinish || '—', v2: d2Data?.bestFinish || '—', isText: true },
  ];

  return (
    <div className="compare-page">
      <IdentityBackdrop type="circuit" />

      <header className="hero">
        <p className="eyebrow">FORMULA 1 TELEMETRY RADAR</p>
        <BootTitle>HEAD-TO-HEAD ARENA</BootTitle>
        <p className="subtitle">
          Compare career statistics, win rates, and championship pedigree between any two drivers in F1 history (1950–Present).
        </p>
      </header>

      {/* Iconic Rivalry Shortcuts */}
      <div className="arena-rivalries-bar">
        <span className="rivalries-title">ICONIC RIVALRIES:</span>
        <div className="rivalries-scroll">
          {ICONIC_RIVALRIES.map((r, idx) => {
            const isCurrent =
              (d1Id === r.d1 && d2Id === r.d2) || (d1Id === r.d2 && d2Id === r.d1);
            return (
              <button
                key={idx}
                type="button"
                className={`rivalry-btn ${isCurrent ? 'active' : ''}`}
                onClick={() => selectDrivers(r.d1, r.d2)}
              >
                <span className="rivalry-name">{r.label}</span>
                <span className="rivalry-era">{r.era}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dual Cockpit Head-to-Head Arena */}
      <div className="arena-cockpit-grid">
        {/* Driver 1 Card */}
        <div className="arena-driver-card card-d1" style={{ '--accent': d1Color }}>
          <div className="arena-search-box">
            <input
              type="text"
              className="arena-search-input"
              placeholder="Search Driver 1…"
              value={query1}
              onFocus={() => setIsSearching1(true)}
              onChange={(e) => {
                setQuery1(e.target.value);
                setIsSearching1(true);
              }}
            />
            {isSearching1 && filtered1.length > 0 && (
              <div className="arena-autocomplete-menu">
                {filtered1.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className="arena-autocomplete-item"
                    onClick={() => {
                      selectDrivers(d.id, d2Id);
                      setQuery1('');
                      setIsSearching1(false);
                    }}
                  >
                    <span>{d.name}</span>
                    <span className="item-sub">{d.nat}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="arena-driver-body">
            <span className="arena-driver-num" style={{ color: d1Color }}>
              {(() => {
                const rawNum = d1Data?.carNumber || dr1?.permanentNumber || d1Data?.recentResults?.[0]?.number;
                return rawNum && /^\d+$/.test(rawNum) ? `#${rawNum}` : dr1?.code || '—';
              })()}
            </span>
            <h2 className="arena-driver-name">
              {loading1 ? 'LOADING…' : dr1 ? (
                <>
                  <span className="name-first">{dr1.givenName} </span>
                  <span className="name-last">{dr1.familyName}</span>
                </>
              ) : 'SELECT DRIVER 1'}
            </h2>
            <div className="arena-driver-sub-row">
              <span className="arena-driver-nat">{dr1?.nationality || 'Driver'}</span>
              {d1Data?.recentResults?.[0]?.constructor && (
                <button
                  type="button"
                  className="arena-team-tag"
                  style={{ '--accent': d1Color }}
                  onClick={() => d1Data.recentResults[0].constructorId && onOpenTeam && onOpenTeam(d1Data.recentResults[0].constructorId)}
                >
                  <span className="team-dot" style={{ background: d1Color }} />
                  {d1Data.recentResults[0].constructor}
                </button>
              )}
            </div>
            {dr1 && onOpenDriver && (
              <button
                type="button"
                className="arena-profile-link"
                onClick={() => onOpenDriver(d1Id)}
              >
                VIEW FULL PROFILE →
              </button>
            )}
          </div>
        </div>

        {/* Center VS & Swap Emblem */}
        <div className="arena-center-emblem">
          <div className="arena-vs-badge">VS</div>
          <button
            type="button"
            className="arena-swap-btn"
            onClick={handleSwap}
            title="Swap Driver 1 and Driver 2"
          >
            ⇄ SWAP
          </button>
        </div>

        {/* Driver 2 Card */}
        <div className="arena-driver-card card-d2" style={{ '--accent': d2Color }}>
          <div className="arena-search-box">
            <input
              type="text"
              className="arena-search-input"
              placeholder="Search Driver 2…"
              value={query2}
              onFocus={() => setIsSearching2(true)}
              onChange={(e) => {
                setQuery2(e.target.value);
                setIsSearching2(true);
              }}
            />
            {isSearching2 && filtered2.length > 0 && (
              <div className="arena-autocomplete-menu">
                {filtered2.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className="arena-autocomplete-item"
                    onClick={() => {
                      selectDrivers(d1Id, d.id);
                      setQuery2('');
                      setIsSearching2(false);
                    }}
                  >
                    <span>{d.name}</span>
                    <span className="item-sub">{d.nat}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="arena-driver-body">
            <span className="arena-driver-num" style={{ color: d2Color }}>
              {(() => {
                const rawNum = d2Data?.carNumber || dr2?.permanentNumber || d2Data?.recentResults?.[0]?.number;
                return rawNum && /^\d+$/.test(rawNum) ? `#${rawNum}` : dr2?.code || '—';
              })()}
            </span>
            <h2 className="arena-driver-name">
              {loading2 ? 'LOADING…' : dr2 ? (
                <>
                  <span className="name-first">{dr2.givenName} </span>
                  <span className="name-last">{dr2.familyName}</span>
                </>
              ) : 'SELECT DRIVER 2'}
            </h2>
            <div className="arena-driver-sub-row">
              <span className="arena-driver-nat">{dr2?.nationality || 'Driver'}</span>
              {d2Data?.recentResults?.[0]?.constructor && (
                <button
                  type="button"
                  className="arena-team-tag"
                  style={{ '--accent': d2Color }}
                  onClick={() => d2Data.recentResults[0].constructorId && onOpenTeam && onOpenTeam(d2Data.recentResults[0].constructorId)}
                >
                  <span className="team-dot" style={{ background: d2Color }} />
                  {d2Data.recentResults[0].constructor}
                </button>
              )}
            </div>
            {dr2 && onOpenDriver && (
              <button
                type="button"
                className="arena-profile-link"
                onClick={() => onOpenDriver(d2Id)}
              >
                VIEW FULL PROFILE →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Comparative Stat Meters */}
      <h2 className="section-title">CAREER TELEMETRY COMPARISON</h2>
      <div className="arena-stats-wrap" ref={listRef}>
        {stats.map((s, idx) => {
          const v1Num = typeof s.v1 === 'number' ? s.v1 : 0;
          const v2Num = typeof s.v2 === 'number' ? s.v2 : 0;
          const isD1Ahead = v1Num > v2Num;
          const isD2Ahead = v2Num > v1Num;

          const d1Pct = s.max ? Math.min(100, (v1Num / s.max) * 100) : 0;
          const d2Pct = s.max ? Math.min(100, (v2Num / s.max) * 100) : 0;

          const formatVal = (v) => (s.format ? s.format(v) : v);

          return (
            <div key={idx} className="arena-stat-row">
              <div className={`arena-val arena-val-left ${isD1Ahead ? 'is-winner' : ''}`}>
                {isD1Ahead && <span className="arena-crown">👑</span>}
                <span>{formatVal(s.v1)}</span>
              </div>

              <div className="arena-stat-center">
                <span className="arena-stat-label">{s.label}</span>
                {!s.isText && (
                  <div className="arena-bars-dual">
                    <div className="arena-bar-track-left">
                      <div
                        className="arena-bar-fill-left"
                        style={{
                          width: `${d1Pct}%`,
                          background: isD1Ahead ? d1Color : 'rgba(255,255,255,0.22)',
                        }}
                      />
                    </div>
                    <div className="arena-bar-track-right">
                      <div
                        className="arena-bar-fill-right"
                        style={{
                          width: `${d2Pct}%`,
                          background: isD2Ahead ? d2Color : 'rgba(255,255,255,0.22)',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className={`arena-val arena-val-right ${isD2Ahead ? 'is-winner' : ''}`}>
                <span>{formatVal(s.v2)}</span>
                {isD2Ahead && <span className="arena-crown">👑</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
