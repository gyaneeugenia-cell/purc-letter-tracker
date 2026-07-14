import { useEffect, useState } from 'react';
import { Pencil, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { http } from '../api/http.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { ExportButtons } from '../components/ui/ExportButtons.jsx';
import { purcDepartments } from '../constants/departments.js';

const userColumns = [
  { header: 'Name', accessor: (u) => u.name || '-' },
  { header: 'Job Title', accessor: (u) => u.title || '-' },
  { header: 'Email', accessor: (u) => u.email || '-' },
  { header: 'Directorate', accessor: (u) => u.department || '-' },
  { header: 'Role', accessor: (u) => (u.role === 'SYSTEM_ADMIN' ? 'Admin' : 'Normal User') },
  { header: 'Status', accessor: () => 'ACTIVE' }
];

export default function UserManagement() {
  const { user: currentUser, updateProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'NORMAL_USER', department: 'Executive Secretary', title: '' });
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', title: '', department: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const isAdmin = currentUser?.role === 'SYSTEM_ADMIN';

  useEffect(() => { http.get('/admin/users').then((res) => setUsers(res.data.data)); }, []);

  // Admins may edit anyone; everyone else may edit only their own account.
  const canEdit = (user) => isAdmin || user.id === currentUser?.id;

  function openEdit(user) {
    setEditUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      title: user.title || '',
      department: user.department || purcDepartments[0]
    });
    setError('');
  }

  async function saveEdit(event) {
    event.preventDefault();
    if (!editUser) return;
    setSavingEdit(true);
    setError('');
    try {
      let updated;
      if (editUser.id === currentUser?.id) {
        // Editing yourself — go through auth so the top bar stays in sync.
        updated = await updateProfile(editForm);
      } else {
        const { data } = await http.patch(`/admin/users/${editUser.id}`, editForm);
        updated = data.data;
      }
      setUsers((items) => items.map((item) => (item.id === editUser.id ? { ...item, ...updated } : item)));
      setEditUser(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteUser(user) {
    if (!isAdmin) return;
    if (user.id === currentUser?.id) {
      setError('You cannot delete your own active administrator account.');
      return;
    }
    const confirmed = window.confirm(`Delete user ${user.name}? This removes access from the sample user list.`);
    if (!confirmed) return;
    try {
      await http.delete(`/admin/users/${user.id}`);
      setUsers((items) => items.filter((item) => item.id !== user.id));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateRole(user, role) {
    if (!isAdmin) return;
    if (user.id === currentUser?.id && role !== 'SYSTEM_ADMIN') {
      setError('You cannot remove admin access from your own active administrator account.');
      return;
    }
    try {
      const { data } = await http.patch(`/admin/users/${user.id}/role`, { role });
      setUsers((items) => items.map((item) => (item.id === user.id ? data.data : item)));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function createUser(event) {
    event.preventDefault();
    if (!isAdmin) return;
    try {
      const { data } = await http.post('/admin/users', form);
      setUsers((items) => [...items, data.data]);
      setForm({ name: '', email: '', role: 'NORMAL_USER', department: 'Executive Secretary', title: '' });
      setOpen(false);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  function displayRole(role) {
    return role === 'SYSTEM_ADMIN' ? 'Admin' : 'Normal User';
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <ExportButtons title="User Directory" periodLabel="All Users" columns={userColumns} rows={users} size="sm" />
        {isAdmin ? (
          <button className="primary-button" onClick={() => setOpen(true)}><UserPlus size={16} /> Add user</button>
        ) : (
          <span className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700">Admin-only actions</span>
        )}
      </div>
      {!isAdmin && (
        <div className="rounded-sm border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-purcBlue">
          You can view users, but only a SYSTEM_ADMIN can create users, delete users, set roles, or change advanced access settings.
        </div>
      )}
      {error && <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-purcRed">{error}</div>}
      <div className="table-shell">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-white/5">
              {['User', 'Email', 'Directorate', 'Role', 'Status', 'Actions'].map((h) => <th key={h} className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {users.map((user) => (
              <tr key={user.id} className="transition-colors hover:bg-blue-50/40 dark:hover:bg-white/5">
                <td className="px-4 py-4 font-semibold">{user.name}<p className="text-xs font-normal text-slate-500">{user.title}</p></td>
                <td className="px-4 py-4">{user.email}</td>
                <td className="px-4 py-4">{user.department}</td>
                <td className="px-4 py-4">
                  {isAdmin ? (
                    <label className="inline-flex items-center gap-2">
                      <ShieldCheck size={16} className={user.role === 'SYSTEM_ADMIN' ? 'text-purcBlue' : 'text-slate-400'} />
                      <select
                        className="input min-w-36 py-2 text-xs font-bold"
                        value={user.role === 'SYSTEM_ADMIN' ? 'SYSTEM_ADMIN' : 'NORMAL_USER'}
                        onChange={(event) => updateRole(user, event.target.value)}
                        disabled={user.id === currentUser?.id}
                        title={user.id === currentUser?.id ? 'You cannot demote your own active admin account' : 'Set user role'}
                      >
                        <option value="NORMAL_USER">Normal User</option>
                        <option value="SYSTEM_ADMIN">Admin</option>
                      </select>
                    </label>
                  ) : (
                    displayRole(user.role)
                  )}
                </td>
                <td className="px-4 py-4"><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">ACTIVE</span></td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => openEdit(user)}
                      disabled={!canEdit(user)}
                      title={canEdit(user) ? 'Edit this user' : 'You can only edit your own information'}
                      className="inline-flex items-center gap-2 rounded-sm border border-blue-200 px-3 py-2 text-xs font-bold text-purcBlue transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      onClick={() => deleteUser(user)}
                      disabled={!isAdmin || user.id === currentUser?.id}
                      className="inline-flex items-center gap-2 rounded-sm border border-red-200 px-3 py-2 text-xs font-bold text-purcRed transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={Boolean(editUser)} title="Edit user information" onClose={() => setEditUser(null)}>
        <form onSubmit={saveEdit} className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            Full name / username
            <input className="input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            Email
            <input className="input" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            Job title
            <input className="input" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            Directorate
            <select className="input" value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}>
              {purcDepartments.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
          {error && <p className="sm:col-span-2 rounded-sm bg-red-50 px-3 py-2 text-sm font-semibold text-purcRed">{error}</p>}
          <div className="sm:col-span-2 flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => setEditUser(null)} className="rounded-sm border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10">Cancel</button>
            <button className="primary-button disabled:opacity-60" disabled={savingEdit}>{savingEdit ? 'Saving…' : 'Save changes'}</button>
          </div>
        </form>
      </Modal>
      <Modal open={open} title="Add User" onClose={() => setOpen(false)}>
        <form onSubmit={createUser} className="grid gap-4 md:grid-cols-2">
          <input className="input" placeholder="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          <input className="input" placeholder="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          <input className="input" placeholder="Job title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          <select className="input" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })}>
            {purcDepartments.map((department) => <option key={department}>{department}</option>)}
          </select>
          <select className="input md:col-span-2" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
            <option value="NORMAL_USER">Normal User</option>
            <option value="SYSTEM_ADMIN">Admin</option>
          </select>
          <button className="primary-button md:col-span-2">Create user</button>
        </form>
      </Modal>
    </div>
  );
}
