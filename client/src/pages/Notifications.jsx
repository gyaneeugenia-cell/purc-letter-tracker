import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { http } from '../api/http.js';

export default function Notifications() {
  const [items, setItems] = useState([]);
  useEffect(() => { http.get('/notifications').then((res) => setItems(res.data.data)); }, []);

  async function markRead(item) {
    await http.patch(`/notifications/${item.id}/read`);
    setItems((current) => current.map((notification) => notification.id === item.id ? { ...notification, unread: false } : notification));
  }

  function dismiss(item) {
    setItems((current) => current.filter((notification) => notification.id !== item.id));
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel divide-y divide-slate-200 rounded-xl dark:divide-white/10">
        {items.map((item) => (
          <div key={item.id} className="flex flex-wrap gap-4 p-5">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-cobalt text-white"><BellRing size={18} /></div>
            <div className="flex-1">
              <p className="font-semibold">{item.title}</p>
              <p className="text-sm text-slate-500">{item.message}</p>
            </div>
            <div className="flex items-center gap-2">
              {item.unread && <button className="secondary-button" onClick={() => markRead(item)}>Mark read</button>}
              <button className="secondary-button" onClick={() => dismiss(item)}>Dismiss</button>
              {item.unread && <span className="h-2 w-2 rounded-full bg-red-500" />}
            </div>
          </div>
        ))}
        {!items.length && (
          <div className="p-8 text-center text-sm font-semibold text-slate-500">
            No notifications require attention.
          </div>
        )}
      </div>
    </div>
  );
}
