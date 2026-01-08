import fs from "node:fs";
import path from "node:path";
import { migrate } from "./migrate.js";
import { openDb, toIsoOrNull } from "./db.js";

const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), "data", "studysync.db");

function resetDbFile() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
}

function main() {
  resetDbFile();
  const db = migrate();

  const insertTask = db.prepare(
    "INSERT INTO tasks (title, description, due_at, priority, status) VALUES (@title, @description, @due_at, @priority, @status)"
  );
  const insertSub = db.prepare(
    "INSERT INTO subtasks (task_id, title, status, sort_order) VALUES (?, ?, ?, ?)"
  );
  const insertNote = db.prepare(
    "INSERT INTO notes (title, body, tags) VALUES (?, ?, ?)"
  );
  const link = db.prepare("INSERT OR IGNORE INTO task_notes (task_id, note_id) VALUES (?, ?)");
  const upsertReflection = db.prepare(
    `INSERT INTO reflections (day, mood, productivity, text)
     VALUES (@day, @mood, @productivity, @text)
     ON CONFLICT(day) DO UPDATE SET mood=excluded.mood, productivity=excluded.productivity, text=excluded.text`
  );
  const insertReminder = db.prepare(
    "INSERT INTO reminders (task_id, fire_at, channel, status) VALUES (?, ?, ?, 'scheduled')"
  );

  const t1 = insertTask.run({
    title: "COMP1680 Assignment: Cost analysis report",
    description: "Break down sections, gather references, draft, revise, finalise.",
    due_at: toIsoOrNull(new Date(Date.now() + 5*24*3600*1000)),
    priority: 1,
    status: "in_progress"
  }).lastInsertRowid;

  insertSub.run(t1, "Create outline and word budget", "done", 1);
  insertSub.run(t1, "Collect 6–8 academic references", "in_progress", 2);
  insertSub.run(t1, "Draft sections 1–3", "todo", 3);
  insertSub.run(t1, "Draft sections 4–6", "todo", 4);
  insertSub.run(t1, "Final proof + Harvard refs", "todo", 5);

  const t2 = insertTask.run({
    title: "Exam prep: Distributed Systems",
    description: "Focus on consistency models, consensus, failure modes.",
    due_at: toIsoOrNull(new Date(Date.now() + 10*24*3600*1000)),
    priority: 2,
    status: "todo"
  }).lastInsertRowid;

  insertSub.run(t2, "Review lecture slides 1–5", "todo", 1);
  insertSub.run(t2, "Solve past paper Q1–Q3", "todo", 2);
  insertSub.run(t2, "Make flashcards for key terms", "todo", 3);

  const n1 = insertNote.run(
    "Cost analysis: key assumptions",
    "Make sure to justify cost model inputs: instance type, run time, storage, egress, and opportunity cost. Compare HPC vs cloud.",
    "hpc,cloud,cost"
  ).lastInsertRowid;

  const n2 = insertNote.run(
    "Consensus quick notes",
    "Raft: leader election, log replication, safety. Failure modes: split-brain, partitions; mitigations: quorums/timeouts.",
    "distributed,raft,consensus"
  ).lastInsertRowid;

  link.run(t1, n1);
  link.run(t2, n2);

  const today = new Date().toISOString().slice(0, 10);
  upsertReflection.run({
    day: today,
    mood: 4,
    productivity: 3,
    text: "Planned well, but context-switching hurt focus. Next: timebox deep work."
  });

  insertReminder.run(t1, new Date(Date.now() + 60*60*1000).toISOString(), "in_app");
  insertReminder.run(t2, new Date(Date.now() + 2*60*60*1000).toISOString(), "in_app");

  db.close();
  console.log("Seed complete:", DB_PATH);
}

main();
