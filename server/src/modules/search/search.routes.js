import { Router } from 'express';
import { departments, letters } from '../../utils/sampleData.js';
import { canonicalizeInstitution } from '../../utils/institutions.js';

export const searchRouter = Router();

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function getLetterDate(letter) {
  return new Date(letter.letterDate || letter.receivedAt || letter.dispatchedAt || letter.createdAt || Date.now());
}

function normalizePriority(value) {
  return ['URGENT', 'HIGH'].includes(String(value || '').toUpperCase()) ? 'URGENT' : 'NORMAL';
}

function departmentTerms(value) {
  const term = normalize(value);
  if (!term) return [];
  const department = departments.find((item) => normalize(item.name) === term || normalize(item.code) === term);
  return [value, department?.name, department?.code].filter(Boolean).map(normalize);
}

// Intelligent free-text match across every meaningful field of a letter.
function matchesText(letter, q) {
  if (!q) return true;
  const haystack = [
    letter.trackingNumber,
    letter.registryNumber,
    letter.letterNumber,
    letter.subject,
    letter.senderOrganization,
    letter.sender,
    letter.recipient,
    letter.summary,
    letter.status,
    letter.priority,
    letter.currentDepartment,
    letter.routeDepartment,
    letter.remarks
  ].join(' ').toLowerCase();
  // Match the raw term, and also the canonical institution name (so "ecg" finds "Electricity Company of Ghana").
  return [q, normalize(canonicalizeInstitution(q))].some((term) => term && haystack.includes(term));
}

function matchesDepartment(letter, department) {
  const terms = departmentTerms(department);
  if (!terms.length) return true;
  const fields = letter.type === 'OUTGOING'
    ? [letter.routeDepartment, letter.sender]
    : [letter.routeDepartment, letter.currentDepartment, letter.assignedTo];
  const haystack = fields.join(' ').toLowerCase();
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
    letter.trackingNumber,
    letter.remarks
  ].join(' ').toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

searchRouter.get('/', (req, res) => {
  const q = normalize(req.query.q);
  const type = String(req.query.type || '');
  const priority = String(req.query.priority || '');
  const department = String(req.query.department || '');
  const party = String(req.query.party || '');
  const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : null;
  const dateTo = req.query.dateTo ? new Date(req.query.dateTo) : null;
  if (dateTo && !Number.isNaN(dateTo.getTime())) dateTo.setHours(23, 59, 59, 999);

  const results = letters
    .filter((letter) => !type || letter.type === type)
    .filter((letter) => !priority || normalizePriority(letter.priority) === priority)
    .filter((letter) => !dateFrom || Number.isNaN(dateFrom.getTime()) || getLetterDate(letter).getTime() >= dateFrom.getTime())
    .filter((letter) => !dateTo || Number.isNaN(dateTo.getTime()) || getLetterDate(letter).getTime() <= dateTo.getTime())
    .filter((letter) => matchesText(letter, q))
    .filter((letter) => matchesDepartment(letter, department))
    .filter((letter) => matchesCompany(letter, party))
    .sort((a, b) => getLetterDate(b).getTime() - getLetterDate(a).getTime());

  res.json({
    data: results,
    total: results.length,
    breakdown: {
      received: results.filter((l) => l.type === 'INCOMING').length,
      dispatched: results.filter((l) => l.type === 'OUTGOING').length
    }
  });
});
