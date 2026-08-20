# F1 Grid Archive

Formula 1 archive site: constructor standings, team driver lineups, team history, and every circuit that has ever hosted a Grand Prix.

- React 19 + Vite + animejs v4
- Data: Ergast mirror at `https://api.jolpi.ca/ergast/f1` (always through `src/api.js`)
- Design: dark carbon timing-screen (see `src/index.css` tokens)

## Circuits

`public/circuit/` holds 45 track maps (Wikipedia file titles, raw originals, corner labels kept). `TrackCircuit.jsx` fetches an SVG, injects it, and animates the `id="track"` path — a draw-on with a lapping car. PNGs (no SVG exists on Wikimedia) render as static images. If a map fails to load or has no single closed `#track` path, the abstract path fallback renders.

Untagged / image-only maps: Monsanto, Pedralbes, Charade, Reims-Gueux (PNG); Bremgarten, Sarthe, Phoenix, Donington (SVGs without a single `#track` path — segmented or traced-bitmap files).

### Attribution

Circuit maps are from **Wikimedia Commons**, licensed under CC BY-SA (various versions), by their respective authors. Files retain their original Wikimedia titles; see each file's Commons page for credits. Tagging pass: `scripts/tag-tracks.ps1`, `scripts/analyze-tracks.ps1` (internal tooling).
