import { Archive, BarChart3, FileSearch, Inbox, LayoutDashboard, Send, ShieldCheck, Users } from 'lucide-react';

// Single source of truth for the primary navigation (used by the desktop
// sidebar and the mobile slide-in drawer so they never drift apart).
export const navItems = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Received Letter Register', to: '/incoming', icon: Inbox },
  { label: 'Dispatched Letter Register', to: '/outgoing', icon: Send },
  { label: 'Search', to: '/search', icon: FileSearch },
  { label: 'Tracking Timeline', to: '/timeline', icon: Archive },
  { label: 'Analytics', to: '/analytics', icon: BarChart3 },
  { label: 'Users', to: '/users', icon: Users },
  { label: 'Audit Logs', to: '/audit', icon: ShieldCheck }
];
