import { useEffect, useMemo, useState } from 'react';
import { Inbox, Plus, Search, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { http } from '../api/http.js';
import { PeriodControls, formatRangeLabel, usePersistentPeriod } from '../components/ui/PeriodControls.jsx';
import { ExportButtons } from '../components/ui/ExportButtons.jsx';
import { letterExportColumns } from '../utils/letterColumns.js';
import { DataTable } from '../components/ui/DataTable.jsx';
import { MetricStat } from '../components/ui/MetricStat.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { allStatusOptions, incomingStatusOptions, outgoingStatusOptions } from '../constants/statuses.js';
import { institutionSearchTerms } from '../constants/institutions.js';

function letterTimestamp(letter) {
  return new Date(letter.receivedAt || letter.dispatchedAt || letter.createdAt || 0).getTime();
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState('');
  const [letterType, setLetterType] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const { timeRange, setTimeRange, groupBy, setGroupBy } = usePersistentPeriod();

  // Re-fetch whenever period changes OR a letter mutation event fires
  useEffect(() => {
    http.get('/dashboard/summary', { params: { from: timeRange.from, to: timeRange.to, groupBy } })
      .then((res) => setData(res.data));
  }, [timeRange, groupBy, refreshKey]);

  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1);
    window.addEventListener('purc-letters-changed', handler);
    return () => window.removeEventListener('purc-letters-changed', handler);
  }, []);

  const registerLetters = useMemo(() => {
    const queryTerms = institutionSearchTerms(query);
    const filtered = (data?.registerLetters || []).filter((letter) => {
      const searchText = [
        letter.trackingNumber,
        letter.referenceNumber,
        letter.registryNumber,
        letter.letterNumber,
        letter.senderOrganization,
        letter.sender,
        letter.recipient,
        letter.subject,
        letter.routeDepartment,
        letter.currentDepartment
      ].filter(Boolean).join(' ').toLowerCase();
      return (!queryTerms.length || queryTerms.some((term) => searchText.includes(term)))
        && (!letterType || letter.type === letterType)
        && (!status || letter.status === status);
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'oldest') return letterTimestamp(a) - letterTimestamp(b);
      if (sortBy === 'subject') return String(a.subject || '').localeCompare(String(b.subject || ''));
      if (sortBy === 'followUp') {
        const aDate = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      }
      return letterTimestamp(b) - letterTimestamp(a);
    });
  }, [data, letterType, query, sortBy, status]);

  if (!data) {
    return <div className="grid gap-6 sm:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  }

  const icons = [Inbox, Send];
  const rangeLabel = formatRangeLabel(timeRange);
  // Status options follow the chosen letter type (like the Search page).
  const statusOptionsForType = letterType === 'INCOMING'
    ? incomingStatusOptions
    : letterType === 'OUTGOING'
      ? outgoingStatusOptions
      : allStatusOptions;

  return (
    <div className="space-y-8">
      <div className="relative z-50">
        <PeriodControls
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          groupBy={groupBy}
          setGroupBy={setGroupBy}
        />
      </div>

      {/* Metrics — flat, borderless, whitespace-led */}
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-slate-200 dark:sm:divide-white/10">
        {data.metrics.map((metric, index) => (
          <MetricStat key={metric.label} label={metric.label} value={metric.value} trend={metric.trend} icon={icons[index]} />
        ))}
      </section>

      <div className="h-px bg-slate-200 dark:bg-white/10" />

      {/* Letter register — open layout, no card container */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Letter Register</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Letters recorded within {rangeLabel.toLowerCase()}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="soft-button" onClick={() => navigate('/incoming?new=1')}>
              <Plus size={15} /> Register received letter
            </button>
            <button type="button" className="soft-button" onClick={() => navigate('/outgoing?new=1')}>
              <Plus size={15} /> Register dispatched letter
            </button>
            <ExportButtons
              title="Letter Register"
              periodLabel={rangeLabel}
              columns={letterExportColumns}
              rows={registerLetters}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
            Search register
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Reference, institution, or subject"
              />
            </div>
          </label>
          <label className="grid gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
            Letter type
            <select className="input" value={letterType} onChange={(event) => { setLetterType(event.target.value); setStatus(''); }}>
              <option value="">All letter types</option>
              <option value="INCOMING">Received</option>
              <option value="OUTGOING">Dispatched</option>
            </select>
          </label>
          <label className="grid gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
            Status
            <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All</option>
              {statusOptionsForType.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
            Sort by
            <select className="input" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="subject">Subject A-Z</option>
            </select>
          </label>
        </div>

        {/* Count strip — plain text, no pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span><span className="font-semibold text-slate-900 tabular-nums dark:text-white">{registerLetters.length}</span> letter record(s)</span>
          <span>Selected period: <span className="font-medium text-slate-700 dark:text-slate-200">{rangeLabel}</span></span>
        </div>

        <DataTable rows={registerLetters} embedded operational />
      </section>
    </div>
  );
}
