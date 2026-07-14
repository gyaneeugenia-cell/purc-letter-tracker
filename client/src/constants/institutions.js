export const otherInstitutionValue = '__OTHER__';

// Letters do not only come from utilities — they also come from ministries,
// regulators, assemblies, associations and private parties. The list is grouped
// so the dropdown stays readable, and "Other" always allows a free-text name.
export const institutionGroups = [
  {
    label: 'Electricity — Generation',
    options: [
      'Volta River Authority',
      'Bui Power Authority',
      'Sunon Asogli Power (Ghana) Limited',
      'Cenpower Generation Company Limited',
      'Karpowership Ghana Company Limited',
      'Twin City Energy Limited',
      'Amandi Energy Limited',
      'CENIT Energy Limited',
      'Trojan Power Limited',
      'Genser Energy Ghana Limited',
      'Early Power Limited',
      'Rotan Power Limited'
    ]
  },
  {
    label: 'Electricity — Transmission & Distribution',
    options: [
      'Ghana Grid Company Limited',
      'Electricity Company of Ghana',
      'Northern Electricity Distribution Company',
      'Enclave Power Company Limited'
    ]
  },
  {
    label: 'Natural Gas',
    options: [
      'Ghana National Gas Company',
      'West African Gas Pipeline Company Limited'
    ]
  },
  {
    label: 'Water',
    options: [
      'Ghana Water Company Limited',
      'Community Water and Sanitation Agency'
    ]
  },
  {
    label: 'Ministries',
    options: [
      'Ministry of Energy and Green Transition',
      'Ministry of Finance',
      'Ministry of Sanitation and Water Resources',
      'Ministry of Works and Housing',
      'Ministry of Local Government, Decentralisation and Rural Development',
      'Ministry of Trade and Industry',
      'Ministry of Justice and Attorney-General'
    ]
  },
  {
    label: 'Regulators & Government Agencies',
    options: [
      'Energy Commission',
      'Water Resources Commission',
      'National Petroleum Authority',
      'Petroleum Commission',
      'Environmental Protection Agency',
      'Ghana Standards Authority',
      'Ghana Revenue Authority',
      'Office of the President',
      'Parliament of Ghana',
      'Office of the Auditor-General',
      'Commission on Human Rights and Administrative Justice'
    ]
  },
  {
    label: 'Assemblies & Local Government',
    options: [
      'Metropolitan, Municipal and District Assembly',
      'Regional Coordinating Council'
    ]
  },
  {
    label: 'Associations, Consumers & Other Parties',
    options: [
      'Association of Ghana Industries',
      'Ghana National Chamber of Commerce and Industry',
      'Trades Union Congress',
      'Consumer / Individual Complainant',
      'Media Organisation',
      'Law Firm / Legal Counsel',
      'Private Company'
    ]
  }
];

// Flat list (used by search datalists and validation).
export const institutionOptions = institutionGroups.flatMap((group) => group.options);

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
  cwsa: 'Community Water and Sanitation Agency',
  moe: 'Ministry of Energy and Green Transition',
  mof: 'Ministry of Finance',
  mswr: 'Ministry of Sanitation and Water Resources',
  ec: 'Energy Commission',
  wrc: 'Water Resources Commission',
  npa: 'National Petroleum Authority',
  epa: 'Environmental Protection Agency',
  gsa: 'Ghana Standards Authority',
  gra: 'Ghana Revenue Authority',
  agi: 'Association of Ghana Industries',
  tuc: 'Trades Union Congress',
  mmda: 'Metropolitan, Municipal and District Assembly',
  rcc: 'Regional Coordinating Council'
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
