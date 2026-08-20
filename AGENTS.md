# F1 Grid Archive

Fun project: Formula 1 website showing team standings, team drivers, team history, and every F1 circuit past and present.

- Repo: this directory (AnimeJS)
- API: Ergast mirror at `https://api.jolpi.ca/ergast/f1` (wrapped in `src/api.js` — never hit the base URL directly, use the wrappers)
- Stack: React 19 + Vite + animejs v4 (motion)

## Session state (2026-08-19)

### Circuit maps — `public/circuit/` (singular), 46 files
- Naming = Wikipedia file titles, raw originals (keep corner labels). 46 files: 7 user-downloaded + 12 USA + 13 Europe + 6 Spain + 7 France + 1 Japan (Fuji 1965-74 layout, 2026-08-19).
- **All 38 taggable SVGs now carry `id="track"`** (tagged 2026-08-19 via `scripts/tag-tracks.ps1` + per-file review). **Untagged/fallback bucket**: Donington (traced bitmap PNG-in-SVG, 0 paths), Bremgarten / Sarthe / Phoenix (track drawn as separate segment paths — no single loop; would need manual path concatenation to animate). **Re-tags 2026-08-19**: Algarve = F1-sectors file, 3 colored sector paths (#f5ff00/#0ad6ff/#ff0606, sw=3) concatenated into one `id="track"` d (old wrong tag removed); Riverside = pass-1 heuristic tagged a 10×16 runoff-texture squiggle → re-tagged to the `fill:none stroke:#000000 stroke-width:6` loop (325×609).
- **TrackCircuit bbox/viewBox logic**: track viewBox comes from the track path's OWN bbox (path-d parser in `TrackCircuit.jsx`, includes control points — endpoint-only under-measures coarse paths like Riverside), padded by stroke; file width/height attrs are ignored (Adelaide/24 files had no viewBox and off-canvas content). Parser gotcha: `d="([^"]+)"` regexes must use `(?<![\w-])d=` or they match `d="track"` inside `id="track"`; the `default` case must consume stray numbers or `Z`-followed-by-numbers hangs forever.
- ⚠️ **PNG-only circuits** (no SVG exists anywhere on Wikimedia): Monsanto, Pedralbes, Charade, Reims-Gueux — render as `<img>` (TrackCircuit handles `.png`).
- ⚠️ Bahrain file is the **Paddock short layout**, not the GP layout — replace with a GP-layout file when possible.
- Era flags: Long Beach is 1984-86 layout (F1 era 1976-83, no SVG exists); Detroit = F1-era downtown circuit (2008 map); Caesars Palace 1983 Indy layout = same road course as F1 1981-82; Phoenix 1989-90 (F1 ran 1989-91); Watkins Glen 2024 long circuit ≈ F1 era; Jerez 1985-92 (F1 ran 1986-90); Madring (2026) = first GP 2026; Charade 1958-88 map covers F1 era 1965-72 + 1989-90; Dijon 1972 (F1 ran 1974-84); Magny-Cours 1992-2002 (F1 ran 1991-2008); Paul Ricard 2014-18 version (F1 ran 1971-90 + 2018-25).

### Track tagging notes
- The `stroke:#000000` heuristic only matched 7/42 files — real SVGs are a zoo. `scripts/analyze-tracks.ps1` lists per-file path candidates (len, subpaths, bbox, stroke/fill) to pick the track path; `scripts/tag-tracks.ps1` then replaces/inserts `id="track"` (guards against `url(#id)` references).
- PS 5.1 gotchas: no em-dashes in .ps1 (ANSI parse breaks); regex `d="..."` matches inside `id="..."` — use `(?<![-\w])d="([^"]*)"`; never type filenames with `ü/ï` (console mangling) — resolve via `Get-ChildItem | Where Name -like`.

### Download pipeline — `scripts/fetch-circuits.ps1`
- Usage: `powershell -ExecutionPolicy Bypass -File scripts\fetch-circuits.ps1 "SearchName" "More Names"...` — all positional (script uses `ValueFromRemainingArguments`; `-File` won't bind a `-Circuit` flag).
- Method: en.wikipedia.org search API → pick top `.svg` → `https://commons.wikimedia.org/wiki/Special:Redirect/file/File:<title>` with UA header `F1GridArchive/0.2 (personal hobby project)`.
- **Commons throttles by IP per-Varnish-backend — intermittent 429s.** Retry backoff is 15/45/90/180s, 6s pause between files; retries eventually break through (slower files need several attempts). `upload.wikimedia.org` is hard-blocked; webfetch (opencode infra) bypasses the block entirely — fallback for stubborn files.
- Country order = first-appearance order in jolpi circuits list: Australia, Morocco, UK (done) → USA (done) → Sweden, Germany, Bahrain (done) → Baku, Boavista, Estoril, Bremgarten, Monsanto, Portimao (**DONE 2026-08-19**) → Spain: catalunya, jarama, jerez, madring, montjuic, pedralbes, valencia (**DONE 2026-08-19**) → France: charade, dijon, essarts, lemans, magny_cours, reims, ricard (**DONE 2026-08-19**) → **Japan (fuji, okayama, suzuka — NEXT)** → Argentina (galvez), South Africa (george, kyalami), Hungary (hungaroring), Italy (imola, monza, mugello, pescara) → Brazil (interlagos, jacarepagua), Turkey (istanbul), Saudi Arabia (jeddah), Qatar (losail), Singapore (marina_bay), Monaco (monaco) → Canada (mosport, tremblant, villeneuve), Belgium (nivelles, spa, zolder), Austria (red_bull_ring, zeltweg), Mexico (rodriguez), Malaysia (sepang), China (shanghai), Russia (sochi), UAE (yas_marina), Korea (yeongam), Netherlands (zandvoort).
- Search-name tips: Portimao = "Algarve"; Monsanto = "Monsanto" (not "Circuito de Monsanto" — only `Circuit Monsanto.png` exists, no SVG); Madrid = "Madring" (commons search; en-wiki search picks the logo — filter `Madring (2026).svg`); Pedralbes = PNG only; Charade = PNG only (`Circuit Charade 1958 1988.png`); Reims = PNG only (`Circuit Reims-Gueux.png`).

### Remaining pipeline
1. Finish downloads: **Japan (fuji ✅ done, okayama, suzuka — NEXT)** → Argentina → … → Netherlands (~30 files).
2. ✅ **Track tagging done**: all 38 taggable SVGs carry `id="track"` (Adelaide was the last, tagged via inline replace on path4134). Segmented maps (Bremgarten, Sarthe, Phoenix) + Donington stay untagged → abstract fallback / img bucket. Verify visually via dev server: Buddh, Algarve, Miami, Watkins Glen, Riverside, Catalunya, Dijon.
3. ✅ **TrackCircuit rework done (docs-pattern)**: fetch SVG → `DOMParser` → extract only `#track`'s `d` + canvas (viewBox else width/height attrs) → render OWN minimal svg (one red `#track` path, stroke-width = max(w,h)/140) + **HTML div `.car`** (14×7px, `left:-7px top:-3.5px`, docs-exact). Animate via `svg.createMotionPath` + `svg.createDrawable` (namespace imports from `animejs`) — draw-on + car lap at 120 px/s (clamp 4-20s). Abstract `D` path also has `id="track"` → single animation path for fallbacks. PNG → `<img>`; no `#track` / fetch fail / no canvas → abstract fallback; reduced-motion hides `.car`, static track. Raw files never touch the DOM (extraction only).
4. ✅ **Hero = Silverstone** (`Circuit Silverstone 2010 infobox.svg`, eyebrow "SILVERSTONE 1950 — TODAY"). Swap to Monaco later via one constant in `Tracks.jsx`.
5. ✅ README rewritten (blurb + CC BY-SA attribution). Build ✅, lint ✅ (pre-existing warning only), preview smoke test ✅.
6. ✅ **Circuit detail view done 2026-08-19**: `CircuitDetail.jsx` (back to tracks, FIRST GP / GPs / LAST GP / LAP RECORD stats w/ scramble, animated `TrackCircuit`, MOST WINS top-3 drivers+constructors, compact RACE LOG newest-first) + `src/circuitMaps.js` (46 circuitId→file map; `vegas`→Caesars Palace SVG, `las_vegas`→2023 strip; no `caesars_palace` id in jolpi) + `getCircuitHistory` in api.js (paginated results.json, flattens winner + FastestLap rank 1). Track rows are now buttons (no Wikipedia links). UK→United Kingdom normalization in getCircuits. Car lap speed normalized via `getTotalLength()` (120 px/s, clamp 4-20s). Build 254KB (+6KB).

### Design system (src/index.css)
Dark carbon timing-screen look. Tokens: `--carbon #0d0f12`, `--panel #15181e`, `--line #242a33`, `--ink #eef0f3`, `--muted #767e8c`, `--red #e10600`. Fonts Anton/Archivo/JetBrains Mono. Kerb-stripe motif; `prefers-reduced-motion` guarded.

### animejs v4 facts (verified in node_modules)
- `createMotionPath(path, offset)` → `{translateX, translateY, rotate}`; `createDrawable(el)` + `animate(drawable, { draw: ['0 0','0 1'] })`
- `splitText` chars get class `char`; `scrambleText({ chars: 'numbers', duration })` as `textContent:` value
- Per-target fn values may return `[from, to]` arrays (e.g. `width: (el,i) => [0, widths[i]]`)
- anime does NOT set `transform-box` — SVG car shapes must be drawn around local (0,0) so `rotate` pivots correctly
- Lint: one pre-existing warning in `useAnime.js:11` (exhaustive-deps) — leave it; build passes.
