import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import Planner from "./pages/Planner.jsx";
import TaskDetail from "./pages/TaskDetail.jsx";
import Notes from "./pages/Notes.jsx";
import Reflection from "./pages/Reflection.jsx";
import Settings from "./pages/Settings.jsx";
import { apiGet, apiPut } from "./api.js";

function useReminderPoller(enabled, notifyBrowser) {
  const [due, setDue] = useState([]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function tick() {
      try {
        const data = await apiGet("/api/reminders/due");
        if (cancelled) return;
        setDue(data.items || []);

        // optional browser notifications
        if (notifyBrowser && (data.items || []).length) {
          for (const r of data.items) {
            const title = r.task_title ? `Reminder: ${r.task_title}` : "StudySync reminder";
            const body = r.task_title ? "A scheduled reminder is due." : "A scheduled reminder is due.";
            try {
              if ("Notification" in window && Notification.permission === "granted") {
                // eslint-disable-next-line no-new
                new Notification(title, { body });
              }
            } catch { /* ignore */ }
          }
        }
      } catch {
        // ignore transient errors
      }
    }

    tick();
    const t = setInterval(tick, 30_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [enabled, notifyBrowser]);

  async function markFired(id) {
    await apiPut(`/api/reminders/${id}`, { status: "fired" });
    setDue((d) => d.filter((x) => x.id !== id));
  }

  return { due, markFired };
}

export default function App() {
  const [notifyBrowser, setNotifyBrowser] = useState(false);

  const { due, markFired } = useReminderPoller(true, notifyBrowser);

  const banner = useMemo(() => {
    if (!due.length) return null;
    const r = due[0];
    const title = r.task_title ? `Reminder due: ${r.task_title}` : "Reminder due";
    return { r, title };
  }, [due]);

  async function enableBrowserNotifications() {
    if (!("Notification" in window)) {
      alert("Browser notifications are not supported in this browser.");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") setNotifyBrowser(true);
    else setNotifyBrowser(false);
  }

  return (
    <div className="app">
      <nav className="nav">
        <h1>StudySync</h1>
        <NavLink to="/" end className={({ isActive }) => isActive ? "active" : ""}>Dashboard</NavLink>
        <NavLink to="/planner" className={({ isActive }) => isActive ? "active" : ""}>Planner</NavLink>
        <NavLink to="/notes" className={({ isActive }) => isActive ? "active" : ""}>Notes</NavLink>
        <NavLink to="/reflection" className={({ isActive }) => isActive ? "active" : ""}>Daily Reflection</NavLink>
        <NavLink to="/settings" className={({ isActive }) => isActive ? "active" : ""}>Settings</NavLink>

        <div className="card" style={{ background: "transparent", borderColor: "rgba(255,255,255,0.2)" }}>
          <div className="muted" style={{ color: "#d1d5db" }}>
            Notifications: {notifyBrowser ? "Browser + in-app" : "In-app only"}
          </div>
          <div style={{ marginTop: 10 }}>
            <button className="secondary" onClick={enableBrowserNotifications}>Enable browser notifications</button>
          </div>
        </div>
      </nav>

      <main className="content">
        {banner && (
          <div className="banner">
            <div>
              <div><strong>{banner.title}</strong></div>
              <div className="muted">Scheduled at: {new Date(banner.r.fire_at).toLocaleString()}</div>
            </div>
            <div className="row">
              <button className="secondary" onClick={() => markFired(banner.r.id)}>Dismiss</button>
            </div>
          </div>
        )}

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/tasks/:id" element={<TaskDetail />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/reflection" element={<Reflection />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
