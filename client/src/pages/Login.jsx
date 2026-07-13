import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { http } from '../api/http.js';
import { purcDepartments } from '../constants/departments.js';

// Basic but solid email format check.
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export default function Login() {
  const { user, login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [supportModal, setSupportModal] = useState(null);
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '', department: 'Executive Secretary', title: 'Officer', securityQuestion: '', securityAnswer: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password reset (security-question flow — no email involved).
  const [resetStep, setResetStep] = useState('email'); // 'email' | 'answer' | 'done'
  const [resetEmail, setResetEmail] = useState('');
  const [resetQuestion, setResetQuestion] = useState('');
  const [resetAnswer, setResetAnswer] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState(null); // { type: 'success' | 'error', text }

  if (user) return <Navigate to="/" replace />;

  function openResetModal() {
    setResetStep('email');
    setResetEmail(email);
    setResetQuestion('');
    setResetAnswer('');
    setResetNewPassword('');
    setResetConfirm('');
    setResetMsg(null);
    setSupportModal('forgot');
  }

  // Step 1 — look up the security question for the email.
  async function fetchSecurityQuestion() {
    if (!isValidEmail(resetEmail)) {
      setResetMsg({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }
    setResetLoading(true);
    setResetMsg(null);
    try {
      const { data } = await http.post('/auth/reset/question', { email: resetEmail });
      setResetQuestion(data.question);
      setResetStep('answer');
    } catch (err) {
      setResetMsg({ type: 'error', text: err.message });
    } finally {
      setResetLoading(false);
    }
  }

  // Step 2 — verify the answer and set a new password.
  async function submitReset() {
    if (resetNewPassword.length < 8) {
      setResetMsg({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    if (resetNewPassword !== resetConfirm) {
      setResetMsg({ type: 'error', text: 'The two passwords do not match.' });
      return;
    }
    setResetLoading(true);
    setResetMsg(null);
    try {
      const { data } = await http.post('/auth/reset/verify', { email: resetEmail, answer: resetAnswer, password: resetNewPassword });
      setResetStep('done');
      setResetMsg({ type: 'success', text: data.message || 'Your password has been reset.' });
    } catch (err) {
      setResetMsg({ type: 'error', text: err.message });
    } finally {
      setResetLoading(false);
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
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
    if (!isValidEmail(signupForm.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (String(signupForm.password).length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
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

  return (
    <div className="min-h-screen overflow-y-auto bg-[#f7f9fd] text-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_85%,rgba(70,91,168,0.14),transparent_28%),radial-gradient(circle_at_82%_50%,rgba(227,30,47,0.12),transparent_30%)]" />
      <img src="/purc_logo.bmp" alt="" className="pointer-events-none fixed left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.035] mix-blend-multiply" />
      <div className="pointer-events-none fixed right-[9%] top-[37%] h-52 w-36 rounded-[45%] border border-red-100/70 bg-[radial-gradient(circle,rgba(227,30,47,0.10)_1px,transparent_1px)] [background-size:8px_8px]" />

      <header className="relative">
        <div className="mx-auto flex min-h-20 max-w-6xl flex-col items-center justify-center gap-3 px-4 py-3 text-center sm:flex-row sm:gap-4 sm:px-6">
          <img src="/purc_logo.bmp" alt="PURC logo" className="h-12 w-12 shrink-0 rounded-full object-contain opacity-90 mix-blend-multiply sm:h-16 sm:w-16" />
          <div className="min-w-0 text-center">
            <p className="text-balance text-[clamp(1.05rem,4.5vw,2.55rem)] font-black leading-tight tracking-tight text-ink">PURC Letter &amp; Document Tracking System</p>
          </div>
        </div>
      </header>

      <main className="relative">
        <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-5xl items-start justify-center px-6 pb-8 pt-1">
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
            <div className="flex items-center justify-center text-xs font-bold text-purcBlue">
              <button type="button" onClick={openResetModal} className="inline-flex items-center gap-2 hover:text-ink">
                <LockKeyhole size={14} /> Forgot password?
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
      <Modal open={Boolean(supportModal)} title="Password Reset" onClose={() => setSupportModal(null)}>
        <div className="space-y-4">
          {resetStep === 'email' && (
            <>
              <p className="text-sm text-slate-600">Enter your email to begin. You will answer your security question and choose a new password.</p>
              <label className="block text-left">
                <span className="text-sm font-bold text-slate-700">Email</span>
                <input
                  className="input mt-2"
                  type="email"
                  placeholder="Enter your email"
                  value={resetEmail}
                  onChange={(event) => setResetEmail(event.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fetchSecurityQuestion(); } }}
                />
              </label>
              {resetMsg && <p className={`rounded-lg px-3 py-2 text-sm font-semibold ${resetMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-purcRed'}`}>{resetMsg.text}</p>}
              <button className="primary-button w-full disabled:opacity-60" disabled={resetLoading} onClick={fetchSecurityQuestion}>
                {resetLoading ? 'Checking…' : 'Continue'}
              </button>
            </>
          )}

          {resetStep === 'answer' && (
            <>
              <div className="rounded-lg border border-blue-100 bg-blue-50/70 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-purcBlue">Security question</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{resetQuestion}</p>
              </div>
              <label className="block text-left">
                <span className="text-sm font-bold text-slate-700">Your answer</span>
                <input className="input mt-2" type="text" placeholder="Type your answer" value={resetAnswer} onChange={(e) => setResetAnswer(e.target.value)} />
              </label>
              <label className="block text-left">
                <span className="text-sm font-bold text-slate-700">New password</span>
                <input className="input mt-2" type="password" placeholder="Minimum 8 characters" value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} />
              </label>
              <label className="block text-left">
                <span className="text-sm font-bold text-slate-700">Confirm new password</span>
                <input className="input mt-2" type="password" placeholder="Re-enter your new password" value={resetConfirm} onChange={(e) => setResetConfirm(e.target.value)} />
              </label>
              {resetMsg && <p className={`rounded-lg px-3 py-2 text-sm font-semibold ${resetMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-purcRed'}`}>{resetMsg.text}</p>}
              <button className="primary-button w-full disabled:opacity-60" disabled={resetLoading} onClick={submitReset}>
                {resetLoading ? 'Resetting…' : 'Reset password'}
              </button>
              <button className="text-xs font-bold text-slate-500 hover:text-ink" onClick={() => { setResetStep('email'); setResetMsg(null); }}>← Use a different email</button>
            </>
          )}

          {resetStep === 'done' && (
            <>
              <p className="rounded-lg bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700">{resetMsg?.text}</p>
              <button className="primary-button w-full" onClick={() => setSupportModal(null)}>Back to sign in</button>
            </>
          )}
        </div>
      </Modal>
      <Modal open={signupOpen} title="New User Registration" onClose={() => setSignupOpen(false)}>
        <form onSubmit={onSignup} className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            Full name
            <input className="input" value={signupForm.name} onChange={(event) => setSignupForm({ ...signupForm, name: event.target.value })} required />
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            Email
            <input className="input" type="email" value={signupForm.email} onChange={(event) => setSignupForm({ ...signupForm, email: event.target.value })} required />
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            Job title
            <input className="input" value={signupForm.title} onChange={(event) => setSignupForm({ ...signupForm, title: event.target.value })} />
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            Directorate
            <select className="input" value={signupForm.department} onChange={(event) => setSignupForm({ ...signupForm, department: event.target.value })}>
              {purcDepartments.map((department) => <option key={department}>{department}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500 md:col-span-2">
            Create password
            <div className="relative">
              <input className="input pr-12" type={showSignupPassword ? 'text' : 'password'} placeholder="Minimum 8 characters" value={signupForm.password} onChange={(event) => setSignupForm({ ...signupForm, password: event.target.value })} required />
              <button type="button" onClick={() => setShowSignupPassword((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-ink" aria-label={showSignupPassword ? 'Hide password' : 'Show password'}>
                {showSignupPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500 md:col-span-2">
            Security question (used to reset your password)
            <input className="input" list="security-questions" placeholder="e.g. What is your staff ID?" value={signupForm.securityQuestion} onChange={(event) => setSignupForm({ ...signupForm, securityQuestion: event.target.value })} required />
            <datalist id="security-questions">
              <option value="What is your staff ID?" />
              <option value="In which town were you born?" />
              <option value="What was the name of your first school?" />
              <option value="What is your mother's maiden name?" />
              <option value="What is your favourite book?" />
            </datalist>
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500 md:col-span-2">
            Answer
            <input className="input" placeholder="Remember this — you'll need it to reset your password" value={signupForm.securityAnswer} onChange={(event) => setSignupForm({ ...signupForm, securityAnswer: event.target.value })} required />
          </label>
          {error && <p className="md:col-span-2 rounded-sm bg-red-50 px-3 py-2 text-sm font-semibold text-purcRed">{error}</p>}
          <button className="primary-button md:col-span-2" disabled={loading}>{loading ? 'Creating account...' : 'Register and enter system'}</button>
        </form>
      </Modal>
    </div>
  );
}
