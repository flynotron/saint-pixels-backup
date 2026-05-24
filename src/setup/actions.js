const { PlacePixel } = require('../actions/PlacePixel.js');
const { Leaderboard } = require('../actions/Leaderboard.js');

/**
 * @param {import('express').Application} app
 * @param {import('better-sqlite3').Database} db
 */
function initializeActions(app, db) {
  // Inject db into actions that need it
  PlacePixel.setDb(db);
  Leaderboard.setDb(db);

  app.post('/api/pixel',              PlacePixel.execute);
  app.get('/api/leaderboard',         Leaderboard.execute);
  app.get('/api/profile/:username',   Leaderboard.profile);
}

module.exports = { initializeActions };
