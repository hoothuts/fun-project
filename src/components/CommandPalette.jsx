import { useState, useEffect, useMemo, useRef } from 'react';
import { circuitMap } from '../circuitMaps.js';
import { circuitBios } from '../circuitBios.js';
import { allDrivers, allConstructors } from '../f1SearchIndex.js';

// Modern & prominent icons given search priority
const PRIORITY_DRIVERS = new Set([
  'max_verstappen', 'hamilton', 'norris', 'leclerc', 'piastri', 'russell',
  'alonso', 'sainz', 'perez', 'gasly', 'ocon', 'albon', 'tsunoda', 'stroll',
  'hulkenberg', 'bottas', 'zhou', 'magnussen', 'ricciardo', 'lawson',
  'colapinto', 'bearman', 'antonelli', 'doohan', 'bortoleto', 'vettel',
  'michael_schumacher', 'senna', 'prost', 'lauda', 'mansell', 'raikkonen',
  'hakkinen', 'stewart', 'clark', 'fangio', 'hunt', 'fittipaldi', 'piquet',
  'villeneuve', 'hill', 'button', 'rosberg', 'webber', 'massa'
]);

const PRIORITY_TEAMS = new Set([
  'red_bull', 'ferrari', 'mclaren', 'mercedes', 'aston_martin', 'alpine',
  'williams', 'rb', 'sauber', 'haas', 'lotus_f1', 'tyrrell', 'brabham',
  'benetton', 'renault', 'brawn', 'toro_rosso', 'force_india', 'jordan',
  'alfa', 'alphatauri', 'racing_point'
]);

// Comprehensive indexed database of ALL 78 circuits, 881 drivers, 214 teams & navigation views
const SEARCH_DATABASE = [
  // ── NAVIGATION & ERAS ──
  { type: 'view', category: 'NAVIGATION', id: 'view-teams', title: 'The Grid (Constructors Championship)', subtitle: 'Current and historic constructor standings', hash: 'teams', badge: 'VIEW', priority: 20 },
  { type: 'view', category: 'NAVIGATION', id: 'view-drivers', title: 'World Drivers Championship', subtitle: 'Driver points, rankings and era standings', hash: 'drivers', badge: 'VIEW', priority: 20 },
  { type: 'view', category: 'NAVIGATION', id: 'view-schedule', title: 'Grand Prix Calendar', subtitle: 'Championship calendar, dates, and race winners', hash: 'schedule', badge: 'VIEW', priority: 20 },
  { type: 'view', category: 'NAVIGATION', id: 'view-tracks', title: 'All 78 Circuits Archive', subtitle: 'Interactive 3D telemetry for every F1 track', hash: 'tracks', badge: 'VIEW', priority: 20 },

  // ── ALL 78 CIRCUITS ──
  ...Object.keys(circuitMap).map((id) => {
    const bio = circuitBios[id];
    const name = bio?.name || id
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      type: 'circuit',
      category: 'TRACKS',
      id,
      title: name,
      subtitle: bio ? `${bio.type} · ${bio.length || ''} · ${bio.turns || ''} Turns` : 'Historical Circuit',
      hash: `circuit/${id}`,
      badge: 'TRACK',
      priority: 15,
    };
  }),

  // ── ALL 881 DRIVERS (1950–Present) ──
  ...allDrivers.map((d) => {
    const isPriority = PRIORITY_DRIVERS.has(d.id);
    return {
      type: 'driver',
      category: 'DRIVERS',
      id: d.id,
      title: d.name,
      subtitle: `${d.nat} ${d.code ? `· #${d.code}` : ''} · Formula 1 Driver`,
      hash: `driver/${d.id}`,
      badge: isPriority ? 'DRIVER' : 'HISTORIC',
      priority: isPriority ? 12 : 1,
    };
  }),

  // ── ALL 214 CONSTRUCTORS (1950–Present) ──
  ...allConstructors.map((c) => {
    const isPriority = PRIORITY_TEAMS.has(c.id);
    return {
      type: 'team',
      category: 'TEAMS',
      id: c.id,
      title: c.name,
      subtitle: `${c.nat} Constructor`,
      hash: `team/${c.id}`,
      badge: isPriority ? 'TEAM' : 'HISTORIC',
      priority: isPriority ? 12 : 1,
    };
  }),
];

export default function CommandPalette({ isOpen, onClose, onNavigate }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setCategoryFilter('ALL');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter items
  const filtered = useMemo(() => {
    let items = SEARCH_DATABASE;
    if (categoryFilter !== 'ALL') {
      items = items.filter((item) => item.category === categoryFilter);
    }

    if (!query.trim()) {
      return items.filter((item) => (item.priority || 0) >= 12).slice(0, 20);
    }

    const q = query.toLowerCase().trim();
    return items
      .filter((item) => {
        return (
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const aStarts = a.title.toLowerCase().startsWith(q);
        const bStarts = b.title.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return (b.priority || 0) - (a.priority || 0);
      })
      .slice(0, 35);
  }, [query, categoryFilter]);

  // Handle keyboard navigation (Arrow Up, Down, Enter, Esc)
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < filtered.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filtered[selectedIndex];
      if (item) {
        onNavigate(item.hash);
        onClose();
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector('.cmd-item.is-selected');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="cmd-backdrop" onClick={onClose}>
      <div
        className="cmd-dialog"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header Search Bar */}
        <div className="cmd-search-bar">
          <span className="cmd-search-icon">⌕</span>
          <input
            ref={inputRef}
            type="text"
            className="cmd-input"
            placeholder="Search 881 drivers, 214 teams, 78 tracks, views… (↑↓ to select)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          {query && (
            <button
              type="button"
              className="cmd-clear-btn"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
            >
              ✕
            </button>
          )}
          <span className="cmd-kbd-badge">ESC</span>
        </div>

        {/* Category Filter Pills */}
        <div className="cmd-filters">
          {['ALL', 'TRACKS', 'DRIVERS', 'TEAMS', 'NAVIGATION'].map((cat) => (
            <button
              key={cat}
              type="button"
              className={`cmd-filter-pill ${categoryFilter === cat ? 'active' : ''}`}
              onClick={() => {
                setCategoryFilter(cat);
                setSelectedIndex(0);
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="cmd-list" ref={listRef}>
          {filtered.length === 0 ? (
            <div className="cmd-empty">No results found for &ldquo;{query}&rdquo;</div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={`${item.type}-${item.id}`}
                className={`cmd-item ${selectedIndex === idx ? 'is-selected' : ''}`}
                onClick={() => {
                  onNavigate(item.hash);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className="cmd-item-main">
                  <span className="cmd-item-title">{item.title}</span>
                  <span className="cmd-item-subtitle">{item.subtitle}</span>
                </div>
                <span className={`cmd-type-badge ${item.type}`}>{item.badge}</span>
              </div>
            ))
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="cmd-footer">
          <span className="cmd-hint">
            <kbd>↑</kbd> <kbd>↓</kbd> navigate
          </span>
          <span className="cmd-hint">
            <kbd>↵</kbd> select
          </span>
          <span className="cmd-hint">
            <kbd>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
