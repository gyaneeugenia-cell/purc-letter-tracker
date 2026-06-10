export const otherInstitutionValue = '__OTHER__';

export const institutionOptions = [
  // Electricity — Generation (government)
  'Volta River Authority',
  'Bui Power Authority',
  // Electricity — Generation (Independent Power Producers)
  'Sunon Asogli Power (Ghana) Limited',
  'Cenpower Generation Company Limited',
  'Karpowership Ghana Company Limited',
  'Twin City Energy Limited',
  'Amandi Energy Limited',
  'CENIT Energy Limited',
  'Trojan Power Limited',
  'Genser Energy Ghana Limited',
  'Early Power Limited',
  'Rotan Power Limited',
  // Electricity — Transmission
  'Ghana Grid Company Limited',
  // Electricity — Distribution
  'Electricity Company of Ghana',
  'Northern Electricity Distribution Company',
  'Enclave Power Company Limited',
  // Natural Gas
  'Ghana National Gas Company',
  'West African Gas Pipeline Company Limited',
  // Water
  'Ghana Water Company Limited',
  'Community Water and Sanitation Agency'
];

const institutionAliases = {
  vra: 'Volta River Authority',
  bpa: 'Bui Power Authority',
  asogli: 'Sunon Asogli Power (Ghana) Limited',
  cenpower: 'Cenpower Generation Company Limited',
  karpowership: 'Karpowership Ghana Company Limited',
  amandi: 'Amandi Energy Limited',
  cenit: 'CENIT Energy Limited',
  genser: 'Genser Energy Ghana Limited',
  gridco: 'Ghana Grid Company Limited',
  ecg: 'Electricity Company of Ghana',
  nedco: 'Northern Electricity Distribution Company',
  enclave: 'Enclave Power Company Limited',
  gngc: 'Ghana National Gas Company',
  wapco: 'West African Gas Pipeline Company Limited',
  gwcl: 'Ghana Water Company Limited',
  cwsa: 'Community Water and Sanitation Agency'
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
