import express from "express";
import { migrate } from "../db/migrate.js";
import { toIsoOrNull } from "../db/db.js";
import { assertEnum, assertInt, assertString, optionalString } from "../lib/validate.js";

const router = express.Router();
const db = migrate();

const TASK_STATUSES = ["todo", "in_progress", "done"];

function taskRowToApi(row) {
  if (!row) return null;
  return {
    ...row,
    priority: Number(row.priority),
  };
}

router.get("/", (req, res) => {
  const { status, q, due_before, due_after } = req.query;

  let sql = "SELECT * FROM tasks WHERE 1=1";
  const params = [];

  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }
  if (q) {
    sql += " AND (title LIKE ? OR description LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }
  if (due_before) {
    sql += " AND due_at IS NOT NULL AND due_at <= ?";
    params.push(new Date(due_before).toISOString());
  }
  if (due_after) {
    sql += " AND due_at IS NOT NULL AND due_at >= ?";
    params.push(new Date(due_after).toISOString());
  }
  sql += " ORDER BY CASE status WHEN 'todo' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END, COALESCE(due_at, '9999-12-31T00:00:00.000Z') ASC, priority ASC, updated_at DESC";

  const rows = db.prepare(sql).all(...params).map(taskRowToApi);
  res.json({ items: rows });
});

router.post("/", (req, res) => {
  const title = assertString(req.body?.title, "title", { minLen: 1 });
  const description = optionalString(req.body?.description);
  const due_at = toIsoOrNull(req.body?.due_at);
  const priority = req.body?.priority === undefined ? 2 : assertInt(req.body?.priority, "priority", { min: 1, max: 3 });
  const status = req.body?.status === undefined ? "todo" : assertEnum(req.body?.status, TASK_STATUSES, "status");

  const stmt = db.prepare("INSERT INTO tasks (title, description, due_at, priority, status) VALUES (?, ?, ?, ?, ?)");
  const info = stmt.run(title, description, due_at, priority, status);
  const created = db.prepare("SELECT * FROM tasks WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ item: taskRowToApi(created) });
});

router.get("/:id", (req, res) => {
  const id = assertInt(req.params.id, "id", { min: 1 });

  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const subtasks = db.prepare("SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order ASC, id ASC").all(id);
  const notes = db.prepare(
    `SELECT n.* FROM notes n
     INNER JOIN task_notes tn ON tn.note_id = n.id
     WHERE tn.task_id = ?
     ORDER BY n.updated_at DESC`
  ).all(id);

  res.json({
    item: taskRowToApi(task),
    subtasks,
    notes
  });
});

router.put("/:id", (req, res) => {
  const id = assertInt(req.params.id, "id", { min: 1 });

  const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Task not found" });

  const title = req.body?.title !== undefined ? assertString(req.body.title, "title") : existing.title;
  const description = req.body?.description !== undefined ? optionalString(req.body.description) : existing.description;
  const due_at = req.body?.due_at !== undefined ? toIsoOrNull(req.body.due_at) : existing.due_at;
  const priority = req.body?.priority !== undefined ? assertInt(req.body.priority, "priority", { min: 1, max: 3 }) : existing.priority;
  const status = req.body?.status !== undefined ? assertEnum(req.body.status, TASK_STATUSES, "status") : existing.status;

  db.prepare("UPDATE tasks SET title = ?, description = ?, due_at = ?, priority = ?, status = ? WHERE id = ?")
    .run(title, description, due_at, priority, status, id);

  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  res.json({ item: taskRowToApi(updated) });
});

router.delete("/:id", (req, res) => {
  const id = assertInt(req.params.id, "id", { min: 1 });
  const info = db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  if (info.changes === 0) return res.status(404).json({ error: "Task not found" });
  res.status(204).send();
});

// Subtasks
router.post("/:id/subtasks", (req, res) => {
  const taskId = assertInt(req.params.id, "task_id", { min: 1 });
  const title = assertString(req.body?.title, "title");
  const status = req.body?.status === undefined ? "todo" : assertEnum(req.body.status, ["todo", "in_progress", "done"], "status");
  const sort_order = req.body?.sort_order === undefined ? 0 : assertInt(req.body.sort_order, "sort_order", { min: 0 });

  const task = db.prepare("SELECT id FROM tasks WHERE id = ?").get(taskId);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const info = db.prepare("INSERT INTO subtasks (task_id, title, status, sort_order) VALUES (?, ?, ?, ?)")
    .run(taskId, title, status, sort_order);

  const created = db.prepare("SELECT * FROM subtasks WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ item: created });
});

router.put("/subtasks/:subtaskId", (req, res) => {
  const subtaskId = assertInt(req.params.subtaskId, "subtaskId", { min: 1 });
  const existing = db.prepare("SELECT * FROM subtasks WHERE id = ?").get(subtaskId);
  if (!existing) return res.status(404).json({ error: "Subtask not found" });

  const title = req.body?.title !== undefined ? assertString(req.body.title, "title") : existing.title;
  const status = req.body?.status !== undefined ? assertEnum(req.body.status, ["todo", "in_progress", "done"], "status") : existing.status;
  const sort_order = req.body?.sort_order !== undefined ? assertInt(req.body.sort_order, "sort_order", { min: 0 }) : existing.sort_order;

  db.prepare("UPDATE subtasks SET title = ?, status = ?, sort_order = ? WHERE id = ?")
    .run(title, status, sort_order, subtaskId);

  const updated = db.prepare("SELECT * FROM subtasks WHERE id = ?").get(subtaskId);
  res.json({ item: updated });
});

router.delete("/subtasks/:subtaskId", (req, res) => {
  const subtaskId = assertInt(req.params.subtaskId, "subtaskId", { min: 1 });
  const info = db.prepare("DELETE FROM subtasks WHERE id = ?").run(subtaskId);
  if (info.changes === 0) return res.status(404).json({ error: "Subtask not found" });
  res.status(204).send();
});

// Link/unlink notes
router.post("/:id/notes/:noteId", (req, res) => {
  const taskId = assertInt(req.params.id, "taskId", { min: 1 });
  const noteId = assertInt(req.params.noteId, "noteId", { min: 1 });

  const task = db.prepare("SELECT id FROM tasks WHERE id = ?").get(taskId);
  if (!task) return res.status(404).json({ error: "Task not found" });
  const note = db.prepare("SELECT id FROM notes WHERE id = ?").get(noteId);
  if (!note) return res.status(404).json({ error: "Note not found" });

  db.prepare("INSERT OR IGNORE INTO task_notes (task_id, note_id) VALUES (?, ?)").run(taskId, noteId);
  res.status(204).send();
});

router.delete("/:id/notes/:noteId", (req, res) => {
  const taskId = assertInt(req.params.id, "taskId", { min: 1 });
  const noteId = assertInt(req.params.noteId, "noteId", { min: 1 });

  db.prepare("DELETE FROM task_notes WHERE task_id = ? AND note_id = ?").run(taskId, noteId);
  res.status(204).send();
});

export default router;
