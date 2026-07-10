import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { http } from '../api/http.js';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await http.post('/auth/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f9fd] px-4 text-slate-950">
      <div className="w-full max-w-md rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_90px_rgba(6,29,58,0.16)]">
        <div className="purc-red-rule mx-auto" />
        <h1 className="mt-4 text-center text-2xl font-black text-ink">Set a new password</h1>

        {!token ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-sm font-semibold text-purcRed">
            This link is missing its reset code. Please use the link from your email, or request a new one.
          </p>
        ) : done ? (
          <div className="mt-5 space-y-4 text-center">
            <p className="rounded-lg bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700">
              Your password has been reset. You can now sign in with your new password.
            </p>
            <Link to="/login" className="primary-button inline-flex w-full items-center justify-center">Go to sign in</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <label className="block text-left">
              <span className="text-sm font-bold text-slate-700">New password</span>
              <div className="relative mt-2">
                <input
                  className="input pr-12"
                  type={show ? 'text' : 'password'}
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <label className="block text-left">
              <span className="text-sm font-bold text-slate-700">Confirm new password</span>
              <input
                className="input mt-2"
                type={show ? 'text' : 'password'}
                placeholder="Re-enter your new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-purcRed">{error}</p>}
            <button disabled={loading} className="primary-button w-full disabled:opacity-60">
              <LockKeyhole size={16} /> {loading ? 'Saving…' : 'Reset password'}
            </button>
            <p className="text-center text-sm">
              <Link to="/login" className="font-bold text-purcBlue hover:text-ink">Back to sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
