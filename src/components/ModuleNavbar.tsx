import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useT } from '../i18n';
import { ThemeToggle, LanguageToggle } from './ThemeToggle';
import { NotificationBell } from './NotificationBell';
import { LogOut, ArrowLeft } from 'lucide-react';
import type { ModuleGroup } from '../config/modules';
import type { DictKey } from '../i18n';

interface Props {
  moduleGroup: ModuleGroup;
}

export default function ModuleNavbar({ moduleGroup }: Props) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const t = useT();

  return (
    <div className="bg-surface border-b border-line sticky top-0 z-50">
      {/* Top bar: logo + module name + user */}
      <div className="h-16 px-4 sm:px-6 md:px-8 flex items-center justify-between">
        {/* Brand & Modern Interactive Back Trigger */}
        <button
          onClick={() => navigate('/')}
          className="group flex items-center gap-3 cursor-pointer text-left focus:outline-none"
          title="Back to Dashboard"
        >
          {/* Logo with smooth back-arrow hover transition */}
          <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
            <img
              src="/logo.png"
              alt="Vital Security"
              className="w-full h-full object-contain transition-all duration-200 group-hover:opacity-0 group-hover:scale-75"
            />
            <div className="absolute inset-0 rounded-xl bg-subtle text-ink flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 shadow-xs border border-line">
              <ArrowLeft className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-ink tracking-tight group-hover:text-primary-600 transition-colors">
              Vital Security
            </span>
            <span className="text-muted/40 font-light text-sm">/</span>
            <span className="text-sm font-semibold text-muted group-hover:text-ink transition-colors">
              {moduleGroup.labelKey ? t(moduleGroup.labelKey as DictKey) : moduleGroup.label}
            </span>
          </div>
        </button>

        <div className="flex items-center gap-3 sm:gap-4">
          <LanguageToggle />
          <ThemeToggle />
          <NotificationBell />

          <div className="h-6 w-px bg-line" />

          <Link
            to="/profile"
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
            title="My Profile"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs ring-2 ring-blue-500/20">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-ink leading-tight">{user?.firstName} {user?.lastName}</p>
              <p className="text-[10px] text-muted font-medium leading-tight capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </Link>

          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="p-1.5 text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors ml-0.5"
            title={t('logout')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-feature tabs — only rendered when multiple tabs exist to avoid redundant visual layers */}
      {moduleGroup.subFeatures && moduleGroup.subFeatures.length > 1 && (
        <div className="flex items-center gap-1 px-4 sm:px-6 md:px-8 border-t border-line/60 bg-subtle/30 overflow-x-auto overflow-y-hidden no-scrollbar">
          {moduleGroup.subFeatures
            // Per-sub-feature role scope (e.g. Guard Patrols hidden from OPERATIONS).
            .filter((sf) => !sf.roles || !user || sf.roles.includes(user.role as any))
            .map((sf) => {
            const sfPath = sf.route.split('?')[0];
            const isActive =
              location.pathname === sfPath ||
              (sfPath !== '/' && location.pathname.startsWith(sfPath));
            const Icon = sf.icon;

            return (
              <NavLink
                key={sf.route}
                to={sf.route}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-all duration-150 shrink-0 ${
                  isActive
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400 bg-surface shadow-xs'
                    : 'border-transparent text-muted hover:text-ink hover:border-line'
                }`}
              >
                {Icon && <Icon size={16} className={isActive ? 'text-primary-600 dark:text-primary-400' : 'text-muted'} />}
                {sf.labelKey ? t(sf.labelKey as DictKey) : sf.label}
              </NavLink>
            );
            })}
        </div>
      )}
    </div>
  );
}
