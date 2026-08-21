const BASE = 'https://api.jolpi.ca/ergast/f1';
const cache = new Map();

async function get(url, retries = 3, delay = 400) {
  if (cache.has(url)) return cache.get(url);
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429 && attempt < retries) {
        await new Promise((r) => setTimeout(r, delay * Math.pow(2, attempt)));
        continue;
      }
      if (!res.ok) throw new Error(`Timing screen unreachable (${res.status})`);
      const data = await res.json();
      cache.set(url, data);
      return data;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delay * Math.pow(2, attempt)));
    }
  }
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

  const targetSeasons = seasons.slice(-15).reverse();
  const results = await Promise.all(
    targetSeasons.map(async (y) => {
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
  return results.filter(Boolean);
}

export async function getDriverDetail(driverId) {
  const [bioData, seasonsData, countData, winsData, p2Data, p3Data] = await Promise.all([
    get(`${BASE}/drivers/${driverId}.json`),
    get(`${BASE}/drivers/${driverId}/seasons.json?limit=100`),
    get(`${BASE}/drivers/${driverId}/results.json?limit=1`),
    get(`${BASE}/drivers/${driverId}/results/1.json?limit=1`).catch(() => ({ MRData: { total: '0' } })),
    get(`${BASE}/drivers/${driverId}/results/2.json?limit=1`).catch(() => ({ MRData: { total: '0' } })),
    get(`${BASE}/drivers/${driverId}/results/3.json?limit=1`).catch(() => ({ MRData: { total: '0' } })),
  ]);

  const driver = bioData.MRData.DriverTable.Drivers[0];
  const seasons = (seasonsData.MRData?.SeasonTable?.Seasons || []).map((s) => s.season);
  const totalRaces = +countData.MRData.total || 0;
  const totalWins = +winsData.MRData.total || 0;
  const p2Count = +p2Data.MRData.total || 0;
  const p3Count = +p3Data.MRData.total || 0;
  const podiums = totalWins + p2Count + p3Count;

  // Fetch recent races from the driver's latest active seasons (up to 2 recent seasons)
  const targetRecentSeasons = seasons.slice(-2).reverse();
  const recentSeasonResults = await Promise.all(
    targetRecentSeasons.map(async (y) => {
      try {
        const d = await get(`${BASE}/${y}/drivers/${driverId}/results.json?limit=100`);
        return d.MRData?.RaceTable?.Races || [];
      } catch {
        return [];
      }
    })
  );

  const allRecentRaces = recentSeasonResults.flat();
  allRecentRaces.sort((a, b) => {
    if (a.season !== b.season) return +b.season - +a.season;
    return +b.round - +a.round;
  });

  const recentResults = allRecentRaces.slice(0, 12).map((r) => ({
    season: r.season,
    round: r.round,
    raceName: r.raceName,
    date: r.date,
    position: r.Results[0]?.positionText || '—',
    grid: r.Results[0]?.grid,
    points: r.Results[0]?.points,
    constructor: r.Results[0]?.Constructor?.name,
    constructorId: r.Results[0]?.Constructor?.constructorId,
    status: r.Results[0]?.status,
  }));

  // Fetch driver season standings in parallel to compute true career points and best finish
  const standings = await Promise.all(
    seasons.map(async (y) => {
      try {
        const d = await get(`${BASE}/${y}/drivers/${driverId}/driverStandings.json`);
        const ds = d.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings?.[0];
        return ds ? { points: +ds.points || 0, pos: +ds.position || Infinity } : null;
      } catch {
        return null;
      }
    })
  );

  const validStandings = standings.filter(Boolean);
  const totalPoints = validStandings.reduce((sum, s) => sum + s.points, 0);
  const bestChampPos = validStandings.reduce((min, s) => Math.min(min, s.pos), Infinity);

  let bestFinish = '—';
  if (totalWins > 0) {
    bestFinish = 'P1';
  } else if (p2Count > 0) {
    bestFinish = 'P2';
  } else if (p3Count > 0) {
    bestFinish = 'P3';
  } else if (bestChampPos !== Infinity) {
    bestFinish = `P${bestChampPos}`;
  }

  return {
    driver,
    totalRaces,
    totalWins,
    podiums,
    points: totalPoints,
    bestFinish,
    recentResults,
  };
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