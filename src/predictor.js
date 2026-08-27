// Weights for each factor. Must not need to sum to 1, but keeping them
// normalized makes the raw advantage score easy to reason about.
const WEIGHTS = {
  form: 0.25,
  h2h: 0.15,
  split: 0.25, // home/away split
  table: 0.20,
  injury: 0.15
};

const HOME_FIELD_NUDGE = 0.08;

function parseForm(formStr) {
  const arr = (formStr || '').split('').slice(-5);
  while (arr.length < 5) arr.unshift('x');
  const pts = arr.reduce((s, c) => s + (c === 'W' ? 3 : c === 'D' ? 1 : 0), 0);
  return { arr, pts, max: 15 };
}

function h2hTally(h2h, homeId) {
  let homeWins = 0, awayWins = 0, draws = 0;
  const lines = [];
  (h2h || []).slice(0, 10).forEach(f => {
    const hg = f.goals.home, ag = f.goals.away;
    if (hg === null || ag === null) return;
    if (hg === ag) {
      draws++;
    } else if ((hg > ag && f.teams.home.id === homeId) || (ag > hg && f.teams.away.id === homeId)) {
      homeWins++;
    } else {
      awayWins++;
    }
    const year = new Date(f.fixture.date).getFullYear();
    lines.push(`${year}  ${f.teams.home.name} ${hg}-${ag} ${f.teams.away.name}`);
  });
  return { homeWins, awayWins, draws, total: homeWins + awayWins + draws, lines: lines.slice(0, 6) };
}

function findRank(standings, teamId) {
  try {
    for (const group of standings[0].league.standings) {
      for (const row of group) {
        if (row.team.id === teamId) return row.rank;
      }
    }
  } catch (e) { /* standings shape can vary or be empty */ }
  return null;
}

/**
 * @param {object} d - { home, away, h2h, homeStats, awayStats, standings, homeInj, awayInj }
 *   home/away: { id, name } from the fixture
 *   homeStats/awayStats: API-Football /teams/statistics response for each team
 *   standings: API-Football /standings response
 *   homeInj/awayInj: API-Football /injuries response arrays
 */
function computePrediction(d) {
  const { home, away, h2h, homeStats, awayStats, standings, homeInj = [], awayInj = [] } = d;

  const homeForm = parseForm(homeStats.form);
  const awayForm = parseForm(awayStats.form);
  const h2hT = h2hTally(h2h, home.id);

  const homeHomeWins = homeStats.fixtures.wins.home;
  const homeHomePlayed = homeStats.fixtures.played.home;
  const awayAwayWins = awayStats.fixtures.wins.away;
  const awayAwayPlayed = awayStats.fixtures.played.away;
  const homeHomePct = homeHomePlayed ? homeHomeWins / homeHomePlayed : 0;
  const awayAwayPct = awayAwayPlayed ? awayAwayWins / awayAwayPlayed : 0;

  const homeRank = findRank(standings, home.id);
  const awayRank = findRank(standings, away.id);

  const homeInjCount = (homeInj || []).length;
  const awayInjCount = (awayInj || []).length;

  const formScore = (homeForm.pts - awayForm.pts) / 15;
  const h2hScore = h2hT.total ? (h2hT.homeWins - h2hT.awayWins) / h2hT.total : 0;
  const splitScore = homeHomePct - awayAwayPct;

  let tableScore = 0;
  if (homeRank && awayRank) {
    const totalTeams = 20;
    tableScore = Math.max(-1, Math.min(1, (awayRank - homeRank) / totalTeams));
  }

  const injuryScore = Math.max(-1, Math.min(1, (awayInjCount - homeInjCount) / 6));

  let raw =
    WEIGHTS.form * formScore +
    WEIGHTS.h2h * h2hScore +
    WEIGHTS.split * splitScore +
    WEIGHTS.table * tableScore +
    WEIGHTS.injury * injuryScore;
  raw = Math.max(-1, Math.min(1, raw));

  let homeP = 0.34 + raw * 0.36 + HOME_FIELD_NUDGE * 0.5;
  let awayP = 0.34 - raw * 0.36 - HOME_FIELD_NUDGE * 0.5;
  let drawP = 1 - homeP - awayP;
  homeP = Math.max(0.05, homeP);
  awayP = Math.max(0.05, awayP);
  drawP = Math.max(0.10, drawP);
  const sum = homeP + awayP + drawP;
  homeP = Math.round((homeP / sum) * 100);
  awayP = Math.round((awayP / sum) * 100);
  drawP = 100 - homeP - awayP;

  const lean =
    homeP >= awayP && homeP >= drawP ? home.name :
    awayP >= homeP && awayP >= drawP ? away.name : 'a draw';

  return {
    home, away,
    percentages: { home: homeP, draw: drawP, away: awayP },
    lean,
    factors: {
      form: { home: homeForm, away: awayForm, weight: WEIGHTS.form },
      h2h: { ...h2hT, weight: WEIGHTS.h2h },
      split: {
        home: { wins: homeHomeWins, played: homeHomePlayed, pct: homeHomePct },
        away: { wins: awayAwayWins, played: awayAwayPlayed, pct: awayAwayPct },
        weight: WEIGHTS.split
      },
      table: { homeRank, awayRank, weight: WEIGHTS.table },
      injury: { home: homeInjCount, away: awayInjCount, weight: WEIGHTS.injury }
    }
  };
}

module.exports = { computePrediction, parseForm, h2hTally, findRank, WEIGHTS };
