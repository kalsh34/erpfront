import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';
import { Card, FormField, Modal, Select, InfoTooltip } from '../../components/ui';
import { downloadCsv } from '../payroll-shared/export';
import { useT, type DictKey, type TParams } from '../../i18n';

type T = (key: DictKey, params?: TParams) => string;

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  employeeId?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  moduleGrants?: string[];
  moduleDenies?: string[];
}

const ROLE_LABEL_KEY: Record<string, DictKey> = {
  [UserRole.SUPER_ADMIN]: 'settingsRoleSuperAdmin',
  [UserRole.SYSTEM_ADMIN]: 'settingsRoleSystemAdmin',
  [UserRole.HR_ADMIN]: 'settingsRoleHrAdmin',
  [UserRole.FINANCE_OFFICER]: 'settingsRoleFinanceOfficer',
  [UserRole.OPERATIONS]: 'settingsRoleOperations',
  [UserRole.GUARD]: 'guard',
  [UserRole.HEAD]: 'settingsRoleHead',
  [UserRole.CEO]: 'settingsRoleCeo',
};

const DEPARTMENT_LABEL_KEY: Record<string, DictKey> = {
  [UserRole.SUPER_ADMIN]: 'settingsDeptSuperAdmin',
  [UserRole.SYSTEM_ADMIN]: 'settingsDeptSystemAdmin',
  [UserRole.HR_ADMIN]: 'settingsDeptHrAdmin',
  [UserRole.FINANCE_OFFICER]: 'settingsDeptFinanceOfficer',
  [UserRole.OPERATIONS]: 'settingsDeptOperations',
  [UserRole.GUARD]: 'settingsDeptGuard',
  [UserRole.HEAD]: 'settingsDeptHead',
  [UserRole.CEO]: 'settingsDeptCeo',
};

/** Theme-token badge palette so every role chip reads correctly in both themes. */
const ROLE_BADGE_STYLES: Record<string, string> = {
  [UserRole.SUPER_ADMIN]: 'bg-primary-600 text-white border border-primary-600',
  [UserRole.SYSTEM_ADMIN]: 'bg-info-subtle text-info-text border border-info-line',
  [UserRole.HR_ADMIN]: 'bg-warning-subtle text-warning-text border border-warning-line',
  [UserRole.FINANCE_OFFICER]: 'bg-success-subtle text-success-text border border-success-line',
  [UserRole.OPERATIONS]:
    'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300 border border-primary-200 dark:border-primary-500/30',
  [UserRole.GUARD]: 'bg-subtle text-muted border border-line',
  [UserRole.HEAD]: 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300 border border-primary-200 dark:border-primary-500/30',
  [UserRole.CEO]: 'bg-danger-subtle text-danger-text border border-danger-line',
};

const ROLE_BADGE_FALLBACK = 'bg-subtle text-muted border border-line';

const SECURITY_MATRIX: { roleKey: DictKey; hr: string; pay: string; ops: string; fin: string; admin: string }[] = [
  { roleKey: 'settingsRoleCeo', hr: 'F', pay: 'F', ops: 'F', fin: 'F', admin: 'F' },
  { roleKey: 'settingsRoleHrManager', hr: 'F', pay: 'F', ops: 'V', fin: 'N', admin: 'N' },
  { roleKey: 'settingsRoleOperations', hr: 'V', pay: 'V', ops: 'F', fin: 'N', admin: 'N' },
  { roleKey: 'settingsRoleSiteSupervisor', hr: 'N', pay: 'N', ops: 'A', fin: 'N', admin: 'N' },
];

const PERMISSION_CELL: Record<string, { label: string; className: string }> = {
  F: { label: 'F', className: 'bg-success-subtle text-success-text' },
  V: { label: 'V', className: 'bg-info-subtle text-info-text' },
  N: { label: 'N', className: 'bg-danger-subtle text-danger-text' },
  A: { label: 'A', className: 'bg-warning-subtle text-warning-text' },
};

const TAB_ITEMS: { key: string; labelKey: DictKey }[] = [
  { key: 'users', labelKey: 'settingsTabUsers' },
  { key: 'roles', labelKey: 'settingsTabRoles' },
  { key: 'audit', labelKey: 'settingsTabAudit' },
  { key: 'system', labelKey: 'settingsTabSystem' },
  { key: 'integrations', labelKey: 'settingsTabIntegrations' },
];

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/** Human label for a permission key (used by the module-access grant UI). */
function permLabel(p: string, t: T): string {
  const key = (PERM_LABEL_KEYS as Record<string, DictKey>)[p];
  return key ? t(key) : p;
}

function roleLabel(role: string, t: T): string {
  const key = ROLE_LABEL_KEY[role];
  return key ? t(key) : role;
}

function departmentLabel(role: string, t: T): string {
  const key = DEPARTMENT_LABEL_KEY[role];
  return key ? t(key) : '—';
}

function formatLastLogin(date: string | undefined, t: T): string {
  if (!date) return t('settingsNeverLoggedIn');
  const d = new Date(date);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return t('settingsJustNow');
  if (diffMin < 60) return t('settingsMinsAgo', { count: diffMin });
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return t('settingsHoursAgo', { count: diffHr });
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function SettingsPage() {
  const t = useT();
  const meUserId = useAuthStore((s) => s.user?._id || '');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const refreshUsers = () => {
    setLoading(true);
    api
      .get('/users')
      .then((res) => setUsers(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        roleLabel(u.role, t).toLowerCase().includes(q),
    );
  }, [users, search, t]);

  return (
    <div className="p-6 space-y-6">
      {/* Navigation Tabs + Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2">
        <div className="flex flex-wrap items-center gap-1">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-2.5 whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400 bg-primary-500/5'
                  : 'border-transparent text-muted hover:text-ink hover:border-line'
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
          <div className="ml-2">
            <InfoTooltip content="Manage system users, access roles, system integrations, and audit logs." />
          </div>
        </div>

        {activeTab === 'users' && (
          <button
            onClick={() => setShowProvisionModal(true)}
            className="h-9 px-4 flex items-center gap-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('settingsProvisionNewUser')}
          </button>
        )}
      </div>

      {/* Users Tab Content */}
      {activeTab === 'users' && (
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {successMsg && (
              <div className="mb-4 flex items-center justify-between gap-3 p-3 text-sm text-success-text bg-success-subtle rounded-lg border border-success-line">
                <span>{successMsg}</span>
                <button
                  type="button"
                  onClick={() => setSuccessMsg('')}
                  aria-label="Dismiss"
                  className="text-success-text/70 hover:text-success-text font-bold"
                >
                  ×
                </button>
              </div>
            )}

            {/* Search Bar */}
            <div className="relative mb-5">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={t('settingsSearchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="v-input !pl-10"
              />
            </div>

            {/* Table */}
            <div className="bg-surface rounded-xl border border-line overflow-hidden">
              <div className="px-5 py-4 border-b border-line">
                <h3 className="text-base font-semibold text-ink">{t('settingsUsersTableTitle')}</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-subtext uppercase tracking-wider">{t('settingsColUserDetails')}</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-subtext uppercase tracking-wider">{t('settingsColSystemRole')}</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-subtext uppercase tracking-wider">{t('settingsColDepartment')}</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-subtext uppercase tracking-wider">{t('settingsColLastLogin')}</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-subtext uppercase tracking-wider">{t('settingsColTwoFa')}</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-subtext uppercase tracking-wider">{t('settingsColAccess')}</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-subtext uppercase tracking-winder">{t('settingsColSystemState')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <div className="flex items-center justify-center gap-2 text-muted">
                            <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                            {t('settingsLoadingUsers')}
                          </div>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-subtext">
                          {search ? t('settingsNoUsersMatch') : t('settingsNoUsersFound')}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user._id} className="hover:bg-surface-hover transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                                {getInitials(user.firstName, user.lastName)}
                              </div>
                              <div>
                                <p className="font-medium text-ink">{user.firstName} {user.lastName}</p>
                                <p className="text-xs text-subtext">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_BADGE_STYLES[user.role] || ROLE_BADGE_FALLBACK}`}>
                              {roleLabel(user.role, t)}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-muted">{departmentLabel(user.role, t)}</td>
                          <td className="px-5 py-4 text-sm text-muted">
                            {user.lastLogin ? (
                              formatLastLogin(user.lastLogin, t)
                            ) : (
                              <span className="text-subtext">{t('settingsNoSessionToday')}</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <svg
                              className={`w-5 h-5 ${user.isActive ? 'text-success' : 'text-subtext'}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                              />
                            </svg>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1">
                              {(user.moduleGrants || []).map((k) => (
                                <span key={k} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-success-subtle text-success-text border border-success-line">+{k}</span>
                              ))}
                              {(user.moduleDenies || []).map((k) => (
                                <span key={k} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-danger-subtle text-danger-text border border-danger-line">−{k}</span>
                              ))}
                              <button
                                onClick={() => setEditingUser(user)}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-line text-primary-600 dark:text-primary-300 hover:bg-subtle transition-colors"
                              >
                                {t('settingsEditAccess')}
                              </button>
                              {user._id !== meUserId && (
                                <button
                                  onClick={async () => {
                                    if (!window.confirm(t('settingsDeleteUserConfirm', { name: `${user.firstName} ${user.lastName}`, email: user.email }))) return;
                                    try {
                                      await api.delete(`/users/${user._id}`);
                                      setSuccessMsg(t('settingsUserDeleted', { name: user.firstName }));
                                      refreshUsers();
                                    } catch {
                                      setSuccessMsg('');
                                    }
                                  }}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-line text-danger-text hover:bg-danger-subtle transition-colors"
                                  title={t('settingsDeleteUser')}
                                >
                                  <Trash2 size={12} className="mr-1" />{t('delete')}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1 items-center">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  user.isActive
                                    ? 'bg-success-subtle text-success-text border border-success-line'
                                    : 'bg-subtle text-muted border border-line'
                                }`}
                              >
                                {user.isActive ? t('active') : t('inactive')}
                              </span>
                              <button
                                onClick={async () => {
                                  if (!window.confirm(t('settingsDeactivateConfirm', { name: user.firstName }))) return;
                                  try {
                                    await api.put(`/users/${user._id}/${user.isActive ? 'deactivate' : 'activate'}`);
                                    setSuccessMsg(
                                      user.isActive
                                        ? t('settingsUserDeactivated', { name: user.firstName })
                                        : t('settingsUserActivated', { name: user.firstName }),
                                    );
                                    refreshUsers();
                                  } catch {
                                    setSuccessMsg('');
                                  }
                                }}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-line text-muted hover:bg-subtle transition-colors"
                                title={user.isActive ? t('settingsDeactivateUser') : t('settingsActivateUser')}
                              >
                                {user.isActive ? t('settingsDeactivateUser') : t('settingsActivateUser')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Sidebar — Security Matrix */}
          <div className="w-80 flex-shrink-0 hidden xl:block">
            <div className="bg-surface rounded-xl border border-line p-5 sticky top-6">
              <h3 className="text-sm font-semibold text-ink mb-4">{t('settingsSecurityMatrixTitle')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="text-left py-2 pr-2 font-medium text-muted">{t('settingsColSystemRole')}</th>
                      <th className="text-center py-2 px-1 font-medium text-muted">HR</th>
                      <th className="text-center py-2 px-1 font-medium text-muted">Pay</th>
                      <th className="text-center py-2 px-1 font-medium text-muted">Ops</th>
                      <th className="text-center py-2 px-1 font-medium text-muted">Fin</th>
                      <th className="text-center py-2 px-1 font-medium text-muted">Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {SECURITY_MATRIX.map((row) => (
                      <tr key={row.roleKey}>
                        <td className="py-2.5 pr-2 font-medium text-ink whitespace-nowrap">{t(row.roleKey)}</td>
                        {(['hr', 'pay', 'ops', 'fin', 'admin'] as const).map((col) => {
                          const cell = PERMISSION_CELL[row[col]];
                          return (
                            <td key={col} className="py-2.5 px-1 text-center">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold ${cell.className}`}>
                                {cell.label}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 pt-4 border-t border-line space-y-2">
                <p className="text-[10px] font-semibold text-subtext uppercase tracking-wider">{t('settingsLegend')}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-success-subtle text-success-text font-bold text-[10px]">F</span>
                    {t('settingsLegendFull')}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-info-subtle text-info-text font-bold text-[10px]">V</span>
                    {t('settingsLegendView')}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-warning-subtle text-warning-text font-bold text-[10px]">A</span>
                    {t('settingsLegendApprove')}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-danger-subtle text-danger-text font-bold text-[10px]">N</span>
                    {t('settingsLegendNone')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Roles & Permissions */}
      {activeTab === 'roles' && <RolesPermissionsTab />}
      {activeTab === 'audit' && <AuditLogTab />}
      {activeTab === 'system' && <SystemSettingsTab />}
      {activeTab === 'integrations' && <IntegrationsTab />}

      {/* Provision New User Modal */}
      {showProvisionModal && (
        <ProvisionModal
          onClose={() => setShowProvisionModal(false)}
          onCreated={() => {
            refreshUsers();
            setSuccessMsg(t('settingsUserCreated'));
          }}
        />
      )}

      {/* Edit user access modal */}
      {editingUser && (
        <EditAccessModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={refreshUsers}
        />
      )}
    </div>
  );
}

function ProvisionModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const t = useT();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: UserRole.GUARD,
    employeeId: '',
  });
  const [guardOptions, setGuardOptions] = useState<{ _id: string; label: string }[]>([]);
  const [grants, setGrants] = useState<string[]>([]);
  const [denies, setDenies] = useState<string[]>([]);
  const [modules, setModules] = useState<{ key: string; label: string; permissions: string[] }[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/users/module-access').then((res) => setModules(res.data.data || [])).catch(() => {});
    api
      .get('/guards')
      .then((res) =>
        setGuardOptions(
          (res.data.data || []).map((row: { employee: { _id: string; firstName: string; lastName: string; employeeCode?: string } }) => ({
            _id: row.employee._id,
            label: `${row.employee.firstName} ${row.employee.lastName}${row.employee.employeeCode ? ` (${row.employee.employeeCode})` : ''}`,
          }))
        )
      )
      .catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const grantAll = (key: string) => {
    // Granting a module removes it from denies (deny wins at runtime, so keep the two in sync)
    setDenies((d) => d.filter((k) => k !== key));
    setGrants((g) => (g.includes(key) ? g.filter((k) => k !== key) : [...g, key]));
  };

  const denyAll = (key: string) => {
    setGrants((g) => g.filter((k) => k !== key));
    setDenies((d) => (d.includes(key) ? d.filter((k) => k !== key) : [...d, key]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/users', {
        ...form,
        employeeId: form.role === UserRole.GUARD ? form.employeeId : undefined,
        moduleGrants: grants,
        moduleDenies: denies,
      });
      onClose();
      onCreated();
    } catch (err: any) {
      // Show the server's real reason for validation failures (e.g. "Email
      // already exists"), but never leak routing noise; network/server failures
      // fall back to the generic retry message.
      const status = err?.response?.status;
      const serverMsg = typeof err?.response?.data?.message === 'string' ? err.response.data.message : '';
      const isNotFound = status === 404 || /not found/i.test(serverMsg);
      setError(
        status && status >= 400 && status < 500 && serverMsg && !isNotFound
          ? serverMsg
          : t('somethingWentWrong')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={t('settingsProvisionTitle')} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-danger-text bg-danger-subtle rounded-lg border border-danger-line">{error}</div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            name="firstName"
            label={t('settingsFieldFirstName')}
            value={form.firstName}
            onChange={handleChange}
            required
          />
          <FormField
            name="lastName"
            label={t('settingsFieldLastName')}
            value={form.lastName}
            onChange={handleChange}
            required
          />
        </div>
        <FormField
          name="email"
          type="email"
          label={t('settingsFieldEmail')}
          value={form.email}
          onChange={handleChange}
          required
        />
        <FormField
          name="password"
          type="password"
          label={t('settingsFieldPassword')}
          value={form.password}
          onChange={handleChange}
          required
          minLength={8}
        />
        <Select
          name="role"
          label={t('settingsFieldSystemRole')}
          value={form.role}
          onChange={handleChange}
        >
          {Object.values(UserRole).map((role) => (
            <option key={role} value={role}>
              {roleLabel(role, t)}
            </option>
          ))}
        </Select>

        {form.role === UserRole.GUARD && (
          <Select
            name="employeeId"
            label={t('settingsFieldGuardRecord')}
            value={form.employeeId}
            onChange={handleChange}
            required
          >
            <option value="">Select a guard</option>
            {guardOptions.map((g) => (
              <option key={g._id} value={g._id}>
                {g.label}
              </option>
            ))}
          </Select>
        )}

        {/* Module access — grant or deny per module (deny wins at runtime) */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <p className="text-sm font-medium text-ink">{t('settingsModuleAccessTitle')}</p>
            <InfoTooltip content={t('settingsModuleAccessHint')} />
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto border border-line rounded-lg p-3">
            {modules.map((m) => (
              <div key={m.key} className="py-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label={expanded.includes(m.key) ? 'Hide actions and pages' : 'Show actions and pages'}
                      onClick={() => setExpanded((x) => (x.includes(m.key) ? x.filter((k) => k !== m.key) : [...x, m.key]))}
                      className="text-subtext hover:text-ink transition-colors flex-shrink-0"
                    >
                      <ChevronDown size={14} className={`transition-transform ${expanded.includes(m.key) ? 'rotate-180' : ''}`} />
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">
                        {m.label}
                        {grants.includes(m.key) && <span className="ml-2 text-[10px] font-bold text-success-600 uppercase">Granted</span>}
                        {denies.includes(m.key) && <span className="ml-2 text-[10px] font-bold text-danger-text uppercase">Denied</span>}
                      </p>
                      <p className="text-[11px] text-subtext truncate">
                        {m.permissions.length} {m.permissions.length === 1 ? 'permission' : 'permissions'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => grantAll(m.key)}
                      className={`px-3 h-8 rounded-lg text-xs font-semibold border transition-colors ${
                        grants.includes(m.key)
                          ? 'bg-success-subtle text-success-text border-success-line'
                          : 'border-line text-muted hover:bg-subtle'
                      }`}
                    >
                      {t('settingsModuleGrant')}
                    </button>
                    <button
                      type="button"
                      onClick={() => denyAll(m.key)}
                      className={`px-3 h-8 rounded-lg text-xs font-semibold border transition-colors ${
                        denies.includes(m.key)
                          ? 'bg-danger-subtle text-danger-text border-danger-line'
                          : 'border-line text-muted hover:bg-subtle'
                      }`}
                    >
                      {t('settingsModuleDeny')}
                    </button>
                  </div>
                </div>
                {expanded.includes(m.key) && (
                  <div className="mt-2 ml-6 pl-3 pr-2 py-2 rounded-lg bg-subtle/60 border border-line/60">
                    <p className="text-[10px] font-bold text-subtext uppercase tracking-wide mb-1.5">Actions enabled by this module</p>
                    <div className="flex flex-wrap gap-1.5">
                      {m.permissions.map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded-md border border-line bg-surface text-[10px] font-medium text-muted font-mono">
                          {permLabel(p, t)}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-subtext mt-1.5 leading-relaxed">
                      Granting this module enables every listed action across all pages it covers (role defaults still apply; deny removes them).
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted mt-2">{t('settingsModuleRoleHint')}</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 flex items-center rounded-lg border border-line text-sm font-medium text-ink hover:bg-subtle transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-10 px-5 flex items-center gap-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {submitting ? t('settingsProvisioning') : t('settingsProvisionUser')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Edit a user's role + module access (grant/deny) inline. */
function EditAccessModal({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [role, setRole] = useState<string>(user.role);
  const [grants, setGrants] = useState<string[]>(user.moduleGrants || []);
  const [denies, setDenies] = useState<string[]>(user.moduleDenies || []);
  const [modules, setModules] = useState<{ key: string; label: string; permissions: string[] }[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/users/module-access').then((res) => setModules(res.data.data || [])).catch(() => {});
  }, []);

  const grantAll = (key: string) => {
    setDenies((d) => d.filter((k) => k !== key));
    setGrants((g) => (g.includes(key) ? g.filter((k) => k !== key) : [...g, key]));
  };
  const denyAll = (key: string) => {
    setGrants((g) => g.filter((k) => k !== key));
    setDenies((d) => (d.includes(key) ? d.filter((k) => k !== key) : [...d, key]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.put(`/users/${user._id}`, {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role,
        moduleGrants: grants,
        moduleDenies: denies,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user access');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`${user.firstName} ${user.lastName} — ${t('settingsEditAccess')}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-danger-text bg-danger-subtle rounded-lg border border-danger-line">{error}</div>
        )}
        <Select name="role" label={t('settingsFieldSystemRole')} value={role} onChange={(e) => setRole(e.target.value)}>
          {Object.values(UserRole).map((r) => (
            <option key={r} value={r}>
              {roleLabel(r, t)}
            </option>
          ))}
        </Select>
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <p className="text-sm font-medium text-ink">{t('settingsModuleAccessTitle')}</p>
            <InfoTooltip content={t('settingsModuleAccessHint')} />
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto border border-line rounded-lg p-3">
            {modules.map((m) => (
              <div key={m.key} className="py-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label={expanded.includes(m.key) ? 'Hide actions and pages' : 'Show actions and pages'}
                      onClick={() => setExpanded((x) => (x.includes(m.key) ? x.filter((k) => k !== m.key) : [...x, m.key]))}
                      className="text-subtext hover:text-ink transition-colors flex-shrink-0"
                    >
                      <ChevronDown size={14} className={`transition-transform ${expanded.includes(m.key) ? 'rotate-180' : ''}`} />
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">
                        {m.label}
                        {grants.includes(m.key) && <span className="ml-2 text-[10px] font-bold text-success-600 uppercase">Granted</span>}
                        {denies.includes(m.key) && <span className="ml-2 text-[10px] font-bold text-danger-text uppercase">Denied</span>}
                      </p>
                      <p className="text-[11px] text-subtext truncate">{m.permissions.length} permissions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => grantAll(m.key)}
                      className={`px-3 h-8 rounded-lg text-xs font-semibold border transition-colors ${
                        grants.includes(m.key) ? 'bg-success-subtle text-success-text border-success-line' : 'border-line text-muted hover:bg-subtle'
                      }`}
                    >
                      {t('settingsModuleGrant')}
                    </button>
                    <button
                      type="button"
                      onClick={() => denyAll(m.key)}
                      className={`px-3 h-8 rounded-lg text-xs font-semibold border transition-colors ${
                        denies.includes(m.key) ? 'bg-danger-subtle text-danger-text border-danger-line' : 'border-line text-muted hover:bg-subtle'
                      }`}
                    >
                      {t('settingsModuleDeny')}
                    </button>
                  </div>
                </div>
                {expanded.includes(m.key) && (
                  <div className="mt-2 ml-6 pl-3 pr-2 py-2 rounded-lg bg-subtle/60 border border-line/60">
                    <p className="text-[10px] font-bold text-subtext uppercase tracking-wide mb-1.5">Actions enabled by this module</p>
                    <div className="flex flex-wrap gap-1.5">
                      {m.permissions.map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded-md border border-line bg-surface text-[10px] font-medium text-muted font-mono">
                          {permLabel(p, t)}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-subtext mt-1.5 leading-relaxed">
                      Granting this module enables every listed action across all pages it covers (role defaults still apply; deny removes them).
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted mt-2">{t('settingsModuleRoleHint')}</p>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 flex items-center rounded-lg border border-line text-sm font-medium text-ink hover:bg-subtle transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-10 px-5 flex items-center gap-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {submitting ? 'Saving…' : t('save') || 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ============================================================
   ROLES & PERMISSIONS TAB
   Shows the EFFECTIVE permission grants per role — the same
   union (hardcoded role map + module-registered permissions)
   that the backend authorize() middleware enforces.
   ============================================================ */

interface RolePermissions {
  role: string;
  permissions: string[];
}

const PERM_LABEL_KEYS: Record<string, DictKey> = {
  'user.create': 'permUserCreate',
  'user.read': 'permUserRead',
  'user.update': 'permUserUpdate',
  'user.delete': 'permUserDelete',
  'employee.create': 'permEmployeeCreate',
  'employee.read': 'permEmployeeRead',
  'employee.update': 'permEmployeeUpdate',
  'employee.delete': 'permEmployeeDelete',
  'site.create': 'permSiteCreate',
  'site.read': 'permSiteRead',
  'site.update': 'permSiteUpdate',
  'guard.register': 'permGuardRegister',
  'guard.assign-site': 'permGuardAssignSite',
  'guard.modify-hours': 'permGuardModifyHours',
  'guard-attendance.read': 'permGuardAttendanceRead',
  'guard-attendance.manage': 'permGuardAttendanceManage',
  'guard-attendance.future': 'permGuardAttendanceFuture',
  'staff-attendance.manage': 'permStaffAttendanceManage',
  'guard-payroll.read': 'permGuardPayrollRead',
  'guard-payroll.rates': 'permGuardPayrollRates',
  'guard-payroll.calculate': 'permGuardPayrollCalculate',
  'guard-payroll.check': 'permGuardPayrollCheck',
  'guard-payroll.approve': 'permGuardPayrollApprove',
  'guard-payroll.pay': 'permGuardPayrollPay',
  'guard-payroll.return': 'permGuardPayrollReturn',
  'office-payroll.create': 'permOfficePayrollCreate',
  'office-payroll.calculate': 'permOfficePayrollCalculate',
  'office-payroll.submit': 'permOfficePayrollSubmit',
  'office-payroll.check': 'permOfficePayrollCheck',
  'office-payroll.enter-ot': 'permOfficePayrollEnterOt',
  'office-payroll.return': 'permOfficePayrollReturn',
  'office-payroll.rates': 'permOfficePayrollRates',
  'office-payroll.approve': 'permOfficePayrollApprove',
  'office-payroll.pay': 'permOfficePayrollPay',
  'report.read': 'permReportRead',
  'audit.read': 'permAuditRead',
  'settings.read': 'permSettingsRead',
  'settings.update': 'permSettingsUpdate',
  'payroll-period.read': 'permPayrollPeriodRead',
  'payroll-config.manage': 'permPayrollConfigManage',
  'organization.read': 'permOrganizationRead',
  'organization.manage': 'permOrganizationManage',
  'candidate.read': 'permCandidateRead',
  'candidate.manage': 'permCandidateManage',
  'performance.read': 'permPerformanceRead',
  'performance.manage': 'permPerformanceManage',
  'rotation.read': 'permRotationRead',
  'rotation.manage': 'permRotationManage',
  'rotation.generate': 'permRotationGenerate',
  'rotation.approve': 'permRotationApprove',
  'rotation.publish': 'permRotationPublish',
  'rotation.override': 'permRotationOverride',
};

// Order matters: findIndex returns the FIRST matching prefix, so longer
// prefixes (guard-payroll., guard-attendance.) must precede the bare 'guard'.
const PERM_GROUP_ORDER = [
  'user.', 'employee.', 'site.', 'guard-payroll.', 'guard-attendance.', 'guard',
  'staff-attendance.', 'payroll-period.',
  'office-payroll.', 'payroll-config.', 'organization.',
  'candidate.', 'performance.', 'rotation.', 'report.', 'audit.', 'settings.',
];

function permGroup(permission: string): string {
  const idx = PERM_GROUP_ORDER.findIndex((p) => permission.startsWith(p));
  return idx >= 0 ? PERM_GROUP_ORDER[idx] : 'other.';
}

const GROUP_LABEL_KEYS: Record<string, DictKey> = {
  'user.': 'permGroupUsers',
  'employee.': 'permGroupEmployees',
  'site.': 'permGroupSites',
  guard: 'permGroupGuards',
  'guard-attendance.': 'permGroupGuardAttendance',
  'staff-attendance.': 'permGroupStaffAttendance',
  'payroll-period.': 'permGroupPayrollPeriods',
  'guard-payroll.': 'permGroupGuardPayroll',
  'office-payroll.': 'permGroupStaffPayroll',
  'payroll-config.': 'permGroupPayrollConfig',
  'organization.': 'permGroupOrganization',
  'candidate.': 'permGroupRecruitment',
  'performance.': 'permGroupPerformance',
  'rotation.': 'permGroupRotations',
  'report.': 'permGroupReports',
  'audit.': 'permGroupAudit',
  'settings.': 'permGroupSettings',
  'other.': 'permGroupOther',
};

/** Column order (excluding the catch-all "Other" bucket). */
const GROUP_ORDER = [
  'user.', 'employee.', 'site.', 'guard', 'guard-attendance.', 'staff-attendance.',
  'payroll-period.', 'guard-payroll.', 'office-payroll.', 'payroll-config.',
  'organization.', 'candidate.', 'performance.', 'rotation.', 'report.', 'audit.', 'settings.',
];

/** Short column captions — the grid is too narrow for the full group names. */
const GROUP_ABBREV_KEYS: Record<string, DictKey> = {
  'guard': 'colAbbrevGuards',
  'guard-attendance.': 'colAbbrevGuardAtt',
  'staff-attendance.': 'colAbbrevStaffAtt',
  'payroll-period.': 'colAbbrevPeriods',
  'payroll-config.': 'colAbbrevPayConfig',
};

function RolesPermissionsTab() {
  const t = useT();
  const [roles, setRoles] = useState<RolePermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRole, setExpandedRole] = useState<string | null>(UserRole.SUPER_ADMIN);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .get('/users/roles')
      .then((res) => setRoles(res.data.data || []))
      .catch(() => setError(t('settingsFailedLoadRoles')))
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-line py-16 flex items-center justify-center gap-2 text-muted">
        <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        {t('settingsLoadingPermissions')}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger-subtle border border-danger-line text-danger-text rounded-xl px-5 py-4 text-sm">{error}</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="bg-info-subtle border border-info-line text-info-text rounded-xl px-5 py-3.5 text-sm flex items-start gap-3">
        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>{t('settingsEffectiveGrants')}</p>
      </div>

      {/* Compact matrix */}
      <div className="bg-surface rounded-xl border border-line overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-ink">{t('settingsPermissionSummary')}</h3>
            <InfoTooltip content={t('settingsClickRoleHint')} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left px-5 py-3 text-xs font-semibold text-subtext uppercase tracking-wider">{t('settingsColSystemRole')}</th>
                {GROUP_ORDER.map((g) => (
                  <th
                    key={g}
                    className="text-center px-2 py-3 text-[10px] font-semibold text-subtext uppercase tracking-wider"
                    title={t(GROUP_LABEL_KEYS[g])}
                  >
                    {t(GROUP_ABBREV_KEYS[g] || GROUP_LABEL_KEYS[g]).split(' ')[0]}
                  </th>
                ))}
                <th className="text-center px-4 py-3 text-xs font-semibold text-subtext uppercase tracking-wider">{t('settingsTotalCol')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {roles.map(({ role, permissions }) => {
                const groupHas = (prefix: string) => permissions.some((p) => permGroup(p) === prefix);
                return (
                  <tr
                    key={role}
                    onClick={() => setExpandedRole(expandedRole === role ? null : role)}
                    className="hover:bg-surface-hover cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_BADGE_STYLES[role] || ROLE_BADGE_FALLBACK}`}>
                          {roleLabel(role, t)}
                        </span>
                        {expandedRole === role && (
                          <svg className="w-4 h-4 text-subtext" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                      </div>
                    </td>
                    {GROUP_ORDER.map((g) => (
                      <td key={g} className="text-center px-2 py-3.5">
                        {groupHas(g) ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-success-subtle text-success">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-subtle text-subtext">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="text-center px-4 py-3.5">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded-full bg-info-subtle text-info-text text-xs font-bold">
                        {permissions.length}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded detail */}
      {expandedRole && (() => {
        const roleEntry = roles.find((r) => r.role === expandedRole);
        if (!roleEntry) return null;
        const groups = new Map<string, string[]>();
        roleEntry.permissions.forEach((p) => {
          const g = permGroup(p);
          if (!groups.has(g)) groups.set(g, []);
          groups.get(g)!.push(p);
        });
        const sortedGroups = Array.from(groups.entries()).sort(
          (a, b) => GROUP_ORDER.indexOf(a[0]) - GROUP_ORDER.indexOf(b[0]),
        );
        return (
          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold text-ink">
                  {t('settingsRolePermissionsTitle', { role: roleLabel(roleEntry.role, t) })}
                </h3>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_BADGE_STYLES[roleEntry.role] || ROLE_BADGE_FALLBACK}`}>
                  {t('settingsGrantedCount', { count: roleEntry.permissions.length })}
                </span>
              </div>
              <button
                onClick={() => setExpandedRole(null)}
                className="text-xs font-medium text-muted hover:text-ink transition-colors"
              >
                {t('settingsCollapse')}
              </button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sortedGroups.map(([groupKey, perms]) => (
                <div key={groupKey} className="rounded-xl border border-line bg-subtle p-4">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2.5">
                    {t(GROUP_LABEL_KEYS[groupKey])}
                  </p>
                  <ul className="space-y-1.5">
                    {perms
                      .slice()
                      .sort((a, b) => a.localeCompare(b))
                      .map((p) => (
                        <li key={p} className="flex items-start gap-2 text-sm text-ink">
                          <svg className="w-4 h-4 text-success flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          {PERM_LABEL_KEYS[p] ? t(PERM_LABEL_KEYS[p]) : p}
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ============================================================
   AUDIT LOG TAB
   Real data from /audit-logs (AUDIT_READ permission). Shows every
   recorded action with actor, entity, reason and IP, plus an
   expandable before/after diff and CSV export of the current page.
   ============================================================ */

interface AuditRow {
  _id: string;
  userId?: { firstName?: string; lastName?: string; email?: string; role?: string };
  action: string;
  entity: string;
  entityId?: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  createdAt: string;
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

function AuditLogTab() {
  const t = useT();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [entity, setEntity] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    const params: Record<string, string | number> = { page, limit: 100 };
    if (entity) params.entity = entity;
    api
      .get('/audit-logs', { params })
      .then((res) => {
        setRows(res.data.data || []);
        setTotal(res.data.pagination?.total ?? 0);
        setTotalPages(Math.max(res.data.pagination?.totalPages ?? 1, 1));
      })
      .catch(() => setError(t('auditLoadError')))
      .finally(() => setLoading(false));
  }, [page, entity, t]);

  const entities = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.entity));
    return [...set].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.action.toLowerCase().includes(q) ||
        r.entity.toLowerCase().includes(q) ||
        (r.reason || '').toLowerCase().includes(q) ||
        `${r.userId?.firstName || ''} ${r.userId?.lastName || ''}`.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const exportCsv = () => {
    const header = ['Datetime', 'User', 'Role', 'Action', 'Entity', 'Reason', 'IP'];
    const body = filtered.map((r) => [
      fmtDateTime(r.createdAt),
      `${r.userId?.firstName || ''} ${r.userId?.lastName || ''}`.trim(),
      r.userId?.role || '',
      r.action,
      r.entity,
      r.reason || '',
      r.ipAddress || '',
    ]);
    downloadCsv(`audit-log-page${page}.csv`, [header, ...body]);
  };

  return (
    <div className="space-y-4">
      {/* stat + filter bar */}
      <div className="bg-surface rounded-xl border border-line px-5 py-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">{t('auditRecordsTotal', { count: total })}</p>
          <p className="text-xs text-subtext mt-0.5">{t('auditRecordsHint')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] font-bold text-subtext uppercase tracking-wider mb-1">{t('auditFilterEntity')}</label>
            <Select value={entity} onChange={(e) => { setPage(1); setEntity(e.target.value); }} className="w-44 !h-9 text-sm">
              <option value="">{t('auditAllEntities')}</option>
              {entities.map((ent) => <option key={ent} value={ent}>{ent}</option>)}
            </Select>
          </div>
          <div className="relative">
            <label className="block text-[10px] font-bold text-subtext uppercase tracking-wider mb-1">{t('auditFilterSearch')}</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('auditSearchPlaceholder')}
              className="v-input w-52 !h-9 text-sm"
            />
          </div>
          <button
            onClick={exportCsv}
            className="h-9 px-4 flex items-center gap-2 rounded-lg border border-line text-sm font-medium text-ink hover:bg-subtle transition-colors"
          >
            {t('auditExportCsv')}
          </button>
        </div>
      </div>

      {error && <div className="bg-danger-subtle border border-danger-line text-danger-text rounded-xl px-5 py-3.5 text-sm">{error}</div>}

      <div className="bg-surface rounded-xl border border-line overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center gap-2 text-muted">
            <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            {t('auditLoading')}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted text-sm">{t('auditNoEntries')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-subtext uppercase tracking-wider">{t('auditColTime')}</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-subtext uppercase tracking-wider">{t('auditColUser')}</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-subtext uppercase tracking-wider">{t('auditColAction')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-subtext uppercase tracking-wider">{t('auditColEntity')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-subtext uppercase tracking-wider">{t('auditColReason')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-subtext uppercase tracking-wider">{t('auditColIp')}</th>
                  <th className="px-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((r) => {
                  const isOpen = expanded === r._id;
                  const user = `${r.userId?.firstName || ''} ${r.userId?.lastName || ''}`.trim() || 'System';
                  const changed = (r.oldValues || r.newValues) ? Object.keys({ ...(r.oldValues || {}), ...(r.newValues || {}) }).slice(0, 6) : [];
                  return (
                    <Fragment key={r._id}>
                      <tr className={`hover:bg-subtle/40 transition-colors ${isOpen ? 'bg-subtle/40' : ''}`}>
                        <td className="px-5 py-3 text-xs text-subtext whitespace-nowrap font-mono">{fmtDateTime(r.createdAt)}</td>
                        <td className="px-5 py-3">
                          <span className="text-ink font-medium">{user}</span>
                          <span className="block text-[11px] text-muted">{roleLabel(r.userId?.role || '', t)}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded-md bg-primary-500/10 text-primary-600 dark:text-primary-300 font-mono text-[11px] font-medium">
                            {r.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted text-xs">{r.entity}</td>
                        <td className="px-4 py-3 text-muted text-xs max-w-[220px] truncate" title={r.reason}>
                          {r.reason ? (r.reason.length > 48 ? `${r.reason.slice(0, 48)}…` : r.reason) : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted text-xs font-mono">{r.ipAddress || '—'}</td>
                        <td className="px-2 py-3 text-right">
                          <button
                            onClick={() => setExpanded(isOpen ? null : r._id)}
                            className="p-1 text-muted hover:text-ink transition-colors"
                            aria-label={isOpen ? 'Collapse' : 'Expand'}
                          >
                            <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-subtle/30">
                          <td colSpan={7} className="px-5 py-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div>
                                <p className="text-[10px] font-bold text-subtext uppercase tracking-wider mb-2">{t('auditDetailAction')}</p>
                                <ul className="text-xs space-y-1 text-ink">
                                  <li><span className="text-muted">{t('auditDetailEntity')}:</span> {r.entity}{r.entityId ? ` (${r.entityId})` : ''}</li>
                                  <li><span className="text-muted">{t('auditDetailIp')}:</span> {r.ipAddress || '—'}</li>
                                  <li className="min-w-0"><span className="text-muted">UA:</span> <span className="break-all">{r.userAgent ? r.userAgent.slice(0, 120) : '—'}</span></li>
                                </ul>
                                {changed.length > 0 && (
                                  <p className="mt-2 text-xs text-subtext">{t('auditChangedFields', { fields: changed.join(', ') })}</p>
                                )}
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-subtext uppercase tracking-wider mb-2">{t('auditDetailDiff')}</p>
                                <pre className="text-[11px] leading-relaxed bg-canvas border border-line rounded-lg p-3 overflow-auto max-h-56 whitespace-pre-wrap break-all">
{JSON.stringify({ old: r.oldValues, new: r.newValues }, null, 1).slice(0, 2400)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* pagination */}
        {!loading && total > 0 && (
          <div className="px-5 py-3 border-t border-line flex items-center justify-between text-sm">
            <p className="text-subtext text-xs">{t('auditPageInfo', { page, totalPages })}</p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-8 px-3 rounded-lg border border-line text-xs font-medium text-ink hover:bg-subtle disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('auditPrev')}
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 px-3 rounded-lg border border-line text-xs font-medium text-ink hover:bg-subtle disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('auditNext')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   SYSTEM SETTINGS TAB
   Data-backed system overview: live API health, data volume, and
   the currently active statutory payroll defaults (tax brackets,
   pension rules) the system applies today.
   ============================================================ */

function SystemSettingsTab() {
  const t = useT();
  const [health, setHealth] = useState<{ ok: boolean; serverTime?: string } | null>(null);
  const [stats, setStats] = useState({ users: 0, employees: 0, audit: 0 });
  const [tax, setTax] = useState<{ kind: string; name: string; effectiveFrom: string; brackets: { min: number | null; max: number | null; rate: number }[] }[]>([]);
  const [pension, setPension] = useState<{ kind: string; name: string; effectiveFrom: string; employeePercent: number; employerPercent: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get('/health').catch(() => null),
      api.get('/users').catch(() => null),
      api.get('/employees?limit=1').catch(() => null),
      api.get('/audit-logs?limit=1').catch(() => null),
      api.get('/payroll-common/tax-brackets').catch(() => null),
      api.get('/payroll-common/pension-rules').catch(() => null),
    ]).then(([health_, users_, emp_, audit_, tax_, pens_]) => {
      if (!alive) return;
      const h = health_?.data as { success?: boolean; timestamp?: string } | null;
      setHealth({ ok: !!h?.success, serverTime: h?.timestamp });
      const u = Array.isArray(users_?.data?.data) ? users_.data.data : [];
      setStats({
        users: u.length,
        employees: emp_?.data?.pagination?.total ?? 0,
        audit: audit_?.data?.pagination?.total ?? 0,
      });
      setTax(tax_?.data?.data || []);
      setPension(pens_?.data?.data || []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-line py-16 flex items-center justify-center gap-2 text-muted">
        <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        {t('systemLoading')}
      </div>
    );
  }

  const fmtDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="space-y-5">
      {/* System status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl border border-line p-5">
          <p className="text-[10px] font-bold text-subtext uppercase tracking-wider mb-3">{t('systemApiStatus')}</p>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${health?.ok ? 'bg-success' : 'bg-destructive'}`} />
            <span className={`text-lg font-semibold ${health?.ok ? 'text-success-text' : 'text-danger-text'}`}>
              {health?.ok ? t('systemOnline') : t('systemOffline')}
            </span>
          </div>
          <p className="text-xs text-subtext mt-2">{health?.ok ? t('systemApiHint') : t('systemOfflineHint')}</p>
        </div>
        <div className="bg-surface rounded-xl border border-line p-5">
          <p className="text-[10px] font-bold text-subtext uppercase tracking-wider mb-3">{t('systemServerTime')}</p>
          <p className="text-sm text-ink font-mono">{health?.serverTime ? fmtDateTime(health.serverTime) : '—'}</p>
          <p className="text-[11px] text-subtext mt-2">{t('systemServerTimeHint')}</p>
        </div>
        <div className="bg-surface rounded-xl border border-line p-5">
          <p className="text-[10px] font-bold text-subtext uppercase tracking-wider mb-3">{t('systemDataVolume')}</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-lg font-bold text-ink">{stats.users}</p><p className="text-[10px] text-muted">{t('systemStatUsers')}</p></div>
            <div><p className="text-lg font-bold text-ink">{stats.employees}</p><p className="text-[10px] text-muted">{t('systemStatEmployees')}</p></div>
            <div><p className="text-lg font-bold text-ink">{stats.audit}</p><p className="text-[10px] text-muted">{t('systemStatAudit')}</p></div>
          </div>
        </div>
      </div>

      {/* Statutory payroll defaults */}
      <div className="bg-surface rounded-xl border border-line overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-ink">{t('systemStatutoryTitle')}</h3>
            <InfoTooltip content={t('systemStatutoryHint')} />
          </div>
        </div>
        <div className="p-5 grid grid-cols-1 xl:grid-cols-2 gap-5">
          {tax.map((br) => (
            <div key={br._id} className="rounded-xl border border-line bg-subtle p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{br.name}</p>
                  <p className="text-[11px] text-subtext mt-0.5">{t('systemEffectiveFrom')}: {fmtDate(br.effectiveFrom)}</p>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-primary-500/10 text-primary-600 dark:text-primary-300 text-[10px] font-bold">{br.kind}</span>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-line text-subtext">
                      <th className="text-left py-1.5 font-medium">{t('systemTaxableFrom')}</th>
                      <th className="text-left py-1.5 font-medium">{t('systemTaxableTo')}</th>
                      <th className="text-right py-1.5 font-medium">{t('systemRate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {br.brackets.map((b, i) => (
                      <tr key={i} className={i < br.brackets.length - 1 ? 'border-b border-line/50' : ''}>
                        <td className="py-1 font-mono text-ink">{b.min.toLocaleString()}</td>
                        <td className="py-1 font-mono text-ink">{b.max === null ? '∞' : b.max.toLocaleString()}</td>
                        <td className="py-1 text-right font-semibold text-ink">{b.rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {pension.map((p) => (
            <div key={p._id} className="rounded-xl border border-line bg-subtle p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{p.name}</p>
                  <p className="text-[11px] text-subtext mt-0.5">{t('systemEffectiveFrom')}: {fmtDate(p.effectiveFrom)}</p>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-success-500/10 text-success-600 dark:text-success-300 text-[10px] font-bold">{p.kind}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="bg-surface rounded-lg border border-line p-2">
                  <p className="text-lg font-bold text-ink">{p.employeePercent}%</p>
                  <p className="text-[10px] text-muted">{t('systemPensionEmployee')}</p>
                </div>
                <div className="bg-surface rounded-lg border border-line p-2">
                  <p className="text-lg font-bold text-ink">{p.employerPercent}%</p>
                  <p className="text-[10px] text-muted">{t('systemPensionEmployer')}</p>
                </div>
              </div>
            </div>
          ))}
          {tax.length === 0 && pension.length === 0 && (
            <p className="text-sm text-muted">{t('systemStatutoryNone')}</p>
          )}
        </div>
      </div>

      {/* Editable statutory defaults pointer */}
      <div className="bg-info-subtle border border-info-line text-info-text rounded-xl px-5 py-3.5 text-sm">
        {t('systemStatutoryEditHint')}
      </div>
    </div>
  );
}

/* ============================================================
   INTEGRATIONS TAB
   Honest catalog of what the system actually connects to today
   and what is planned but not yet wired.
   ============================================================ */

const INTEGRATIONS: { status: 'ACTIVE' | 'PLANNED'; icon: string; labelKey: DictKey; descKey: DictKey }[] = [
  { status: 'ACTIVE', icon: '⬆', labelKey: 'intXlsxImportLbl', descKey: 'intXlsxImportDesc' },
  { status: 'ACTIVE', icon: '⭳', labelKey: 'intBankExportLbl', descKey: 'intBankExportDesc' },
  { status: 'ACTIVE', icon: '⌗', labelKey: 'intTaxExportLbl', descKey: 'intTaxExportDesc' },
  { status: 'ACTIVE', icon: '▦', labelKey: 'intPensionExportLbl', descKey: 'intPensionExportDesc' },
  { status: 'ACTIVE', icon: '⿻', labelKey: 'intQrPatrolLbl', descKey: 'intQrPatrolDesc' },
  { status: 'ACTIVE', icon: '🗎', labelKey: 'intFileStorageLbl', descKey: 'intFileStorageDesc' },
  { status: 'ACTIVE', icon: 'ⲫ', labelKey: 'intAuditLbl', descKey: 'intAuditDesc' },
  { status: 'PLANNED', icon: '✉', labelKey: 'intEmailLbl', descKey: 'intEmailDesc' },
  { status: 'PLANNED', icon: '🖰', labelKey: 'intBiometricLbl', descKey: 'intBiometricDesc' },
  { status: 'PLANNED', icon: '☎', labelKey: 'intSmsLbl', descKey: 'intSmsDesc' },
];

function IntegrationsTab() {
  const t = useT();
  const active = INTEGRATIONS.filter((i) => i.status === 'ACTIVE');
  const planned = INTEGRATIONS.filter((i) => i.status === 'PLANNED');
  const row = (i: (typeof INTEGRATIONS)[number]) => (
    <div key={i.labelKey} className="rounded-xl border border-line bg-subtle p-4 flex items-start gap-3">
      <span className="w-9 h-9 rounded-lg bg-surface border border-line flex items-center justify-center text-base flex-shrink-0" aria-hidden>
        {i.icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{t(i.labelKey)}</p>
        <p className="text-xs text-subtext mt-1 leading-relaxed">{t(i.descKey)}</p>
      </div>
    </div>
  );
  return (
    <div className="space-y-5">
      <div className="bg-surface rounded-xl border border-line overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success" />
          <h3 className="text-base font-semibold text-ink">{t('intActiveTitle')}</h3>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">{active.map(row)}</div>
      </div>
      <div className="bg-surface rounded-xl border border-line overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-warning" />
          <h3 className="text-base font-semibold text-ink">{t('intPlannedTitle')}</h3>
          <InfoTooltip content={t('intPlannedHint')} />
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">{planned.map(row)}</div>
      </div>
    </div>
  );
}
