const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { logEvent } = require("../services/auditService");

function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing in .env");
  }
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function isValidEmail(email) {
  return typeof email === "string" && email.includes("@") && email.length <= 254;
}

async function signup(req, res) {
  const { email, password } = req.body || {};

  if (!isValidEmail(email) || typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Invalid email or password (min 8 chars)" });
  }

  const cleanEmail = email.trim().toLowerCase();

  const existing = await db.query("SELECT id FROM users WHERE email = $1", [cleanEmail]);
  if (existing.rowCount > 0) {
    return res.status(409).json({ error: "Email already in use" });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const inserted = await db.query(
    "INSERT INTO users (email, password_hash) VALUES ($1,$2) RETURNING id, email, created_at",
    [cleanEmail, passwordHash]
  );

  const user = inserted.rows[0];
  const token = signToken(user);

  await logEvent({
    actorUserId: user.id,
    eventType: "signup",
    req,
    metadata: { email: user.email }
  });

  return res.status(201).json({ user, token });
}

async function login(req, res) {
  const { email, password } = req.body || {};

  if (!isValidEmail(email) || typeof password !== "string") {
    return res.status(400).json({ error: "Invalid email or password" });
  }

  const cleanEmail = email.trim().toLowerCase();

  const result = await db.query(
    "SELECT id, email, password_hash, created_at FROM users WHERE email = $1",
    [cleanEmail]
  );

  if (result.rowCount === 0) {
    await logEvent({ eventType: "login_failed", req, metadata: { email: cleanEmail } });
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const userRow = result.rows[0];
  const ok = await bcrypt.compare(password, userRow.password_hash);

  if (!ok) {
    await logEvent({ actorUserId: userRow.id, eventType: "login_failed", req, metadata: { email: cleanEmail } });
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const user = { id: userRow.id, email: userRow.email, created_at: userRow.created_at };
  const token = signToken(user);

  await logEvent({ actorUserId: user.id, eventType: "login_success", req });

  return res.json({ user, token });
}

module.exports = { signup, login };