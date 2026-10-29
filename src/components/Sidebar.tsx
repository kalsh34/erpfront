import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore, can } from '../stores/authStore';
import { UserRole } from '../types';
import { ThemeToggle, LanguageToggle } from './ThemeToggle';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  children?: { path: string; label: string }[];
}

const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
);
const PeopleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
);
const PayrollIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
);
const OpsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
);
const AdminIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-.786-.426-1.756-.426-2.532 0a1.724 1.724 0 00-1.066 2.573c.94 1.543.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426.786-.426 1.756 0 2.532a1.724 1.724 0 001.066 2.573c.94 1.543.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-.426 2.924 0 3.35" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);
const SitesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
);
const ChevronDown = () => (
  <svg className="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
);
const ShieldIcon = () => (
  <img src="/logo.png" alt="Vital Security" className="w-10 h-10 object-contain" />
);

const SalesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
);
const ProcurementIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
);
const InventoryIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
);
const FleetIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h8m-8 4h4m-6 4h8M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" /></svg>
);
const ProjectsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
);
const DocsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
);
const ReportsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-6m4 6V7m4 10v-3M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" /></svg>
);

const lockedModules = [
  { label: 'Sales & CRM', icon: <SalesIcon /> },
  { label: 'Procurement', icon: <ProcurementIcon /> },
  { label: 'Inventory', icon: <InventoryIcon /> },
  { label: 'Fleet', icon: <FleetIcon /> },
  { label: 'Projects', icon: <ProjectsIcon /> },
  { label: 'Documents', icon: <DocsIcon /> },
];

const SIDEBAR_COLORS: Record<string, { activeBg: string; activeText: string; childActiveBg: string; childActiveText: string }> = {
  default: { activeBg: 'bg-blue-600/20', activeText: 'text-blue-400', childActiveBg: 'bg-blue-600/15', childActiveText: 'text-blue-300' },
};

function getSidebarColors(_path: string) {
  return SIDEBAR_COLORS.default;
}

function getNavItems(opsAlerts: number, perms?: string[]): NavItem[] {
  return [
    { path: '/', label: 'Dashboard', icon: <DashboardIcon /> },
    {
      path: '/employees',
      label: 'HR and People',
      icon: <PeopleIcon />,
      children: [
        { path: '/employees', label: 'Employees' },
        { path: '/departments', label: 'Departments & Positions' },
        { path: '/staff-attendance', label: 'Staff Attendance' },
      ],
    },
    { path: '/sites', label: 'Sites', icon: <SitesIcon /> },
    {
      path: '/guards',
      label: 'Operations',
      icon: <OpsIcon />,
      badge: opsAlerts || undefined,
      children: [
        { path: '/guards', label: 'Guards' },
        { path: '/attendance', label: 'Guard Attendance' },
        { path: '/rotations', label: 'Shift Scheduling' },
      ],
    },
    {
      path: '/guard-payroll',
      label: 'Payroll',
      icon: <PayrollIcon />,
      children: [
        { path: '/guard-payroll', label: 'Guard Payroll' },
        { path: '/staff-payroll', label: 'Staff Payroll' },
      ],
    },
    { path: '/settings', label: 'Administration', icon: <AdminIcon /> },
    ...(can(perms, 'report.read') ? [{ path: '/reports', label: 'Reports', icon: <ReportsIcon /> }] : []),
  ];
}

function getGuardNavItems(): NavItem[] {
  return [
    { path: '/guard', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/guard/scan', label: 'Scan QR', icon: <OpsIcon /> },
    { path: '/guard/shifts', label: 'My Shifts', icon: <PayrollIcon /> },
    { path: '/my-sites', label: 'My Sites', icon: <SitesIcon /> },
    { path: '/profile', label: 'My Profile', icon: <PeopleIcon /> },
  ];
}

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [hrOpen, setHrOpen] = useState(false);
  const [opsOpen, setOpsOpen] = useState(false);

  if (!user) return null;

  const isGuard = user.role === UserRole.GUARD;
  const navItems = isGuard ? getGuardNavItems() : getNavItems(0, user?.permissions);
  const isPayrollActive = location.pathname.startsWith('/guard-payroll') || location.pathname.startsWith('/staff-payroll');
  const isHrActive = location.pathname.startsWith('/employees') || location.pathname.startsWith('/staff-attendance') || location.pathname.startsWith('/departments');
  const isOpsActive = location.pathname.startsWith('/rotations') || location.pathname.startsWith('/attendance') || location.pathname === '/guards';

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-64 bg-[#0f172a] text-gray-300 flex flex-col select-none sidebar-scrollbar overflow-y-auto z-40">
      {/* Logo */}
      <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-700/50 flex-shrink-0">
        <ShieldIcon />
        <h1 className="text-white font-bold text-sm tracking-wide leading-tight">VITAL SECURITY</h1>
      </div>

      {/* Primary Nav */}
      <nav className="py-3 px-3 flex-1 space-y-0.5">
        {navItems.map((item) => {
          const colors = getSidebarColors(item.path);

          if (item.children) {
            const isHrItem = item.path === '/employees';
            const isPayrollItem = item.path === '/guard-payroll';
            const isOpsItem = item.path === '/guards' && item.children;
            const isOpen = isHrItem ? (hrOpen || isHrActive) : isPayrollItem ? (payrollOpen || isPayrollActive) : isOpsItem ? (opsOpen || isOpsActive) : false;
            const setIsOpen = isHrItem ? setHrOpen : isPayrollItem ? setPayrollOpen : isOpsItem ? setOpsOpen : () => {};
            const isActive = isHrItem ? isHrActive : isPayrollItem ? isPayrollActive : isOpsItem ? isOpsActive : false;

            return (
              <div key={item.path}>
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? `${colors.activeBg} ${colors.activeText}`
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                  }`}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  <span className={`flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown />
                  </span>
                </button>
                {isOpen && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-700/50 pl-3">
                    {item.children.map((child) => {
                      const childFullPath = child.path;
                      const currentFull = location.pathname + location.search;
                      const isChildActive = currentFull === childFullPath || currentFull.startsWith(childFullPath + '&');
                      return (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          end
                          className={`block px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                            isChildActive
                              ? `${colors.childActiveBg} ${colors.childActiveText} font-medium`
                              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                          }`}
                        >
                          {child.label}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive: linkIsActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  linkIsActive
                    ? `${colors.activeBg} ${colors.activeText}`
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`
              }
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="flex-shrink-0 min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Coming Soon Modules */}
      {!isGuard && (
        <div className="px-3 pb-2 flex-shrink-0">
          <p className="px-3 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Coming Soon</p>
          <div className="space-y-0.5">
            {lockedModules.map((mod) => (
              <div
                key={mod.label}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 cursor-default opacity-50"
              >
                <span className="flex-shrink-0 grayscale">{mod.icon}</span>
                <span className="flex-1 truncate">{mod.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Footer */}
      <div className="p-3 border-t border-gray-700/50 flex-shrink-0 space-y-2">
        <div className="flex items-center justify-between px-2 pt-1">
          <LanguageToggle className="bg-gray-800/80 border-gray-700 text-gray-300" />
          <ThemeToggle className="bg-gray-800/80 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700" />
        </div>
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user.firstName?.[0]}{user.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.firstName} {user.lastName}</p>
            <p className="text-[11px] text-gray-500 truncate">{user.role.replace(/_/g, ' ')}</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="flex-shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/5 transition-colors"
            title="Logout"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
