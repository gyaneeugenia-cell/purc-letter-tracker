import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlarmClock, BellRing } from 'lucide-react';
import { http } from '../../api/http.js';
import { getCompliance, complianceChipClass, formatDeadline } from '../../utils/compliance.js';

// A standing reminder of dispatched letters whose deadlines are overdue or coming
// up. It looks at ALL dispatched letters (not just the selected period), so a
// deadline never slips past unnoticed because of a date filter.
export function DeadlineReminders() {
  const [letters, setLetters] = useState([]);
  const [tick, setTick] = useState(0);
  // Remember whether the user collapsed the panel.
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('purc_reminders_collapsed') === '1'; } catch { return false; }
  });

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem('purc_reminders_collapsed', next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  }

  useEffect(() => {
    let active = true;
    const load = () => http.get('/letters', { params: { type: 'OUTGOING' } })
      .then((res) => { if (active) setLetters(res.data.data || []); })
      .catch(() => { /* keep whatever we have */ });
    load();
    const onChange = () => load();
    window.addEventListener('purc-letters-changed', onChange);
    // Re-evaluate each minute so a deadline that lapses is caught without a reload.
    const timer = window.setInterval(() => setTick((t) => t + 1), 60000);
    return () => { active = false; window.removeEventListener('purc-letters-changed', onChange); window.clearInterval(timer); };
  }, []);

  // tick is only used to force recomputation over time.
  void tick;

  const items = letters
    .map((letter) => ({ letter, compliance: getCompliance(letter) }))
    .filter(({ compliance }) => compliance && (compliance.status === 'OVERDUE' || compliance.status === 'DUE_SOON'))
    .sort((a, b) => a.compliance.daysLeft - b.compliance.daysLeft);

  if (!items.length) return null;

  const overdue = items.filter((i) => i.compliance.status === 'OVERDUE').length;
  const dueSoon = items.length - overdue;

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/50 dark:bg-amber-950/30">
      <div className="flex flex-wrap items-center gap-2">
        <BellRing size={18} className="text-amber-600 dark:text-amber-300" />
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-amber-800 dark:text-amber-200">Deadline reminders</h2>
        <span className="ml-auto text-xs font-bold text-amber-700 dark:text-amber-300">
          {overdue > 0 && `${overdue} overdue`}{overdue > 0 && dueSoon > 0 && ' · '}{dueSoon > 0 && `${dueSoon} due soon`}
        </span>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="rounded-lg border border-amber-300 px-3 py-1 text-xs font-bold text-amber-800 transition hover:bg-amber-100 dark:border-amber-800/60 dark:text-amber-200 dark:hover:bg-amber-900/40"
        >
          {collapsed ? 'Show' : 'Hide'}
        </button>
      </div>
      {!collapsed && (
      <ul className="mt-4 space-y-2">
        {items.map(({ letter, compliance }) => (
          <li key={letter.id}>
            <Link
              to={`/letters/${letter.id}`}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-100 bg-white px-4 py-3 transition hover:border-amber-300 hover:shadow-sm dark:border-white/10 dark:bg-slate-900/60"
            >
              <AlarmClock size={16} className={compliance.status === 'OVERDUE' ? 'text-purcRed' : 'text-amber-600'} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink dark:text-white">{letter.recipient || 'Recipient'} — {letter.subject}</p>
                <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                  {letter.trackingNumber} · deadline {formatDeadline(letter.deadlineAt)}
                </p>
              </div>
              <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${complianceChipClass(compliance.tone)}`}>
                {compliance.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      )}
    </section>
  );
}
