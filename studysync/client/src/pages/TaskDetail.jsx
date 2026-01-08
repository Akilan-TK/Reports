import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiDelete, apiGet, apiPost, apiPut } from "../api.js";

const STATUS = ["todo", "in_progress", "done"];

function toLocalInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function TaskDetail() {
  const { id } = useParams();
  const taskId = Number(id);

  const [task, setTask] = useState(null);
  const [subtasks, setSubtasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [allNotes, setAllNotes] = useState([]);
  const [err, setErr] = useState(null);

  const [edit, setEdit] = useState(null);
  const [newSub, setNewSub] = useState("");
  const [noteToLink, setNoteToLink] = useState("");
  const [reminderAt, setReminderAt] = useState("");

  const linkedNoteIds = useMemo(() => new Set(notes.map(n => n.id)), [notes]);

  async function load() {
    try {
      setErr(null);
      const data = await apiGet(`/api/tasks/${taskId}`);
      setTask(data.item);
      setSubtasks(data.subtasks || []);
      setNotes(data.notes || []);
      const noteList = await apiGet("/api/notes");
      setAllNotes(noteList.items || []);
      setEdit({
        title: data.item.title,
        description: data.item.description || "",
        due_at: toLocalInputValue(data.item.due_at),
        priority: data.item.priority,
        status: data.item.status
      });
    } catch (e) {
      setErr(String(e.message || e));
    }
  }

  useEffect(() => { load(); }, [taskId]);

  async function saveTask(e) {
    e.preventDefault();
    try {
      const payload = {
        ...edit,
        priority: Number(edit.priority),
        due_at: edit.due_at ? new Date(edit.due_at).toISOString() : null
      };
      await apiPut(`/api/tasks/${taskId}`, payload);
      await load();
    } catch (e2) {
      setErr(String(e2.message || e2));
    }
  }

  async function addSubtask(e) {
    e.preventDefault();
    if (!newSub.trim()) return;
    await apiPost(`/api/tasks/${taskId}/subtasks`, { title: newSub.trim(), status: "todo", sort_order: subtasks.length + 1 });
    setNewSub("");
    await load();
  }

  async function setSubStatus(sub, status) {
    await apiPut(`/api/tasks/subtasks/${sub.id}`, { status });
    await load();
  }

  async function deleteSub(subId) {
    await apiDelete(`/api/tasks/subtasks/${subId}`);
    await load();
  }

  async function linkNote() {
    const nid = Number(noteToLink);
    if (!nid) return;
    await apiPost(`/api/tasks/${taskId}/notes/${nid}`);
    setNoteToLink("");
    await load();
  }

  async function unlinkNote(nid) {
    await apiDelete(`/api/tasks/${taskId}/notes/${nid}`);
    await load();
  }

  async function createReminder() {
    if (!reminderAt) return;
    await apiPost("/api/reminders", {
      task_id: taskId,
      fire_at: new Date(reminderAt).toISOString(),
      channel: "in_app"
    });
    setReminderAt("");
    alert("Reminder scheduled (in-app).");
  }

  if (err) return <div className="card"><strong>Error:</strong> {err}</div>;
  if (!task || !edit) return <div className="card">Loading…</div>;

  const availableNotes = allNotes.filter(n => !linkedNoteIds.has(n.id));

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2>Task</h2>
        <div className="row">
          <Link className="pill" to="/planner">Back to Planner</Link>
        </div>
      </div>

      <div className="card">
        <h3>Edit</h3>
        <form onSubmit={saveTask}>
          <div className="row">
            <input style={{ minWidth: 300, flex: "1 1 auto" }} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
            <select value={edit.priority} onChange={(e) => setEdit({ ...edit, priority: e.target.value })}>
              <option value={1}>Priority 1 (High)</option>
              <option value={2}>Priority 2 (Medium)</option>
              <option value={3}>Priority 3 (Low)</option>
            </select>
            <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
              {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="datetime-local" value={edit.due_at} onChange={(e) => setEdit({ ...edit, due_at: e.target.value })} />
            <button type="submit">Save</button>
          </div>
          <div style={{ marginTop: 10 }}>
            <input style={{ width: "100%" }} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} placeholder="Description" />
          </div>
        </form>

        <div style={{ marginTop: 16 }}>
          <h4>Reminder</h4>
          <div className="row">
            <input type="datetime-local" value={reminderAt} onChange={(e) => setReminderAt(e.target.value)} />
            <button type="button" onClick={createReminder}>Schedule</button>
            <span className="muted">MVP: reminders fire while the app is open.</span>
          </div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h3>Subtasks</h3>
          <form onSubmit={addSubtask} className="row">
            <input style={{ flex: "1 1 auto", minWidth: 240 }} placeholder="New subtask" value={newSub} onChange={(e) => setNewSub(e.target.value)} />
            <button type="submit">Add</button>
          </form>

          <div className="list" style={{ marginTop: 12 }}>
            {subtasks.map(s => (
              <div key={s.id} className="item">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div>
                    <div><strong>{s.title}</strong></div>
                    <div className="muted small">Status: {s.status}</div>
                  </div>
                  <div className="row">
                    <button className="secondary" onClick={() => setSubStatus(s, "todo")}>Todo</button>
                    <button className="secondary" onClick={() => setSubStatus(s, "in_progress")}>In progress</button>
                    <button className="secondary" onClick={() => setSubStatus(s, "done")}>Done</button>
                    <button className="danger" onClick={() => deleteSub(s.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
            {!subtasks.length && <div className="muted">No subtasks yet.</div>}
          </div>
        </div>

        <div className="card">
          <h3>Linked notes</h3>
          <div className="row">
            <select value={noteToLink} onChange={(e) => setNoteToLink(e.target.value)} style={{ minWidth: 280, flex: "1 1 auto" }}>
              <option value="">Select a note to link…</option>
              {availableNotes.map(n => (
                <option key={n.id} value={n.id}>{n.title}</option>
              ))}
            </select>
            <button type="button" onClick={linkNote}>Link</button>
            <Link className="pill" to="/notes">Go to Notes</Link>
          </div>

          <div className="list" style={{ marginTop: 12 }}>
            {notes.map(n => (
              <div key={n.id} className="item">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div>
                    <div><strong>{n.title}</strong></div>
                    <div className="muted small">{n.tags ? `Tags: ${n.tags}` : "No tags"}</div>
                  </div>
                  <div className="row">
                    <button className="secondary" onClick={() => unlinkNote(n.id)}>Unlink</button>
                  </div>
                </div>
                <div className="muted" style={{ marginTop: 8 }}>
                  {n.body.length > 160 ? `${n.body.slice(0, 160)}…` : n.body}
                </div>
              </div>
            ))}
            {!notes.length && <div className="muted">No notes linked to this task.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
