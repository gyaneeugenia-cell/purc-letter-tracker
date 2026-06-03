# Deploying the PURC Letter Tracker

The app is now packaged as a **single web service**: the Express server builds and
serves the React client, so one deployment gives you one shareable URL.

## What changed to make it deployable
- The client calls the API at a **relative `/api`** path in production, so it works
  on any domain automatically (no hard-coded `localhost`).
- The server **serves the built client** (`client/dist`) and falls back to
  `index.html` for React Router routes — so every tab works after refresh.
- CORS reflects the request origin, so there are no cross-origin errors.
- A global **ErrorBoundary** prevents any page from showing a blank screen.

## Option A — Render.com (free, recommended)
1. Push this folder to a GitHub repository.
2. Go to https://render.com → **New → Blueprint**, and point it at your repo.
   Render reads the included `render.yaml` automatically.
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
3. Click **Apply**. After ~3–5 minutes Render gives you a public URL like
   `https://purc-letter-tracker.onrender.com` — send that to your supervisor.

(No database is required — the app runs on its built-in sample data.)

## Option B — Railway.com
1. Push to GitHub, then https://railway.app → **New Project → Deploy from repo**.
2. Set Build = `npm install && npm run build`, Start = `npm start`.
3. Railway exposes a public URL you can share.

## Run it locally as it will run in production
```bash
npm install
npm run build      # builds client/dist
npm start          # serves API + client on http://localhost:4000
```
Open http://localhost:4000

## Login for your supervisor
Use the demo accounts shown on the login screen (admin + normal user).

## Database / SQL (optional, future)
The program currently runs on **in-memory sample data**, so there is no SQL
database to query yet. To enable real SQL:
1. Provision a PostgreSQL database (Render/Railway/Neon all offer free ones).
2. Set the `DATABASE_URL` environment variable on the service.
3. The server already includes a `pg` connection pool (`server/src/config/db.js`);
   the data routes would then be migrated from sample data to SQL tables.
Until that migration is done, you can browse all records through the app's
existing pages (Dashboard, Received Letters, Letters Sent, Search, Audit Logs).
