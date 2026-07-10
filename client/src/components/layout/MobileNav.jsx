import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { navItems as nav } from './navItems.js';

// Slide-in navigation drawer for phones and tablets (hidden on lg and up,
// where the fixed Sidebar is shown instead).
export function MobileNav({ open, onClose }) {
  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  return (
    <div className={`fixed inset-0 z-[130] lg:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      {/* Panel */}
      <aside
        className={`absolute left-0 top-0 flex h-full w-[80%] max-w-xs flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-200 dark:border-white/10 dark:bg-slate-950 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-4 dark:border-white/10">
          <img src="/purc_logo.bmp" alt="PURC logo" className="h-11 w-11 shrink-0 object-contain mix-blend-multiply dark:mix-blend-normal" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black leading-tight text-purcRed dark:text-red-200">PUBLIC UTILITIES</p>
            <p className="text-[11px] font-extrabold leading-tight text-purcBlue dark:text-blue-100">REGULATORY COMMISSION</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 space-y-1.5 overflow-y-auto p-3">
          {nav.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${
                  isActive
                    ? 'bg-gradient-to-r from-purcBlue to-cobalt text-white shadow-lg shadow-blue-900/20'
                    : 'text-slate-800 hover:bg-slate-100 hover:text-purcBlue dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </div>
  );
}
