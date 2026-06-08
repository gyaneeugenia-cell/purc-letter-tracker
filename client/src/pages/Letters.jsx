import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Filter, Inbox, Loader2, Plus, Search, Send, XCircle } from 'lucide-react';
import { http } from '../api/http.js';
import { notifyLettersChanged } from '../api/letterEvents.js';
import { PeriodLabel, formatRangeLabel, usePersistentPeriod } from '../components/ui/PeriodControls.jsx';
import { ExportButtons } from '../components/ui/ExportButtons.jsx';
import { letterExportColumns } from '../utils/letterColumns.js';
import { DataTable } from '../components/ui/DataTable.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { StatusChip } from '../components/ui/StatusChip.jsx';
import { purcDepartments } from '../constants/departments.js';
import { institutionOptions, institutionSearchTerms, otherInstitutionValue, selectedInstitution } from '../constants/institutions.js';
import { incomingStatusOptions, outgoingStatusOptions, statusLabels } from '../constants/statuses.js';

function emptyForm(type) {
  return {
    type,
    trackingNumber: '',
    registryNumber: '',
    subject: '',
    senderOrganizationOption: '',
    customSenderOrganization: '',
    sender: '',
    recipientOption: '',
    customRecipient: '',
    recipient: '',
    letterDate: '',
    letterNumber: '',
    attachments: 0,
    priority: 'NORMAL',
    dueAt: '',
    remarks: '',
    currentDepartment: 'ES office',
    routeDepartment: 'Executive Secretary'
  };
}

function numericOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function dispatchDestinationForLetter(letter) {
  if (letter?.type === 'OUTGOING') return letter.recipient || 'Recipient';
  return letter?.routeDepartment || letter?.currentDepartment || 'Executive Secretary';
}

export default function Letters({ type }) {
  const navigate = useNavigate();
  const { timeRange } = usePersistentPeriod();
  const [searchParams, setSearchParams] = useSearchParams();
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [form, setForm] = useState(() => emptyForm(type));
  const [pendingDispatchLetter, setPendingDispatchLetter] = useState(null);
  const [redirectingLetter, setRedirectingLetter] = useState(null);
  const [dispatching, setDispatching] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [formError, setFormError] = useState('');
  const redirectTimerRef = useRef(null);

  async function loadLetters() {
    setLoading(true);
    try {
      const { data } = await http.get('/letters', { params: { type } });
      setLetters(data.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLetters();
    setForm(emptyForm(type));
    setStatusMessage('');
    setFormError('');
  }, [type]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => () => {
    if (redirectTimerRef.current) window.clearTimeout(redirectTimerRef.current);
  }, []);

  async function submit(event) {
    event.preventDefault();
    setFormError('');
    const senderOrganization = selectedInstitution(form.senderOrganizationOption, form.customSenderOrganization);
    const recipient = type === 'OUTGOING'
      ? selectedInstitution(form.recipientOption, form.customRecipient)
      : form.recipient.trim();
    if (type === 'INCOMING' && !senderOrganization) {
      setFormError('Select the institution the letter came from.');
      return;
    }
    if (type === 'OUTGOING' && !recipient) {
      setFormError('Select the recipient institution.');
      return;
    }
    const payload = {
      ...form,
      senderOrganization,
      sender: type === 'OUTGOING' ? form.routeDepartment : form.sender,
      recipient,
      attachments: Number(form.attachments) > 0 ? 1 : 0
    };
    try {
      const { data } = await http.post('/letters', payload);
      const createdLetter = data.data;
      setLetters((items) => [createdLetter, ...items]);
      setForm(emptyForm(type));
      setOpen(false);
      setPendingDispatchLetter(createdLetter);
      notifyLettersChanged();
    } catch (error) {
      setFormError(error?.response?.data?.message || error.message || 'Unable to create this letter record.');
    }
  }

  function redirectCreatedLetterToDispatch() {
    if (!pendingDispatchLetter) return;
    const letter = pendingDispatchLetter;
    setPendingDispatchLetter(null);
    directToLetterDetails(letter);
  }

  function directToLetterDetails(letter) {
    setRedirectingLetter(letter);
    if (redirectTimerRef.current) window.clearTimeout(redirectTimerRef.current);
    redirectTimerRef.current = window.setTimeout(() => {
      navigate(`/letters/${letter.id}`, { state: { allowDispatch: true } });
      setRedirectingLetter(null);
      redirectTimerRef.current = null;
    }, 1400);
  }

  async function changeLetterStatus(letter, nextStatus) {
    const returnToEs = ['ES_RECEIVED', 'READY_FOR_SIGNATURE'].includes(nextStatus);
    const destination = returnToEs
      ? 'ES office'
      : dispatchDestinationForLetter(letter);
    const { data } = await http.post(`/letters/${letter.id}/workflow`, {
      status: nextStatus,
      currentDepartment: destination,
      note: `Status changed to ${statusLabels[nextStatus] || nextStatus} from the ${type === 'INCOMING' ? 'letters received' : 'letters sent'} page.`
    });
    const updated = data?.data;
    if (updated) {
      setLetters((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setStatusMessage(`${updated.trackingNumber} is now ${statusLabels[updated.status] || updated.status}.`);
      notifyLettersChanged();
    }
  }

  async function markCreatedLetterDispatched() {
    if (!pendingDispatchLetter) return;
    const destination = dispatchDestinationForLetter(pendingDispatchLetter);
    setDispatching(true);
    try {
      const { data } = await http.post(`/letters/${pendingDispatchLetter.id}/route`, {
        department: destination,
        note: pendingDispatchLetter.type === 'OUTGOING' ? `Dispatched from PURC to ${destination}` : `Dispatched from ES to ${destination}`
      });
      setLetters((items) => items.map((item) => (item.id === data.data.id ? data.data : item)));
      setPendingDispatchLetter(null);
      setStatusMessage(
        data.data.type === 'INCOMING'
          ? `${data.data.trackingNumber} marked as dispatched internally.`
          : `${data.data.trackingNumber} marked as dispatched externally.`
      );
      notifyLettersChanged();
    } finally {
      setDispatching(false);
    }
  }

  const filteredLetters = useMemo(() => {
    const queryTerms = institutionSearchTerms(query);
    return letters.filter((letter) => {
      const haystack = [letter.trackingNumber, letter.registryNumber, letter.letterNumber, letter.subject, letter.senderOrganization, letter.sender, letter.recipient, letter.currentDepartment, letter.routeDepartment, letter.assignedTo]
        .join(' ')
        .toLowerCase();
      const matchesQuery = !queryTerms.length || queryTerms.some((term) => haystack.includes(term));
      const matchesStatus = !status || letter.status === status;
      const matchesPriority = !priority || letter.priority === priority;
      return matchesQuery && matchesStatus && matchesPriority;
    });
  }, [letters, priority, query, status]);

  function resetFilters() {
    setQuery('');
    setStatus('');
    setPriority('');
    loadLetters();
  }

  const statusOptions = type === 'INCOMING' ? incomingStatusOptions : outgoingStatusOptions;

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-slate-900/60">
        <div className="flex items-center gap-4">
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white shadow-md ${type === 'INCOMING' ? 'bg-gradient-to-br from-indigo-400 to-indigo-500 shadow-indigo-900/15' : 'bg-gradient-to-br from-rose-400 to-rose-500 shadow-rose-900/15'}`}>
            {type === 'INCOMING' ? <Inbox size={22} /> : <Send size={22} />}
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-ink dark:text-white">{type === 'INCOMING' ? 'Received Letter Register' : 'Outgoing Letter Register'}</h1>
            <div className="mt-1"><PeriodLabel timeRange={timeRange} /></div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="soft-button" onClick={() => setOpen(true)}><Plus size={15} /> {type === 'INCOMING' ? 'Register received letter' : 'Register outgoing letter'}</button>
          <ExportButtons
            title={type === 'INCOMING' ? 'Received Letter Register' : 'Outgoing Letter Register'}
            periodLabel={formatRangeLabel(timeRange)}
            columns={letterExportColumns}
            rows={filteredLetters}
          />
        </div>
      </div>

      {statusMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          <CheckCircle2 size={16} /> {statusMessage}
        </div>
      )}

      {/* ── Filter toolbar ── */}
      <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-slate-900/60">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,1fr))_auto]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search subject, sender, reference number…" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select className="input" value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="">All priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="NORMAL">Normal</option>
          </select>
          <button type="button" className="secondary-button" onClick={resetFilters}><Filter size={16} /> Reset</button>
        </div>
      </div>

      {/* ── Records ── */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-slate-900/60">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink dark:text-white">
              {type === 'INCOMING' ? 'Received Letter Register' : 'Outgoing Letter Register'}
            </h2>
            <p className="mt-0.5 text-xs font-medium text-slate-400">Select a reference number to open the letter's details.</p>
          </div>
          {!loading && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-200">{filteredLetters.length} record(s)</span>
          )}
        </div>
        <div className="p-2">
          {loading ? <Skeleton className="h-96" /> : (
            <DataTable
              rows={filteredLetters}
              letterType={type}
              statusOptions={statusOptions}
              onStatusChange={changeLetterStatus}
            />
          )}
        </div>
      </section>
      <Modal open={open} title={type === 'INCOMING' ? 'Register Received Letter' : 'Register Outgoing Letter'} onClose={() => { setOpen(false); setFormError(''); }}>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          {formError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-purcRed md:col-span-2">
              {formError}
            </div>
          )}
          <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Date
            <input className="input" type="date" value={form.letterDate} onChange={(e) => setForm({ ...form, letterDate: e.target.value })} required />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Reference
            <input className="input" placeholder="Type reference" value={form.trackingNumber} onChange={(e) => { setForm({ ...form, trackingNumber: e.target.value }); setFormError(''); }} required />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Registry number
            <input className="input" inputMode="numeric" pattern="[0-9]*" placeholder="Type registry number" value={form.registryNumber} onChange={(e) => setForm({ ...form, registryNumber: numericOnly(e.target.value) })} />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            No. of letter
            <input className="input" inputMode="numeric" pattern="[0-9]*" placeholder="No. of letter on the document" value={form.letterNumber} onChange={(e) => setForm({ ...form, letterNumber: numericOnly(e.target.value) })} />
          </label>
          <input className="input md:col-span-2" placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
          {type === 'INCOMING' ? (
            <>
              <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Institution letter came from
                <select className="input" value={form.senderOrganizationOption} onChange={(e) => setForm({ ...form, senderOrganizationOption: e.target.value, customSenderOrganization: '' })} required>
                  <option value="">Select institution</option>
                  {institutionOptions.map((institution) => <option key={institution}>{institution}</option>)}
                  <option value={otherInstitutionValue}>Other institution</option>
                </select>
              </label>
              {form.senderOrganizationOption === otherInstitutionValue && (
                <input className="input" placeholder="Enter institution name" value={form.customSenderOrganization} onChange={(e) => setForm({ ...form, customSenderOrganization: e.target.value })} required />
              )}
              <input className="input" placeholder="From whom sent / signatory (optional)" value={form.sender} onChange={(e) => setForm({ ...form, sender: e.target.value })} />
              <input className="input" placeholder="Recipient named on letter (optional)" value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} />
            </>
          ) : (
            <>
              <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200 md:col-span-2">
                Recipient institution
                <select className="input" value={form.recipientOption} onChange={(e) => setForm({ ...form, recipientOption: e.target.value, customRecipient: '' })} required>
                  <option value="">Select recipient institution</option>
                  {institutionOptions.map((institution) => <option key={institution}>{institution}</option>)}
                  <option value={otherInstitutionValue}>Other institution</option>
                </select>
              </label>
              {form.recipientOption === otherInstitutionValue && (
                <input className="input md:col-span-2" placeholder="Enter recipient institution" value={form.customRecipient} onChange={(e) => setForm({ ...form, customRecipient: e.target.value })} required />
              )}
            </>
          )}
          <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Priority
            <select className="input" value={form.priority || 'NORMAL'} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option>NORMAL</option><option>URGENT</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {type === 'INCOMING' ? 'Directorate to route to' : 'Directorate responsible for letter'}
            <select className="input" value={form.routeDepartment} onChange={(e) => setForm({ ...form, routeDepartment: e.target.value })}>
              {purcDepartments.map((department) => <option key={department}>{department}</option>)}
            </select>
          </label>
          <textarea className="input md:col-span-2" rows="3" placeholder="Remarks" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          <button className="primary-button md:col-span-2">Create record</button>
        </form>
      </Modal>
      <Modal open={Boolean(pendingDispatchLetter)} title="Has this letter been dispatched?" onClose={redirectCreatedLetterToDispatch}>
        {pendingDispatchLetter && (
          <div className="space-y-5">
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 dark:border-blue-900/60 dark:bg-blue-950/40">
              <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-300">Current status</p>
              <div className="mt-2">
                <StatusChip status={pendingDispatchLetter.status} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" className="secondary-button" onClick={redirectCreatedLetterToDispatch}>
                <XCircle size={16} /> No
              </button>
              <button type="button" className="primary-button" onClick={markCreatedLetterDispatched} disabled={dispatching}>
                <CheckCircle2 size={16} /> Yes
              </button>
            </div>
          </div>
        )}
      </Modal>
      {redirectingLetter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/90 bg-white shadow-[0_24px_90px_rgba(6,29,58,0.28)] dark:border-white/10 dark:bg-slate-900">
            <div className="relative p-6">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(70,91,168,0.10),rgba(14,143,143,0.08),rgba(246,212,75,0.12))]" />
              <div className="relative flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-purcBlue text-white shadow-lg shadow-blue-900/20">
                  <Loader2 className="animate-spin" size={26} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Record saved</p>
                  <h2 className="mt-2 text-2xl font-black text-ink dark:text-white">Directing you to letter details page</h2>
                  <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Preparing {redirectingLetter.trackingNumber} so you can confirm dispatch.
                  </p>
                </div>
              </div>
              <div className="relative mt-6 h-3 overflow-hidden rounded-full bg-blue-100 dark:bg-slate-700">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-[linear-gradient(90deg,#465BA8,#0E8F8F,#F6D44B)]" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
