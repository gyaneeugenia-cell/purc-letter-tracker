import dns from 'node:dns';
// Render's network is IPv4-only for outbound connections. Some hosts (Gmail's
// SMTP, in particular) resolve to IPv6 first, which fails with ENETUNREACH.
// Prefer IPv4 so outbound email and database connections work reliably.
dns.setDefaultResultOrder('ipv4first');

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { initPersistence } from './config/persistence.js';
import { authenticate } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { lettersRouter } from './modules/letters/letters.routes.js';
import { documentsRouter } from './modules/documents/documents.routes.js';
import { notificationsRouter } from './modules/notifications/notifications.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { searchRouter } from './modules/search/search.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { assistantRouter } from './modules/assistant/assistant.routes.js';

const app = express();

// Render terminates TLS at a proxy and sets X-Forwarded-For; trust it so
// rate-limiting identifies clients correctly (and stops the validation error).
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
// Reflect the request origin so the API works from any deployed front-end host.
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 500 }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'purc-letter-tracking-api', time: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/dashboard', authenticate, dashboardRouter);
app.use('/api/letters', authenticate, lettersRouter);
app.use('/api/documents', authenticate, documentsRouter);
app.use('/api/notifications', authenticate, notificationsRouter);
app.use('/api/reports', authenticate, reportsRouter);
app.use('/api/audit-logs', authenticate, auditRouter);
app.use('/api/search', authenticate, searchRouter);
app.use('/api/admin', authenticate, adminRouter);
app.use('/api/assistant', authenticate, assistantRouter);

app.get('/api/tracking/:trackingNumber', (req, res) => {
  res.json({ trackingNumber: req.params.trackingNumber, message: 'Tracking endpoint active' });
});

// ── Serve the built React client (single-service deployment) ──
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback: any non-API route returns index.html so React Router handles it.
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Unmatched /api routes only
app.use(notFound);
app.use(errorHandler);

// Initialise optional database persistence, then start serving.
initPersistence().finally(() => {
  app.listen(env.port, () => {
    console.log(`PURC API listening on http://localhost:${env.port}/api`);
  });
});
