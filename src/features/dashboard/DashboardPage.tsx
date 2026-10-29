import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';
import { MODULES } from '../../config/modules';
import { useT, useLang } from '../../i18n';
import { ThemeToggle, LanguageToggle } from '../../components/ThemeToggle';
import { NotificationBell } from '../../components/NotificationBell';
import { Search, ChevronRight, Shield, Users, MapPin, CalendarCheck, Receipt, LogOut } from 'lucide-react';

type ModuleCategory = 'ALL' | 'ops' | 'hr' | 'payroll' | 'admin' | 'reports';

const CATEGORIES: { id: ModuleCategory; labelKey: string }[] = [
  { id: 'ALL', labelKey: 'dashCatAll' },
  { id: 'ops', labelKey: 'dashCatOps' },
  { id: 'hr', labelKey: 'dashCatHr' },
  { id: 'payroll', labelKey: 'dashCatPayroll' },
  { id: 'admin', labelKey: 'dashCatAdmin' },
];

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const t = useT();
  const lang = useLang();
  const dateLocale = lang === 'am' ? 'am-ET' : 'en-GB';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ModuleCategory>('ALL');

  if (user?.role === UserRole.GUARD) {
    return (
      <div className="min-h-screen bg-canvas">
        <header className="h-16 bg-surface border-b border-line px-4 sm:px-6 md:px-8 flex items-center justify-between sticky top-0 z-50 shadow-xs">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Vital Security" className="w-9 h-9 object-contain shrink-0" />
            <div>
            <p className="text-base font-bold text-ink leading-tight tracking-tight">Vital Security</p>
            <p className="text-[11px] text-muted leading-tight">{t('dashGuardPortalHdr')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <LanguageToggle />
            <ThemeToggle />
            <NotificationBell />

            <div className="h-6 w-px bg-line" />

            <Link to="/profile" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity" title={t('myProfile')}>
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
        </header>
        <div className="p-6 flex items-center justify-center min-h-[calc(100vh-70px)]">
          <div className="v-card p-10 text-center max-w-md shadow-card">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
              <Shield className="w-8 h-8 stroke-[2]" />
            </div>
            <h2 className="text-xl font-bold text-ink mb-2">{t('welcomeGuard')}, {user?.firstName}!</h2>
            <p className="text-muted text-sm leading-relaxed mb-6">{t('guardDashboardHint')}</p>
            <button
              onClick={() => navigate('/guard')}
              className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              {t('dashGuardPortalGo')} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('goodMorning');
    if (h < 17) return t('goodAfternoon');
    return t('goodEvening');
  };

  const allowedModules = useMemo(() => {
    return MODULES.filter((m) => !m.hidden && m.roles.includes(user?.role as UserRole));
  }, [user?.role]);

  const filteredModules = useMemo(() => {
    let result = allowedModules;

    if (activeCategory !== 'ALL') {
      result = result.filter((m) => m.groupId === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.label.toLowerCase().includes(q) ||
          m.subtitle.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allowedModules, activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Top Header */}
      <header className="h-16 bg-surface border-b border-line px-4 sm:px-6 md:px-8 flex items-center justify-between sticky top-0 z-50 shadow-xs">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Vital Security" className="w-9 h-9 object-contain shrink-0" />
          <span className="text-base font-bold text-ink tracking-tight">Vital Security</span>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-xl mx-8 hidden md:block">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-primary-600 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-10 pr-16 py-2 text-xs bg-canvas hover:bg-subtle/50 focus:bg-surface border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all placeholder:text-muted font-medium"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 text-[10px] text-muted font-semibold bg-surface border border-line px-1.5 py-0.5 rounded shadow-xs">
              <span>Ctrl</span><span>K</span>
            </div>
          </div>
        </div>

        {/* Status, Language, Theme & Profile */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {t('dashSystemLive')}
          </div>

          <LanguageToggle />
          <ThemeToggle />
          <NotificationBell />

          <div className="h-6 w-px bg-line" />

          <Link to="/profile" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity" title={t('myProfile')}>
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
      </header>

      {/* Main Container */}
      <div className="px-8 py-8 max-w-[1600px] mx-auto space-y-6">
        {/* Welcome & Command Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-line/60">
          <div data-tour="dashboard-welcome">
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <Shield className="w-4 h-4" />
              </span>
              <h1 className="text-2xl font-bold text-ink tracking-tight">
                {greeting()}, {user?.firstName}
              </h1>
            </div>
            <p className="text-xs text-muted font-medium">
              {t('dashSubtitle')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-3 bg-surface border border-line rounded-xl px-4 py-2 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <div className="text-right">
                <p className="text-xs font-semibold text-ink leading-tight">
                  {new Date().toLocaleDateString(dateLocale, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <p className="text-[10px] text-muted font-mono leading-tight">
                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            onClick={() => navigate('/employees')}
            className="bg-surface border border-line rounded-xl p-4 shadow-xs hover:border-primary-400 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted">{t('dashWorkforceLbl')}</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-navy-800 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold text-ink">{t('dashWorkforceTitle')}</p>
            <p className="text-[11px] text-muted mt-0.5">{t('dashWorkforceSub')}</p>
          </div>

          <div
            onClick={() => navigate('/sites')}
            className="bg-surface border border-line rounded-xl p-4 shadow-xs hover:border-primary-400 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted">{t('dashSitesLbl')}</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-navy-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <MapPin className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold text-ink">{t('dashSitesTitle')}</p>
            <p className="text-[11px] text-muted mt-0.5">{t('dashSitesSub')}</p>
          </div>

          <div
            onClick={() => navigate('/guards')}
            className="bg-surface border border-line rounded-xl p-4 shadow-xs hover:border-primary-400 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted">{t('dashGuardsLbl')}</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-navy-800 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <CalendarCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold text-ink">{t('dashGuardsTitle')}</p>
            <p className="text-[11px] text-muted mt-0.5">{t('dashGuardsSub')}</p>
          </div>

          <div
            onClick={() => navigate('/guard-payroll')}
            className="bg-surface border border-line rounded-xl p-4 shadow-xs hover:border-primary-400 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted">{t('dashPayrollLbl')}</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-navy-800 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold text-ink">{t('dashPayrollTitle')}</p>
            <p className="text-[11px] text-muted mt-0.5">{t('dashPayrollSub')}</p>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
          <div className="flex items-center gap-1.5 p-1 bg-subtle/60 rounded-xl border border-line">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeCategory === cat.id
                    ? 'bg-surface text-ink shadow-xs border border-line font-bold'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {t(cat.labelKey as any)}
              </button>
            ))}
          </div>

          <p className="text-xs text-muted font-medium">
            {t('dashShowingModules', { count: filteredModules.length })}
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredModules.map((mod) => {
            const Icon = mod.icon;
            const isClickable = mod.active && mod.route;
            return (
              <button
                key={mod.id}
                onClick={() => isClickable && navigate(mod.route!)}
                disabled={!isClickable}
                className={`group relative bg-surface rounded-2xl border p-6 text-left transition-all duration-200 min-h-[10.75rem] flex flex-col ${
                  isClickable
                    ? `border-line shadow-card hover:border-primary-300 hover:shadow-card-hover hover:-translate-y-1 cursor-pointer`
                    : 'border-line opacity-55 cursor-not-allowed'
                }`}
              >
                {/* Icon on a tinted plate — continuity: same plate, per-module accent */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 shrink-0"
                  style={{ backgroundColor: `${mod.color}14` }}
                >
                  <Icon size={56} className="w-7 h-7" />
                </div>

                {/* Content */}
                <h3 className="text-[15px] font-semibold text-ink mb-1 leading-snug">
                  {t(mod.labelKey as any) || mod.label}
                </h3>
                <p className="text-[13px] text-muted leading-relaxed flex-1 line-clamp-2">
                  {t(mod.subtitleKey as any) || mod.subtitle}
                </p>

                {/* Footer row: arrow or SOON — same slot on every card */}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px] font-medium text-muted group-hover:text-primary-600 transition-colors">
                    {isClickable ? t('openModule') : t('comingSoon')}
                  </span>
                  {isClickable ? (
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200"
                      style={{ backgroundColor: `${mod.color}14`, color: mod.color }}
                    >
                      <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-muted bg-canvas  border border-line px-2 py-0.5 rounded-full">
                      {t('soon')}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
