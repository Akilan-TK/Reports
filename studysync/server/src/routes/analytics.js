import express from "express";
import { migrate } from "../db/migrate.js";

const router = express.Router();
const db = migrate();

router.get("/dashboard", (req, res) => {
  const now = new Date().toISOString();
  const soon = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

  const overdue = db.prepare(
    `SELECT * FROM tasks
     WHERE status != 'done' AND due_at IS NOT NULL AND due_at < ?
     ORDER BY due_at ASC`
  ).all(now);

  const dueSoon = db.prepare(
    `SELECT * FROM tasks
     WHERE status != 'done' AND due_at IS NOT NULL AND due_at >= ? AND due_at <= ?
     ORDER BY due_at ASC`
  ).all(now, soon);

  const inProgress = db.prepare(
    `SELECT * FROM tasks WHERE status = 'in_progress' ORDER BY COALESCE(due_at, '9999-12-31T00:00:00.000Z') ASC, updated_at DESC LIMIT 20`
  ).all();

  res.json({ now, overdue, dueSoon, inProgress });
});

export default router;
