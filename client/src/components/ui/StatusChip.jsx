import { statusLabels } from '../../constants/statuses.js';

const statusStyles = {
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  ES_RECEIVED: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200',
  DISPATCHED_TO_DEPARTMENT: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200',
  READY_FOR_SIGNATURE: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200',
  DISPATCHED: 'bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-200',
  ARCHIVED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  REJECTED: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-200'
};

export function StatusChip({ status }) {
  const normalizedStatus = status === 'RECEIPT_RECORDED' ? 'DISPATCHED_TO_DEPARTMENT' : status;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[normalizedStatus] || statusStyles.DRAFT}`}>
      {statusLabels[normalizedStatus] || String(normalizedStatus || 'UNKNOWN').replaceAll('_', ' ')}
    </span>
  );
}
