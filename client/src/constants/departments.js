// The Executive Secretariat is the commission's single point of entry and exit:
// every letter arrives at ES and every letter leaves through ES. ES then assigns
// the letter to one of the eight directorates below.
export const executiveSecretariat = 'Executive Secretary';

export const purcDepartmentOptions = [
  { code: 'ES', name: executiveSecretariat },
  { code: 'RED', name: 'Regulatory Economics' },
  { code: 'LFH', name: 'Legal & Formal Hearing' },
  { code: 'ROCS', name: 'Regional Operations and Consumer Services' },
  { code: 'FP', name: 'Finance & Procurement' },
  { code: 'ESPM', name: 'Energy Services and Performance Monitoring' },
  { code: 'WSPM', name: 'Water Services and Performance Monitoring' },
  { code: 'RCA', name: 'Research and Corporate Affairs' },
  { code: 'HRA', name: 'Human Resources & Administration' }
];

// Executive Secretariat + the eight directorates (used for staff accounts and filters).
export const purcDepartments = purcDepartmentOptions.map((department) => department.name);
