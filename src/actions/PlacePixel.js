const { getCooldown, resetCooldown } = require('../helpers/cooldown.js');
const { getSession } = require('../helpers/session.js');

class PlacePixel {
  /**
   * @param {*} req 
   * @param {*} res 
   */
  static execute(req, res) {
    const session = getSession(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const cooldownLeft = getCooldown(session.username);
    if (cooldownLeft > 0) {
      return res.status(429).json({ error: 'Cooldown active. Please wait.', cooldown: cooldownLeft });
    }

    resetCooldown(session.username);

    // @TODO Implement storing the pixel in the database

    return res.json({ success: true });
  }
}

module.exports = { PlacePixel };
