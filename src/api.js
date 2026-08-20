const BASE = 'https://api.jolpi.ca/ergast/f1';

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Timing screen unreachable (${res.status})`);
  return res.json();
}

export async function getStandings() {
  const data = await get(`${BASE}/current/constructorStandings.json`);
  const table = data.MRData.StandingsTable;
  return {
    season: table.season,
    round: table.round,
    standings: table.StandingsLists[0].ConstructorStandings,
  };
}

export async function getTeamDrivers(teamId) {
  const data = await get(`${BASE}/current/constructors/${teamId}/drivers.json`);
  return data.MRData.DriverTable.Drivers;
}

export async function getTeamHistory(teamId) {
  const data = await get(`${BASE}/constructors/${teamId}/constructorStandings.json?limit=1000`);
  return data.MRData.StandingsTable.StandingsLists.map((l) => l.ConstructorStandings[0]);
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
  const races = [];
  let offset = 0;
  for (;;) {
    const data = await get(`${BASE}/circuits/${circuitId}/results.json?limit=1000&offset=${offset}`);
    races.push(...data.MRData.RaceTable.Races);
    offset += +data.MRData.limit;
    if (offset >= +data.MRData.total) break;
  }
  return races.map((r) => {
    const winner = r.Results.find((x) => x.position === '1');
    const fl = r.Results.find((x) => x.FastestLap?.rank === '1');
    return {
      season: r.season,
      raceName: r.raceName,
      date: r.date,
      winner:
        winner && {
          name: `${winner.Driver.givenName} ${winner.Driver.familyName}`,
          constructor: winner.Constructor.name,
        },
      fastest:
        fl && {
          name: `${fl.Driver.givenName} ${fl.Driver.familyName}`,
          time: fl.FastestLap.Time.time,
        },
    };
  });
}