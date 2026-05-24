// Injected by initializeActions
let _db = null;

/**
 * Returns the current day string in UTC-4 (e.g. "2025-05-23")
 * @returns {string}
 */
function getDayUTC4() {
  const now = new Date();
  const utc4 = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  return utc4.toISOString().slice(0, 10);
}

class Leaderboard {
  /**
   * GET /api/leaderboard
   * Returns the top 10 players for today (UTC-4 day boundary)
   * @param {*} req
   * @param {*} res
   */
  static execute(req, res) {
    if (!_db) return res.status(503).json({ error: 'Database not available' });

    try {
      const day = getDayUTC4();
      const rows = _db.prepare(`
        SELECT username, count
        FROM pixel_counts
        WHERE day = ?
        ORDER BY count DESC
        LIMIT 10
      `).all(day);

      return res.json({ day, leaderboard: rows });
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * @param {Database} db
   */
  static setDb(db) {
    _db = db;
  }
}

module.exports = { Leaderboard };
