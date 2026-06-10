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
  { name: 'Community Water and Sanitation Agency', aliases: ['cwsa', 'community water and sanitation agency'] }
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
