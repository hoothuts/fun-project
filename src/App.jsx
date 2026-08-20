import { useEffect, useState, useCallback } from 'react';
import Grid from './components/Grid.jsx';
import Drivers from './components/Drivers.jsx';
import Calendar from './components/Calendar.jsx';
import Tracks from './components/Tracks.jsx';
import TeamDetail from './components/TeamDetail.jsx';
import DriverDetail from './components/DriverDetail.jsx';
import CircuitDetail from './components/CircuitDetail.jsx';
import { getCircuits } from './api.js';

import ErrorBoundary from './components/ErrorBoundary.jsx';

export default function App() {
  const [route, setRoute] = useState({ view: 'teams', id: null });
  const [circuitsCache, setCircuitsCache] = useState(null);

  useEffect(() => {
    getCircuits().then(setCircuitsCache).catch(() => {});
  }, []);

  const parseHash = useCallback(() => {
    const hash = window.location.hash.replace(/^#\/?/, '') || 'teams';
    const [path, id] = hash.split('/');

    if (path === 'team' && id) {
      setRoute({ view: 'team', id });
    } else if (path === 'driver' && id) {
      setRoute({ view: 'driver', id });
    } else if (path === 'circuit' && id) {
      setRoute({ view: 'circuit', id });
    } else if (path === 'drivers') {
      setRoute({ view: 'drivers', id: null });
    } else if (path === 'schedule' || path === 'calendar') {
      setRoute({ view: 'schedule', id: null });
    } else if (path === 'tracks' || path === 'circuits') {
      setRoute({ view: 'tracks', id: null });
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
      <header className="topbar">
        <button className="brand" onClick={() => navigate('teams')}>
          <span className="brand-mark">F1</span>
          <span className="brand-name">GRID ARCHIVE</span>
        </button>
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
            className={`tab ${route.view === 'schedule' ? 'active' : ''}`}
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
        </nav>
      </header>

      <main className="content">
        <ErrorBoundary>
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