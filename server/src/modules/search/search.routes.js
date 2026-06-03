import { Router } from 'express';
import { departments, letters } from '../../utils/sampleData.js';
import { enrichLettersWithRemarkIntelligence } from '../../utils/remarkIntelligence.js';
import { canonicalizeInstitution } from '../../utils/institutions.js';

export const searchRouter = Router();

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function getLetterDate(letter) {
  return new Date(letter.receivedAt || letter.dispatchedAt || letter.createdAt || Date.now());
}

function isEsOffice(value) {
  return ['es office', 'executive secretary', 'executive secretary office'].includes(normalize(value));
}

function isStillAtEs(letter) {
  return ['ES_RECEIVED', 'READY_FOR_SIGNATURE'].includes(letter.status) || isEsOffice(letter.currentDepartment);
}

function endOfToday() {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today;
}

function departmentTerms(value) {
  const term = normalize(value);
  if (!term) return [];
  const department = departments.find((item) => normalize(item.name) === term || normalize(item.code) === term);
  return [value, department?.name, department?.code].filter(Boolean).map(normalize);
}

function matchesText(letter, q) {
  if (!q) return true;
  const haystack = [
    letter.trackingNumber,
    letter.registryNumber,
    letter.letterNumber,
    letter.referenceNumber,
    letter.type,
    letter.subject,
    letter.senderOrganization,
    letter.sender,
    letter.recipient,
    letter.summary,
    letter.status,
    letter.inferredAction,
    letter.inferenceReason,
    letter.priority,
    letter.currentDepartment,
    letter.inferredDepartment,
    letter.inferredDepartmentCode,
    letter.assignedTo,
    letter.remarks
  ].join(' ').toLowerCase();
  return [q, normalize(canonicalizeInstitution(q))].some((term) => term && haystack.includes(term));
}

function matchesDepartment(letter, department) {
  const terms = departmentTerms(department);
  if (!terms.length) return true;
  const departmentFields = letter.type === 'OUTGOING'
    ? [
        letter.routeDepartment,
        letter.sender,
        letter.inferredDepartment,
        letter.inferredDepartmentCode
      ]
    : [
        letter.routeDepartment,
        letter.currentDepartment,
        letter.inferredDepartment,
        letter.inferredDepartmentCode,
        letter.assignedTo
      ];
  const haystack = departmentFields.join(' ').toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

function matchesCompany(letter, party) {
  const terms = [normalize(party), normalize(canonicalizeInstitution(party))].filter(Boolean);
  if (!terms.length) return true;
  const haystack = [
    letter.senderOrganization,
    letter.sender,
    letter.recipient,
    letter.subject,
    letter.summary,
    letter.letterNumber,
    letter.trackingNumber,
    letter.remarks
  ].join(' ').toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

searchRouter.get('/', (req, res) => {
  const q = normalize(req.query.q);
  const type = String(req.query.type || '');
  const status = String(req.query.status || '');
  const dispatch = String(req.query.dispatch || '');
  const atEs = String(req.query.atEs || '');
  const priority = String(req.query.priority || '');
  const attachmentFilter = String(req.query.attachmentFilter || '');
  const department = String(req.query.department || '');
  const party = String(req.query.party || '');
  const today = endOfToday();

  const results = enrichLettersWithRemarkIntelligence(letters)
    .filter((letter) => getLetterDate(letter).getTime() <= today.getTime())
    .filter((letter) => !type || letter.type === type)
    .filter((letter) => !status || letter.status === status)
    .filter((letter) => dispatch !== 'all' || ['DISPATCHED_TO_DEPARTMENT', 'DISPATCHED'].includes(letter.status))
    .filter((letter) => atEs !== 'all' || isStillAtEs(letter))
    .filter((letter) => !priority || letter.priority === priority)
    .filter((letter) => !attachmentFilter || (attachmentFilter === 'HAS_ATTACHMENTS' ? Number(letter.attachments) > 0 : Number(letter.attachments) === 0))
    .filter((letter) => matchesText(letter, q))
    .filter((letter) => matchesDepartment(letter, department))
    .filter((letter) => matchesCompany(letter, party))
    .sort((a, b) => getLetterDate(b).getTime() - getLetterDate(a).getTime());

  res.json({
    data: results,
    total: results.length,
    filters: { q, type, status, dispatch, atEs, priority, attachmentFilter, department, party }
  });
});
