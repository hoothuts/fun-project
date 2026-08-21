# F1 Grid Archive

Fun project: Formula 1 website showing team standings, team drivers, team history, and every F1 circuit past and present.

- Repo: this directory (AnimeJS)
- API: Ergast mirror at `https://api.jolpi.ca/ergast/f1` (wrapped in `src/api.js` — never hit the base URL directly, use the wrappers)
- Stack: React 19 + Vite + animejs v4 (motion)

## Session state (2026-08-20)

### Full Website Functionality Completed ✅
1. **API Layer (`src/api.js`)**:
   - In-memory cache map + 429 exponential backoff retry loop.
   - Fixed `getTeamHistory(teamId)`: queries active seasons and fetches standings in parallel batches, resolving the Jolpi 400 error.
   - Added `getDriverStandings(season = 'current')` and `getDriverDetail(driverId)` (fetches all active career seasons for true career points, podiums, and pulls the driver's latest active season races, e.g. Vettel 2022 Aston Martin).
   - Added `getSchedule(season = 'current')` (merges full calendar with race winners).
   - Optimized `getCircuitHistory(circuitId)` using fast `results/1.json` + `fastest/1/results.json` queries.
2. **Navigation & Hash Router (`src/App.jsx`)**:
   - 4 main navigation tabs: **Teams**, **Drivers**, **Schedule**, **Tracks**.
   - URL hash routing: `#teams`, `#drivers`, `#schedule`, `#tracks`, `#team/:id`, `#driver/:id`, `#circuit/:id`.
   - Full browser back/forward and deep linking support.
3. **Views & Components**:
   - **Teams / Grid (`Grid.jsx`)**: Constructor championship grid with historical Era & Season selector (`EraSeasonSelector.jsx`) covering Ground Effect, Turbo-Hybrid, V8, V10, and Classic eras + starting lights.
   - **Drivers Championship (`Drivers.jsx`)**: World Championship standings cards with team accents, rank, driver number, name, points, wins, and era selector.
   - **Driver Detail (`DriverDetail.jsx`)**: Bio, total GPs, career wins, podiums, points, best finish, and broadcast-styled recent race results log (P1 Gold / P2 Silver / P3 Bronze / Points finishes).
   - **Schedule / Calendar (`Calendar.jsx`)**: Full championship rounds, circuit links, race dates, completed winners with era selector, and upcoming badges.
   - **Team Detail (`TeamDetail.jsx`)**: Constructor info, clickable driver garage cards, and animated season-by-season points history bars.
   - **Tracks (`Tracks.jsx`) & Circuit Detail (`CircuitDetail.jsx`)**: Search/filter circuits, 3D rotatable circular HUD radar dial in Red (`var(--red)` / `#e10600`) with 360° user drag rotation, dot-matrix grid, compass cardinals (N/E/S/W), dual-layer track tracing, live capsule car lap, broadcast fastest-lap purple badges (`#b138dd`), and interactive historical era layout switcher pills.
   - **Visual Identity System (`IdentityBackdrop.jsx`)**: Lightweight 0KB bespoke telemetry/watermark backdrops for teams (aero speedlines + chassis watermark), drivers (giant number watermark + RPM tachometer arc), and circuits (GPS coordinate stamp + sector timing indicators).
   - **Era & Season Selector (`EraSeasonSelector.jsx`)**: Unified tactile era navigation across Ground Effect (2022–2026), Turbo-Hybrid (2014–2021), V8 Era (2006–2013), V10 Era (1995–2005), and Classic eras.
4. **Team Colors (`src/teamColors.js`)**:
   - Expanded map covering modern and historic F1 constructors.
5. **Build & Lint**:
   - Clean production build (`npm run build`).
   - 0 errors on `npm run lint`.

### Circuit maps — `public/circuit/` (singular), 160 files
- **100% Pure Standardized Vector SVGs (160 files)** sourced from `julesr0y/f1-circuits-svg` (CC-BY-4.0).
- **0 PNG fallbacks**: All 78 historical and modern circuits (including Charade, Monsanto, Pedralbes, Reims-Gueux) now render as animated vector paths.
- **Interactive Historical Configurations**: Circuits with multiple historical eras (e.g. Silverstone, Monza, Spa, Monaco, Zandvoort) now feature interactive TRACK LAYOUTS selector pills (e.g. `1950–1954`, `2010–2026`) in `CircuitDetail.jsx`.
- **Clean continuous paths**: Standardized 500×500 coordinate space, single continuous `<path>` elements parsed seamlessly by `TrackCircuit.jsx` and anime.js `createMotionPath` & `createDrawable`.

### Design system (src/index.css)
Dark carbon timing-screen look. Tokens: `--carbon #0d0f12`, `--panel #15181e`, `--line #242a33`, `--ink #eef0f3`, `--muted #767e8c`, `--red #e10600`, `--purple #b138dd`, `--gold #ffd700`, `--silver #d1d5db`, `--bronze #cd7f32`. Fonts Anton/Archivo/JetBrains Mono. Kerb-stripe motif; `prefers-reduced-motion` guarded.

### animejs v4 facts (verified in node_modules)
- `createMotionPath(path, offset)` → `{translateX, translateY, rotate}`; `createDrawable(el)` + `animate(drawable, { draw: ['0 0','0 1'] })`
- `splitText` chars get class `char`; `scrambleText({ chars: 'numbers', duration })` as `textContent:` value
- Per-target fn values may return `[from, to]` arrays (e.g. `width: (el,i) => [0, widths[i]]`)
- anime does NOT set `transform-box` — SVG car shapes must be drawn around local (0,0) so `rotate` pivots correctly

