# PURC Letter Tracker

Enterprise official letter and document tracking platform for incoming/outgoing letters, routing, workflow approvals, QR tracking, audit logs, notifications, reports, and document archiving.

## Project Structure

```text
client/   React, Tailwind CSS, Framer Motion, React Router, Recharts
server/   Node.js, Express, PostgreSQL, JWT, Multer, QR/PDF/Excel export
```

## Quick Start

```bash
npm install
npm run dev
```

Default URLs:

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000/api

Demo login:

- Email: `gyaneeugenia@gmail.com`
- Password: `Password123!`

The API can run with PostgreSQL configured through `server/.env`. If no database is available, it falls back to enterprise sample data so the UI remains fully explorable.
