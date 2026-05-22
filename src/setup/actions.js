const { PlacePixel } = require('../actions/PlacePixel.js');

function initializeActions(app) {
  app.post('/api/pixel', PlacePixel.execute);  // fixed: added leading slash
}

module.exports = { initializeActions };
