// Flat, borderless metric in the spirit of Material 3 / Fluent 2:
// a small uppercase label, a large tabular number, and a single PURC-blue
// accent. No card, no shadow, no rounded container — whitespace does the work.
export function MetricStat({ icon: Icon, label, value, trend }) {
  const hasTrend = trend !== undefined && trend !== null && trend !== '';
  const trendUp = Number(trend) >= 0;

  return (
    <div className="flex flex-col gap-3 px-0 py-2 sm:px-8 sm:first:pl-0">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        {Icon && <Icon size={16} strokeWidth={2} className="text-purcBlue dark:text-blue-300" />}
        <span className="text-[11px] font-semibold uppercase tracking-[0.09em]">{label}</span>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-[44px] font-semibold leading-none tracking-tight text-slate-900 tabular-nums dark:text-white">
          {value}
        </span>
        {hasTrend && (
          <span className={`text-xs font-semibold tabular-nums ${trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {trendUp ? '▲' : '▼'} {Math.abs(Number(trend))}%
          </span>
        )}
      </div>
    </div>
  );
}
