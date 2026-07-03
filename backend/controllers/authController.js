const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );
}

async function register(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "username and password are required" });
  }

  const existing = await User.findOne({ username });
  if (existing) {
    return res.status(409).json({ error: "username already taken" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, passwordHash });

  const token = signToken(user);
  res.status(201).json({ token, user: { username: user.username, role: user.role } });
}

async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "username and password are required" });
  }

  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ error: "invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "invalid credentials" });

  const token = signToken(user);
  res.json({ token, user: { username: user.username, role: user.role } });
}

async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, login, me };
