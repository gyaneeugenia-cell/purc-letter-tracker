const institutions = [
  { name: 'Electricity Company of Ghana', aliases: ['ecg', 'electricity company of ghana'] },
  { name: 'Northern Electricity Distribution Company', aliases: ['nedco', 'northern electricity distribution company'] },
  { name: 'Ghana Grid Company Limited', aliases: ['gridco', 'ghana grid company', 'ghana grid company limited'] },
  { name: 'Ghana Water Company Limited', aliases: ['gwcl', 'ghana water company', 'ghana water company limited'] },
  { name: 'Community Water and Sanitation Agency', aliases: ['cwsa', 'community water and sanitation agency'] },
  { name: 'Ghana National Gas Company', aliases: ['gngc', 'ghana gas', 'ghana national gas company'] },
  { name: 'Ghana National Petroleum Corporation', aliases: ['gnpc', 'ghana national petroleum corporation'] },
  { name: 'Energy Commission', aliases: ['energy commission'] },
  { name: 'Ministry of Energy', aliases: ['moe', 'ministry of energy'] },
  { name: 'PURC Ashanti Regional Office', aliases: ['purc ashanti regional office'] },
  { name: 'PURC Northern Regional Office', aliases: ['purc northern regional office'] },
  { name: 'Association of Independent Power Producers', aliases: ['aipp', 'association of independent power producers'] }
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
