import { useEffect, useState } from 'react';
import { http } from '../api/http.js';
import { PeriodLabel, formatRangeLabel, usePersistentPeriod } from '../components/ui/PeriodControls.jsx';
import { ExportButtons } from '../components/ui/ExportButtons.jsx';

const auditColumns = [
  { header: 'Time', accessor: (l) => new Date(l.at).toLocaleString('en-GB') },
  { header: 'Actor', accessor: (l) => l.actor || '-' },
  { header: 'Action', accessor: (l) => l.action || '-' },
  { header: 'Reference No.', accessor: (l) => l.entity || '-' },
  { header: 'Severity', accessor: (l) => l.severity || '-' }
];

export default function AuditLogs() {
  const { timeRange } = usePersistentPeriod();
  const [logs, setLogs] = useState([]);
  useEffect(() => { http.get('/audit-logs').then((res) => setLogs(res.data.data)); }, []);
  return (
    <div className="space-y-6">
      <PeriodLabel timeRange={timeRange} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-extrabold text-purcBlue shadow-sm ring-1 ring-blue-100 dark:bg-blue-900/50 dark:text-blue-100 dark:ring-blue-800/70">
          Audit Logs
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-300">{logs.length} record(s)</span>
          <ExportButtons title="Audit Activity Log" periodLabel={formatRangeLabel(timeRange)} columns={auditColumns} rows={logs} size="sm" />
        </div>
      </div>
      <div className="table-shell">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-white/5">
              {['Time', 'Actor', 'Action', 'Reference No.'].map((h) => <th key={h} className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {logs.map((log) => (
              <tr key={log.id} className="transition-colors hover:bg-blue-50/40 dark:hover:bg-white/5">
                <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{new Date(log.at).toLocaleString()}</td>
                <td className="px-4 py-3.5 text-slate-700 dark:text-slate-200">{log.actor}</td>
                <td className="px-4 py-3.5 font-semibold text-ink dark:text-white">{log.action}</td>
                <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{log.entity}</td>
              </tr>
            ))}
            {!logs.length && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">No audit activity recorded.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
