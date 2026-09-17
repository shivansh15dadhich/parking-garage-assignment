const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');
const { isValidEmail, isValidPassword } = require('../utils/validators');

function register(req, res) {
  const { name, email, password } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = db
    .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name.trim(), email, passwordHash);

  const token = jwt.sign(
    { id: result.lastInsertRowid, email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  res.status(201).json({
    token,
    user: { id: result.lastInsertRowid, name: name.trim(), email }
  });
}

function login(req, res) {
  const { email, password } = req.body;

  if (!isValidEmail(email) || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const passwordMatches = bcrypt.compareSync(password, user.password_hash);
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email }
  });
}

function me(req, res) {
  const user = db
    .prepare('SELECT id, name, email, created_at FROM users WHERE id = ?')
    .get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user });
}

module.exports = { register, login, me };
