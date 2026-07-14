const institutions = [
  { name: 'Volta River Authority', aliases: ['vra', 'volta river authority'] },
  { name: 'Bui Power Authority', aliases: ['bpa', 'bui power authority'] },
  { name: 'Sunon Asogli Power (Ghana) Limited', aliases: ['asogli', 'sunon asogli', 'sunon asogli power', 'sunon asogli power (ghana) limited'] },
  { name: 'Cenpower Generation Company Limited', aliases: ['cenpower', 'cenpower generation company limited'] },
  { name: 'Karpowership Ghana Company Limited', aliases: ['karpowership', 'karpowership ghana company limited'] },
  { name: 'Twin City Energy Limited', aliases: ['twin city energy', 'twin city energy limited'] },
  { name: 'Amandi Energy Limited', aliases: ['amandi', 'amandi energy limited'] },
  { name: 'CENIT Energy Limited', aliases: ['cenit', 'cenit energy limited'] },
  { name: 'Trojan Power Limited', aliases: ['trojan', 'trojan power limited'] },
  { name: 'Genser Energy Ghana Limited', aliases: ['genser', 'genser energy ghana limited'] },
  { name: 'Early Power Limited', aliases: ['early power', 'early power limited'] },
  { name: 'Rotan Power Limited', aliases: ['rotan', 'rotan power limited'] },
  { name: 'Ghana Grid Company Limited', aliases: ['gridco', 'ghana grid company', 'ghana grid company limited'] },
  { name: 'Electricity Company of Ghana', aliases: ['ecg', 'electricity company of ghana'] },
  { name: 'Northern Electricity Distribution Company', aliases: ['nedco', 'northern electricity distribution company'] },
  { name: 'Enclave Power Company Limited', aliases: ['enclave', 'enclave power', 'enclave power company limited'] },
  { name: 'Ghana National Gas Company', aliases: ['gngc', 'ghana gas', 'ghana national gas company'] },
  { name: 'West African Gas Pipeline Company Limited', aliases: ['wapco', 'west african gas pipeline company', 'west african gas pipeline company limited'] },
  { name: 'Ghana Water Company Limited', aliases: ['gwcl', 'ghana water company', 'ghana water company limited'] },
  { name: 'Community Water and Sanitation Agency', aliases: ['cwsa', 'community water and sanitation agency'] },
  // Ministries
  { name: 'Ministry of Energy and Green Transition', aliases: ['moe', 'ministry of energy', 'ministry of energy and green transition'] },
  { name: 'Ministry of Finance', aliases: ['mof', 'ministry of finance'] },
  { name: 'Ministry of Sanitation and Water Resources', aliases: ['mswr', 'ministry of sanitation', 'ministry of sanitation and water resources'] },
  { name: 'Ministry of Works and Housing', aliases: ['ministry of works and housing'] },
  { name: 'Ministry of Local Government, Decentralisation and Rural Development', aliases: ['ministry of local government', 'ministry of local government, decentralisation and rural development'] },
  { name: 'Ministry of Trade and Industry', aliases: ['moti', 'ministry of trade and industry'] },
  { name: 'Ministry of Justice and Attorney-General', aliases: ['ministry of justice', 'attorney-general', 'ministry of justice and attorney-general'] },
  // Regulators and government agencies
  { name: 'Energy Commission', aliases: ['energy commission'] },
  { name: 'Water Resources Commission', aliases: ['wrc', 'water resources commission'] },
  { name: 'National Petroleum Authority', aliases: ['npa', 'national petroleum authority'] },
  { name: 'Petroleum Commission', aliases: ['petroleum commission'] },
  { name: 'Environmental Protection Agency', aliases: ['epa', 'environmental protection agency'] },
  { name: 'Ghana Standards Authority', aliases: ['gsa', 'ghana standards authority'] },
  { name: 'Ghana Revenue Authority', aliases: ['gra', 'ghana revenue authority'] },
  { name: 'Office of the President', aliases: ['office of the president', 'presidency', 'jubilee house'] },
  { name: 'Parliament of Ghana', aliases: ['parliament', 'parliament of ghana'] },
  { name: 'Office of the Auditor-General', aliases: ['auditor-general', 'office of the auditor-general'] },
  { name: 'Commission on Human Rights and Administrative Justice', aliases: ['chraj', 'commission on human rights and administrative justice'] },
  // Assemblies and local government
  { name: 'Metropolitan, Municipal and District Assembly', aliases: ['mmda', 'district assembly', 'metropolitan, municipal and district assembly'] },
  { name: 'Regional Coordinating Council', aliases: ['rcc', 'regional coordinating council'] },
  // Associations, consumers and other parties
  { name: 'Association of Ghana Industries', aliases: ['agi', 'association of ghana industries'] },
  { name: 'Ghana National Chamber of Commerce and Industry', aliases: ['chamber of commerce', 'ghana national chamber of commerce and industry'] },
  { name: 'Trades Union Congress', aliases: ['tuc', 'trades union congress'] },
  { name: 'Consumer / Individual Complainant', aliases: ['consumer', 'individual', 'consumer / individual complainant'] },
  { name: 'Media Organisation', aliases: ['media', 'media organisation'] },
  { name: 'Law Firm / Legal Counsel', aliases: ['law firm', 'legal counsel', 'law firm / legal counsel'] },
  { name: 'Private Company', aliases: ['private company'] }
];

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function canonicalizeInstitution(value) {
  const trimmed = String(value || '').replace(/\s+/g, ' ').trim();
  const normalized = normalize(trimmed);
  if (!normalized) return '';
  return institutions.find((institution) => institution.aliases.includes(normalized))?.name || trimmed;
}
