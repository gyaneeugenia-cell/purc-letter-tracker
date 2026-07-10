import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';
import { MobileNav } from './MobileNav.jsx';
import { Assistant } from '../ai/Assistant.jsx';

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,253,1)_42%,rgba(244,247,251,1)),radial-gradient(circle_at_top_right,rgba(70,91,168,0.05),transparent_26%)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96)_42%,rgba(15,23,42,0.98)),radial-gradient(circle_at_top_right,rgba(70,91,168,0.20),transparent_26%)]" />
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Topbar onMenuClick={() => setMobileNavOpen(true)} />
          <main className="px-4 pb-4 pt-1 lg:px-8 lg:pb-8 lg:pt-3">
            <Outlet />
          </main>
        </div>
      </div>
      <Assistant />
    </div>
  );
}
