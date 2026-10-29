import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, QrCode, Clock, MapPin, UserRound, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { NotificationBell } from '../../components/NotificationBell';
import { useT } from '../../i18n';

/**
 * Shared shell for every guard-portal page: a compact top bar (logo, live
 * notification bell, profile, logout) and a thumb-friendly bottom nav.
 */
export default function GuardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const t = useT();

  const navItems = [
    { to: '/guard', label: t('dashboard'), icon: Home },
    { to: '/guard/scan', label: t('scanQr'), icon: QrCode },
    { to: '/guard/shifts', label: t('myShifts'), icon: Clock },
    { to: '/my-sites', label: t('mySites'), icon: MapPin },
    { to: '/profile', label: t('myProfile'), icon: UserRound },
  ];

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`;

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Top bar */}
      <header className="bg-surface border-b border-line px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5 min-w-0">
          <img src="/logo.png" alt="Vital Security" className="w-9 h-9 rounded-xl object-contain flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink leading-tight truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-[11px] text-muted leading-tight">Vital Security · Guard</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <NotificationBell />
          <NavLink to="/profile" className="ml-1" title={t('myProfile')}>
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={initials} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-xs">
                {initials}
              </div>
            )}
          </NavLink>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="p-2 text-muted hover:text-red-500 rounded-lg hover:bg-subtle transition-colors"
            title={t('logout')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 pb-24">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 bg-surface border-t border-line z-40">
        <div className="max-w-lg mx-auto grid grid-cols-5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/guard'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-primary-600' : 'text-muted hover:text-ink'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="truncate max-w-full px-1">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
