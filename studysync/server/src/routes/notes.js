import express from "express";
import { migrate } from "../db/migrate.js";
import { assertInt, assertString, optionalString } from "../lib/validate.js";

const router = express.Router();
const db = migrate();

router.get("/", (req, res) => {
  const { q, tag } = req.query;

  let sql = "SELECT * FROM notes WHERE 1=1";
  const params = [];

  if (q) {
    sql += " AND (title LIKE ? OR body LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }
  if (tag) {
    sql += " AND tags LIKE ?";
    params.push(`%${tag}%`);
  }
  sql += " ORDER BY updated_at DESC";

  const items = db.prepare(sql).all(...params);
  res.json({ items });
});

router.post("/", (req, res) => {
  const title = assertString(req.body?.title, "title");
  const body = assertString(req.body?.body, "body", { minLen: 1 });
  const tags = optionalString(req.body?.tags);

  const info = db.prepare("INSERT INTO notes (title, body, tags) VALUES (?, ?, ?)").run(title, body, tags);
  const created = db.prepare("SELECT * FROM notes WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ item: created });
});

router.get("/:id", (req, res) => {
  const id = assertInt(req.params.id, "id", { min: 1 });
  const note = db.prepare("SELECT * FROM notes WHERE id = ?").get(id);
  if (!note) return res.status(404).json({ error: "Note not found" });

  const tasks = db.prepare(
    `SELECT t.* FROM tasks t
     INNER JOIN task_notes tn ON tn.task_id = t.id
     WHERE tn.note_id = ?
     ORDER BY t.updated_at DESC`
  ).all(id);

  res.json({ item: note, tasks });
});

router.put("/:id", (req, res) => {
  const id = assertInt(req.params.id, "id", { min: 1 });
  const existing = db.prepare("SELECT * FROM notes WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Note not found" });

  const title = req.body?.title !== undefined ? assertString(req.body.title, "title") : existing.title;
  const body = req.body?.body !== undefined ? assertString(req.body.body, "body", { minLen: 1 }) : existing.body;
  const tags = req.body?.tags !== undefined ? optionalString(req.body.tags) : existing.tags;

  db.prepare("UPDATE notes SET title = ?, body = ?, tags = ? WHERE id = ?").run(title, body, tags, id);

  const updated = db.prepare("SELECT * FROM notes WHERE id = ?").get(id);
  res.json({ item: updated });
});

router.delete("/:id", (req, res) => {
  const id = assertInt(req.params.id, "id", { min: 1 });
  const info = db.prepare("DELETE FROM notes WHERE id = ?").run(id);
  if (info.changes === 0) return res.status(404).json({ error: "Note not found" });
  res.status(204).send();
});

export default router;
