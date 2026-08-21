import fs from 'node:fs';
import path from 'node:path';

const ergastToJules = {
  'adelaide': 'adelaide',
  'ain-diab': 'ain-diab',
  'aintree': 'aintree',
  'albert_park': 'melbourne',
  'americas': 'austin',
  'anderstorp': 'anderstorp',
  'avus': 'avus',
  'bahrain': 'bahrain',
  'baku': 'baku',
  'boavista': 'porto',
  'brands_hatch': 'brands-hatch',
  'bremgarten': 'bremgarten',
  'buddh': 'buddh',
  'catalunya': 'catalunya',
  'charade': 'clermont-ferrand',
  'dallas': 'dallas',
  'detroit': 'detroit',
  'dijon': 'dijon',
  'donington': 'donington',
  'essarts': 'rouen',
  'estoril': 'estoril',
  'fuji': 'fuji',
  'galvez': 'buenos-aires',
  'george': 'east-london',
  'hockenheimring': 'hockenheimring',
  'hungaroring': 'hungaroring',
  'imola': 'imola',
  'indianapolis': 'indianapolis',
  'interlagos': 'interlagos',
  'istanbul': 'istanbul',
  'jacarepagua': 'jacarepagua',
  'jarama': 'jarama',
  'jeddah': 'jeddah',
  'jerez': 'jerez',
  'kyalami': 'kyalami',
  'las_vegas': 'las-vegas',
  'lemans': 'bugatti',
  'long_beach': 'long-beach',
  'losail': 'lusail',
  'madring': 'madring',
  'magny_cours': 'magny-cours',
  'marina_bay': 'marina-bay',
  'miami': 'miami',
  'monaco': 'monaco',
  'monsanto': 'monsanto',
  'montjuic': 'montjuic',
  'monza': 'monza',
  'mosport': 'mosport',
  'mugello': 'mugello',
  'nivelles': 'nivelles',
  'nurburgring': 'nurburgring',
  'okayama': 'aida',
  'pedralbes': 'pedralbes',
  'pescara': 'pescara',
  'phoenix': 'phoenix',
  'portimao': 'portimao',
  'red_bull_ring': 'spielberg',
  'reims': 'reims',
  'ricard': 'paul-ricard',
  'riverside': 'riverside',
  'rodriguez': 'mexico-city',
  'sebring': 'sebring',
  'sepang': 'sepang',
  'shanghai': 'shanghai',
  'silverstone': 'silverstone',
  'sochi': 'sochi',
  'spa': 'spa-francorchamps',
  'suzuka': 'suzuka',
  'tremblant': 'mont-tremblant',
  'valencia': 'valencia',
  'vegas': 'caesars-palace',
  'villeneuve': 'montreal',
  'watkins_glen': 'watkins-glen',
  'yas_marina': 'yas-marina',
  'yeongam': 'yeongam',
  'zandvoort': 'zandvoort',
  'zeltweg': 'zeltweg',
  'zolder': 'zolder',
};

async function build() {
  console.log('Fetching circuits.json...');
  const res = await fetch('https://raw.githubusercontent.com/julesr0y/f1-circuits-svg/main/circuits.json');
  const julesCircuits = await res.json();
  const julesMap = new Map(julesCircuits.map(c => [c.id, c]));

  const circuitMap = {};
  const circuitMeta = {};
  const validFiles = new Set();

  for (const [ergastId, julesId] of Object.entries(ergastToJules)) {
    const jc = julesMap.get(julesId);
    if (!jc) {
      console.error('Missing Jules data for:', ergastId, julesId);
      continue;
    }

    // Sort layouts by latest year in active seasons
    const sorted = [...jc.layouts].sort((a, b) => {
      const maxA = Math.max(...(a.seasons.match(/\d{4}/g) || [0]).map(Number));
      const maxB = Math.max(...(b.seasons.match(/\d{4}/g) || [0]).map(Number));
      return maxB - maxA;
    });

    const primaryLayout = sorted[0];
    circuitMap[ergastId] = `${primaryLayout.layoutId}.svg`;

    circuitMeta[ergastId] = {
      julesId: jc.id,
      name: jc.name,
      countryId: jc.countryId,
      defaultLayout: primaryLayout.layoutId,
      layouts: jc.layouts.map(l => ({
        id: l.layoutId,
        file: `${l.layoutId}.svg`,
        seasons: l.seasons,
        orientation: l['f1-orientation'] ?? null,
      }))
    };

    jc.layouts.forEach(l => validFiles.add(`${l.layoutId}.svg`));
  }

  // Clean legacy files from public/circuit
  const files = fs.readdirSync('public/circuit');
  let removed = 0;
  for (const f of files) {
    if (!validFiles.has(f)) {
      fs.unlinkSync(path.join('public/circuit', f));
      removed++;
    }
  }
  console.log(`Removed ${removed} legacy circuit files from public/circuit.`);
  console.log(`Remaining files in public/circuit: ${fs.readdirSync('public/circuit').length}`);

  const content = `// Auto-generated mapping to julesr0y/f1-circuits-svg (CC-BY-4.0)
export const circuitMap = ${JSON.stringify(circuitMap, null, 2)};

export const circuitMeta = ${JSON.stringify(circuitMeta, null, 2)};
`;

  fs.writeFileSync('src/circuitMaps.js', content, 'utf8');
  console.log('Updated src/circuitMaps.js successfully.');
}

build().catch(console.error);
