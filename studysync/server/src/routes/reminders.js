import express from "express";
import { migrate } from "../db/migrate.js";
import { toIsoOrNull } from "../db/db.js";
import { assertEnum, assertInt } from "../lib/validate.js";

const router = express.Router();
const db = migrate();

const CHANNELS = ["in_app", "browser"];
const STATUSES = ["scheduled", "fired", "cancelled"];

router.post("/", (req, res) => {
  const task_id = req.body?.task_id === undefined || req.body?.task_id === null ? null : assertInt(req.body.task_id, "task_id", { min: 1 });
  const fire_at = toIsoOrNull(req.body?.fire_at);
  if (!fire_at) return res.status(400).json({ error: "Invalid fire_at (ISO date/time required)." });
  const channel = req.body?.channel === undefined ? "in_app" : assertEnum(req.body.channel, CHANNELS, "channel");

  const info = db.prepare("INSERT INTO reminders (task_id, fire_at, channel, status) VALUES (?, ?, ?, 'scheduled')")
    .run(task_id, fire_at, channel);

  const item = db.prepare("SELECT * FROM reminders WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ item });
});

// Return reminders due at/before now
router.get("/due", (req, res) => {
  const now = toIsoOrNull(req.query.now) || new Date().toISOString();
  const items = db.prepare(
    `SELECT r.*, t.title AS task_title
     FROM reminders r
     LEFT JOIN tasks t ON t.id = r.task_id
     WHERE r.status = 'scheduled' AND r.fire_at <= ?
     ORDER BY r.fire_at ASC`
  ).all(now);
  res.json({ now, items });
});

router.put("/:id", (req, res) => {
  const id = assertInt(req.params.id, "id", { min: 1 });
  const status = req.body?.status ? assertEnum(req.body.status, STATUSES, "status") : null;

  const existing = db.prepare("SELECT * FROM reminders WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Reminder not found" });

  if (!status) return res.status(400).json({ error: "status is required" });

  db.prepare("UPDATE reminders SET status = ? WHERE id = ?").run(status, id);
  const item = db.prepare("SELECT * FROM reminders WHERE id = ?").get(id);
  res.json({ item });
});

router.get("/", (req, res) => {
  const items = db.prepare("SELECT * FROM reminders ORDER BY fire_at DESC LIMIT 200").all();
  res.json({ items });
});

export default router;
