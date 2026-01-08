import React from "react";

export default function Settings() {
  return (
    <div>
      <h2>Settings</h2>
      <div className="card">
        <h3>Prototype notes</h3>
        <ul>
          <li>This is an academic MVP (single-user, local DB).</li>
          <li>Reminders fire while the app is open (in-app banner; optional browser notifications).</li>
          <li>For evaluation, keep tasks realistic and time-bound.</li>
        </ul>
      </div>
    </div>
  );
}
