import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { NotificationBell } from './NotificationBell';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuthStore();

  const roleDisplay: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    SYSTEM_ADMIN: 'System Admin',
    HR_ADMIN: 'HR Director',
    FINANCE_OFFICER: 'CFO',
    OPERATIONS: 'Operations Manager',
    GUARD: 'Security Officer',
    HEAD: 'Department Head',
    CEO: 'CEO',
  };

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`;

  return (
    <header className="h-16 bg-surface border-b border-line flex items-center justify-between px-6 flex-shrink-0">
      {/* Left: Logo + Title + Subtitle */}
      <div className="flex items-center gap-3">
        <svg className="w-7 h-7 text-primary-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm-1 14.5v-5h2v5h-2zm0-7v-2h2v2h-2z" />
        </svg>
        <div>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
        </div>
      </div>

      {/* Right: Notifications + Profile */}
      <div className="flex items-center gap-4">
        <NotificationBell />

        <Link
          to="/profile"
          className="flex items-center gap-3 pl-4 border-l border-line hover:opacity-80 transition-opacity"
          title="My Profile"
        >
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={initials} className="w-9 h-9 rounded-full object-cover shadow-sm" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-bold">
              {initials}
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-ink">{user?.firstName} {user?.lastName}</p>
            <p className="text-[11px] text-muted">{roleDisplay[user?.role || ''] || user?.role}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
