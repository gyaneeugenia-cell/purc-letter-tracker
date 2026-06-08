import { useEffect, useMemo, useState } from 'react';
import { Building2, Clock, Inbox, Plus, Search, Send, TimerReset } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { http } from '../api/http.js';
import { PeriodControls, formatRangeLabel, usePersistentPeriod } from '../components/ui/PeriodControls.jsx';
import { ExportButtons } from '../components/ui/ExportButtons.jsx';
import { letterExportColumns } from '../utils/letterColumns.js';
import { DataTable } from '../components/ui/DataTable.jsx';
import { MetricCard } from '../components/ui/MetricCard.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { allStatusOptions } from '../constants/statuses.js';
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
    return <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;
  }

  const icons = [Inbox, TimerReset, Building2, Clock, Send];
  const rangeLabel = formatRangeLabel(timeRange);

  return (
    <div className="space-y-6">
      <div className="relative z-50">
        <PeriodControls
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          groupBy={groupBy}
          setGroupBy={setGroupBy}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {data.metrics.map((metric, index) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} trend={metric.trend} tone={metric.tone} icon={icons[index]} compact />
        ))}
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-slate-900/60">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-base font-black tracking-tight text-ink dark:text-white">Letter Register</h2>
            <p className="mt-0.5 text-xs font-medium text-slate-400">
              Search, sort, and open letters recorded within the selected reporting period.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="soft-button" onClick={() => navigate('/incoming?new=1')}>
              <Plus size={15} /> Register received letter
            </button>
            <button type="button" className="soft-button" onClick={() => navigate('/outgoing?new=1')}>
              <Plus size={15} /> Register outgoing letter
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
        <div className="grid gap-3 px-5 py-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
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
          <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Letter type
            <select className="input" value={letterType} onChange={(event) => setLetterType(event.target.value)}>
              <option value="">All letter types</option>
              <option value="INCOMING">Received</option>
              <option value="OUTGOING">Outgoing</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Status
            <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              {allStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Sort by
            <select className="input" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="subject">Subject A-Z</option>
              <option value="followUp">Follow-up date first</option>
            </select>
          </label>
        </div>

        {/* Count strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3 dark:border-white/10">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-200">{registerLetters.length} letter record(s)</span>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-purcBlue dark:bg-blue-900/50 dark:text-blue-100">
            Selected period: {rangeLabel}
          </span>
        </div>

        <div className="p-2">
          <DataTable rows={registerLetters} embedded operational />
        </div>
      </section>
    </div>
  );
}
