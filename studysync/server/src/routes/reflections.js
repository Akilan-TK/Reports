import express from "express";
import { migrate } from "../db/migrate.js";
import { assertInt, assertString, optionalString } from "../lib/validate.js";

const router = express.Router();
const db = migrate();

function isYmd(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

router.get("/", (req, res) => {
  const { from, to } = req.query;
  let sql = "SELECT * FROM reflections WHERE 1=1";
  const params = [];

  if (from && isYmd(from)) {
    sql += " AND day >= ?";
    params.push(from);
  }
  if (to && isYmd(to)) {
    sql += " AND day <= ?";
    params.push(to);
  }
  sql += " ORDER BY day DESC";

  const items = db.prepare(sql).all(...params);
  res.json({ items });
});

// Upsert by day
router.put("/:day", (req, res) => {
  const day = req.params.day;
  if (!isYmd(day)) return res.status(400).json({ error: "Invalid day. Use YYYY-MM-DD." });

  const mood = assertInt(req.body?.mood, "mood", { min: 1, max: 5 });
  const productivity = assertInt(req.body?.productivity, "productivity", { min: 1, max: 5 });
  const text = optionalString(req.body?.text);

  const stmt = db.prepare(
    `INSERT INTO reflections (day, mood, productivity, text)
     VALUES (@day, @mood, @productivity, @text)
     ON CONFLICT(day) DO UPDATE SET mood=excluded.mood, productivity=excluded.productivity, text=excluded.text`
  );

  stmt.run({ day, mood, productivity, text });
  const item = db.prepare("SELECT * FROM reflections WHERE day = ?").get(day);
  res.json({ item });
});

router.get("/summary", (req, res) => {
  const window = req.query.window === "30" ? 30 : 7;

  const rows = db.prepare(
    `SELECT mood, productivity FROM reflections
     WHERE day >= date('now', ?)
     ORDER BY day ASC`
  ).all(`-${window} day`);

  const avg = (arr, key) => arr.length ? (arr.reduce((a, r) => a + Number(r[key]), 0) / arr.length) : null;

  res.json({
    windowDays: window,
    count: rows.length,
    avgMood: avg(rows, "mood"),
    avgProductivity: avg(rows, "productivity")
  });
});

export default router;
