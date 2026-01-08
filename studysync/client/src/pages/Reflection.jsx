import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPut } from "../api.js";

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

export default function Reflection() {
  const day = useMemo(() => todayYmd(), []);
  const [mood, setMood] = useState(3);
  const [productivity, setProductivity] = useState(3);
  const [text, setText] = useState("");
  const [recent, setRecent] = useState([]);
  const [summary, setSummary] = useState(null);
  const [err, setErr] = useState(null);

  async function load() {
    try {
      setErr(null);
      const list = await apiGet("/api/reflections?from=" + encodeURIComponent(day));
      const s = await apiGet("/api/reflections/summary?window=7");
      setSummary(s);

      // If already have today's entry, show it
      const todays = (list.items || []).find(r => r.day === day);
      if (todays) {
        setMood(Number(todays.mood));
        setProductivity(Number(todays.productivity));
        setText(todays.text || "");
      }
      // recent 7 days
      const recentList = await apiGet("/api/reflections?from=" + encodeURIComponent(new Date(Date.now() - 7*24*3600*1000).toISOString().slice(0,10)));
      setRecent(recentList.items || []);
    } catch (e) {
      setErr(String(e.message || e));
    }
  }

  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    try {
      setErr(null);
      await apiPut(`/api/reflections/${day}`, { mood: Number(mood), productivity: Number(productivity), text });
      await load();
      alert("Saved.");
    } catch (e2) {
      setErr(String(e2.message || e2));
    }
  }

  return (
    <div>
      <h2>Daily Reflection</h2>

      {err && <div className="card"><strong>Error:</strong> {err}</div>}

      <div className="card">
        <h3>Today ({day})</h3>
        <form onSubmit={save}>
          <div className="row">
            <label>
              Mood (1–5)
              <select value={mood} onChange={(e) => setMood(e.target.value)} style={{ marginLeft: 8 }}>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label>
              Productivity (1–5)
              <select value={productivity} onChange={(e) => setProductivity(e.target.value)} style={{ marginLeft: 8 }}>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
          <div style={{ marginTop: 10 }}>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="What went well? What didn’t? What will you change tomorrow?" />
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button type="submit">Save reflection</button>
          </div>
        </form>

        {summary && (
          <div style={{ marginTop: 14 }} className="row">
            <span className="pill">7-day avg mood: {summary.avgMood ? summary.avgMood.toFixed(2) : "n/a"}</span>
            <span className="pill">7-day avg productivity: {summary.avgProductivity ? summary.avgProductivity.toFixed(2) : "n/a"}</span>
            <span className="pill">Entries: {summary.count}</span>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Recent entries</h3>
        {recent.length ? (
          <div className="list">
            {recent.map(r => (
              <div key={r.id} className="item">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div><strong>{r.day}</strong></div>
                  <div className="row">
                    <span className="pill">Mood: {r.mood}</span>
                    <span className="pill">Productivity: {r.productivity}</span>
                  </div>
                </div>
                {r.text && <div className="muted" style={{ marginTop: 8 }}>{r.text}</div>}
              </div>
            ))}
          </div>
        ) : <div className="muted">No recent entries yet.</div>}
      </div>
    </div>
  );
}
