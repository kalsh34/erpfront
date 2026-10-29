import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import api from '../lib/api';
import { useT } from '../i18n';

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  link?: string;
  read: boolean;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

const TYPE_STYLES: Record<string, string> = {
  INFO: 'bg-blue-500',
  SUCCESS: 'bg-green-500',
  WARNING: 'bg-amber-500',
  ALERT: 'bg-red-500',
};

/**
 * Live notification bell: polls /api/notifications every 30s, shows the unread
 * badge, and opens a dropdown to read/mark notifications.
 */
export function NotificationBell() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setItems(res.data.data.items);
      setUnreadCount(res.data.data.unreadCount);
    } catch {
      // Silent — the bell must never break the page.
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  // Close when clicking outside the dropdown.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      await load();
      setLoading(false);
    }
  };

  const openItem = async (n: NotificationItem) => {
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await api.post(`/notifications/${n._id}/read`);
      } catch {
        // optimistic — next poll corrects it
      }
    }
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnreadCount(0);
    try {
      await api.post('/notifications/read-all');
    } catch {
      // optimistic — next poll corrects it
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={toggle}
        className="relative p-2 text-muted hover:text-ink transition-colors rounded-lg hover:bg-subtle"
        title={t('notifications')}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 rounded-full text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-surface border border-line rounded-xl shadow-overlay z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <p className="text-sm font-semibold text-ink">{t('notifications')}</p>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                {t('markAllRead')}
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted text-center">{t('loading')}</p>
            )}
            {!loading && items.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted text-center">{t('noNotifications')}</p>
            )}
            {items.map((n) => (
              <button
                key={n._id}
                onClick={() => openItem(n)}
                className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-subtle transition-colors border-b border-line last:border-0 ${
                  n.read ? 'opacity-60' : ''
                }`}
              >
                <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${TYPE_STYLES[n.type] || 'bg-gray-300'}`} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink truncate">{n.title}</span>
                  <span className="block text-xs text-muted mt-0.5">{n.message}</span>
                  <span className="block text-[10px] text-muted/70 mt-1">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
