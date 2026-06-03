export const otherInstitutionValue = '__OTHER__';

export const institutionOptions = [
  'Electricity Company of Ghana',
  'Northern Electricity Distribution Company',
  'Ghana Grid Company Limited',
  'Ghana Water Company Limited',
  'Community Water and Sanitation Agency',
  'Ghana National Gas Company',
  'Ghana National Petroleum Corporation',
  'Energy Commission',
  'Ministry of Energy',
  'PURC Ashanti Regional Office',
  'PURC Northern Regional Office',
  'Association of Independent Power Producers'
];

const institutionAliases = {
  ecg: 'Electricity Company of Ghana',
  nedco: 'Northern Electricity Distribution Company',
  gridco: 'Ghana Grid Company Limited',
  gwcl: 'Ghana Water Company Limited',
  cwsa: 'Community Water and Sanitation Agency',
  gngc: 'Ghana National Gas Company',
  gnpc: 'Ghana National Petroleum Corporation',
  moe: 'Ministry of Energy',
  aipp: 'Association of Independent Power Producers'
};

export function institutionSelection(value = '') {
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return '';
  return institutionOptions.find((option) => option.toLowerCase() === normalized) || otherInstitutionValue;
}

export function selectedInstitution(option, customValue = '') {
  return option === otherInstitutionValue ? String(customValue).trim() : String(option || '').trim();
}

export function institutionSearchTerms(value = '') {
  const trimmed = String(value).trim().toLowerCase();
  return [...new Set([trimmed, String(institutionAliases[trimmed] || '').toLowerCase()].filter(Boolean))];
}
