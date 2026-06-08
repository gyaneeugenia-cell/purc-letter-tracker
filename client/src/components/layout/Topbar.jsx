import { Moon, Sun } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const pageTitles = [
  { match: (path) => path === '/', eyebrow: 'Operations command center', title: 'Dashboard' },
  { match: (path) => path.startsWith('/incoming'), eyebrow: 'ES intake', title: 'Received Letter Register' },
  { match: (path) => path.startsWith('/outgoing'), eyebrow: 'Dispatch workflow', title: 'Letters For Sending Register' },
  { match: (path) => path.startsWith('/search'), eyebrow: 'Enterprise retrieval', title: 'Search' },
  { match: (path) => path.startsWith('/timeline'), eyebrow: 'Chain of custody', title: 'Tracking Timeline' },
  { match: (path) => path.startsWith('/analytics'), eyebrow: 'Executive intelligence', title: 'Analytics Dashboard' },
  { match: (path) => path.startsWith('/notifications'), eyebrow: 'Alerts and assignments', title: 'Notifications Center' },
  { match: (path) => path.startsWith('/users'), eyebrow: 'Access control', title: 'User Management' },
  { match: (path) => path.startsWith('/audit'), eyebrow: 'Immutable activity', title: 'Audit Logs' },
  { match: (path) => path.startsWith('/settings'), eyebrow: 'System configuration', title: 'Settings' },
  { match: (path) => path.startsWith('/letters'), eyebrow: 'Official letter record', title: 'Letter Details' }
];

export function Topbar() {
  const { user, logout, theme, setTheme } = useAuth();
  const location = useLocation();
  const page = pageTitles.find((item) => item.match(location.pathname)) || pageTitles[0];

  return (
    <header className="relative z-20 bg-transparent dark:bg-slate-950/40">
      <div className="flex h-20 items-start justify-between gap-4 px-4 pt-2 lg:px-8">
        <div className="min-w-0 pt-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-slate-700 dark:text-slate-200">{page.title}</h1>
        </div>
        <div className="flex flex-1 items-center justify-end gap-3 pt-0">
          <button className="icon-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold text-slate-900 dark:text-white">{user?.name}</p>
            <p className="text-xs font-semibold text-purcBlue dark:text-blue-200">{user?.department}</p>
          </div>
          <button onClick={logout} className="rounded-sm border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
