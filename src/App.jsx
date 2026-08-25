import { useEffect, useState, useCallback } from 'react';
import Grid from './components/Grid.jsx';
import Drivers from './components/Drivers.jsx';
import Calendar from './components/Calendar.jsx';
import Tracks from './components/Tracks.jsx';
import CompareView from './components/CompareView.jsx';
import TeamDetail from './components/TeamDetail.jsx';
import DriverDetail from './components/DriverDetail.jsx';
import CircuitDetail from './components/CircuitDetail.jsx';
import RaceDetail from './components/RaceDetail.jsx';
import GarageShowroom from './components/GarageShowroom.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import SpeedlineCanvas from './components/SpeedlineCanvas.jsx';
import { getCircuits } from './api.js';

import ErrorBoundary from './components/ErrorBoundary.jsx';

export default function App() {
  const [route, setRoute] = useState({ view: 'teams', id: null });
  const [circuitsCache, setCircuitsCache] = useState(null);
  const [isCmdOpen, setIsCmdOpen] = useState(false);

  useEffect(() => {
    getCircuits().then(setCircuitsCache).catch(() => {});
  }, []);

  // Global keyboard shortcut for Command Palette (Cmd+K / Ctrl+K / /)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCmdOpen((prev) => !prev);
      } else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        setIsCmdOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const parseHash = useCallback(() => {
    const hash = window.location.hash.replace(/^#\/?/, '') || 'teams';
    const parts = hash.split('/');
    const path = parts[0];

    if (path === 'race' && parts[1] && parts[2]) {
      setRoute({ view: 'race', season: parts[1], round: parts[2] });
    } else if (path === 'team' && parts[1]) {
      setRoute({ view: 'team', id: parts[1] });
    } else if (path === 'driver' && parts[1]) {
      setRoute({ view: 'driver', id: parts[1] });
    } else if (path === 'circuit' && parts[1]) {
      setRoute({ view: 'circuit', id: parts[1] });
    } else if (path === 'compare' || path === 'vs') {
      setRoute({
        view: 'compare',
        d1: parts[1] || 'max_verstappen',
        d2: parts[2] || (parts[1] === 'norris' ? 'max_verstappen' : 'norris'),
      });
    } else if (path === 'drivers') {
      setRoute({ view: 'drivers', id: null });
    } else if (path === 'schedule' || path === 'calendar') {
      setRoute({ view: 'schedule', id: null });
    } else if (path === 'tracks' || path === 'circuits') {
      setRoute({ view: 'tracks', id: null });
    } else if (path === 'garage' || path === 'showroom' || path === '3d') {
      setRoute({ view: 'garage', id: null });
    } else {
      setRoute({ view: 'teams', id: null });
    }
  }, []);

  useEffect(() => {
    parseHash();
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  }, [parseHash]);

  const navigate = (newHash) => {
    window.location.hash = newHash;
  };

  const handleOpenRace = (season, round) => {
    navigate(`race/${season}/${round}`);
  };

  const handleOpenTeam = (teamId) => {
    navigate(`team/${teamId}`);
  };

  const handleOpenDriver = (driverId) => {
    navigate(`driver/${driverId}`);
  };

  const handleOpenCircuit = (circuit) => {
    const cid = typeof circuit === 'string' ? circuit : circuit.circuitId;
    navigate(`circuit/${cid}`);
  };

  const handleOpenCompare = (d1Id) => {
    const defaultRival = d1Id === 'norris' ? 'max_verstappen' : 'norris';
    navigate(`compare/${d1Id}/${defaultRival}`);
  };

  const handleBack = (fallback) => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate(fallback);
    }
  };

  // Find circuit details from cache or build fallback object
  const activeCircuit =
    route.view === 'circuit' && route.id
      ? circuitsCache?.find((c) => c.circuitId === route.id) || {
          circuitId: route.id,
          circuitName: route.id.replace(/_/g, ' ').toUpperCase(),
          Location: { locality: 'Circuit', country: '' },
        }
      : null;

  return (
    <div className="app">
      <SpeedlineCanvas />

      <header className="topbar">
        <button className="brand" onClick={() => navigate('teams')}>
          <span className="brand-name">GRID ARCHIVE</span>
        </button>

        <div className="topbar-center">
          <button
            type="button"
            className="cmd-trigger-btn"
            onClick={() => setIsCmdOpen(true)}
            title="Search tracks, drivers, teams (⌘K)"
          >
            <span className="cmd-trigger-icon">⌕</span>
            <span className="cmd-trigger-text">Search F1 Archive…</span>
            <span className="cmd-trigger-kbd">⌘K</span>
          </button>
        </div>

        <nav className="tabs">
          <button
            className={`tab ${route.view === 'teams' ? 'active' : ''}`}
            onClick={() => navigate('teams')}
          >
            Teams
          </button>
          <button
            className={`tab ${route.view === 'drivers' ? 'active' : ''}`}
            onClick={() => navigate('drivers')}
          >
            Drivers
          </button>
          <button
            className={`tab ${route.view === 'schedule' || route.view === 'race' ? 'active' : ''}`}
            onClick={() => navigate('schedule')}
          >
            Schedule
          </button>
          <button
            className={`tab ${route.view === 'tracks' ? 'active' : ''}`}
            onClick={() => navigate('tracks')}
          >
            Tracks
          </button>
          <button
            className={`tab ${route.view === 'compare' ? 'active' : ''}`}
            onClick={() => navigate('compare')}
          >
            Compare
          </button>
          <button
            className={`tab ${route.view === 'garage' ? 'active' : ''}`}
            onClick={() => navigate('garage')}
          >
            Garage ✦
          </button>
        </nav>
      </header>

      <CommandPalette
        isOpen={isCmdOpen}
        onClose={() => setIsCmdOpen(false)}
        onNavigate={navigate}
      />

      <main className="content">
        <ErrorBoundary>
          {route.view === 'race' && (
            <RaceDetail
              season={route.season}
              round={route.round}
              onBack={() => handleBack('schedule')}
              onOpenDriver={handleOpenDriver}
              onOpenTeam={handleOpenTeam}
              onOpenCircuit={handleOpenCircuit}
            />
          )}

          {route.view === 'team' && (
            <TeamDetail
              team={route.id}
              onBack={() => handleBack('teams')}
              onOpenDriver={handleOpenDriver}
            />
          )}

          {route.view === 'driver' && (
            <DriverDetail
              driverId={route.id}
              onBack={() => handleBack('drivers')}
              onOpenTeam={handleOpenTeam}
              onOpenCompare={handleOpenCompare}
            />
          )}

          {route.view === 'circuit' && activeCircuit && (
            <CircuitDetail
              circuit={activeCircuit}
              onBack={() => handleBack('tracks')}
              onOpenDriver={handleOpenDriver}
              onOpenTeam={handleOpenTeam}
            />
          )}

          {route.view === 'compare' && (
            <CompareView
              d1={route.d1}
              d2={route.d2}
              onOpenDriver={handleOpenDriver}
              onOpenTeam={handleOpenTeam}
            />
          )}

          {route.view === 'garage' && (
            <GarageShowroom />
          )}

          {route.view === 'teams' && (
            <Grid onOpenTeam={handleOpenTeam} />
          )}

          {route.view === 'drivers' && (
            <Drivers
              onOpenDriver={handleOpenDriver}
              onOpenTeam={handleOpenTeam}
            />
          )}

          {route.view === 'schedule' && (
            <Calendar
              onOpenRace={handleOpenRace}
              onOpenCircuit={handleOpenCircuit}
              onOpenDriver={handleOpenDriver}
              onOpenTeam={handleOpenTeam}
            />
          )}

          {route.view === 'tracks' && (
            <Tracks onOpenCircuit={handleOpenCircuit} />
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}