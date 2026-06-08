import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock3, Search, Send } from 'lucide-react';
import { http } from '../api/http.js';
import { PeriodLabel, formatRangeLabel, usePersistentPeriod } from '../components/ui/PeriodControls.jsx';
import { ExportButtons } from '../components/ui/ExportButtons.jsx';
import { letterExportColumns } from '../utils/letterColumns.js';
import { StatusChip } from '../components/ui/StatusChip.jsx';

const incomingStages = [
  { status: 'ES_RECEIVED', label: 'Received Letter at ES', tone: 'blue' },
  { status: 'DISPATCHED_TO_DEPARTMENT', label: 'Received Letter Dispatched', tone: 'amber' }
];

const outgoingStages = [
  { status: 'READY_FOR_SIGNATURE', label: 'Outgoing letter at ES', tone: 'amber' },
  { status: 'DISPATCHED', label: 'Letter Sent', tone: 'emerald' }
];

const toneClasses = {
  blue: 'bg-blue-50 text-purcBlue ring-blue-100 dark:bg-blue-950/50 dark:text-blue-100 dark:ring-blue-900/50',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/50 dark:text-amber-100 dark:ring-amber-900/50',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-100 dark:ring-emerald-900/50',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700'
};

function displayDateTime(value) {
  if (!value) return 'Not recorded yet';
  return new Date(value).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function eventTime(letter, status) {
  if (status === 'ES_RECEIVED' || status === 'READY_FOR_SIGNATURE') return letter.receivedAt || letter.createdAt;
  if (status === 'DISPATCHED_TO_DEPARTMENT' || status === 'DISPATCHED') return letter.dispatchedAt || letter.updatedAt;
  return letter.updatedAt || letter.createdAt;
}

function stageState(index, currentIndex) {
  if (index < currentIndex) return 'done';
  if (index === currentIndex) return 'current';
  return 'future';
}

export default function Timeline() {
  const { timeRange } = usePersistentPeriod();
  const [letters, setLetters] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    http.get('/letters').then((res) => setLetters(res.data.data));
  }, []);

  const filteredLetters = letters.filter((letter) => {
    const normalized = query.toLowerCase();
    return !normalized || [
      letter.trackingNumber,
      letter.subject,
      letter.status,
      letter.inferredAction,
      letter.inferenceReason,
      letter.currentDepartment,
      letter.inferredDepartment,
      letter.senderOrganization,
      letter.sender,
      letter.recipient
    ].join(' ').toLowerCase().includes(normalized);
  });

  return (
    <div className="space-y-6">
      <PeriodLabel timeRange={timeRange} />
      <div className="glass-panel rounded-xl p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-extrabold text-purcBlue shadow-sm ring-1 ring-blue-100 dark:bg-blue-900/50 dark:text-blue-100 dark:ring-blue-800/70">
            Tracking Timeline
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-300">{filteredLetters.length} record(s)</span>
            <ExportButtons title="Tracking Timeline" periodLabel={formatRangeLabel(timeRange)} columns={letterExportColumns} rows={filteredLetters} size="sm" />
          </div>
        </div>
        <div className="mb-6 flex flex-col gap-3 md:flex-row">
          <div className="relative max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input className="input pl-10" placeholder="Enter reference number, subject, status, directorate, or institution..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <button type="button" className="secondary-button" onClick={() => setQuery('')}>Reset search</button>
        </div>
        <div className="space-y-5">
          {filteredLetters.map((letter) => {
            const stages = letter.type === 'INCOMING' ? incomingStages : outgoingStages;
            const foundIndex = stages.findIndex((stage) => stage.status === letter.status);
            const currentIndex = foundIndex >= 0 ? foundIndex : stages.length;
            return (
              <div key={letter.id} className="rounded-xl border border-slate-200 bg-white/75 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/80">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link to={`/letters/${letter.id}`} className="font-black text-cobalt hover:underline dark:text-blue-300">{letter.trackingNumber}</Link>
                    <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{letter.subject}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-300">
                      Last activity: {displayDateTime(letter.updatedAt || letter.dispatchedAt || letter.receivedAt || letter.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip status={letter.status} />
                  </div>
                </div>


                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {stages.map((step, index) => {
                    const state = stageState(index, currentIndex);
                    const isDone = state === 'done';
                    const isCurrent = state === 'current';
                    return (
                      <div
                        key={step.status}
                        className={`rounded-xl p-3 ring-1 ${isCurrent ? toneClasses[step.tone] : isDone ? toneClasses.emerald : toneClasses.slate}`}
                      >
                        <div className="flex items-center gap-2">
                          {isDone ? <CheckCircle2 size={16} /> : isCurrent ? <Send size={16} /> : <Clock3 size={16} />}
                          <p className="text-xs font-black">{step.label}</p>
                        </div>
                        <p className="mt-2 text-[11px] font-semibold opacity-80">
                          {state === 'future' ? 'Waiting for this step' : displayDateTime(eventTime(letter, step.status))}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!filteredLetters.length && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-6 text-center text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-white/5">
              No timeline records match the current search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
