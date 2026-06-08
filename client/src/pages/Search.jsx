import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { http } from '../api/http.js';
import { DataTable } from '../components/ui/DataTable.jsx';
import { PeriodLabel, formatRangeLabel, usePersistentPeriod } from '../components/ui/PeriodControls.jsx';
import { ExportButtons } from '../components/ui/ExportButtons.jsx';
import { letterExportColumns } from '../utils/letterColumns.js';
import { incomingStatusOptions, outgoingStatusOptions } from '../constants/statuses.js';
import { purcDepartments } from '../constants/departments.js';

export default function Search() {
  const { timeRange } = usePersistentPeriod();
  const [searchParams] = useSearchParams();
  const initialParam = searchParams.get('q') || '';
  const initialStatus = searchParams.get('status') || '';
  const initialType = searchParams.get('type')
    || (incomingStatusOptions.some((option) => option.value === initialStatus)
      ? 'INCOMING'
      : outgoingStatusOptions.some((option) => option.value === initialStatus)
        ? 'OUTGOING'
        : '');
  const [query, setQuery] = useState(initialParam);
  const [rows, setRows] = useState([]);
  const [type, setType] = useState(initialType);
  const [status, setStatus] = useState(initialStatus);
  const [dispatchScope, setDispatchScope] = useState(searchParams.get('dispatch') || '');
  const [atEsScope, setAtEsScope] = useState(searchParams.get('atEs') || '');
  const [priority, setPriority] = useState('');
  const [attachmentFilter, setAttachmentFilter] = useState('');
  const [department, setDepartment] = useState(searchParams.get('department') || '');
  const [party, setParty] = useState(searchParams.get('party') || '');

  const statusOptions = type === 'INCOMING'
    ? incomingStatusOptions
    : type === 'OUTGOING'
      ? outgoingStatusOptions
      : [];
  const directorateLabel = type === 'INCOMING'
    ? 'Recipient directorate'
    : type === 'OUTGOING'
      ? 'Responsible PURC directorate'
      : 'Directorate filter';

  function buildParams(nextQuery = query, overrides = {}) {
    const params = {
      q: nextQuery,
      type,
      status,
      dispatch: dispatchScope,
      atEs: atEsScope,
      priority,
      attachmentFilter,
      department,
      party,
      ...overrides
    };
    return Object.fromEntries(Object.entries(params).filter(([, value]) => value));
  }

  async function runSearch(event, nextQuery = query, overrides = {}) {
    event?.preventDefault();
    const { data } = await http.get('/search', { params: buildParams(nextQuery, overrides) });
    setRows(data.data);
  }

  function resetFilters() {
    setType('');
    setStatus('');
    setDispatchScope('');
    setAtEsScope('');
    setPriority('');
    setAttachmentFilter('');
    setDepartment('');
    setParty('');
    setQuery('');
    runSearch(null, '', { type: '', status: '', dispatch: '', atEs: '', priority: '', attachmentFilter: '', department: '', party: '' });
  }

  function changeType(value) {
    setType(value);
    setStatus('');
    setDepartment('');
  }

  useEffect(() => {
    setQuery(initialParam);
  }, [initialParam]);

  useEffect(() => {
    const timeout = window.setTimeout(() => runSearch(null, query), 180);
    return () => window.clearTimeout(timeout);
  }, [attachmentFilter, atEsScope, department, dispatchScope, party, priority, query, status, type]);

  return (
    <div className="space-y-5">
      <PeriodLabel timeRange={timeRange} />
      <form onSubmit={runSearch} className="glass-panel flex flex-col gap-3 rounded-xl p-4 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input className="input pl-10" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by reference number, institution, signatory, or subject…" />
        </div>
        <button className="primary-button shrink-0">Search</button>
      </form>

      <div className="glass-panel rounded-xl p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Filter results</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Letter type
            <select className="input" value={type} onChange={(event) => changeType(event.target.value)}>
              <option value="">All letter types</option>
              <option value="INCOMING">Received</option>
              <option value="OUTGOING">Outgoing</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Status
            <select className="input" value={status} onChange={(event) => setStatus(event.target.value)} disabled={!type}>
              <option value="">{type ? 'All statuses' : 'Select letter type first'}</option>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Priority
            <select className="input" value={priority} onChange={(event) => setPriority(event.target.value)}>
              <option value="">All priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="NORMAL">Normal</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Attachments
            <select className="input" value={attachmentFilter} onChange={(event) => setAttachmentFilter(event.target.value)}>
              <option value="">All (with or without)</option>
              <option value="HAS_ATTACHMENTS">Has attachments</option>
              <option value="NO_ATTACHMENTS">No attachments</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            {directorateLabel}
            <select className="input" value={department} onChange={(event) => setDepartment(event.target.value)} disabled={!type}>
              <option value="">{type ? 'All directorates' : 'Select letter type first'}</option>
              {purcDepartments.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Utility / institution
            <input
              className="input"
              value={party}
              onChange={(event) => setParty(event.target.value)}
              placeholder="e.g. NEDCo, ECG, GWCL…"
            />
          </label>
        </div>
        <div className="mt-4">
          <button type="button" className="secondary-button" onClick={resetFilters}>Reset filters</button>
        </div>
      </div>

      {(atEsScope || dispatchScope || department || party) && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-blue-50/80 px-4 py-3 text-sm font-medium text-purcBlue dark:bg-blue-900/30 dark:text-blue-200">
          <span>
            {atEsScope === 'all' ? 'Showing: all letters pending dispatch at ES' : dispatchScope === 'all' ? 'Showing: all internally and externally dispatched letters' : department ? `Directorate: ${department}` : ''}{party ? ` · Filtered by: ${party}` : ''}
          </span>
        </div>
      )}

      <section className="glass-panel rounded-xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-extrabold text-purcBlue shadow-sm ring-1 ring-blue-100 dark:bg-blue-900/50 dark:text-blue-100 dark:ring-blue-800/70">
            Search Results
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-300">{rows.length} record(s)</span>
            <ExportButtons
              title="Search Results"
              periodLabel={formatRangeLabel(timeRange)}
              columns={letterExportColumns}
              rows={rows}
              size="sm"
            />
          </div>
        </div>
        <DataTable rows={rows} letterType={type} operational />
      </section>
    </div>
  );
}
