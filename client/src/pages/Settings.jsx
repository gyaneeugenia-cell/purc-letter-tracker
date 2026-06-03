import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SYSTEM_ADMIN';
  const [activeSection, setActiveSection] = useState('Letters');
  const [message, setMessage] = useState('');
  const sections = ['General', 'Letters', 'Workflow', 'Security', 'Notifications', 'Archiving', 'Integrations'];
  return (
    <div className="space-y-6">
      {!isAdmin && (
        <div className="rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          Settings are read-only for your role. Only SYSTEM_ADMIN can save configuration, manage roles, and change advanced controls.
        </div>
      )}
      {message && <div className="rounded-sm border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="glass-panel rounded-xl p-3">{sections.map((s) => <button key={s} onClick={() => setActiveSection(s)} className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-white dark:hover:bg-white/10 ${activeSection === s ? 'bg-white text-purcBlue shadow-sm dark:bg-white/10' : ''}`}>{s}</button>)}</aside>
        <section className="glass-panel rounded-xl p-6">
          <h2 className="section-title">{activeSection} Configuration</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <input className="input" defaultValue="PURC" disabled={!isAdmin} />
            <input className="input" defaultValue="PURC-{TYPE}-{YYYY}-{SEQ}" disabled={!isAdmin} />
            <input className="input" defaultValue="72" disabled={!isAdmin} />
            <select className="input" disabled={!isAdmin}><option>Require QR code on registration</option></select>
          </div>
          <button className="primary-button mt-6" disabled={!isAdmin} onClick={() => setMessage(`${activeSection} settings saved.`)}>Save settings</button>
        </section>
      </div>
    </div>
  );
}
