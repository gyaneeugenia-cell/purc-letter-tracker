import { useEffect, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';

export const groupingOptions = [
  { value: 'yearly', label: 'Yearly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'daily', label: 'Daily' }
];

const periodStorageKey = 'purc_reporting_period';

function pad(value) {
  return String(value).padStart(2, '0');
}

export function toDateInput(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const ALL_TIME_START = '2020-01-01';

export function getDefaultRange() {
  const now = new Date();
  // Default to all available records — from 2020 to today
  return {
    from: ALL_TIME_START,
    to: toDateInput(now)
  };
}

export function isAllTimeRange(range) {
  return range?.from === ALL_TIME_START && range?.to === toDateInput(new Date());
}

export function formatRangeLabel(range) {
  // When the range covers everything up to today, show a clear label instead of raw dates.
  if (isAllTimeRange(range)) return 'All Records (To Date)';
  const from = new Date(range.from);
  const to = new Date(range.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 'Select dates';
  const fromLabel = from.toLocaleString('en', { month: 'short', day: 'numeric', year: 'numeric' });
  const toLabel = to.toLocaleString('en', { month: 'short', day: 'numeric', year: 'numeric' });
  return range.from === range.to ? fromLabel : `${fromLabel} - ${toLabel}`;
}

function normalizeRange(range) {
  const fallback = getDefaultRange();
  let from = range?.from || fallback.from;
  let to = range?.to || fallback.to;
  if (new Date(from).getTime() > new Date(to).getTime()) {
    [from, to] = [to, from];
  }
  return { from, to };
}

function isSingleDate(range) {
  return Boolean(range?.from && range?.to && range.from === range.to);
}

function normalizeGrouping(groupBy, range) {
  if (isSingleDate(range)) return 'daily';
  return groupingOptions.some((option) => option.value === groupBy) ? groupBy : 'weekly';
}

function getSavedPeriod() {
  const fallbackRange = getDefaultRange();
  const fallback = { timeRange: fallbackRange, groupBy: normalizeGrouping('monthly', fallbackRange) };
  if (typeof window === 'undefined') return fallback;

  try {
    const saved = JSON.parse(window.localStorage.getItem(periodStorageKey));
    // If no saved period, use all-time default
    if (!saved?.timeRange?.from) return fallback;
    const timeRange = normalizeRange(saved.timeRange);
    return { timeRange, groupBy: normalizeGrouping(saved?.groupBy, timeRange) };
  } catch {
    return fallback;
  }
}

function savePeriod(timeRange, groupBy) {
  if (typeof window === 'undefined') return;
  const normalizedRange = normalizeRange(timeRange);
  const period = { timeRange: normalizedRange, groupBy: normalizeGrouping(groupBy, normalizedRange) };

  try {
    window.localStorage.setItem(periodStorageKey, JSON.stringify(period));
  } catch {
    // The selected range still works for this session when browser storage is unavailable.
  }
}

export function usePersistentPeriod() {
  const [{ timeRange: initialRange, groupBy: initialGrouping }] = useState(() => getSavedPeriod());
  const [timeRange, setTimeRange] = useState(initialRange);
  const [groupBy, setGroupBy] = useState(initialGrouping);

  useEffect(() => {
    savePeriod(timeRange, groupBy);
  }, [groupBy, timeRange]);

  return { timeRange, setTimeRange, groupBy, setGroupBy };
}

// Lightweight read-only indicator — used on pages without the calendar picker.
export function PeriodLabel({ timeRange }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/80 px-4 py-2 text-sm font-semibold text-purcBlue dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200">
      <CalendarDays size={15} className="shrink-0" />
      Selected period: {formatRangeLabel(timeRange)}
    </div>
  );
}

export function PeriodControls({ timeRange, setTimeRange, groupBy, setGroupBy, active = true }) {
  const [open, setOpen] = useState(false);
  const [draftRange, setDraftRange] = useState(timeRange);
  const [draftDate, setDraftDate] = useState(timeRange.from);
  const modeFor = (range) => (isAllTimeRange(range) ? 'all' : isSingleDate(range) ? 'date' : 'range');
  const [selectionMode, setSelectionMode] = useState(() => modeFor(timeRange));

  useEffect(() => {
    setDraftRange(timeRange);
    setDraftDate(timeRange.from);
    setSelectionMode(modeFor(timeRange));
  }, [timeRange]);

  useEffect(() => {
    if (isSingleDate(timeRange) && groupBy !== 'daily') {
      setGroupBy('daily');
    }
  }, [groupBy, setGroupBy, timeRange]);

  function applySelection() {
    if (selectionMode === 'all') {
      setTimeRange(getDefaultRange());
      setGroupBy('monthly');
      setOpen(false);
      return;
    }

    if (selectionMode === 'date') {
      const date = draftDate || draftRange.from || toDateInput(new Date());
      setTimeRange({ from: date, to: date });
      setGroupBy('daily');
      setOpen(false);
      return;
    }

    const nextRange = normalizeRange(draftRange);
    setTimeRange(nextRange);
    if (isSingleDate(nextRange)) setGroupBy('daily');
    setOpen(false);
  }

  const actualSingleDate = isSingleDate(timeRange);
  const visibleGroupingOptions = actualSingleDate ? groupingOptions.filter((option) => option.value === 'daily') : groupingOptions;
  const groupingLabel = actualSingleDate ? 'Date Grouping' : 'Range Grouping';
  const inputClass = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-purcBlue disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-white/10 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-950/70 dark:disabled:text-slate-500';
  const modeButtonClass = (mode) =>
    `rounded-lg border px-2 py-2 text-xs font-bold leading-tight transition ${
      selectionMode === mode
        ? 'border-purcBlue bg-purcBlue text-white shadow-md shadow-blue-900/20'
        : 'border-slate-200 bg-white text-slate-600 hover:border-purcBlue hover:text-purcBlue dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-300 dark:hover:text-white'
    }`;

  return (
    <div className="relative z-[80] inline-flex max-w-full flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-pressed={active}
        className={`flex min-w-[240px] max-w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-bold shadow-sm transition ${
          active
            ? 'border-purcBlue bg-purcBlue text-white'
            : 'border-slate-200 bg-white text-slate-700 hover:border-purcBlue hover:text-purcBlue dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-blue-300'
        }`}
      >
        <CalendarDays size={17} className={`shrink-0 ${active ? 'text-white' : 'text-purcBlue dark:text-blue-300'}`} />
        <span className="truncate">{formatRangeLabel(timeRange)}</span>
      </button>

      <label className="flex min-w-[220px] items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100">
        <span className="text-purcBlue dark:text-blue-300">{groupingLabel}</span>
        <select
          value={groupBy}
          onChange={(event) => setGroupBy(event.target.value)}
          disabled={actualSingleDate}
          className="min-w-0 flex-1 bg-transparent font-black text-slate-800 outline-none disabled:cursor-not-allowed dark:text-white"
        >
          {visibleGroupingOptions.map((option) => (
            <option key={option.value} value={option.value} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">{option.label}</option>
          ))}
        </select>
      </label>

      {open && (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-[9999] w-[min(380px,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-white/10 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-800 dark:text-white">Select period</p>
            <button type="button" onClick={() => setOpen(false)} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white" aria-label="Close">
              <X size={15} />
            </button>
          </div>

          {/* Mode toggle — Single date | Date range | All Records (To Date) */}
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => setSelectionMode('date')} className={modeButtonClass('date')}>
              Single date
            </button>
            <button type="button" onClick={() => setSelectionMode('range')} className={modeButtonClass('range')}>
              Date range
            </button>
            <button type="button" onClick={() => setSelectionMode('all')} className={modeButtonClass('all')}>
              All Records (To Date)
            </button>
          </div>

          {selectionMode === 'all' ? (
            <p className="mt-4 rounded-lg bg-blue-50 px-3 py-3 text-xs font-semibold leading-5 text-purcBlue dark:bg-blue-950/40 dark:text-blue-200">
              Shows every record from the start up to today. No specific dates required.
            </p>
          ) : selectionMode === 'date' ? (
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Date
              <input type="date" value={draftDate || ''} onChange={(e) => setDraftDate(e.target.value)} className={inputClass} />
            </label>
          ) : (
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                From
                <input type="date" value={draftRange.from} onChange={(e) => setDraftRange((r) => ({ ...r, from: e.target.value }))} className={inputClass} />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                To
                <input type="date" value={draftRange.to} onChange={(e) => setDraftRange((r) => ({ ...r, to: e.target.value }))} className={inputClass} />
              </label>
            </div>
          )}

          <button type="button" onClick={applySelection} className="mt-4 w-full rounded-lg bg-purcBlue py-2 text-sm font-bold text-white shadow-md shadow-blue-900/20 hover:bg-ink">
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
