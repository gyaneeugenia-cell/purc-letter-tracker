import { NavLink } from 'react-router-dom';
import { navItems as nav } from './navItems.js';

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-white p-0 shadow-xl dark:border-white/10 dark:bg-slate-950 lg:flex">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-4 dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96))]">
        <img src="/purc_logo.png" alt="PURC logo" className="h-12 w-12 shrink-0 object-contain dark:rounded-full dark:bg-white dark:p-1" />
        <div className="min-w-0">
          <p className="text-sm font-black leading-tight text-purcRed dark:text-red-200">PUBLIC UTILITIES</p>
          <p className="text-[11px] font-extrabold uppercase leading-tight tracking-tight text-purcBlue dark:text-blue-100">Regulatory Commission</p>
          <p className="mt-1 text-[10.5px] font-medium leading-snug text-slate-500 dark:text-slate-300">Protecting the interest of consumers &amp; utility services providers</p>
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
