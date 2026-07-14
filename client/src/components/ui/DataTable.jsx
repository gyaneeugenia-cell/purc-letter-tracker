import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from './Modal.jsx';
import { StatusChip } from './StatusChip.jsx';
import { PriorityBadge } from './PriorityBadge.jsx';
import { statusLabels } from '../../constants/statuses.js';

function displayDateTime(letter) {
  const timestamp = letter.receivedAt || letter.dispatchedAt || letter.createdAt;
  const timeSource = timestamp ? new Date(timestamp) : null;
  if (letter.letterDate) {
    const dateOnly = new Date(letter.letterDate).toLocaleDateString();
    const timeOnly = timeSource && !Number.isNaN(timeSource.getTime())
      ? timeSource.toLocaleTimeString()
      : '';
    return [dateOnly, timeOnly].filter(Boolean).join(', ');
  }
  return timeSource && !Number.isNaN(timeSource.getTime()) ? timeSource.toLocaleString() : '-';
}

function normalizeDestination(value) {
  return String(value || '').trim().toLowerCase();
}

function recipientDepartment(letter) {
  const routeDepartment = letter.routeDepartment || letter.recipientDepartment;
  if (routeDepartment) return routeDepartment;
  if (normalizeDestination(letter.currentDepartment) !== 'es office') return letter.currentDepartment;
  return '-';
}

function institutionOrRecipient(letter) {
  return letter.type === 'INCOMING'
    ? (letter.senderOrganization || letter.sender || '-')
    : (letter.recipient || '-');
}

export function DataTable({ rows = [], embedded = false, operational = false, letterType = '', statusOptions = [], onStatusChange }) {
  const [statusRecord, setStatusRecord] = useState(null);
  const [statusValue, setStatusValue] = useState('');
  const [savingStatusId, setSavingStatusId] = useState('');
  const [statusError, setStatusError] = useState('');
  const canChangeStatus = typeof onStatusChange === 'function' && statusOptions.length > 0;
  const showRecipientDepartment = letterType === 'INCOMING';
  const standardHeaders = showRecipientDepartment
    ? ['Date', 'Reference No.', 'Institution', 'From Whom Sent', 'Registry Number', 'Subject', 'Recipient Directorate', 'Status', 'Remarks']
    : ['Date', 'Reference No.', 'Recipient Institution', 'Registry Number', 'Subject', 'Responsible Directorate', 'Status', 'Remarks'];
  const operationalHeaders = ['Date', 'Reference No.', 'Type', 'Institution / Recipient', 'Subject', 'Status'];
  const baseHeaders = operational ? operationalHeaders : standardHeaders;
  const headers = canChangeStatus && !operational ? [...baseHeaders, 'Letter Status'] : baseHeaders;
  const standardColumnWidths = showRecipientDepartment
    ? [130, 180, 190, 160, 140, 220, 200, 190, 220]
    : [130, 180, 190, 140, 240, 200, 190, 220];
  const baseColumnWidths = operational ? [130, 180, 130, 190, 280, 190] : standardColumnWidths;
  const columnWidths = canChangeStatus && !operational ? [...baseColumnWidths, 190] : baseColumnWidths;
  const tableWidth = columnWidths.reduce((total, width) => total + width, 0);

  function defaultStatusFor(letter) {
    const resolvedType = letter.type || letterType;
    return resolvedType === 'OUTGOING' ? 'READY_FOR_SIGNATURE' : 'ES_RECEIVED';
  }

  function openStatusModal(letter) {
    setStatusRecord(letter);
    setStatusValue(letter.status || statusOptions[0]?.value || '');
    setStatusError('');
  }

  function closeStatusModal() {
    setStatusRecord(null);
    setStatusValue('');
    setStatusError('');
  }

  async function saveStatus(event) {
    event.preventDefault();
    if (!statusRecord || !statusValue) return;
    if (statusValue === statusRecord.status) {
      closeStatusModal();
      return;
    }
    setSavingStatusId(statusRecord.id);
    try {
      await onStatusChange(statusRecord, statusValue);
      closeStatusModal();
    } catch (error) {
      setStatusError(error?.response?.data?.message || error?.message || 'Unable to update this letter status.');
    } finally {
      setSavingStatusId('');
    }
  }

  async function undoStatus(letter) {
    const fallbackStatus = defaultStatusFor(letter);
    if (letter.status === fallbackStatus) return;
    setSavingStatusId(letter.id);
    try {
      await onStatusChange(letter, fallbackStatus);
    } catch (error) {
      setStatusRecord(letter);
      setStatusValue(fallbackStatus);
      setStatusError(error?.response?.data?.message || error?.message || 'Unable to undo this letter status.');
    } finally {
      setSavingStatusId('');
    }
  }

  return (
    <>
      <div className={embedded ? 'overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10' : 'table-shell'}>
        <table className="table-fixed text-left text-sm [&_td]:break-words [&_th]:break-words" style={{ width: `${tableWidth}px`, minWidth: `${tableWidth}px` }}>
          <colgroup>
            {columnWidths.map((width, index) => (
              <col key={`${width}-${index}`} style={{ width: `${width}px` }} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-white/5">
              {headers.map((head) => (
                <th key={head} className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {rows.map((letter) => (
              <tr key={letter.id} className="group bg-white transition-colors odd:bg-slate-50/50 hover:bg-blue-50/60 dark:bg-transparent dark:odd:bg-white/5 dark:hover:bg-white/10">
                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{displayDateTime(letter)}</td>
                <td className="break-words px-4 py-4 align-top font-semibold text-cobalt dark:text-blue-300">
                  <Link to={`/letters/${letter.id}`} className="break-words hover:underline">{letter.trackingNumber}</Link>
                </td>
                {operational ? (
                  <>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{letter.type === 'INCOMING' ? 'Received' : 'Dispatched'}</td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{institutionOrRecipient(letter)}</td>
                    <td className="max-w-sm px-4 py-4 text-slate-800 dark:text-slate-100">{letter.subject}</td>
                    <td className="px-4 py-4"><StatusChip status={letter.status} /></td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{institutionOrRecipient(letter)}</td>
                    {showRecipientDepartment && (
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{letter.sender || '-'}</td>
                    )}
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{letter.registryNumber || '-'}</td>
                    <td className="max-w-sm px-4 py-4 text-slate-800 dark:text-slate-100">{letter.subject}</td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{recipientDepartment(letter)}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusChip status={letter.status} />
                        <PriorityBadge priority={letter.priority} />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">{letter.remarks || 'No Remarks'}</p>
                    </td>
                  </>
                )}
                {canChangeStatus && !operational && (
                  <td className="px-4 py-4">
                    <div className="flex flex-col items-start gap-2">
                      <button
                        type="button"
                        onClick={() => openStatusModal(letter)}
                        className="whitespace-nowrap rounded-md border border-blue-200 px-3 py-1.5 text-xs font-semibold text-purcBlue transition hover:bg-blue-50 disabled:opacity-50 dark:border-blue-900/60 dark:hover:bg-blue-950/40"
                        disabled={savingStatusId === letter.id}
                      >
                        Change letter status
                      </button>
                      {letter.status !== defaultStatusFor(letter) && (
                        <button
                          type="button"
                          onClick={() => undoStatus(letter)}
                          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                          disabled={savingStatusId === letter.id}
                        >
                          Undo
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={headers.length} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                  No letter records match the current view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Modal open={Boolean(statusRecord)} title="Change Letter Status" onClose={closeStatusModal}>
        {statusRecord && (
          <form onSubmit={saveStatus} className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Selected letter</p>
              <p className="mt-1 font-semibold text-ink dark:text-white">{statusRecord.trackingNumber}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{statusRecord.subject}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs font-bold uppercase text-slate-500">Current status</p>
              <div className="mt-2"><StatusChip status={statusRecord.status} /></div>
            </div>
            <label className="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-200">
              New status
              <select className="input" value={statusValue} onChange={(event) => setStatusValue(event.target.value)}>
                {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            {statusError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-purcRed">
                {statusError}
              </div>
            )}
            <button className="primary-button w-full" disabled={savingStatusId === statusRecord.id}>
              Save status as {statusLabels[statusValue] || statusValue}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
