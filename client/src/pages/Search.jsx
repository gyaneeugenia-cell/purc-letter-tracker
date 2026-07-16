import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, Search as SearchIcon, SlidersHorizontal } from 'lucide-react';
import { http } from '../api/http.js';
import { DataTable } from '../components/ui/DataTable.jsx';
import { PeriodLabel, formatRangeLabel, usePersistentPeriod } from '../components/ui/PeriodControls.jsx';
import { ExportButtons } from '../components/ui/ExportButtons.jsx';
import { letterExportColumns } from '../utils/letterColumns.js';
import { purcDepartments } from '../constants/departments.js';
import { otherInstitutionValue } from '../constants/institutions.js';
import { useInstitutionGroups } from '../hooks/useInstitutionGroups.js';

export default function Search() {
  const { timeRange } = usePersistentPeriod();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [type, setType] = useState(searchParams.get('type') || '');
  const [priority, setPriority] = useState('');
  const [department, setDepartment] = useState(searchParams.get('department') || '');
  const [partyOption, setPartyOption] = useState(searchParams.get('party') || '');
  const [customParty, setCustomParty] = useState('');
  const institutionGroups = useInstitutionGroups();
  // "Other" lets you type any institution that is not in the list.
  const party = partyOption === otherInstitutionValue ? customParty.trim() : partyOption;
  const [rows, setRows] = useState([]);
  const [breakdown, setBreakdown] = useState({ received: 0, dispatched: 0 });

  // Directorate label adapts to the selected letter type.
  const directorateLabel = type === 'OUTGOING' ? 'Initiating directorate' : 'Directorate';
  // Institution label adapts to the selected letter type.
  const institutionLabel = type === 'INCOMING'
    ? 'Sender institution'
    : type === 'OUTGOING'
      ? 'Recipient institution'
      : 'Utility / institution';

  function buildParams() {
    // The date range comes from the global reporting period shown at the top.
    const params = { q: query, type, priority, department, party, dateFrom: timeRange.from, dateTo: timeRange.to };
    return Object.fromEntries(Object.entries(params).filter(([, v]) => v));
  }

  async function runSearch() {
    const { data } = await http.get('/search', { params: buildParams() });
    setRows(data.data);
    setBreakdown(data.breakdown || { received: 0, dispatched: 0 });
  }

  function resetFilters() {
    setType('');
    setPriority('');
    setDepartment('');
    setPartyOption('');
    setCustomParty('');
    setQuery('');
  }

  function changeType(value) {
    setType(value);
    setDepartment('');
    setPartyOption('');
    setCustomParty('');
  }

  // Live, debounced search — re-runs whenever any filter or the global period changes.
  useEffect(() => {
    const timeout = window.setTimeout(runSearch, 180);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, type, priority, department, party, timeRange.from, timeRange.to]);

  const hasActiveFilters = Boolean(query || type || priority || department || party);

  return (
    <div className="space-y-5">
      <PeriodLabel timeRange={timeRange} />

      {/* Free-text search */}
      <form onSubmit={(e) => { e.preventDefault(); runSearch(); }} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-slate-900/60">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            className="input py-3 pl-12 text-base"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reference number, institution, signatory, subject, registry number, remarks…"
          />
        </div>
      </form>

      {/* Advanced filters */}
      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-slate-900/60">
        <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <SlidersHorizontal size={14} /> Advanced filters
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Letter type
            <select className="input" value={type} onChange={(e) => changeType(e.target.value)}>
              <option value="">All letter types</option>
              <option value="INCOMING">Received</option>
              <option value="OUTGOING">Dispatched</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Priority
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">All priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="NORMAL">Normal</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            {directorateLabel}
            <select className="input" value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">All directorates</option>
              {purcDepartments.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            {institutionLabel}
            <select className="input" value={partyOption} onChange={(e) => { setPartyOption(e.target.value); setCustomParty(''); }}>
              <option value="">All institutions</option>
              {institutionGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((inst) => <option key={inst} value={inst}>{inst}</option>)}
                </optgroup>
              ))}
              <option value={otherInstitutionValue}>Other (type a name)</option>
            </select>
            {partyOption === otherInstitutionValue && (
              <input
                className="input mt-2"
                placeholder="Type the institution name"
                value={customParty}
                onChange={(e) => setCustomParty(e.target.value)}
              />
            )}
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="secondary-button" onClick={resetFilters} disabled={!hasActiveFilters}>
            <Filter size={16} /> Reset filters
          </button>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-purcBlue dark:bg-blue-900/40 dark:text-blue-200">{breakdown.received} received</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">{breakdown.dispatched} dispatched</span>
          </div>
        </div>
      </div>

      {/* Results — columns adapt to the chosen letter type */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-slate-900/60">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink dark:text-white">
              {type === 'INCOMING' ? 'Received Letter Results' : type === 'OUTGOING' ? 'Dispatched Letter Results' : 'Search Results'}
            </h2>
            <p className="mt-0.5 text-xs font-medium text-slate-400">Select a reference number to open the letter's details.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-200">{rows.length} record(s)</span>
            <ExportButtons
              title="Search Results"
              periodLabel={formatRangeLabel(timeRange)}
              columns={letterExportColumns}
              rows={rows}
              size="sm"
            />
          </div>
        </div>
        <div className="p-2">
          <DataTable rows={rows} letterType={type} operational={!type} />
        </div>
      </section>
    </div>
  );
}
