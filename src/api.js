const BASE = 'https://api.jolpi.ca/ergast/f1';
const memoryCache = new Map();
const inflightPromises = new Map();
const driverDetailCache = new Map();

// ponytail: Jolpi Ergast API rate-limits at ~4 req/s and omits CORS headers on 429 responses.
// Throttle concurrency to max 2 and ensure >= 180ms gap to eliminate 429 lockouts.
const MAX_CONCURRENT = 2;
const MIN_GAP_MS = 180;
let activeCount = 0;
let lastRequestTime = 0;
let cooldownUntil = 0;
const queue = [];

function getStorage(key) {
  try {
    const raw = sessionStorage.getItem(`f1_cache_${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStorage(key, data) {
  try {
    sessionStorage.setItem(`f1_cache_${key}`, JSON.stringify(data));
  } catch {
    // Quota exceeded or private mode, gracefully ignored
  }
}

function triggerCooldown(durationMs = 2500) {
  cooldownUntil = Math.max(cooldownUntil, Date.now() + durationMs);
}

function processQueue() {
  if (queue.length === 0 || activeCount >= MAX_CONCURRENT) return;
  const now = Date.now();
  if (now < cooldownUntil) {
    setTimeout(processQueue, cooldownUntil - now + 50);
    return;
  }
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < MIN_GAP_MS) {
    setTimeout(processQueue, MIN_GAP_MS - timeSinceLast);
    return;
  }

  const task = queue.shift();
  if (!task) return;

  activeCount++;
  lastRequestTime = Date.now();

  task().finally(() => {
    activeCount--;
    processQueue();
  });
}

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    queue.push(() => fn().then(resolve, reject));
    processQueue();
  });
}

async function fetchWithRetry(url, retries = 4, delay = 600) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await enqueue(() => fetch(url));
      if (res.status === 429) {
        triggerCooldown(2500 + attempt * 1000);
        if (attempt < retries) {
          const waitTime = Math.max(1500, delay * Math.pow(2, attempt) + Math.random() * 400);
          await new Promise((r) => setTimeout(r, waitTime));
          continue;
        }
        throw new Error(`Rate limit exceeded (429)`);
      }
      if (!res.ok) throw new Error(`Timing screen unreachable (${res.status})`);
      const data = await res.json();
      memoryCache.set(url, data);
      setStorage(url, data);
      return data;
    } catch (err) {
      // Cloudflare 429 error pages lack CORS headers, causing fetch() to throw a TypeError in browser
      triggerCooldown(2500 + attempt * 1000);
      if (attempt === retries) throw err;
      const waitTime = Math.max(1500, delay * Math.pow(2, attempt) + Math.random() * 400);
      await new Promise((r) => setTimeout(r, waitTime));
    }
  }
}

async function get(url, retries = 4, delay = 600) {
  if (memoryCache.has(url)) return memoryCache.get(url);
  const stored = getStorage(url);
  if (stored) {
    memoryCache.set(url, stored);
    return stored;
  }
  if (inflightPromises.has(url)) {
    return inflightPromises.get(url);
  }

  const p = fetchWithRetry(url, retries, delay).finally(() => {
    inflightPromises.delete(url);
  });

  inflightPromises.set(url, p);
  return p;
}

export async function getStandings(season = 'current') {
  const data = await get(`${BASE}/${season}/constructorStandings.json`);
  const table = data.MRData.StandingsTable;
  return {
    season: table.season,
    round: table.round,
    standings: table.StandingsLists[0]?.ConstructorStandings || [],
  };
}

export async function getDriverStandings(season = 'current') {
  const data = await get(`${BASE}/${season}/driverStandings.json`);
  const table = data.MRData.StandingsTable;
  return {
    season: table.season,
    round: table.round,
    standings: table.StandingsLists[0]?.DriverStandings || [],
  };
}

export async function getTeamDrivers(teamId, season = 'current') {
  const data = await get(`${BASE}/${season}/constructors/${teamId}/drivers.json`);
  return data.MRData.DriverTable?.Drivers || [];
}

export async function getTeamHistory(teamId) {
  const sData = await get(`${BASE}/constructors/${teamId}/seasons.json?limit=100`);
  const seasons = (sData.MRData?.SeasonTable?.Seasons || []).map((s) => s.season);
  if (!seasons.length) return [];

  // Limit to most recent 12 seasons and batch in chunks of 2 to avoid bursting the API
  const targetSeasons = seasons.slice(-12).reverse();
  const results = [];

  for (let i = 0; i < targetSeasons.length; i += 2) {
    const chunk = targetSeasons.slice(i, i + 2);
    const chunkRes = await Promise.all(
      chunk.map(async (y) => {
        try {
          const d = await get(`${BASE}/${y}/constructors/${teamId}/constructorStandings.json`);
          const item = d.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings?.[0];
          if (!item) return null;
          return {
            season: y,
            position: item.position,
            positionText: item.positionText,
            points: item.points,
            wins: item.wins,
          };
        } catch {
          return null;
        }
      })
    );
    results.push(...chunkRes.filter(Boolean));
  }

  return results;
}

export async function getDriverDetail(driverId) {
  if (driverDetailCache.has(driverId)) {
    return driverDetailCache.get(driverId);
  }

  const stored = getStorage(`driver_detail_${driverId}`);
  if (stored) {
    driverDetailCache.set(driverId, stored);
    return stored;
  }

  // Fetch page 1 of all race results (covers 100% of races for 90% of all F1 drivers)
  const page1 = await get(`${BASE}/drivers/${driverId}/results.json?limit=100`);
  const totalRaces = +page1.MRData?.total || 0;
  let allRaces = page1.MRData?.RaceTable?.Races || [];

  // If driver has more than 100 career races, fetch subsequent pages in sequence
  if (totalRaces > 100) {
    for (let o = 100; o < totalRaces; o += 100) {
      const p = await get(`${BASE}/drivers/${driverId}/results.json?limit=100&offset=${o}`).catch(() => ({
        MRData: { RaceTable: { Races: [] } },
      }));
      allRaces = allRaces.concat(p.MRData?.RaceTable?.Races || []);
    }
  }

  // Extract driver bio from first available race result or fallback endpoint
  let driver = allRaces[0]?.Results?.[0]?.Driver;
  if (!driver) {
    const bioData = await get(`${BASE}/drivers/${driverId}.json`).catch(() => ({}));
    driver = bioData.MRData?.DriverTable?.Drivers?.[0] || {
      driverId,
      givenName: driverId.replace(/_/g, ' ').toUpperCase(),
      familyName: '',
    };
  }

  let totalWins = 0;
  let podiums = 0;
  let totalPoints = 0;
  let bestPos = Infinity;

  for (const r of allRaces) {
    const res = r.Results?.[0];
    if (!res) continue;
    const pos = +res.position;
    const pts = +res.points || 0;
    totalPoints += pts;
    if (pos === 1) totalWins++;
    if (pos >= 1 && pos <= 3) podiums++;
    if (pos > 0 && pos < bestPos) bestPos = pos;
  }

  const bestFinish = totalWins > 0 ? 'P1' : bestPos !== Infinity ? `P${bestPos}` : '—';

  // Sort races chronologically descending for recent results
  const sortedRaces = allRaces.slice().sort((a, b) => {
    if (a.season !== b.season) return +b.season - +a.season;
    return +b.round - +a.round;
  });

  const recentResults = sortedRaces.slice(0, 12).map((r) => ({
    season: r.season,
    round: r.round,
    raceName: r.raceName,
    date: r.date,
    number: r.Results?.[0]?.number,
    position: r.Results?.[0]?.positionText || '—',
    grid: r.Results?.[0]?.grid,
    points: r.Results?.[0]?.points,
    constructor: r.Results?.[0]?.Constructor?.name,
    constructorId: r.Results?.[0]?.Constructor?.constructorId,
    status: r.Results?.[0]?.status,
  }));

  const carNumber =
    driver?.permanentNumber ||
    sortedRaces[0]?.Results?.[0]?.number ||
    driver?.code ||
    '';

  const detail = {
    driver,
    carNumber,
    totalRaces,
    totalWins,
    podiums,
    points: totalPoints,
    bestFinish,
    recentResults,
  };

  driverDetailCache.set(driverId, detail);
  setStorage(`driver_detail_${driverId}`, detail);
  return detail;
}

export async function getSchedule(season = 'current') {
  const [schedData, winData] = await Promise.all([
    get(`${BASE}/${season}.json`),
    get(`${BASE}/${season}/results/1.json?limit=100`).catch(() => ({
      MRData: { RaceTable: { Races: [] } },
    })),
  ]);

  const races = schedData.MRData?.RaceTable?.Races || [];
  const winners = new Map(
    (winData.MRData?.RaceTable?.Races || []).map((r) => [
      r.round,
      {
        driver: `${r.Results[0]?.Driver?.givenName} ${r.Results[0]?.Driver?.familyName}`,
        driverId: r.Results[0]?.Driver?.driverId,
        constructor: r.Results[0]?.Constructor?.name,
        constructorId: r.Results[0]?.Constructor?.constructorId,
        time: r.Results[0]?.Time?.time,
      },
    ])
  );

  return races.map((r) => ({
    season: r.season,
    round: r.round,
    raceName: r.raceName,
    circuit: r.Circuit,
    date: r.date,
    time: r.time,
    winner: winners.get(r.round) || null,
  }));
}

export async function getRaceResults(season, round) {
  const [resData, schedData] = await Promise.all([
    get(`${BASE}/${season}/${round}/results.json?limit=100`).catch(() => null),
    get(`${BASE}/${season}/${round}.json`).catch(() => null),
  ]);

  const raceRes = resData?.MRData?.RaceTable?.Races?.[0];
  const raceSched = schedData?.MRData?.RaceTable?.Races?.[0];
  const race = raceRes || raceSched;
  if (!race) return null;

  const results = (raceRes?.Results || []).map((r) => {
    const gridPos = +r.grid || null;
    const finPos = +r.position || null;
    let gridDelta = null;
    if (gridPos && finPos) {
      gridDelta = gridPos - finPos;
    }

    return {
      position: r.positionText || r.position,
      numericPosition: finPos,
      number: r.number,
      points: r.points,
      driver: `${r.Driver?.givenName} ${r.Driver?.familyName}`,
      driverCode: r.Driver?.code || r.Driver?.familyName?.slice(0, 3).toUpperCase(),
      driverId: r.Driver?.driverId,
      driverNationality: r.Driver?.nationality,
      constructor: r.Constructor?.name,
      constructorId: r.Constructor?.constructorId,
      grid: r.grid,
      gridDelta,
      laps: r.laps,
      status: r.status,
      time: r.Time?.time || null,
      fastestLap: r.FastestLap
        ? {
            rank: r.FastestLap.rank,
            lap: r.FastestLap.lap,
            time: r.FastestLap.Time?.time,
            speed: r.FastestLap.AverageSpeed?.speed,
          }
        : null,
      isFastestLap: r.FastestLap?.rank === '1',
    };
  });

  return {
    season: race.season,
    round: race.round,
    raceName: race.raceName,
    circuit: race.Circuit,
    date: race.date,
    time: race.time,
    results,
    isUpcoming: results.length === 0,
  };
}

export async function getCircuits() {
  const data = await get(`${BASE}/circuits.json?limit=100`);
  return data.MRData.CircuitTable.Circuits.map((c) => ({
    ...c,
    Location:
      c.Location?.country === 'UK'
        ? { ...c.Location, country: 'United Kingdom' }
        : c.Location,
  }));
}

export async function getCircuitHistory(circuitId) {
  const [winData, flData] = await Promise.all([
    get(`${BASE}/circuits/${circuitId}/results/1.json?limit=100`),
    get(`${BASE}/circuits/${circuitId}/fastest/1/results.json?limit=100`).catch(() => ({
      MRData: { RaceTable: { Races: [] } },
    })),
  ]);

  const flMap = new Map(
    (flData.MRData?.RaceTable?.Races || []).map((r) => {
      const res = r.Results?.[0];
      const fl = res?.FastestLap;
      return [
        r.season,
        {
          name: res ? `${res.Driver.givenName} ${res.Driver.familyName}` : '',
          driverId: res?.Driver?.driverId,
          time: fl?.Time?.time || res?.Time?.time,
        },
      ];
    })
  );

  const races = winData.MRData?.RaceTable?.Races || [];
  return races.map((r) => {
    const winner = r.Results?.[0];
    const fastest = flMap.get(r.season);
    return {
      season: r.season,
      raceName: r.raceName,
      date: r.date,
      winner:
        winner && {
          name: `${winner.Driver.givenName} ${winner.Driver.familyName}`,
          driverId: winner.Driver.driverId,
          constructor: winner.Constructor.name,
          constructorId: winner.Constructor.constructorId,
        },
      fastest: fastest?.time ? fastest : null,
    };
  });
}