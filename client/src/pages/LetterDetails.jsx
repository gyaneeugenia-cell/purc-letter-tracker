import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Pencil, Route, Trash2 } from 'lucide-react';
import { http } from '../api/http.js';
import { notifyLettersChanged } from '../api/letterEvents.js';
import { StatusChip } from '../components/ui/StatusChip.jsx';
import { PriorityBadge } from '../components/ui/PriorityBadge.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { purcDepartments } from '../constants/departments.js';
import { institutionOptions, institutionSelection, otherInstitutionValue, selectedInstitution } from '../constants/institutions.js';
import { incomingStatusOptions, outgoingStatusOptions, statusLabels } from '../constants/statuses.js';

function emptyEditForm() {
  return {
    trackingNumber: '',
    registryNumber: '',
    letterDate: '',
    letterNumber: '',
    subject: '',
    senderOrganizationOption: '',
    customSenderOrganization: '',
    sender: '',
    recipientOption: '',
    customRecipient: '',
    recipient: '',
    attachments: 0,
    priority: 'NORMAL',
    currentDepartment: 'ES office',
    routeDepartment: 'Executive Secretary',
    assignedTo: '',
    dueAt: '',
    remarks: ''
  };
}

function dateValue(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

function formatValue(value, fallback = '-') {
  return value === undefined || value === null || value === '' ? fallback : value;
}

function numericOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function isEsOffice(value) {
  return String(value || '').trim().toLowerCase() === 'es office';
}

function dispatchDestinationForLetter(letter) {
  if (letter?.type === 'OUTGOING') return letter.recipient || 'Recipient';
  return letter?.routeDepartment || (!isEsOffice(letter?.currentDepartment) ? letter?.currentDepartment : 'Executive Secretary');
}

function sourceDepartmentForLetter(letter) {
  return letter?.routeDepartment || letter?.sender || '-';
}

function displayDestination(letter) {
  if (['ES_RECEIVED', 'READY_FOR_SIGNATURE'].includes(letter.status)) return 'ES office';
  if (letter.type === 'OUTGOING') return formatValue(letter.recipient);
  return isEsOffice(letter.currentDepartment) ? 'ES office' : formatValue(letter.currentDepartment);
}

function displayType(letter) {
  return letter.type === 'INCOMING' ? 'Received' : 'Dispatched';
}

export default function LetterDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [letter, setLetter] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [routeOpen, setRouteOpen] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [routeDepartment, setRouteDepartment] = useState('Executive Secretary');
  const [workflowForm, setWorkflowForm] = useState({ status: '', currentDepartment: 'Executive Secretary', note: '' });
  const [editForm, setEditForm] = useState(emptyEditForm());
  const [message, setMessage] = useState(() => location.state?.message || '');
  const [editError, setEditError] = useState('');
  const [allowDispatchAction, setAllowDispatchAction] = useState(() => Boolean(location.state?.allowDispatch));

  async function loadLetter() {
    const { data } = await http.get(`/letters/${id}`);
    setLetter(data.data);
    setRouteDepartment(dispatchDestinationForLetter(data.data));
  }

  useEffect(() => {
    loadLetter();
  }, [id]);

  useEffect(() => {
    if (!location.state?.allowDispatch) setAllowDispatchAction(false);
  }, [id]);

  useEffect(() => {
    if (!location.state?.message && !location.state?.allowDispatch) return;
    if (location.state?.message) setMessage(location.state.message);
    if (location.state?.allowDispatch) setAllowDispatchAction(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  function openEditModal() {
    const senderOrganization = letter.senderOrganization || letter.sender || '';
    const recipient = letter.recipient || '';
    setEditForm({
      trackingNumber: letter.trackingNumber || '',
      registryNumber: numericOnly(letter.registryNumber),
      letterDate: dateValue(letter.letterDate),
      letterNumber: numericOnly(letter.letterNumber),
      subject: letter.subject || '',
      senderOrganizationOption: institutionSelection(senderOrganization),
      customSenderOrganization: institutionSelection(senderOrganization) === otherInstitutionValue ? senderOrganization : '',
      sender: letter.sender || '',
      recipientOption: institutionSelection(recipient),
      customRecipient: institutionSelection(recipient) === otherInstitutionValue ? recipient : '',
      recipient: letter.recipient || '',
      attachments: Number(letter.attachments) > 0 ? 1 : 0,
      priority: letter.priority || 'NORMAL',
      currentDepartment: letter.currentDepartment || 'ES office',
      routeDepartment: sourceDepartmentForLetter(letter) === '-' ? 'Executive Secretary' : sourceDepartmentForLetter(letter),
      assignedTo: letter.assignedTo || '',
      dueAt: dateValue(letter.dueAt),
      remarks: letter.remarks || ''
    });
    setEditError('');
    setEditOpen(true);
  }

  function openWorkflowModal() {
    const options = letter.type === 'INCOMING' ? incomingStatusOptions : outgoingStatusOptions;
    const currentIndex = options.findIndex((option) => option.value === letter.status);
    const suggestedStatus = options[Math.min(Math.max(currentIndex + 1, 0), options.length - 1)]?.value || options[0]?.value || '';
    setWorkflowForm({
      status: suggestedStatus,
      currentDepartment: letter.type === 'OUTGOING' ? dispatchDestinationForLetter(letter) : letter.currentDepartment || 'Executive Secretary',
      note: ''
    });
    setWorkflowOpen(true);
  }

  async function routeLetter(event) {
    event.preventDefault();
    const destination = dispatchDestinationForLetter({ ...letter, routeDepartment });
    const { data } = await http.post(`/letters/${id}/route`, {
      department: destination,
      note: letter.type === 'OUTGOING' ? `Dispatched from PURC to ${destination}` : `Dispatched from ES to ${destination}`
    });
    setLetter(data.data);
    setMessage(
      data.data.type === 'INCOMING'
        ? `Status updated to dispatched internally. Letter dispatched from ES to ${destination}.`
        : `Status updated to dispatched externally. Letter dispatched to ${destination}.`
    );
    setAllowDispatchAction(false);
    setRouteOpen(false);
    notifyLettersChanged();
  }

  async function saveWorkflow(event) {
    event.preventDefault();
    const payload = {
      ...workflowForm,
      currentDepartment: letter.type === 'OUTGOING' && workflowForm.status === 'DISPATCHED'
        ? dispatchDestinationForLetter(letter)
        : workflowForm.currentDepartment
    };
    const { data } = await http.post(`/letters/${id}/workflow`, payload);
    setLetter(data.data);
    setMessage(`Workflow saved as ${statusLabels[workflowForm.status] || workflowForm.status}.`);
    setWorkflowOpen(false);
    notifyLettersChanged();
  }

  async function saveEdits(event) {
    event.preventDefault();
    setEditError('');
    const senderOrganization = selectedInstitution(editForm.senderOrganizationOption, editForm.customSenderOrganization);
    const recipient = letter.type === 'OUTGOING'
      ? selectedInstitution(editForm.recipientOption, editForm.customRecipient)
      : editForm.recipient.trim();
    if (letter.type === 'INCOMING' && !senderOrganization) {
      setEditError('Select the institution the letter came from.');
      return;
    }
    if (letter.type === 'OUTGOING' && !recipient) {
      setEditError('Select the recipient institution.');
      return;
    }
    const payload = {
      ...editForm,
      senderOrganization,
      recipient,
      sender: letter.type === 'OUTGOING' ? editForm.routeDepartment : editForm.sender
    };
    try {
      const { data } = await http.patch(`/letters/${id}`, payload);
      setLetter(data.data);
      setRouteDepartment(dispatchDestinationForLetter(data.data));
      setMessage('Letter record updated.');
      setEditOpen(false);
    } catch (error) {
      setEditError(error?.response?.data?.message || error.message || 'Unable to update this letter record.');
    }
  }

  async function deleteLetter() {
    await http.delete(`/letters/${id}`);
    navigate(letter.type === 'OUTGOING' ? '/outgoing' : '/incoming', { replace: true });
  }

  function backToLetterList() {
    navigate(letter.type === 'OUTGOING' ? '/outgoing' : '/incoming');
  }

  // Downloads a real PDF built by the server, so it opens on any laptop or phone.
  async function downloadSummary() {
    setSummaryError('');
    setSummaryLoading(true);
    try {
      const { data } = await http.get(`/letters/${letter.id}/summary.pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${String(letter.trackingNumber || 'letter').replace(/[^A-Za-z0-9._-]+/g, '-')}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setSummaryError('Could not download the summary. Please try again.');
    } finally {
      setSummaryLoading(false);
    }
  }

  if (!letter) return <Skeleton className="h-[600px]" />;

  const workflowOptions = letter.type === 'INCOMING' ? incomingStatusOptions : outgoingStatusOptions;

  // A precise, readable date like "Apr 4, 2026, 09:15 AM".
  const formatTimelineDate = (at) => new Date(at).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  // Turn each tracking event into a full sentence that includes the exact time.
  function timelineHeadline(item) {
    const text = `${item.title || ''} ${item.note || ''}`.toLowerCase();
    const when = formatTimelineDate(item.at);
    if (text.includes('record created') || text.includes('registered')) {
      const typeWord = letter.type === 'INCOMING' ? 'Received' : 'Dispatched';
      return `${typeWord} letter recorded on ${when}`;
    }
    // Clean up any older "Outgoing letter dispatched" wording still in the data.
    let title = item.title || '';
    if (/outgoing letter dispatched/i.test(title)) {
      title = letter.recipient ? `Dispatched to ${letter.recipient}` : 'Letter dispatched';
    }
    return `${title} at ${when}`;
  }
  const dispatchDestination = dispatchDestinationForLetter({ ...letter, routeDepartment });
  const summaryFields = letter.type === 'OUTGOING'
    ? [
        ['Type', displayType(letter)],
        ['Reference', letter.trackingNumber],
        ['Registry number', letter.registryNumber],
        ['No. of letter', letter.letterNumber],
        ['PURC directorate the letter came from', sourceDepartmentForLetter(letter)],
        ['Recipient institution', letter.recipient],
        ['Date', letter.letterDate ? new Date(letter.letterDate).toLocaleDateString() : '-']
      ]
    : [
        ['Type', displayType(letter)],
        ['Reference', letter.trackingNumber],
        ['Registry number', letter.registryNumber],
        ['No. of letter', letter.letterNumber],
        ['Institution letter came from', letter.senderOrganization || letter.sender],
        ['From whom sent', letter.sender],
        ['Recipient directorate', letter.routeDepartment],
        ['Recipient named on letter', letter.recipient],
        ['Date', letter.letterDate ? new Date(letter.letterDate).toLocaleDateString() : '-']
      ];

  return (
    <div className="space-y-6">
      {message && <div className="rounded-sm border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}
      {allowDispatchAction && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-purcBlue dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100">
          Click Dispatch to confirm that this letter is dispatched to {dispatchDestination}.
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-slate-900/60">
        <div className={`h-1.5 w-full ${letter.type === 'INCOMING' ? 'bg-gradient-to-r from-indigo-400 to-indigo-500' : 'bg-gradient-to-r from-rose-400 to-rose-500'}`} />
        <div className="flex flex-col justify-between gap-4 p-5 xl:flex-row xl:items-start">
          <div className="min-w-0">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-purcBlue ring-1 ring-blue-100 dark:bg-blue-900/40 dark:text-blue-100 dark:ring-blue-800/60">
              {letter.trackingNumber}
            </span>
            <h1 className="mt-3 max-w-4xl text-2xl font-black leading-tight text-ink dark:text-white">{letter.subject}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {/* The status already reads "Received"/"Dispatched", so a separate
                  type chip would just repeat it. */}
              <StatusChip status={letter.status} />
              <PriorityBadge priority={letter.priority} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="secondary-button" onClick={backToLetterList}><ArrowLeft size={16} /> Back</button>
            <button className="secondary-button" onClick={openEditModal}><Pencil size={16} /> Edit letter</button>
            <button className="secondary-button text-purcRed hover:text-purcRed" onClick={() => setDeleteOpen(true)}><Trash2 size={16} /> Delete</button>
            {allowDispatchAction && (
              <button className="primary-button" onClick={() => setRouteOpen(true)}><Route size={16} /> Dispatch</button>
            )}
          </div>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-slate-900/60">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink dark:text-white">Tracking timeline</h2>
              <button className="secondary-button disabled:opacity-60" onClick={downloadSummary} disabled={summaryLoading}>
                <Download size={16} /> {summaryLoading ? 'Preparing PDF…' : 'Download summary (PDF)'}
              </button>
            </div>
            {summaryError && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-purcRed">{summaryError}</p>
            )}
            <div className="mt-5 space-y-0">
              {(letter.timeline || []).map((item, index, arr) => (
                <div key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
                  <div className="flex flex-col items-center">
                    <span className="mt-1 grid h-3 w-3 place-items-center rounded-full bg-cobalt ring-4 ring-cobalt/15" />
                    {index < arr.length - 1 && <span className="mt-1 w-px flex-1 bg-slate-200 dark:bg-white/10" />}
                  </div>
                  <div className="min-w-0 pb-1">
                    <p className="font-bold text-slate-800 dark:text-slate-100">{timelineHeadline(item)}</p>
                    <p className="mt-0.5 text-xs font-medium text-slate-400">{item.actor} · {item.department}</p>
                    {item.note && item.note.toLowerCase() !== 'record created' && (
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-slate-900/60">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink dark:text-white">Letter summary details</h2>
            <div className="mt-2">
              {summaryFields.map(([label, value]) => (
                <div key={label} className="border-b border-slate-100 py-3 last:border-0 dark:border-white/10">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                  <p className="mt-1 font-semibold text-slate-700 dark:text-slate-100">{formatValue(value)}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
      <Modal open={routeOpen} title={letter.type === 'OUTGOING' ? 'Dispatch Letter from PURC' : 'Dispatch Letter from ES'} onClose={() => setRouteOpen(false)}>
        <form onSubmit={routeLetter} className="space-y-4">
          {letter.type === 'OUTGOING' ? (
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-xs font-bold uppercase text-slate-500">Recipient institution</p>
              <p className="mt-1 font-semibold text-ink">{formatValue(dispatchDestination)}</p>
            </div>
          ) : (
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Destination directorate</span>
              <select className="input mt-2" value={routeDepartment} onChange={(event) => setRouteDepartment(event.target.value)}>
                {purcDepartments.map((department) => <option key={department}>{department}</option>)}
              </select>
            </label>
          )}
          <button className="primary-button w-full">Dispatch letter</button>
        </form>
      </Modal>
      <Modal open={workflowOpen} title="Edit Letter Summary Details" onClose={() => setWorkflowOpen(false)}>
        <form onSubmit={saveWorkflow} className="space-y-4">
          <label className="grid gap-1 text-sm font-bold text-slate-700">
            New status
            <select className="input" value={workflowForm.status} onChange={(event) => setWorkflowForm({ ...workflowForm, status: event.target.value })}>
              {workflowOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          {letter.type === 'OUTGOING' ? (
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-xs font-bold uppercase text-slate-500">Dispatch destination</p>
              <p className="mt-1 font-semibold text-ink">{formatValue(dispatchDestinationForLetter(letter))}</p>
            </div>
          ) : (
            <label className="grid gap-1 text-sm font-bold text-slate-700">
              Current letter destination
              <select className="input" value={workflowForm.currentDepartment} onChange={(event) => setWorkflowForm({ ...workflowForm, currentDepartment: event.target.value })}>
                {purcDepartments.map((department) => <option key={department}>{department}</option>)}
              </select>
            </label>
          )}
          <button className="primary-button w-full">Save metadata settings</button>
        </form>
      </Modal>
      <Modal open={editOpen} title="Edit Letter Record" onClose={() => { setEditOpen(false); setEditError(''); }}>
        <form onSubmit={saveEdits} className="grid gap-4 md:grid-cols-2">
          {editError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-purcRed md:col-span-2">
              {editError}
            </div>
          )}
          <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Date
            <input className="input" type="date" value={editForm.letterDate} onChange={(event) => setEditForm({ ...editForm, letterDate: event.target.value })} />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Reference
            <input className="input" value={editForm.trackingNumber} onChange={(event) => { setEditForm({ ...editForm, trackingNumber: event.target.value }); setEditError(''); }} required />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200 md:col-span-2">
            Registry number
            <input className="input" inputMode="numeric" pattern="[0-9]*" value={editForm.registryNumber} onChange={(event) => setEditForm({ ...editForm, registryNumber: numericOnly(event.target.value) })} />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200 md:col-span-2">
            No. of letter
            <input className="input" inputMode="numeric" pattern="[0-9]*" value={editForm.letterNumber} onChange={(event) => setEditForm({ ...editForm, letterNumber: numericOnly(event.target.value) })} />
          </label>
          <input className="input md:col-span-2" placeholder="Subject" value={editForm.subject} onChange={(event) => setEditForm({ ...editForm, subject: event.target.value })} required />
          {letter.type === 'INCOMING' ? (
            <>
              <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Institution letter came from
                <select className="input" value={editForm.senderOrganizationOption} onChange={(event) => setEditForm({ ...editForm, senderOrganizationOption: event.target.value, customSenderOrganization: '' })} required>
                  <option value="">Select institution</option>
                  {institutionOptions.map((institution) => <option key={institution}>{institution}</option>)}
                  <option value={otherInstitutionValue}>Other institution</option>
                </select>
              </label>
              {editForm.senderOrganizationOption === otherInstitutionValue && (
                <input className="input" placeholder="Enter institution name" value={editForm.customSenderOrganization} onChange={(event) => setEditForm({ ...editForm, customSenderOrganization: event.target.value })} required />
              )}
              <input className="input" placeholder="From whom sent" value={editForm.sender} onChange={(event) => setEditForm({ ...editForm, sender: event.target.value })} />
              <input className="input" placeholder="Recipient named on letter (optional)" value={editForm.recipient} onChange={(event) => setEditForm({ ...editForm, recipient: event.target.value })} />
            </>
          ) : (
            <>
              <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200 md:col-span-2">
                Recipient institution
                <select className="input" value={editForm.recipientOption} onChange={(event) => setEditForm({ ...editForm, recipientOption: event.target.value, customRecipient: '' })} required>
                  <option value="">Select recipient institution</option>
                  {institutionOptions.map((institution) => <option key={institution}>{institution}</option>)}
                  <option value={otherInstitutionValue}>Other institution</option>
                </select>
              </label>
              {editForm.recipientOption === otherInstitutionValue && (
                <input className="input md:col-span-2" placeholder="Enter recipient institution" value={editForm.customRecipient} onChange={(event) => setEditForm({ ...editForm, customRecipient: event.target.value })} required />
              )}
            </>
          )}
          <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Priority
            <select className="input" value={editForm.priority} onChange={(event) => setEditForm({ ...editForm, priority: event.target.value })}>
              <option>NORMAL</option><option>URGENT</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {letter.type === 'INCOMING' ? 'Directorate to route to' : 'Directorate responsible for letter'}
            <select className="input" value={editForm.routeDepartment} onChange={(event) => setEditForm({ ...editForm, routeDepartment: event.target.value })}>
              {purcDepartments.map((department) => <option key={department}>{department}</option>)}
            </select>
          </label>
          <textarea className="input md:col-span-2" rows="3" placeholder="Remarks" value={editForm.remarks} onChange={(event) => setEditForm({ ...editForm, remarks: event.target.value })} />
          <button className="primary-button md:col-span-2">Save corrections</button>
        </form>
      </Modal>
      <Modal open={deleteOpen} title="Delete Letter Record" onClose={() => setDeleteOpen(false)}>
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-600">Delete this letter only if it was created by mistake. This removes it from dashboard counts, letters received, letters sent, search, and timeline history.</p>
          <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-purcRed">{letter.trackingNumber} - {letter.subject}</div>
          <div className="flex gap-2">
            <button className="secondary-button flex-1" onClick={() => setDeleteOpen(false)}>Cancel</button>
            <button className="primary-button flex-1 bg-purcRed hover:bg-red-800" onClick={deleteLetter}>Delete record</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
