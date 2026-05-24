const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const rateLimit = require('express-rate-limit');
const app = express();
const dbFile = path.join(__dirname, 'database.sqlite');
const db = new Database(dbFile);

const { getCooldown, resetCooldown } = require('./src/helpers/cooldown.js');
const { createSession, closeSession, getSession } = require('./src/helpers/session.js');
const { hashPassword } = require('./src/helpers/password.js');
const { initializeActions } = require('./src/setup/actions.js');
const { initializeDatabase } = require('./src/setup/database.js');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

initializeDatabase(db);
initializeActions(app, db);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' }
});

app.post('/api/register', (req, res) => {
  const { username, password } = req.body || {};
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  if (!username || !password)
    return res.status(400).json({ error: 'Username and password are required.' });

  if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username))
    return res.status(400).json({ error: 'Username must be 3-20 characters and only letters, numbers, hyphen, underscore.' });

  if (password.length < 4)
    return res.status(400).json({ error: 'Password must be at least 4 characters.' });

  try {
    if (db.prepare('SELECT id FROM accounts WHERE username = ?').get(username))
      return res.status(409).json({ error: 'Username already taken.' });

    const hashed = hashPassword(password, username);
    db.prepare('INSERT INTO accounts (username, password, ip, created_at) VALUES (?, ?, ?, ?)')
      .run(username, hashed, ip, Date.now());

    const token = createSession(username);
    return res.json({ username, token });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Could not create account.' });
  }
});

app.post('/api/login', loginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password are required.' });

  try {
    const hashedPassword = hashPassword(password, username);
    const row = db.prepare('SELECT username FROM accounts WHERE username = ? AND password = ?')
      .get(username, hashedPassword);

    if (!row)
      return res.status(401).json({ error: 'Invalid credentials.' });

    const token = createSession(row.username);
    return res.json({ username: row.username, token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Database error.' });
  }
});

app.get('/api/me', (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Not authenticated.' });
  return res.json({ username: session.username });
});

app.post('/api/logout', (req, res) => {
  const [, token] = (req.headers.authorization || '').split(' ');
  res.json({ success: closeSession(token) });
});

const paletteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

app.get('/api/palette', paletteLimiter, (req, res) => {
  try {
    const colors = db.prepare('SELECT id, label, color FROM palette ORDER BY id ASC').all();
    res.json({ colors });
  } catch (err) {
    console.error('Palette fetch error:', err);
    return res.status(500).json({ error: 'Could not load palette.' });
  }
});

app.use((req, res) => res.status(404).send('Not found'));

const desiredPort = process.env.PORT ? Number(process.env.PORT) : 0;
const server = app.listen(desiredPort, () => {
  const addr = server.address();
  const boundPort = typeof addr === 'string' ? addr : addr.port;
  console.log(`Saint Pixels server running on http://localhost:${boundPort}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('Port already in use. Try setting PORT environment variable to a free port.');
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});
