import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Filter, Inbox, Plus, Search, Send } from 'lucide-react';
import { http } from '../api/http.js';
import { notifyLettersChanged } from '../api/letterEvents.js';
import { PeriodLabel, formatRangeLabel, usePersistentPeriod } from '../components/ui/PeriodControls.jsx';
import { ExportButtons } from '../components/ui/ExportButtons.jsx';
import { letterExportColumns } from '../utils/letterColumns.js';
import { DataTable } from '../components/ui/DataTable.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { executiveSecretariat, purcDepartments } from '../constants/departments.js';
import { institutionSearchTerms, otherInstitutionValue, selectedInstitution } from '../constants/institutions.js';
import { useInstitutionGroups } from '../hooks/useInstitutionGroups.js';

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

// A subject describes the letter, so it must be real wording — not a number,
// a reference code, or a handful of symbols.
export function validateSubject(value) {
  const subject = String(value || '').trim();
  if (!subject) return 'Enter the subject of the letter.';
  if (!/[A-Za-z]/.test(subject)) return 'The subject must describe the letter in words — it cannot be only numbers.';
  const letters = (subject.match(/[A-Za-z]/g) || []).length;
  if (letters < 3) return 'The subject is too short. Describe the letter in words.';
  if (/^[\d\s\W]+$/.test(subject)) return 'The subject must describe the letter in words — it cannot be only numbers or symbols.';
  return '';
}

export default function Letters({ type }) {
  const { timeRange } = usePersistentPeriod();
  const [searchParams, setSearchParams] = useSearchParams();
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [form, setForm] = useState(() => emptyForm(type));
  const [statusMessage, setStatusMessage] = useState('');
  const [formError, setFormError] = useState('');
  // Includes any institution previously typed in via "Other".
  const institutionGroups = useInstitutionGroups(letters.length);

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

  async function submit(event) {
    event.preventDefault();
    setFormError('');
    const senderOrganization = selectedInstitution(form.senderOrganizationOption, form.customSenderOrganization);
    const recipient = type === 'OUTGOING'
      ? selectedInstitution(form.recipientOption, form.customRecipient)
      : form.recipient.trim();

    const subjectError = validateSubject(form.subject);
    if (subjectError) {
      setFormError(subjectError);
      return;
    }
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
      subject: form.subject.trim(),
      senderOrganization,
      // Received letters are always addressed to the Executive Secretariat.
      routeDepartment: type === 'INCOMING' ? executiveSecretariat : form.routeDepartment,
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
      setStatusMessage(
        type === 'INCOMING'
          ? `${createdLetter.trackingNumber} registered as Received (registry no. ${createdLetter.registryNumber}).`
          : `${createdLetter.trackingNumber} registered as Dispatched to ${createdLetter.recipient} (registry no. ${createdLetter.registryNumber}).`
      );
      notifyLettersChanged();
    } catch (error) {
      setFormError(error?.response?.data?.message || error.message || 'Unable to create this letter record.');
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


  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-slate-900/60">
        <div className="flex items-center gap-4">
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white shadow-md ${type === 'INCOMING' ? 'bg-gradient-to-br from-indigo-400 to-indigo-500 shadow-indigo-900/15' : 'bg-gradient-to-br from-rose-400 to-rose-500 shadow-rose-900/15'}`}>
            {type === 'INCOMING' ? <Inbox size={22} /> : <Send size={22} />}
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-ink dark:text-white">{type === 'INCOMING' ? 'Received Letter Register' : 'Dispatched Letter Register'}</h1>
            <div className="mt-1"><PeriodLabel timeRange={timeRange} /></div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="soft-button" onClick={() => setOpen(true)}><Plus size={15} /> {type === 'INCOMING' ? 'Register received letter' : 'Register dispatched letter'}</button>
          <ExportButtons
            title={type === 'INCOMING' ? 'Received Letter Register' : 'Dispatched Letter Register'}
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search subject, sender, reference number…" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
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
              {type === 'INCOMING' ? 'Received Letter Register' : 'Dispatched Letter Register'}
            </h2>
            <p className="mt-0.5 text-xs font-medium text-slate-400">Select a reference number to open the letter's details.</p>
          </div>
          {!loading && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-200">{filteredLetters.length} record(s)</span>
          )}
        </div>
        <div className="p-2">
          {loading ? <Skeleton className="h-96" /> : (
            <DataTable rows={filteredLetters} letterType={type} />
          )}
        </div>
      </section>
      <Modal open={open} title={type === 'INCOMING' ? 'Register Received Letter' : 'Register Dispatched Letter'} onClose={() => { setOpen(false); setFormError(''); }}>
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
            <input className="input cursor-not-allowed bg-slate-100 text-slate-500 dark:bg-white/5" value="Auto-generated on save" readOnly />
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
                  {institutionGroups.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map((institution) => <option key={institution}>{institution}</option>)}
                    </optgroup>
                  ))}
                  <option value={otherInstitutionValue}>Other (type a name)</option>
                </select>
              </label>
              {form.senderOrganizationOption === otherInstitutionValue && (
                <input className="input" placeholder="Enter institution name" value={form.customSenderOrganization} onChange={(e) => setForm({ ...form, customSenderOrganization: e.target.value })} required />
              )}
              <input className="input" placeholder="From whom sent" value={form.sender} onChange={(e) => setForm({ ...form, sender: e.target.value })} />
              <input className="input" placeholder="Recipient named on letter (optional)" value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} />
            </>
          ) : (
            <>
              <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200 md:col-span-2">
                Recipient institution
                <select className="input" value={form.recipientOption} onChange={(e) => setForm({ ...form, recipientOption: e.target.value, customRecipient: '' })} required>
                  <option value="">Select recipient institution</option>
                  {institutionGroups.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map((institution) => <option key={institution}>{institution}</option>)}
                    </optgroup>
                  ))}
                  <option value={otherInstitutionValue}>Other (type a name)</option>
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
          {/* Received letters are always addressed to the Executive Secretariat,
              which assigns them afterwards — so the recorder does not choose a
              directorate here. Dispatched letters name the directorate they came from. */}
          {type === 'OUTGOING' && (
            <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Initiating directorate
              <select className="input" value={form.routeDepartment} onChange={(e) => setForm({ ...form, routeDepartment: e.target.value })}>
                {purcDepartments.map((department) => <option key={department}>{department}</option>)}
              </select>
            </label>
          )}
          <textarea className="input md:col-span-2" rows="3" placeholder="Remarks" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          <button className="primary-button md:col-span-2">Create record</button>
        </form>
      </Modal>
    </div>
  );
}
