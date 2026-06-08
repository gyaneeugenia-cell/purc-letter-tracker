// Only two priorities are supported: URGENT and NORMAL.
// Any legacy HIGH is shown as Urgent; legacy LOW is shown as Normal.
function normalize(priority) {
  return ['URGENT', 'HIGH'].includes(String(priority || '').toUpperCase()) ? 'URGENT' : 'NORMAL';
}

const styles = {
  NORMAL: 'border-blue-200 text-blue-700',
  URGENT: 'border-red-200 text-red-700'
};

const labels = { NORMAL: 'NORMAL', URGENT: 'URGENT' };

export function PriorityBadge({ priority }) {
  const key = normalize(priority);
  return (
    <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${styles[key]}`}>
      {labels[key]}
    </span>
  );
}
