export const purcDepartmentOptions = [
  { code: 'ES', name: 'Executive Secretary' },
  { code: 'RED', name: 'Regulatory Economics' },
  { code: 'ESPM', name: 'Energy Services and Performance Monitoring' },
  { code: 'WSPM', name: 'Water Services and Performance Monitoring' },
  { code: 'ROD', name: 'Regional Operations' },
  { code: 'LS', name: 'Legal Services' },
  { code: 'FA', name: 'Finance and Administration' }
];

export const purcDepartments = purcDepartmentOptions.map((department) => department.name);
