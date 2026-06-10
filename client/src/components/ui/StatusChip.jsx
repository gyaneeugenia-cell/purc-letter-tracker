import { statusLabels } from '../../constants/statuses.js';

const statusStyles = {
  RECEIVED: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200',
  DISPATCHED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
};

export function StatusChip({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[status] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
      {statusLabels[status] || String(status || 'UNKNOWN').replaceAll('_', ' ')}
    </span>
  );
}
