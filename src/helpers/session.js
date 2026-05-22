const crypto = require('crypto');

const sessions = new Map(); // @TODO Use KeyVal service

function createSession(username) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { username, created: Date.now() });
  return token;
}

/**
 * @param {string} token
 * @return {boolean}
 */
function closeSession(token) {
  if (token) {
    return sessions.delete(token);
  }
  return false;
}

function getSession(req) {
  const auth = req.headers.authorization || '';
  const [type, token] = auth.split(' ');
  if (type === 'Bearer' && sessions.has(token)) {
    return sessions.get(token);
  }
  return null;
}

module.exports = { createSession, closeSession, getSession };
