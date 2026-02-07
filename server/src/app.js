const express = require("express");
const authRoutes = require("./routes/authRoutes");
const db = require("./db");

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/db-health", async (req, res) => {
  const result = await db.query("SELECT 1 AS ok");
  res.json({ db: "ok", result: result.rows[0] });
});

app.use("/auth", authRoutes);

// basic error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;