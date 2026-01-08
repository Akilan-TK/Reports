import React, { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPost, apiPut } from "../api.js";

export default function Notes() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [err, setErr] = useState(null);
  const [q, setQ] = useState("");

  const [form, setForm] = useState({ title: "", body: "", tags: "" });

  async function load() {
    const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
    const data = await apiGet(`/api/notes${qs}`);
    setItems(data.items || []);
  }

  useEffect(() => { load(); }, []);

  async function select(id) {
    setSelected(id);
    const d = await apiGet(`/api/notes/${id}`);
    setDetail(d);
    setForm({ title: d.item.title, body: d.item.body, tags: d.item.tags || "" });
  }

  async function create(e) {
    e.preventDefault();
    try {
      setErr(null);
      const created = await apiPost("/api/notes", form);
      await load();
      await select(created.item.id);
    } catch (e2) {
      setErr(String(e2.message || e2));
    }
  }

  async function save(e) {
    e.preventDefault();
    if (!selected) return;
    try {
      setErr(null);
      await apiPut(`/api/notes/${selected}`, form);
      await load();
      await select(selected);
    } catch (e2) {
      setErr(String(e2.message || e2));
    }
  }

  async function remove() {
    if (!selected) return;
    if (!confirm("Delete this note? Links will be removed.")) return;
    await apiDelete(`/api/notes/${selected}`);
    setSelected(null);
    setDetail(null);
    setForm({ title: "", body: "", tags: "" });
    await load();
  }

  return (
    <div>
      <h2>Notes</h2>

      {err && <div className="card"><strong>Error:</strong> {err}</div>}

      <div className="grid2">
        <div className="card">
          <div className="row">
            <input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="secondary" onClick={load}>Search</button>
          </div>

          <div className="list" style={{ marginTop: 12 }}>
            {items.map(n => (
              <button
                key={n.id}
                className="secondary"
                style={{
                  textAlign: "left",
                  width: "100%",
                  borderColor: selected === n.id ? "#111827" : "#d1d5db"
                }}
                onClick={() => select(n.id)}
              >
                <div><strong>{n.title}</strong></div>
                <div className="muted small">{n.tags ? n.tags : "No tags"}</div>
              </button>
            ))}
            {!items.length && <div className="muted">No notes found.</div>}
          </div>
        </div>

        <div className="card">
          <h3>{selected ? "Edit note" : "Create note"}</h3>

          <form onSubmit={selected ? save : create}>
            <div className="row">
              <input style={{ flex: "1 1 auto" }} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <input placeholder="Tags (comma-separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </div>
            <div style={{ marginTop: 10 }}>
              <textarea placeholder="Write your notes…" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required />
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <button type="submit">{selected ? "Save" : "Create"}</button>
              {selected && <button type="button" className="danger" onClick={remove}>Delete</button>}
            </div>
          </form>

          {detail && (
            <div style={{ marginTop: 16 }}>
              <h4>Linked tasks</h4>
              {detail.tasks?.length ? (
                <div className="list">
                  {detail.tasks.map(t => (
                    <div key={t.id} className="item">
                      <div><strong>{t.title}</strong></div>
                      <div className="muted small">Status: {t.status} • Due: {t.due_at ? new Date(t.due_at).toLocaleString() : "n/a"}</div>
                    </div>
                  ))}
                </div>
              ) : <div className="muted">No tasks linked to this note.</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
