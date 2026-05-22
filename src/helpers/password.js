const crypto = require('crypto');

/**
 * Compute the hash of a password for a given username
 * @param {string} password 
 * @param {string} username 
 * @returns {string}
 */
function hashPassword(password, username) {
  const user = typeof username === 'string' ? username : '';
  const pwd = typeof password === 'string' ? password : '';
  const salt = crypto.createHash('sha256').update(user).digest('hex');
  return crypto.createHmac('sha512', salt).update(pwd).digest('hex');
}

module.exports = { hashPassword };
