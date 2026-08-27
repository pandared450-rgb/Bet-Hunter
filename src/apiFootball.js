const BASE = 'https://v3.football.api-sports.io';

async function call(path, params = {}) {
  const url = new URL(BASE + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });

  const res = await fetch(url.toString(), {
    headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY }
  });

  if (!res.ok) {
    throw new Error(`API-Football HTTP ${res.status} on ${path}`);
  }
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length) {
    const msg = typeof json.errors === 'string' ? json.errors : JSON.stringify(json.errors);
    throw new Error(`API-Football error on ${path}: ${msg}`);
  }
  return json.response;
}

const fetchFixtures = (league, season, next = 20) =>
  call('/fixtures', { league, season, next });

const fetchH2H = (homeId, awayId, last = 10) =>
  call('/fixtures/headtohead', { h2h: `${homeId}-${awayId}`, last });

const fetchTeamStats = (team, league, season) =>
  call('/teams/statistics', { team, league, season });

const fetchStandings = (league, season) =>
  call('/standings', { league, season }).catch(() => []);

const fetchInjuries = (team, season) =>
  call('/injuries', { team, season }).catch(() => []);

module.exports = { fetchFixtures, fetchH2H, fetchTeamStats, fetchStandings, fetchInjuries };
