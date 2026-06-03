import { NavLink } from 'react-router-dom';
import { Archive, BarChart3, FileSearch, Inbox, LayoutDashboard, Send, ShieldCheck, Users } from 'lucide-react';

const nav = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Received Letters', to: '/incoming', icon: Inbox },
  { label: 'Letters Sent', to: '/outgoing', icon: Send },
  { label: 'Search', to: '/search', icon: FileSearch },
  { label: 'Tracking Timeline', to: '/timeline', icon: Archive },
  { label: 'Analytics', to: '/analytics', icon: BarChart3 },
  { label: 'Users', to: '/users', icon: Users },
  { label: 'Audit Logs', to: '/audit', icon: ShieldCheck }
];

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-white p-0 shadow-xl dark:border-white/10 dark:bg-slate-950 lg:flex">
      <div className="relative flex h-20 items-center gap-3 bg-white px-4 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96))]">
        <img src="/purc_logo.bmp" alt="" className="pointer-events-none absolute right-3 top-1/2 h-20 w-20 -translate-y-1/2 object-contain opacity-[0.055] mix-blend-multiply dark:hidden" />
        <img src="/purc_logo.bmp" alt="PURC logo" className="relative h-14 w-14 shrink-0 object-contain opacity-100 mix-blend-multiply dark:mix-blend-normal" />
        <div>
          <p className="font-black leading-tight text-purcRed dark:text-red-200">PUBLIC UTILITIES</p>
          <p className="text-xs font-extrabold leading-tight text-purcBlue dark:text-blue-100">REGULATORY COMMISSION</p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-300">Letter Tracking Suite</p>
        </div>
      </div>
      <nav className="relative flex-1 space-y-2 overflow-y-auto bg-white p-3 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(17,24,39,0.96))]">
        <img src="/purc_logo.bmp" alt="" className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.045] mix-blend-multiply dark:hidden" />
        {nav.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `relative z-10 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                isActive
                  ? 'bg-gradient-to-r from-purcBlue to-cobalt text-white shadow-lg shadow-blue-900/20 dark:shadow-blue-950/40'
                  : 'text-slate-800 hover:bg-white/80 hover:text-purcBlue dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
