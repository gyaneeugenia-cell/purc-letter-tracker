import { useState } from 'react';
import { Menu, Moon, Sun, UserCog } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Modal } from '../ui/Modal.jsx';
import { purcDepartments } from '../../constants/departments.js';

const pageTitles = [
  { match: (path) => path === '/', eyebrow: 'Operations command center', title: 'Dashboard' },
  { match: (path) => path.startsWith('/incoming'), eyebrow: 'ES intake', title: '' },
  { match: (path) => path.startsWith('/outgoing'), eyebrow: 'Dispatch workflow', title: '' },
  { match: (path) => path.startsWith('/search'), eyebrow: 'Enterprise retrieval', title: 'Search' },
  { match: (path) => path.startsWith('/timeline'), eyebrow: 'Chain of custody', title: 'Tracking Timeline' },
  { match: (path) => path.startsWith('/analytics'), eyebrow: 'Executive intelligence', title: 'Analytics Dashboard' },
  { match: (path) => path.startsWith('/notifications'), eyebrow: 'Alerts and assignments', title: 'Notifications Center' },
  { match: (path) => path.startsWith('/users'), eyebrow: 'Access control', title: 'User Management' },
  { match: (path) => path.startsWith('/audit'), eyebrow: 'Immutable activity', title: 'Audit Logs' },
  { match: (path) => path.startsWith('/settings'), eyebrow: 'System configuration', title: 'Settings' },
  { match: (path) => path.startsWith('/letters'), eyebrow: 'Official letter record', title: 'Letter Details' }
];

const emptyForm = { name: '', email: '', title: '', department: '', currentPassword: '', newPassword: '' };

export function Topbar({ onMenuClick }) {
  const { user, logout, theme, setTheme, updateProfile } = useAuth();
  const location = useLocation();
  const page = pageTitles.find((item) => item.match(location.pathname)) || pageTitles[0];

  const [profileOpen, setProfileOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [changePassword, setChangePassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type, text }

  function openProfile() {
    setForm({
      name: user?.name || '',
      email: user?.email || '',
      title: user?.title || '',
      department: user?.department || purcDepartments[0],
      currentPassword: '',
      newPassword: ''
    });
    setChangePassword(false);
    setFeedback(null);
    setProfileOpen(true);
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const payload = { name: form.name, email: form.email, title: form.title, department: form.department };
      if (changePassword) {
        payload.currentPassword = form.currentPassword;
        payload.newPassword = form.newPassword;
      }
      await updateProfile(payload);
      setFeedback({ type: 'success', text: 'Your information has been updated.' });
      setChangePassword(false);
      setForm((f) => ({ ...f, currentPassword: '', newPassword: '' }));
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <header className="relative z-20 bg-transparent dark:bg-slate-950/40">
      <div className="flex h-20 items-center justify-between gap-3 px-4 pt-2 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 pt-0">
          <button onClick={onMenuClick} className="icon-button shrink-0 lg:hidden" aria-label="Open navigation menu">
            <Menu size={20} />
          </button>
          <h1 className="truncate text-xl font-bold tracking-tight text-slate-700 dark:text-slate-200 sm:text-2xl">{page.title}</h1>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2 pt-0 sm:gap-3">
          <button className="icon-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={openProfile}
            className="hidden max-w-[220px] items-center gap-2 rounded-lg px-2 py-1.5 text-right transition hover:bg-slate-100 dark:hover:bg-white/10 sm:flex"
            aria-label="Edit my information"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{user?.name}</p>
              <p className="truncate text-xs font-semibold text-purcBlue dark:text-blue-200">{user?.department}</p>
            </div>
            <UserCog size={18} className="shrink-0 text-slate-500 dark:text-slate-300" />
          </button>
          <button onClick={openProfile} className="icon-button sm:hidden" aria-label="Edit my information">
            <UserCog size={18} />
          </button>
          <button onClick={logout} className="rounded-sm border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10">
            Sign out
          </button>
        </div>
      </div>

      <Modal open={profileOpen} title="Edit my information" onClose={() => setProfileOpen(false)}>
        <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            Full name / username
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            Email
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            Job title
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            Directorate
            <select className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
              {purcDepartments.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>

          <div className="sm:col-span-2">
            {!changePassword ? (
              <button type="button" onClick={() => setChangePassword(true)} className="text-sm font-bold text-purcBlue hover:text-ink">
                Change password
              </button>
            ) : (
              <div className="grid gap-4 rounded-lg border border-slate-200 p-4 dark:border-white/10 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Current password
                  <input className="input" type="password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
                </label>
                <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                  New password
                  <input className="input" type="password" placeholder="Minimum 8 characters" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
                </label>
              </div>
            )}
          </div>

          {feedback && (
            <p className={`sm:col-span-2 rounded-lg px-3 py-2 text-sm font-semibold ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-purcRed'}`}>
              {feedback.text}
            </p>
          )}

          <div className="sm:col-span-2 flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => setProfileOpen(false)} className="rounded-sm border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10">
              Close
            </button>
            <button className="primary-button disabled:opacity-60" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </Modal>
    </header>
  );
}
