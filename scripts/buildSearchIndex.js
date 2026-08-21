import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchWithRetry(url) {
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === 3) throw e;
      await new Promise((r) => setTimeout(r, 800));
    }
  }
}

async function main() {
  console.log('Fetching all F1 drivers from Ergast...');
  const drivers = [];
  for (let offset = 0; offset < 1000; offset += 100) {
    const data = await fetchWithRetry(
      `https://api.jolpi.ca/ergast/f1/drivers.json?limit=100&offset=${offset}`
    );
    const list = data.MRData?.DriverTable?.Drivers || [];
    drivers.push(...list);
    console.log(`  Fetched ${drivers.length} drivers...`);
    if (list.length < 100) break;
  }

  console.log('Fetching all F1 constructors from Ergast...');
  const constructors = [];
  for (let offset = 0; offset < 400; offset += 100) {
    const data = await fetchWithRetry(
      `https://api.jolpi.ca/ergast/f1/constructors.json?limit=100&offset=${offset}`
    );
    const list = data.MRData?.ConstructorTable?.Constructors || [];
    constructors.push(...list);
    console.log(`  Fetched ${constructors.length} constructors...`);
    if (list.length < 100) break;
  }

  // Format drivers into compact objects: [id, name, nationality, code/num]
  const compactDrivers = drivers.map((d) => ({
    id: d.driverId,
    name: `${d.givenName} ${d.familyName}`,
    nat: d.nationality,
    code: d.code || d.permanentNumber || '',
  }));

  // Format constructors into compact objects: [id, name, nationality]
  const compactConstructors = constructors.map((c) => ({
    id: c.constructorId,
    name: c.name,
    nat: c.nationality,
  }));

  const outPath = path.resolve(__dirname, '../src/f1SearchIndex.js');
  const fileContent = `// Auto-generated full database of all 881 F1 Drivers & 214 Constructors (1950–Present)
export const allDrivers = ${JSON.stringify(compactDrivers, null, 2)};

export const allConstructors = ${JSON.stringify(compactConstructors, null, 2)};
`;

  fs.writeFileSync(outPath, fileContent, 'utf-8');
  console.log(`Successfully generated ${outPath}!`);
  console.log(`Indexed ${compactDrivers.length} drivers and ${compactConstructors.length} constructors.`);
}

main().catch(console.error);
