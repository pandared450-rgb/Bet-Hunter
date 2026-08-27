const path = require('path');
const express = require('express');
const api = require('./apiFootball');
const { computePrediction } = require('./predictor');

function createServer() {
  const app = express();
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/fixtures', async (req, res) => {
    try {
      const league = Number(req.query.league);
      const season = Number(req.query.season);
      if (!league || !season) return res.status(400).json({ error: 'league and season are required' });
      const fixtures = await api.fetchFixtures(league, season, 20);
      res.json(fixtures);
    } catch (e) {
      res.status(502).json({ error: e.message });
    }
  });

  app.get('/api/analysis', async (req, res) => {
    try {
      const { homeId, awayId, homeName, awayName, league, season } = req.query;
      if (!homeId || !awayId || !league || !season) {
        return res.status(400).json({ error: 'homeId, awayId, league and season are required' });
      }
      const home = { id: Number(homeId), name: homeName || `Team ${homeId}` };
      const away = { id: Number(awayId), name: awayName || `Team ${awayId}` };
      const lg = Number(league), sn = Number(season);

      const [h2h, homeStats, awayStats, standings, homeInj, awayInj] = await Promise.all([
        api.fetchH2H(home.id, away.id, 10),
        api.fetchTeamStats(home.id, lg, sn),
        api.fetchTeamStats(away.id, lg, sn),
        api.fetchStandings(lg, sn),
        api.fetchInjuries(home.id, sn),
        api.fetchInjuries(away.id, sn)
      ]);

      const prediction = computePrediction({ home, away, h2h, homeStats, awayStats, standings, homeInj, awayInj });
      prediction.rawHomeInj = homeInj;
      prediction.rawAwayInj = awayInj;
      res.json({ prediction });
    } catch (e) {
      res.status(502).json({ error: e.message });
    }
  });

  return app;
}

module.exports = { createServer };
