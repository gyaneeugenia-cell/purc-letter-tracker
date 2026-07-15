import { letters, movements, auditLogs } from './sampleData.js';

// When a user's name changes, update every place that stored the old name so the
// whole system stays consistent (letters they created, tracking movements, audit
// entries). Matching is by exact name.
export function renameUserEverywhere(oldName, newName) {
  const from = String(oldName || '').trim();
  const to = String(newName || '').trim();
  if (!from || !to || from === to) return;

  letters.forEach((l) => {
    if (l.createdBy === from) l.createdBy = to;
    if (l.assignedTo === from) l.assignedTo = to;
  });
  movements.forEach((m) => {
    if (m.actor === from) m.actor = to;
  });
  auditLogs.forEach((a) => {
    if (a.actor === from) a.actor = to;
  });
}
