import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiDelete, apiGet, apiPost, apiPut } from "../api.js";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" }
];

export default function Planner() {
  const [items, setItems] = useState([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [q, setQ] = useState("");
  const [err, setErr] = useState(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    due_at: "",
    priority: 2,
    status: "todo"
  });

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (filterStatus) p.set("status", filterStatus);
    if (q.trim()) p.set("q", q.trim());
    return p.toString() ? `?${p.toString()}` : "";
  }, [filterStatus, q]);

  async function load() {
    try {
      setErr(null);
      const data = await apiGet(`/api/tasks${query}`);
      setItems(data.items || []);
    } catch (e) {
      setErr(String(e.message || e));
    }
  }

  useEffect(() => { load(); }, [query]);

  async function createTask(e) {
    e.preventDefault();
    try {
      setErr(null);
      const payload = {
        ...form,
        due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
        priority: Number(form.priority)
      };
      await apiPost("/api/tasks", payload);
      setForm({ title: "", description: "", due_at: "", priority: 2, status: "todo" });
      await load();
    } catch (e2) {
      setErr(String(e2.message || e2));
    }
  }

  async function quickStatus(id, status) {
    await apiPut(`/api/tasks/${id}`, { status });
    await load();
  }

  async function remove(id) {
    if (!confirm("Delete this task? This removes subtasks and links.")) return;
    await apiDelete(`/api/tasks/${id}`);
    await load();
  }

  return (
    <div>
      <h2>Planner</h2>

      {err && <div className="card"><strong>Error:</strong> {err}</div>}

      <div className="card">
        <h3>Create task</h3>
        <form onSubmit={createTask}>
          <div className="row">
            <input
              style={{ minWidth: 280, flex: "1 1 auto" }}
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value={1}>Priority 1 (High)</option>
              <option value={2}>Priority 2 (Medium)</option>
              <option value={3}>Priority 3 (Low)</option>
            </select>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="todo">Todo</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
            <input
              type="datetime-local"
              value={form.due_at}
              onChange={(e) => setForm({ ...form, due_at: e.target.value })}
            />
            <button type="submit">Add</button>
          </div>
          <div style={{ marginTop: 10 }}>
            <input
              style={{ width: "100%" }}
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </form>
      </div>

      <div className="card">
        <div className="row">
          <input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button className="secondary" onClick={load}>Refresh</button>
        </div>

        <div style={{ marginTop: 12 }} className="list">
          {items.map(t => (
            <div key={t.id} className="item">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div style={{ minWidth: 280 }}>
                  <Link to={`/tasks/${t.id}`}><strong>{t.title}</strong></Link>
                  <div className="muted small">
                    Status: {t.status} • Priority: {t.priority} • Due: {t.due_at ? new Date(t.due_at).toLocaleString() : "n/a"}
                  </div>
                  {t.description && <div className="muted" style={{ marginTop: 6 }}>{t.description}</div>}
                </div>

                <div className="row">
                  <button className="secondary" onClick={() => quickStatus(t.id, "todo")}>Todo</button>
                  <button className="secondary" onClick={() => quickStatus(t.id, "in_progress")}>In progress</button>
                  <button className="secondary" onClick={() => quickStatus(t.id, "done")}>Done</button>
                  <button className="danger" onClick={() => remove(t.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
          {!items.length && <div className="muted">No tasks found.</div>}
        </div>
      </div>
    </div>
  );
}
