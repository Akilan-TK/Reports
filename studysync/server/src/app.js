import express from "express";
import cors from "cors";
import morgan from "morgan";
import tasks from "./routes/tasks.js";
import notes from "./routes/notes.js";
import reflections from "./routes/reflections.js";
import reminders from "./routes/reminders.js";
import analytics from "./routes/analytics.js";
import { migrate } from "./db/migrate.js";

// Ensure DB schema exists on startup
migrate();

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/tasks", tasks);
app.use("/api/notes", notes);
app.use("/api/reflections", reflections);
app.use("/api/reminders", reminders);
app.use("/api/analytics", analytics);

// Basic error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Internal error";
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`StudySync API listening on http://localhost:${PORT}`);
});
