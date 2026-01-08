# StudySync (React + Node + SQLite)

A minimal academic productivity app:
- Study planner with task breakdown (tasks + subtasks)
- Notes with bidirectional linking to tasks
- Daily reflection (mood/productivity)
- Basic reminders (in-app; optional browser notifications while app is open)

## Prerequisites
- Node.js 18+ (recommended)
- npm 9+

## Quick start (dev)
From the repo root:

```bash
npm install
npm run dev
```

- API: http://localhost:4000
- Web: http://localhost:5173

The SQLite database file is created at `server/data/studysync.db`.

## Scripts
- `npm run dev` : start API + web dev server
- `npm run dev:server` : start API only
- `npm run dev:client` : start web only
- `npm run seed` : load demo data (overwrites existing DB)

## Notes on reminders (MVP)
Reminders are designed for an academic prototype:
- Stored in SQLite.
- The client polls `/api/reminders/due` every 30s and shows an in-app banner.
- Optional browser notifications via the Web Notifications API (requires permission and only works while the web app is open).
