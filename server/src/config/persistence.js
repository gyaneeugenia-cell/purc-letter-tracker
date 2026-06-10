// ─────────────────────────────────────────────────────────────────────────
// Optional PostgreSQL persistence.
//
// The app keeps working entirely on its in-memory arrays. When DATABASE_URL is
// set, this module ALSO:
//   1. creates simple tables that mirror the app's data (so pgAdmin shows
//      familiar columns and you can run SQL),
//   2. on startup: loads saved rows back into the in-memory arrays (so data
//      survives restarts) — or seeds the DB from the sample data on first run,
//   3. auto-saves the current data every few seconds and on shutdown.
//
// Every DB call is wrapped in try/catch: if anything fails, the app silently
// continues on in-memory data and never crashes.
// ─────────────────────────────────────────────────────────────────────────
import { pool } from './db.js';
import { letters, users, departments, movements, auditLogs, notifications } from '../utils/sampleData.js';

let enabled = false;

// Friendly labels so the database is readable in pgAdmin (alongside the codes).
const STATUS_LABELS = {
  RECEIVED: 'Received',
  DISPATCHED: 'Dispatched'
};
const TYPE_LABELS = { INCOMING: 'Received', OUTGOING: 'Outgoing' };

const SCHEMA = `
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY, code TEXT, name TEXT, head TEXT, status TEXT, data JSONB
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT, email TEXT, password_hash TEXT, role TEXT,
  department TEXT, title TEXT, avatar TEXT, data JSONB
);
CREATE TABLE IF NOT EXISTS letters (
  id TEXT PRIMARY KEY, tracking_number TEXT, type TEXT, type_label TEXT, status TEXT, status_label TEXT, priority TEXT,
  subject TEXT, sender_organization TEXT, sender TEXT, recipient TEXT,
  route_department TEXT, current_department TEXT, registry_number TEXT, letter_number TEXT,
  letter_date TEXT, attachments INTEGER, remarks TEXT, due_at TEXT,
  received_at TEXT, dispatched_at TEXT, created_at TEXT, updated_at TEXT,
  created_by TEXT, created_by_department TEXT, data JSONB
);
-- Make sure the readable label columns exist even on databases created earlier.
ALTER TABLE letters ADD COLUMN IF NOT EXISTS type_label TEXT;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS status_label TEXT;
CREATE TABLE IF NOT EXISTS letter_movements (
  id TEXT PRIMARY KEY, letter_id TEXT, title TEXT, actor TEXT, department TEXT,
  status TEXT, at TEXT, note TEXT, data JSONB
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY, action TEXT, actor TEXT, entity TEXT, severity TEXT, at TEXT, ip TEXT, data JSONB
);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY, title TEXT, message TEXT, status TEXT, created_at TEXT, data JSONB
);
`;

// How each in-memory row maps to explicit table columns (besides the JSONB `data`).
const TABLES = {
  departments: {
    array: departments,
    columns: ['id', 'code', 'name', 'head', 'status'],
    values: (d) => [d.id, d.code, d.name, d.head, d.status]
  },
  users: {
    array: users,
    columns: ['id', 'name', 'email', 'password_hash', 'role', 'department', 'title', 'avatar'],
    values: (u) => [u.id, u.name, u.email, u.passwordHash, u.role, u.department, u.title, u.avatar]
  },
  letters: {
    array: letters,
    columns: ['id', 'tracking_number', 'type', 'type_label', 'status', 'status_label', 'priority', 'subject', 'sender_organization',
      'sender', 'recipient', 'route_department', 'current_department', 'registry_number', 'letter_number',
      'letter_date', 'attachments', 'remarks', 'due_at', 'received_at', 'dispatched_at', 'created_at',
      'updated_at', 'created_by', 'created_by_department'],
    values: (l) => [l.id, l.trackingNumber, l.type, TYPE_LABELS[l.type] || l.type, l.status, STATUS_LABELS[l.status] || l.status, l.priority, l.subject, l.senderOrganization,
      l.sender, l.recipient, l.routeDepartment, l.currentDepartment, l.registryNumber, l.letterNumber,
      l.letterDate, Number(l.attachments) || 0, l.remarks, l.dueAt, l.receivedAt, l.dispatchedAt,
      l.createdAt, l.updatedAt, l.createdBy, l.createdByDepartment]
  },
  letter_movements: {
    array: movements,
    columns: ['id', 'letter_id', 'title', 'actor', 'department', 'status', 'at', 'note'],
    values: (m) => [m.id, m.letterId, m.title, m.actor, m.department, m.status, m.at, m.note]
  },
  audit_logs: {
    array: auditLogs,
    columns: ['id', 'action', 'actor', 'entity', 'severity', 'at', 'ip'],
    values: (a) => [a.id, a.action, a.actor, a.entity, a.severity, a.at, a.ip]
  },
  notifications: {
    array: notifications,
    columns: ['id', 'title', 'message', 'status', 'created_at'],
    values: (n) => [n.id, n.title, n.message, n.status, n.createdAt]
  }
};

function replaceArray(target, rows) {
  target.length = 0;
  rows.forEach((row) => target.push(row));
}

async function saveTable(client, name, def) {
  await client.query(`DELETE FROM ${name}`);
  for (const row of def.array) {
    if (!row || !row.id) continue;
    const explicit = def.values(row);
    const cols = [...def.columns, 'data'];
    const params = [...explicit, JSON.stringify(row)];
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    await client.query(
      `INSERT INTO ${name} (${cols.join(', ')}) VALUES (${placeholders})
       ON CONFLICT (id) DO NOTHING`,
      params
    );
  }
}

// Snapshot every in-memory array into the database (atomic per save).
export async function persistAll() {
  if (!enabled || !pool) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [name, def] of Object.entries(TABLES)) {
      await saveTable(client, name, def);
    }
    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    console.error('[persistence] save failed:', err.message);
  } finally {
    client.release();
  }
}

async function loadInto(name, def) {
  const { rows } = await pool.query(`SELECT data FROM ${name}`);
  if (rows.length) {
    replaceArray(def.array, rows.map((r) => r.data));
  }
}

export async function initPersistence() {
  if (!pool) {
    console.log('[persistence] DATABASE_URL not set — running on in-memory data only.');
    return;
  }
  try {
    await pool.query(SCHEMA);
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM letters');
    if (rows[0].n === 0) {
      // First run: seed the database from the built-in sample data.
      enabled = true;
      await persistAll();
      console.log('[persistence] Database connected and seeded with sample data.');
    } else {
      // Restore saved data back into the in-memory arrays.
      for (const [name, def] of Object.entries(TABLES)) {
        await loadInto(name, def);
      }
      enabled = true;
      console.log('[persistence] Database connected — saved data restored.');
    }

    // Collapse any legacy priorities to the two supported values (URGENT/NORMAL).
    letters.forEach((l) => {
      l.priority = ['URGENT', 'HIGH'].includes(String(l.priority || '').toUpperCase()) ? 'URGENT' : 'NORMAL';
    });
    // Collapse any legacy statuses to the two supported values:
    // RECEIVED (received by the commission) and DISPATCHED (sent from the commission).
    letters.forEach((l) => {
      l.status = l.type === 'OUTGOING' ? 'DISPATCHED' : 'RECEIVED';
    });

    // Auto-save every 15 seconds and on shutdown.
    setInterval(() => { persistAll(); }, 15000);
    const flush = async () => { await persistAll(); process.exit(0); };
    process.on('SIGTERM', flush);
    process.on('SIGINT', flush);
  } catch (err) {
    enabled = false;
    console.error('[persistence] Could not initialise database — continuing on in-memory data:', err.message);
  }
}
