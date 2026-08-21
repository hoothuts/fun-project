import fs from 'node:fs';
import path from 'node:path';

async function sync() {
  console.log('Fetching circuits.json from julesr0y/f1-circuits-svg...');
  const res = await fetch('https://raw.githubusercontent.com/julesr0y/f1-circuits-svg/main/circuits.json');
  const circuits = await res.json();
  
  const allLayouts = [];
  for (const c of circuits) {
    for (const l of c.layouts) {
      allLayouts.push({
        circuitId: c.id,
        layoutId: l.layoutId,
        seasons: l.seasons,
        orientation: l['f1-orientation'] ?? null,
      });
    }
  }

  console.log(`Found ${circuits.length} circuits with ${allLayouts.length} total layouts.`);

  const outDir = path.resolve('public/circuit');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  let downloaded = 0;
  let failed = [];

  const batchSize = 10;
  for (let i = 0; i < allLayouts.length; i += batchSize) {
    const batch = allLayouts.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async ({ layoutId }) => {
        const url = `https://raw.githubusercontent.com/julesr0y/f1-circuits-svg/main/circuits/minimal/white/${layoutId}.svg`;
        try {
          const r = await fetch(url);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const text = await r.text();
          fs.writeFileSync(path.join(outDir, `${layoutId}.svg`), text, 'utf8');
          downloaded++;
        } catch (err) {
          failed.push({ layoutId, error: err.message });
        }
      })
    );
  }

  console.log(`Sync complete: ${downloaded} SVGs downloaded, ${failed.length} failed.`);
  if (failed.length > 0) {
    console.error('Failed layouts:', failed);
  }
}

sync().catch(console.error);
