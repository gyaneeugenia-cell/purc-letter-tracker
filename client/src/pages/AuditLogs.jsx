import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { http } from '../api/http.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ExportButtons } from '../components/ui/ExportButtons.jsx';

const auditColumns = [
  { header: 'Time', accessor: (l) => new Date(l.at).toLocaleString('en-GB') },
  { header: 'Actor', accessor: (l) => l.actor || '-' },
  { header: 'Action', accessor: (l) => l.action || '-' },
  { header: 'Reference No.', accessor: (l) => l.entity || '-' },
  { header: 'Severity', accessor: (l) => l.severity || '-' }
];

export default function AuditLogs() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SYSTEM_ADMIN';
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  useEffect(() => { http.get('/audit-logs').then((res) => setLogs(res.data.data)); }, []);

  async function deleteLog(log) {
    if (!isAdmin) return;
    if (!window.confirm('Delete this audit log entry? This cannot be undone.')) return;
    setBusyId(log.id);
    setError('');
    try {
      await http.delete(`/audit-logs/${log.id}`);
      setLogs((items) => items.filter((item) => item.id !== log.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  async function clearAll() {
    if (!isAdmin || !logs.length) return;
    if (!window.confirm(`Delete all ${logs.length} audit log entries? This cannot be undone.`)) return;
    setError('');
    try {
      await http.delete('/audit-logs');
      setLogs([]);
    } catch (err) {
      setError(err.message);
    }
  }

  const headers = isAdmin
    ? ['Time', 'Actor', 'Action', 'Reference No.', 'Actions']
    : ['Time', 'Actor', 'Action', 'Reference No.'];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-extrabold text-purcBlue shadow-sm ring-1 ring-blue-100 dark:bg-blue-900/50 dark:text-blue-100 dark:ring-blue-800/70">
          Audit Logs
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <ExportButtons title="Audit Activity Log" periodLabel="All Records" columns={auditColumns} rows={logs} size="sm" />
          {isAdmin && (
            <button
              onClick={clearAll}
              disabled={!logs.length}
              className="inline-flex items-center gap-2 rounded-sm border border-red-200 px-3 py-2 text-xs font-bold text-purcRed transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
            >
              <Trash2 size={14} /> Clear all
            </button>
          )}
        </div>
      </div>
      {error && <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-purcRed">{error}</div>}
      <div className="table-shell">
        <table className="min-w-full text-left text-sm [&_td]:break-words">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-white/5">
              {headers.map((h) => <th key={h} className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {logs.map((log) => (
              <tr key={log.id} className="transition-colors hover:bg-blue-50/40 dark:hover:bg-white/5">
                <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{new Date(log.at).toLocaleString()}</td>
                <td className="px-4 py-3.5 text-slate-700 dark:text-slate-200">{log.actor}</td>
                <td className="px-4 py-3.5 font-semibold text-ink dark:text-white">{log.action}</td>
                <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{log.entity}</td>
                {isAdmin && (
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => deleteLog(log)}
                      disabled={busyId === log.id}
                      className="inline-flex items-center gap-2 rounded-sm border border-red-200 px-3 py-2 text-xs font-bold text-purcRed transition hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {!logs.length && (
              <tr><td colSpan={headers.length} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">No audit activity recorded.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
