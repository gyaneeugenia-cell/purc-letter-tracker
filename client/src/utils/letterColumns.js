import { statusLabels } from '../constants/statuses.js';

function fmtDate(letter) {
  const ts = letter.receivedAt || letter.dispatchedAt || letter.createdAt;
  if (letter.letterDate) {
    const d = new Date(letter.letterDate).toLocaleDateString('en-GB');
    const t = ts ? new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
    return [d, t].filter(Boolean).join(' ');
  }
  return ts ? new Date(ts).toLocaleString('en-GB') : '-';
}

function institutionOrRecipient(letter) {
  return letter.type === 'INCOMING'
    ? (letter.senderOrganization || letter.sender || '-')
    : (letter.recipient || '-');
}

// Full column set for letter registers / search / timeline exports
export const letterExportColumns = [
  { header: 'Date', accessor: fmtDate },
  { header: 'Reference No.', accessor: (l) => l.trackingNumber || '-' },
  { header: 'Type', accessor: (l) => (l.type === 'INCOMING' ? 'Received' : 'Dispatched') },
  { header: 'Registry No.', accessor: (l) => l.registryNumber || '-' },
  { header: 'Institution / Recipient', accessor: institutionOrRecipient },
  { header: 'Subject', accessor: (l) => l.subject || '-' },
  { header: 'Directorate', accessor: (l) => l.routeDepartment || l.currentDepartment || '-' },
  { header: 'Status', accessor: (l) => statusLabels[l.status] || l.status || '-' },
  { header: 'Remarks', accessor: (l) => l.remarks || '-' }
];
