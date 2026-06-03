const styles = {
  LOW: 'border-slate-200 text-slate-600',
  NORMAL: 'border-blue-200 text-blue-700',
  HIGH: 'border-amber-200 text-amber-700',
  URGENT: 'border-red-200 text-red-700'
};

export function PriorityBadge({ priority }) {
  return (
    <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${styles[priority] || styles.NORMAL}`}>
      {priority}
    </span>
  );
}
