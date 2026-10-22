// The Executive Secretariat runs the commission's correspondence, so anyone in
// the Executive Secretary directorate is automatically a system administrator.
export function isExecutiveSecretary(department) {
  const value = String(department || '').trim().toLowerCase();
  return value === 'executive secretary' || value === 'executive secretariat';
}

// Returns the role a user should have: admin when they are in the Executive
// Secretary directorate, otherwise their existing role (this only grants admin,
// it never takes it away from someone moved to another directorate).
export function effectiveRole(currentRole, department) {
  return isExecutiveSecretary(department) ? 'SYSTEM_ADMIN' : (currentRole || 'NORMAL_USER');
}
