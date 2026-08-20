import { useState } from 'react';
import Grid from './components/Grid.jsx';
import Tracks from './components/Tracks.jsx';
import TeamDetail from './components/TeamDetail.jsx';
import CircuitDetail from './components/CircuitDetail.jsx';

export default function App() {
  const [view, setView] = useState('grid');
  const [team, setTeam] = useState(null);
  const [circuit, setCircuit] = useState(null);

  const toHome = () => {
    setTeam(null);
    setCircuit(null);
    setView('grid');
  };

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={toHome}>
          <span className="brand-mark">F1</span>
          <span className="brand-name">GRID ARCHIVE</span>
        </button>
        <nav className="tabs">
          <button
            className={`tab ${!team && !circuit && view === 'grid' ? 'active' : ''}`}
            onClick={toHome}
          >
            Teams
          </button>
          <button
            className={`tab ${view === 'tracks' && !circuit ? 'active' : ''}`}
            onClick={() => {
              setTeam(null);
              setCircuit(null);
              setView('tracks');
            }}
          >
            Tracks
          </button>
        </nav>
      </header>
      <main className="content">
        {circuit ? (
          <CircuitDetail circuit={circuit} onBack={() => setCircuit(null)} />
        ) : team ? (
          <TeamDetail team={team} onBack={toHome} />
        ) : view === 'grid' ? (
          <Grid onOpenTeam={setTeam} />
        ) : (
          <Tracks onOpenCircuit={setCircuit} />
        )}
      </main>
    </div>
  );
}