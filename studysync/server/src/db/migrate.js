import fs from "node:fs";
import path from "node:path";
import { openDb } from "./db.js";

export function migrate() {
  const db = openDb();
  const schemaPath = path.resolve(process.cwd(), "src", "db", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);
  return db;
}
