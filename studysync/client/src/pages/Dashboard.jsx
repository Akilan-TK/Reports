import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../api.js";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const d = await apiGet("/api/analytics/dashboard");
        const s = await apiGet("/api/reflections/summary?window=7");
        if (!cancelled) {
          setData(d);
          setSummary(s);
        }
      } catch (e) {
        if (!cancelled) setErr(String(e.message || e));
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (err) return <div className="card"><strong>Error:</strong> {err}</div>;
  if (!data) return <div className="card">Loading…</div>;

  return (
    <div>
      <h2>Dashboard</h2>

      <div className="kpi">
        <div className="box">
          <div className="muted">Overdue</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{data.overdue.length}</div>
        </div>
        <div className="box">
          <div className="muted">Due in 48h</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{data.dueSoon.length}</div>
        </div>
        <div className="box">
          <div className="muted">In progress</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{data.inProgress.length}</div>
        </div>
      </div>

      <div className="card">
        <h3>Reflection (last 7 days)</h3>
        {summary && (
          <div className="row">
            <span className="pill">Entries: {summary.count}</span>
            <span className="pill">Avg mood: {summary.avgMood ? summary.avgMood.toFixed(2) : "n/a"}</span>
            <span className="pill">Avg productivity: {summary.avgProductivity ? summary.avgProductivity.toFixed(2) : "n/a"}</span>
          </div>
        )}
        <div className="muted" style={{ marginTop: 8 }}>
          Use Daily Reflection to track mood/productivity and spot patterns.
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h3>Overdue</h3>
          {data.overdue.length ? (
            <div className="list">
              {data.overdue.map(t => (
                <Link key={t.id} to={`/tasks/${t.id}`} className="item">
                  <div><strong>{t.title}</strong></div>
                  <div className="muted">Due: {t.due_at ? new Date(t.due_at).toLocaleString() : "n/a"}</div>
                </Link>
              ))}
            </div>
          ) : <div className="muted">No overdue tasks.</div>}
        </div>

        <div className="card">
          <h3>Due soon (48h)</h3>
          {data.dueSoon.length ? (
            <div className="list">
              {data.dueSoon.map(t => (
                <Link key={t.id} to={`/tasks/${t.id}`} className="item">
                  <div><strong>{t.title}</strong></div>
                  <div className="muted">Due: {t.due_at ? new Date(t.due_at).toLocaleString() : "n/a"}</div>
                </Link>
              ))}
            </div>
          ) : <div className="muted">No tasks due soon.</div>}
        </div>
      </div>

      <div className="card">
        <h3>In progress</h3>
        {data.inProgress.length ? (
          <div className="list">
            {data.inProgress.map(t => (
              <Link key={t.id} to={`/tasks/${t.id}`} className="item">
                <div><strong>{t.title}</strong></div>
                <div className="muted">
                  Status: {t.status} • Priority: {t.priority} • Due: {t.due_at ? new Date(t.due_at).toLocaleString() : "n/a"}
                </div>
              </Link>
            ))}
          </div>
        ) : <div className="muted">No tasks in progress.</div>}
      </div>
    </div>
  );
}
