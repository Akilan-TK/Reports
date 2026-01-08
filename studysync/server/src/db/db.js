import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), "data", "studysync.db");

export function openDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("foreign_keys = ON");
  return db;
}

export function isoNow() {
  return new Date().toISOString();
}

export function toIsoOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
