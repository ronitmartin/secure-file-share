const db = require("../db");

async function logEvent({ actorUserId = null, fileId = null, shareId = null, eventType, req, metadata = null }) {
  const ip = req.ip || null;
  const userAgent = req.get("user-agent") || null;

  await db.query(
    `INSERT INTO audit_logs (actor_user_id, file_id, share_id, event_type, ip, user_agent, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [actorUserId, fileId, shareId, eventType, ip, userAgent, metadata]
  );
}

module.exports = { logEvent };