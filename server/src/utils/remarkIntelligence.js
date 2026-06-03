const departmentAliases = [
  {
    code: 'ES',
    name: 'Executive Secretary',
    terms: ['es', 'executive secretary', 'es office', 'secretary office']
  },
  {
    code: 'RED',
    name: 'Regulatory Economics',
    terms: ['red', 'regulatory economics', 'tariff', 'economic']
  },
  {
    code: 'ESPM',
    name: 'Energy Services and Performance Monitoring',
    terms: ['espm', 'energy services', 'energy services and performance monitoring', 'ecg', 'nedco', 'electricity']
  },
  {
    code: 'WSPM',
    name: 'Water Services and Performance Monitoring',
    terms: ['wspm', 'water services', 'water services and performance monitoring', 'ghana water', 'gwcl', 'water']
  },
  {
    code: 'ROD',
    name: 'Regional Operations',
    terms: ['rod', 'regional operations', 'regional', 'complaint']
  },
  {
    code: 'LS',
    name: 'Legal Services',
    terms: ['ls', 'legal services', 'legal']
  },
  {
    code: 'FA',
    name: 'Finance and Administration',
    terms: ['fa', 'fad', 'finance and administration', 'finance']
  }
];

function normalize(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function hasAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function remarkText(letter) {
  return normalize([
    letter.remarks,
    letter.summary,
    letter.subject,
    letter.senderOrganization,
    letter.recipient,
    letter.routeDepartment,
    letter.currentDepartment,
    letter.assignedTo
  ].filter(Boolean).join(' '));
}

function explicitRemarkText(letter) {
  return normalize([letter.remarks, letter.summary].filter(Boolean).join(' '));
}

function inferDepartment(letter, text) {
  const current = departmentAliases.find((department) => normalize(letter.currentDepartment) === normalize(department.name));
  const routed = departmentAliases.find((department) => normalize(letter.routeDepartment) === normalize(department.name));
  const recipient = departmentAliases.find((department) => {
    const recipientText = normalize(letter.recipient);
    return recipientText.includes(normalize(department.name)) || recipientText.includes(normalize(department.code));
  });
  const fromTerms = departmentAliases.find((department) => department.terms.some((term) => text.includes(term)));
  if (current && current.code !== 'ES') return current;
  if (routed && routed.code !== 'ES') return routed;
  return recipient || fromTerms || routed || current || departmentAliases[0];
}

function isEsDestination(value) {
  const normalized = normalize(value);
  return ['es office', 'executive secretary', 'executive secretary office'].includes(normalized);
}

function statusPayload(status, action, confidence, reason, department, riskSignal = 'NORMAL') {
  return {
    status,
    inferredStatus: status,
    inferredAction: action,
    inferenceConfidence: confidence,
    inferenceReason: reason,
    inferredDepartment: department.name,
    inferredDepartmentCode: department.code,
    riskSignal
  };
}

export function inferLetterMovement(letter) {
  const text = remarkText(letter);
  const explicit = explicitRemarkText(letter);
  const department = inferDepartment(letter, text);
  const riskSignal = hasAny(text, ['urgent', 'escalat', 'follow up', 'not yet', 'pending', 'delay', 'overdue'])
    ? 'NEEDS_ATTENTION'
    : 'NORMAL';
  const isOutgoing = letter.type === 'OUTGOING';

  if (hasAny(text, ['archive', 'archived', 'filed away', 'completed', 'closed', 'resolved', 'finalised', 'finalized', 'done'])) {
    return statusPayload('ARCHIVED', 'Archived', 0.98, 'Remarks indicate the record has been archived or filed away.', department, riskSignal);
  }

  if (!isOutgoing && hasAny(text, ['receipt recorded', 'received by', 'receipt confirmed', 'confirmed receipt', 'acknowledged by', 'department received'])) {
    return statusPayload(
      'DISPATCHED_TO_DEPARTMENT',
      'Dispatched internally',
      0.9,
      `Remarks mention ${department.name} receipt, but the tracker records this as ES dispatch because independent department receipt is not confirmed in this workflow.`,
      department,
      riskSignal
    );
  }

  if (letter.dispatchedAt && !isEsDestination(letter.currentDepartment)) {
    return statusPayload(
      isOutgoing ? 'DISPATCHED' : 'DISPATCHED_TO_DEPARTMENT',
      isOutgoing ? 'Dispatched externally' : 'Dispatched internally',
      0.98,
      isOutgoing
        ? 'The record has a dispatch timestamp showing the outgoing letter has left PURC.'
        : `The dispatch action sent the letter from ES to ${department.name}.`,
      department,
      riskSignal
    );
  }

  if (!isOutgoing && hasAny(text, ['not yet dispatched', 'not dispatched', 'awaiting dispatch', 'pending dispatch'])) {
    return statusPayload('ES_RECEIVED', 'Pending internal dispatch', 0.9, 'Remarks indicate the letter is still with ES and has not yet been dispatched.', department, riskSignal);
  }

  if (!isOutgoing && hasAny(text, ['dispatched from es', 'dispatched by es', 'dispatched to', 'sent to', 'forwarded to', 'routed to', 'given to'])) {
    return statusPayload(
      'DISPATCHED_TO_DEPARTMENT',
      'Dispatched internally',
      0.9,
      `Remarks indicate ES sent the letter to ${department.name}, but no receipt confirmation is recorded yet.`,
      department,
      riskSignal
    );
  }

  if (isOutgoing && hasAny(text, ['dispatched', 'sent out', 'delivered', 'logged', 'left the commission', 'left purc'])) {
    return statusPayload('DISPATCHED', 'Dispatched externally', 0.92, 'Remarks indicate the external letter has left PURC.', department, riskSignal);
  }

  if (isOutgoing && hasAny(text, ['ready for es signature', 'ready for signature', 'for es signature', 'awaiting signature', 'signature'])) {
    return statusPayload('READY_FOR_SIGNATURE', 'Pending external dispatch', 0.9, 'Remarks indicate the external letter is still at ES office.', department, riskSignal);
  }

  if (!isOutgoing && hasAny(text, ['at es', 'es office', 'received at es', 'sent to es', 'with es', 'awaiting es', 'not yet dispatched'])) {
    return statusPayload('ES_RECEIVED', 'Pending internal dispatch', 0.88, 'Remarks indicate the letter is still with the Executive Secretary office.', department, riskSignal);
  }

  const fallbackStatus = letter.status || (isOutgoing ? 'READY_FOR_SIGNATURE' : 'ES_RECEIVED');
  return {
    status: fallbackStatus,
    inferredStatus: fallbackStatus,
    inferredAction: 'Needs clearer remarks',
    inferenceConfidence: explicit ? 0.45 : 0.25,
    inferenceReason: explicit
      ? 'Remarks exist, but they do not clearly say whether the letter is at ES, dispatched, received, completed, or archived.'
      : 'No practical movement remark has been entered yet.',
    inferredDepartment: department.name,
    inferredDepartmentCode: department.code,
    riskSignal: explicit ? 'REMARK_REVIEW' : 'MISSING_REMARK'
  };
}

export function enrichLetterWithRemarkIntelligence(letter) {
  const inference = inferLetterMovement(letter);
  return {
    ...letter,
    status: inference.status,
    inferredStatus: inference.inferredStatus,
    inferredAction: inference.inferredAction,
    inferenceConfidence: inference.inferenceConfidence,
    inferenceReason: inference.inferenceReason,
    inferredDepartment: inference.inferredDepartment,
    inferredDepartmentCode: inference.inferredDepartmentCode,
    riskSignal: inference.riskSignal
  };
}

export function enrichLettersWithRemarkIntelligence(items) {
  return items.map((letter) => enrichLetterWithRemarkIntelligence(letter));
}

export function applyRemarkIntelligence(letter) {
  const inference = inferLetterMovement(letter);
  letter.status = inference.status;
  letter.inferredStatus = inference.inferredStatus;
  letter.inferredAction = inference.inferredAction;
  letter.inferenceConfidence = inference.inferenceConfidence;
  letter.inferenceReason = inference.inferenceReason;
  letter.inferredDepartment = inference.inferredDepartment;
  letter.inferredDepartmentCode = inference.inferredDepartmentCode;
  letter.riskSignal = inference.riskSignal;
  return letter;
}

export function remarkInsights(items) {
  const classified = items.filter((letter) => Number(letter.inferenceConfidence) >= 0.75).length;
  const atEs = items.filter((letter) => letter.status === 'ES_RECEIVED' || letter.status === 'READY_FOR_SIGNATURE').length;
  const sentByEs = items.filter((letter) => ['DISPATCHED_TO_DEPARTMENT', 'DISPATCHED'].includes(letter.status)).length;
  const departmentDispatch = items.filter((letter) => letter.type === 'INCOMING' && letter.status === 'DISPATCHED_TO_DEPARTMENT').length;
  const externalDispatch = items.filter((letter) => letter.type === 'OUTGOING' && letter.status === 'DISPATCHED').length;
  const needsReview = items.filter((letter) => Number(letter.inferenceConfidence) < 0.75).length;
  const attention = items.filter((letter) => ['NEEDS_ATTENTION', 'REMARK_REVIEW', 'MISSING_REMARK'].includes(letter.riskSignal)).length;

  return {
    classified,
    atEs,
    sentByEs,
    departmentDispatch,
    externalDispatch,
    needsReview,
    attention
  };
}
