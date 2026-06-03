import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { purcDepartments } from '../constants/departments.js';

const administratorEmail = 'gyaneeugenia@gmail.com';
const administratorSubject = 'PURC Tracker Administrator Support';

export default function Login() {
  const { user, login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [supportModal, setSupportModal] = useState(null);
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '', department: 'Executive Secretary', title: 'Officer' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function onSignup(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(signupForm);
      setSignupOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const administratorMailBody = [
    'Hello Ephraim,',
    '',
    'I need help with the PURC Letter & Document Tracking System.',
    '',
    `My email: ${email}`,
    'Issue: ',
    '',
    'Thank you.'
  ].join('\n');
  const administratorMailUrl = `mailto:${administratorEmail}?subject=${encodeURIComponent(administratorSubject)}&body=${encodeURIComponent(administratorMailBody)}`;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#f7f9fd] text-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_85%,rgba(70,91,168,0.14),transparent_28%),radial-gradient(circle_at_82%_50%,rgba(227,30,47,0.12),transparent_30%)]" />
      <img src="/purc_logo.bmp" alt="" className="pointer-events-none fixed left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.035] mix-blend-multiply" />
      <div className="pointer-events-none fixed right-[9%] top-[37%] h-52 w-36 rounded-[45%] border border-red-100/70 bg-[radial-gradient(circle,rgba(227,30,47,0.10)_1px,transparent_1px)] [background-size:8px_8px]" />

      <header className="relative">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-center gap-4 px-6 text-center">
          <img src="/purc_logo.bmp" alt="PURC logo" className="h-16 w-16 shrink-0 rounded-full object-contain opacity-90 mix-blend-multiply" />
          <div className="min-w-0 text-center">
            <p className="whitespace-nowrap text-[clamp(1.5rem,2.1vw,2.55rem)] font-black tracking-tight text-ink">PURC Letter & Document Tracking System</p>
          </div>
        </div>
      </header>

      <main className="relative">
        <div className="mx-auto flex h-[calc(100vh-80px)] max-w-5xl items-start justify-center px-6 pb-4 pt-1">
          <section className="flex w-full items-center justify-center">
          <form onSubmit={onSubmit} className="w-full max-w-lg rounded-xl border border-slate-200/80 bg-white/95 p-5 text-center shadow-[0_24px_90px_rgba(6,29,58,0.16)] backdrop-blur md:p-6">
            <div className="purc-red-rule mx-auto" />
            <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.22em] text-purcBlue">Account access</p>
            <h2 className="mt-2 text-2xl font-black text-ink">Sign in to PURC Tracker</h2>
            <div className="mt-5 space-y-3">
              <label className="block text-left">
                <span className="text-sm font-bold text-slate-700">Email</span>
                <div className="relative mt-2">
                  <input type="email" autoComplete="email" placeholder="Enter your email" className="w-full rounded-sm border border-slate-300 bg-slate-50 px-4 py-2.5 pr-12 text-slate-950 outline-none transition focus:border-purcBlue focus:ring-4 focus:ring-blue-500/10" value={email} onChange={(event) => setEmail(event.target.value)} />
                  <UserRound className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
              </label>
              <label className="block text-left">
                <span className="text-sm font-bold text-slate-700">Password</span>
                <div className="relative mt-2">
                  <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" className="w-full rounded-sm border border-slate-300 bg-slate-50 px-4 py-2.5 pr-12 text-slate-950 outline-none transition focus:border-purcBlue focus:ring-4 focus:ring-blue-500/10" value={password} onChange={(event) => setPassword(event.target.value)} />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-2 text-slate-500 hover:bg-slate-100 hover:text-ink" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
            </div>
            {error && <p className="mt-4 rounded-sm bg-red-50 px-3 py-2 text-sm font-semibold text-purcRed">{error}</p>}
            <button disabled={loading} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-sm bg-purcBlue px-4 py-3 font-black text-white shadow-lg transition hover:bg-ink disabled:opacity-60">
              <LockKeyhole size={16} />
              {loading ? 'Signing in...' : 'Sign in to PURC Tracker'}
            </button>
            <div className="my-3 flex items-center gap-4 text-xs font-semibold text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              or
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-purcBlue">
              <button type="button" onClick={() => setSupportModal('forgot')} className="inline-flex items-center gap-2 hover:text-ink">
                <LockKeyhole size={14} /> Forgot password?
              </button>
              <button type="button" onClick={() => setSupportModal('admin')} className="inline-flex items-center gap-2 hover:text-ink">
                <Mail size={14} /> Contact administrator
              </button>
            </div>
            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/70 px-4 py-3 text-center text-sm font-bold text-slate-700">
              New User?{' '}
              <button type="button" onClick={() => { setError(''); setSignupOpen(true); }} className="text-purcBlue underline-offset-4 hover:text-ink hover:underline">
                Sign up
              </button>
            </div>
          </form>
        </section>
      </div>
      </main>
      <Modal open={Boolean(supportModal)} title={supportModal === 'forgot' ? 'Password Reset' : 'Contact Administrator'} onClose={() => setSupportModal(null)}>
        {supportModal === 'forgot' ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Enter your PURC email address and the system administrator will receive a reset request.</p>
            <input className="input" value={email} onChange={(event) => setEmail(event.target.value)} />
            <button className="primary-button w-full" onClick={() => setSupportModal(null)}>Send reset request</button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-200">
              For access changes, account unlocks, or role updates, email Ephraim in the Executive Secretary directorate.
            </p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-white">
              {administratorEmail}
            </div>
            <a className="primary-button w-full" href={administratorMailUrl}>
              Email administrator
            </a>
          </div>
        )}
      </Modal>
      <Modal open={signupOpen} title="New User Registration" onClose={() => setSignupOpen(false)}>
        <form onSubmit={onSignup} className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            Full name
            <input className="input" placeholder="e.g. Efua Boateng" value={signupForm.name} onChange={(event) => setSignupForm({ ...signupForm, name: event.target.value })} required />
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            Official email
            <input className="input" type="email" placeholder="name@purc.gov" value={signupForm.email} onChange={(event) => setSignupForm({ ...signupForm, email: event.target.value })} required />
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            Job title
            <input className="input" placeholder="Officer, Assistant, Director..." value={signupForm.title} onChange={(event) => setSignupForm({ ...signupForm, title: event.target.value })} />
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            Directorate
            <select className="input" value={signupForm.department} onChange={(event) => setSignupForm({ ...signupForm, department: event.target.value })}>
              {purcDepartments.map((department) => <option key={department}>{department}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500 md:col-span-2">
            Create password
            <input className="input" type="password" placeholder="Minimum 8 characters" value={signupForm.password} onChange={(event) => setSignupForm({ ...signupForm, password: event.target.value })} required />
          </label>
          {error && <p className="md:col-span-2 rounded-sm bg-red-50 px-3 py-2 text-sm font-semibold text-purcRed">{error}</p>}
          <button className="primary-button md:col-span-2" disabled={loading}>{loading ? 'Creating account...' : 'Register and enter system'}</button>
        </form>
      </Modal>
    </div>
  );
}
