import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { letters, movements, auditLogs } from '../../utils/sampleData.js';
import { canonicalizeInstitution } from '../../utils/institutions.js';
import { inferLetterMovement, applyRemarkIntelligence, enrichLetterWithRemarkIntelligence, enrichLettersWithRemarkIntelligence } from '../../utils/remarkIntelligence.js';

export const lettersRouter = Router();

const workflowLabels = {
  ES_RECEIVED: 'Pending internal dispatch',
  DISPATCHED_TO_DEPARTMENT: 'Dispatched internally',
  READY_FOR_SIGNATURE: 'Pending external dispatch',
  DISPATCHED: 'Dispatched externally',
  ARCHIVED: 'Archived'
};

const esOfficeDestination = 'ES office';
const allowedIncomingStatuses = ['ES_RECEIVED', 'DISPATCHED_TO_DEPARTMENT', 'ARCHIVED'];
const allowedOutgoingStatuses = ['READY_FOR_SIGNATURE', 'DISPATCHED', 'ARCHIVED'];
const allowedLetterTypes = ['INCOMING', 'OUTGOING'];
const allowedPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

function findLetter(id) {
  return letters.find((item) => item.id === id || item.trackingNumber === id);
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function normalizeAttachmentCount(value) {
  if (typeof value === 'boolean') return value ? 1 : 0;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['true', 'yes', 'y', 'with', '1'].includes(normalized)) return 1;
  if (!normalized || ['false', 'no', 'n', 'none', '0'].includes(normalized)) return 0;
  const count = Number(normalized);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function normalizeOptionalNumericField(value, label) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return { value: '' };
  if (!/^\d+$/.test(normalized)) {
    return { error: `${label} must contain numbers only` };
  }
  return { value: normalized };
}

function normalizeOptionalDate(value, label) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return { value: '' };
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return { error: `${label} must be a valid date` };
  return { value: normalized };
}

function isDispatchMovement(item) {
  return item.title === 'Outgoing letter dispatched' || String(item.title || '').startsWith('Dispatched to ');
}

function dispatchMovementKey(item) {
  return normalizeText(item.department || item.title || item.note);
}

function compactTimeline(letter) {
  const seenDispatches = new Set();
  const chronological = movements
    .filter((item) => item.letterId === letter.id)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const compacted = [];
  chronological.forEach((item) => {
    if (String(item.title || '').startsWith('Workflow set to Dispatched')) return;
    if (isDispatchMovement(item)) {
      const key = dispatchMovementKey(item);
      if (seenDispatches.has(key)) return;
      seenDispatches.add(key);
    }
    compacted.push(item);
  });

  return compacted.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function hasDispatchMovement(letter, department) {
  const target = normalizeText(department);
  return movements.some((item) => item.letterId === letter.id && isDispatchMovement(item) && dispatchMovementKey(item) === target);
}

function publicLetter(letter) {
  // Preserve the explicitly-stored status — only attach inference metadata as extra fields.
  // Never let intelligence override a status that was deliberately set via workflow or dispatch.
  const inference = inferLetterMovement(letter);
  return {
    ...letter,
    // Keep letter.status as-is; expose inference results as separate fields only
    inferredStatus: inference.status,
    inferredAction: inference.inferredAction,
    inferenceConfidence: inference.inferenceConfidence,
    inferenceReason: inference.inferenceReason,
    inferredDepartment: inference.inferredDepartment,
    inferredDepartmentCode: inference.inferredDepartmentCode,
    riskSignal: inference.riskSignal,
    timeline: compactTimeline(letter).map((item) => {
      if (item.title === 'Letter registered' && letter.createdBy) {
        return {
          ...item,
          actor: letter.createdBy,
          department: letter.createdByDepartment || item.department
        };
      }
      return item;
    }),
    comments: [
      { id: 'c1', actor: 'Kwame Owusu', text: 'Please verify the regulatory reference before response.', at: new Date().toISOString() }
    ]
  };
}

function actorName(req) {
  return req.user?.name || 'System';
}

function actorDepartment(req) {
  return req.user?.department || 'Executive Secretary';
}

function recordMovement(letter, req, title, note, department = letter.currentDepartment) {
  movements.unshift({
    id: uuid(),
    letterId: letter.id,
    title,
    actor: actorName(req),
    department: department || actorDepartment(req),
    status: 'CURRENT',
    at: new Date().toISOString(),
    note
  });
}

function recordAudit(req, action, letter) {
  auditLogs.unshift({
    id: uuid(),
    action,
    actor: actorName(req),
    entity: letter.trackingNumber,
    severity: 'INFO',
    at: new Date().toISOString(),
    ip: req.ip
  });
}

function applyFilters(items, query) {
  return items.filter((letter) => {
    const q = String(query.q || '').toLowerCase();
    const queryTerms = [q, normalizeText(canonicalizeInstitution(q))].filter(Boolean);
    const matchesQuery = !q || [letter.trackingNumber, letter.registryNumber, letter.letterNumber, letter.subject, letter.senderOrganization, letter.sender, letter.recipient, letter.routeDepartment, letter.inferredAction, letter.inferenceReason]
      .some((value) => queryTerms.some((term) => String(value || '').toLowerCase().includes(term)));
    const matchesType = !query.type || letter.type === query.type;
    const matchesStatus = !query.status || letter.status === query.status;
    const matchesPriority = !query.priority || letter.priority === query.priority;
    return matchesQuery && matchesType && matchesStatus && matchesPriority;
  });
}

lettersRouter.get('/', (req, res) => {
  const filtered = applyFilters(enrichLettersWithRemarkIntelligence(letters), req.query);
  res.json({ data: filtered, total: filtered.length });
});

lettersRouter.post('/', (req, res) => {
  const type = req.body.type || 'INCOMING';
  const trackingNumber = String(req.body.trackingNumber || '').trim();
  const attachments = normalizeAttachmentCount(req.body.attachments ?? req.body.hasAttachments);
  const registryNumber = normalizeOptionalNumericField(req.body.registryNumber, 'Registry number');
  const letterNumber = normalizeOptionalNumericField(req.body.letterNumber, 'No. of letter');
  const letterDate = normalizeOptionalDate(req.body.letterDate, 'Date');
  const dueAt = normalizeOptionalDate(req.body.dueAt, 'Follow-up date');
  const subject = String(req.body.subject || '').trim();
  const priority = String(req.body.priority || 'NORMAL');
  const senderOrganization = type === 'INCOMING'
    ? canonicalizeInstitution(req.body.senderOrganization || req.body.sender)
    : '';
  const recipient = canonicalizeInstitution(req.body.recipient);

  if (!allowedLetterTypes.includes(type)) {
    return res.status(400).json({ message: 'Letter type must be received or prepared for external dispatch' });
  }
  if (!trackingNumber) {
    return res.status(400).json({ message: 'Reference is required and must be entered manually' });
  }
  if (letters.some((item) => item.trackingNumber.toLowerCase() === trackingNumber.toLowerCase())) {
    return res.status(409).json({ message: 'The reference number entered is already used.' });
  }
  if (registryNumber.error) return res.status(400).json({ message: registryNumber.error });
  if (letterNumber.error) return res.status(400).json({ message: letterNumber.error });
  if (letterDate.error || !letterDate.value) return res.status(400).json({ message: letterDate.error || 'Date is required' });
  if (dueAt.error) return res.status(400).json({ message: dueAt.error });
  if (!subject) return res.status(400).json({ message: 'Subject is required' });
  if (!allowedPriorities.includes(priority)) return res.status(400).json({ message: 'Priority is invalid' });
  if (type === 'INCOMING' && !senderOrganization) return res.status(400).json({ message: 'Institution letter came from is required' });
  if (type === 'OUTGOING' && !recipient) return res.status(400).json({ message: 'Recipient institution is required' });

  const letter = {
    id: uuid(),
    trackingNumber,
    status: type === 'OUTGOING' ? 'READY_FOR_SIGNATURE' : 'ES_RECEIVED',
    priority: 'NORMAL',
    confidentiality: 'INTERNAL',
    attachments,
    receivedAt: type === 'INCOMING' ? new Date().toISOString() : null,
    dispatchedAt: type === 'OUTGOING' ? null : undefined,
    createdAt: new Date().toISOString(),
    ...req.body,
    attachments,
    registryNumber: registryNumber.value,
    letterNumber: letterNumber.value,
    letterDate: letterDate.value,
    dueAt: dueAt.value,
    subject,
    priority,
    trackingNumber,
    type,
    senderOrganization,
    recipient,
    sender: type === 'OUTGOING' ? req.body.sender || req.body.routeDepartment || actorDepartment(req) : req.body.sender,
    routeDepartment: req.body.routeDepartment || req.body.currentDepartment || 'Executive Secretary',
    currentDepartment: esOfficeDestination,
    createdBy: actorName(req),
    createdByDepartment: actorDepartment(req)
  };
  applyRemarkIntelligence(letter);
  letters.unshift(letter);
  recordMovement(letter, req, 'Letter registered', 'Record created', actorDepartment(req));
  recordAudit(req, 'LETTER_CREATED', letter);
  res.status(201).json({ data: letter });
});

lettersRouter.get('/:id', (req, res) => {
  const letter = findLetter(req.params.id);
  if (!letter) return res.status(404).json({ message: 'Letter not found' });
  res.json({ data: publicLetter(letter) });
});

lettersRouter.patch('/:id', (req, res) => {
  const letter = findLetter(req.params.id);
  if (!letter) return res.status(404).json({ message: 'Letter not found' });

  const nextReference = String(req.body.trackingNumber || letter.trackingNumber).trim();
  if (!nextReference) {
    return res.status(400).json({ message: 'Reference is required' });
  }
  if (letters.some((item) => item.id !== letter.id && item.trackingNumber.toLowerCase() === nextReference.toLowerCase())) {
    return res.status(409).json({ message: 'The reference number entered is already used.' });
  }

  ['registryNumber', 'letterNumber'].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      const label = field === 'registryNumber' ? 'Registry number' : 'No. of letter';
      const normalized = normalizeOptionalNumericField(req.body[field], label);
      if (normalized.error) req.body[`${field}Error`] = normalized.error;
      req.body[field] = normalized.value;
    }
  });
  if (req.body.registryNumberError) return res.status(400).json({ message: req.body.registryNumberError });
  if (req.body.letterNumberError) return res.status(400).json({ message: req.body.letterNumberError });
  if (Object.prototype.hasOwnProperty.call(req.body, 'dueAt')) {
    const dueAt = normalizeOptionalDate(req.body.dueAt, 'Follow-up date');
    if (dueAt.error) return res.status(400).json({ message: dueAt.error });
    req.body.dueAt = dueAt.value;
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'letterDate')) {
    const letterDate = normalizeOptionalDate(req.body.letterDate, 'Date');
    if (letterDate.error || !letterDate.value) return res.status(400).json({ message: letterDate.error || 'Date is required' });
    req.body.letterDate = letterDate.value;
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'subject') && !String(req.body.subject || '').trim()) {
    return res.status(400).json({ message: 'Subject is required' });
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'priority') && !allowedPriorities.includes(String(req.body.priority))) {
    return res.status(400).json({ message: 'Priority is invalid' });
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'senderOrganization')) {
    req.body.senderOrganization = canonicalizeInstitution(req.body.senderOrganization);
    if (letter.type === 'INCOMING' && !req.body.senderOrganization) {
      return res.status(400).json({ message: 'Institution letter came from is required' });
    }
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'recipient')) {
    req.body.recipient = canonicalizeInstitution(req.body.recipient);
    if (letter.type === 'OUTGOING' && !req.body.recipient) {
      return res.status(400).json({ message: 'Recipient institution is required' });
    }
  }

  const editable = ['trackingNumber', 'registryNumber', 'letterDate', 'letterNumber', 'subject', 'senderOrganization', 'sender', 'recipient', 'priority', 'remarks', 'summary', 'currentDepartment', 'routeDepartment', 'assignedTo', 'dueAt', 'attachments'];
  editable.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      letter[field] = field === 'attachments' ? normalizeAttachmentCount(req.body[field]) : req.body[field];
    }
  });
  if (Object.prototype.hasOwnProperty.call(req.body, 'hasAttachments')) {
    letter.attachments = normalizeAttachmentCount(req.body.hasAttachments);
  }
  letter.trackingNumber = nextReference;
  letter.updatedAt = new Date().toISOString();
  applyRemarkIntelligence(letter);

  recordMovement(letter, req, 'Letter record edited', 'Record corrected after review.', actorDepartment(req));
  recordAudit(req, 'LETTER_UPDATED', letter);
  res.json({ data: publicLetter(letter) });
});

lettersRouter.post('/:id/route', (req, res) => {
  const letter = findLetter(req.params.id);
  if (!letter) return res.status(404).json({ message: 'Letter not found' });
  const targetDepartment = req.body.department || (letter.type === 'OUTGOING' ? letter.recipient : letter.routeDepartment || letter.currentDepartment);
  letter.currentDepartment = targetDepartment;
  if (letter.type === 'INCOMING') letter.routeDepartment = targetDepartment;
  letter.assignedTo = req.body.assignedTo || letter.assignedTo;
  letter.dispatchedAt = new Date().toISOString();
  letter.status = letter.type === 'INCOMING' ? 'DISPATCHED_TO_DEPARTMENT' : 'DISPATCHED';
  letter.updatedAt = new Date().toISOString();
  // Do NOT call applyRemarkIntelligence — dispatch status was explicitly set above.
  if (!hasDispatchMovement(letter, targetDepartment)) {
    recordMovement(
      letter,
      req,
      letter.type === 'INCOMING' ? `Dispatched to ${letter.currentDepartment}` : 'Outgoing letter dispatched',
      req.body.note || (letter.type === 'INCOMING' ? 'Dispatched from ES office for department action.' : 'Outgoing letter dispatched from ES office.'),
      letter.currentDepartment
    );
  }
  recordAudit(req, 'LETTER_DISPATCHED', letter);
  res.json({ data: publicLetter(letter) });
});

lettersRouter.post('/:id/workflow', (req, res) => {
  const letter = findLetter(req.params.id);
  if (!letter) return res.status(404).json({ message: 'Letter not found' });

  const allowed = letter.type === 'INCOMING' ? allowedIncomingStatuses : allowedOutgoingStatuses;
  const nextStatus = req.body.status;
  if (!allowed.includes(nextStatus)) {
    return res.status(400).json({ message: 'Invalid workflow status for this letter type' });
  }

  const dispatchStatuses = ['DISPATCHED', 'DISPATCHED_TO_DEPARTMENT'];
  const esStatuses = ['ES_RECEIVED', 'READY_FOR_SIGNATURE'];
  if (esStatuses.includes(nextStatus)) {
    letter.currentDepartment = esOfficeDestination;
    letter.dispatchedAt = null;
  } else if (dispatchStatuses.includes(nextStatus)) {
    const targetDepartment = req.body.currentDepartment || (letter.type === 'OUTGOING' ? letter.recipient : letter.routeDepartment || letter.currentDepartment);
    letter.currentDepartment = targetDepartment;
    if (letter.type === 'INCOMING') letter.routeDepartment = targetDepartment;
  } else if (req.body.currentDepartment) {
    letter.currentDepartment = req.body.currentDepartment;
  }
  if (req.body.assignedTo) letter.assignedTo = req.body.assignedTo;
  letter.status = nextStatus;
  if (dispatchStatuses.includes(nextStatus)) letter.dispatchedAt = new Date().toISOString();
  if (nextStatus === 'ARCHIVED') letter.completedAt = new Date().toISOString();
  letter.updatedAt = new Date().toISOString();
  // Do NOT call applyRemarkIntelligence here — the user explicitly set this status
  // and intelligence must not silently override it.

  if (dispatchStatuses.includes(nextStatus)) {
    const targetDepartment = letter.currentDepartment || letter.routeDepartment || actorDepartment(req);
    if (!hasDispatchMovement(letter, targetDepartment)) {
      recordMovement(
        letter,
        req,
        letter.type === 'INCOMING' ? `Dispatched to ${targetDepartment}` : 'Outgoing letter dispatched',
        req.body.note || (letter.type === 'INCOMING' ? 'Dispatched from ES office for department action.' : 'Outgoing letter dispatched from ES office.'),
        targetDepartment
      );
    }
  } else {
    recordMovement(
      letter,
      req,
      `Workflow set to ${workflowLabels[nextStatus] || nextStatus}`,
      req.body.note || 'Workflow status updated.',
      letter.currentDepartment
    );
  }
  recordAudit(req, 'WORKFLOW_UPDATED', letter);
  res.json({ data: publicLetter(letter) });
});

lettersRouter.delete('/:id', (req, res) => {
  const index = letters.findIndex((item) => item.id === req.params.id || item.trackingNumber === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Letter not found' });

  const [deleted] = letters.splice(index, 1);
  for (let i = movements.length - 1; i >= 0; i -= 1) {
    if (movements[i].letterId === deleted.id) movements.splice(i, 1);
  }
  recordAudit(req, 'LETTER_DELETED', deleted);
  res.json({ data: deleted });
});
