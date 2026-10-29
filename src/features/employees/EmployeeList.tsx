import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';import api, { getApiBaseUrl } from '../../lib/api';
import { downloadReport } from '../payroll-shared/export';
import ContractList from '../contracts/ContractList';
import EmployeeFormModal from './EmployeeFormModal';
import GuardImportModal from '../guards/GuardImportModal';
import { FileSpreadsheet } from 'lucide-react';
import { InfoTooltip } from '../../components/ui';
import { useT, useLang, formatDate, getMonthNames } from '../../i18n';
import type { DictKey } from '../../i18n';

interface Employee {
  _id: string;
  employeeCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  category: string;
  status: string;
  phone?: string;
  email?: string;
  gender?: string;
  hireDate?: string;
  joinDate?: string;
  position?: string;
  department?: string;
  address?: string;
  salary?: number;
  transportAllowance?: number;
  bankName?: string;
  accountNumber?: string;
  guardInfo?: {
    employmentType?: string;
    idCardNumber?: string;
  };
  dateOfBirth?: string;
  terminationDate?: string | null;
  terminationReason?: string | null;
  statusHistory?: {
    from: string;
    to: string;
    reason: string;
    changedBy?: string;
    changedAt: string;
  }[];
}

interface TrendMonth {
  year: number; month: number; monthName: string;
  active: number; inactive: number; onLeave: number;
  newHires: number; deactivated: number;
}

interface EmployeeAnalytics {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, { total: number; active: number; inactive: number }>;
  activeTotal: number;
  inactiveTotal: number;
  trend: TrendMonth[];
}

/** Status chip: themed subtle background + status text color (light & dark). */
const statusChip: Record<string, string> = {
  ACTIVE: 'bg-success-subtle text-success-text border-success-line',
  INACTIVE: 'bg-subtle text-muted border-line',
  ON_LEAVE: 'bg-warning-subtle text-warning-text border-warning-line',
  TERMINATED: 'bg-danger-subtle text-danger-text border-danger-line',
  CONTRACTED: 'bg-info-subtle text-info-text border-info-line',
  EXPIRED: 'bg-subtle text-muted border-line',
};

const categoryLabels: Record<string, DictKey> = {
  GUARD: 'guard',
  OFFICE_STAFF: 'officeStaff',
};

/** Category chip: semantic info/violet accents that read well on both themes. */
const categoryChip: Record<string, string> = {
  GUARD: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  OFFICE_STAFF: 'bg-slate-100 text-slate-800 border border-slate-200 dark:bg-navy-800 dark:text-slate-200 dark:border-navy-700',
};

const tabs: DictKey[] = ['tabDirectory', 'tabGuarantor', 'tabContract', 'tabAttendance', 'tabPerformance'];

interface AttendanceSummary {
  employee: { _id: string; firstName: string; lastName: string; employeeCode: string; department?: string };
  counts: Record<string, number>;
  payableDays: number;
  totalDaysInMonth: number;
}

interface PerfRecord {
  _id: string;
  employeeId: { firstName: string; lastName: string; employeeCode: string; department?: string } | string;
  period: string; attendanceRate: number; punctualityRate: number;
  score: number; trend: number; flags: string[]; reviewDueDate?: string;
}

interface PerfStats {
  avgScore: number; topDepartment: string; openFlags: number; reviewsDue: number;
}

const TAB_MAP: Record<string, number> = {
  directory: 0, guarantor: 1, contract: 2, attendance: 3, performance: 4,
};

/* Shared themed class strings for this module. */
const inputCls =
  'w-full h-10 pl-10 pr-4 rounded-lg border border-line bg-surface text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400';
const selectCls =
  'h-10 px-4 pr-8 rounded-lg border border-line bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 appearance-none cursor-pointer';
const thCls = 'text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider';
const thR = 'text-right px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider';
const thC = 'text-center px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider';
const tdMuted = 'px-6 py-4 text-sm text-muted';
const cardCls = 'bg-surface rounded-xl border border-line';
const statCardCls = `${cardCls} p-5`;
const spinner = (
  <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
);

const STATUS_KEYS: Record<string, DictKey> = {
  ACTIVE: 'active',
  CONTRACTED: 'statusContracted',
  INACTIVE: 'inactive',
  ON_LEAVE: 'statusOnLeave',
  TERMINATED: 'statusTerminated',
  EXPIRED: 'statusExpired',
};

export default function EmployeeList() {
  const t = useT();
  const lang = useLang();
  const [searchParams] = useSearchParams();
  const initialTab = TAB_MAP[searchParams.get('tab') || ''] ?? 0;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab);

  const [stats, setStats] = useState({ total: 0, guards: 0, staff: 0, onLeave: 0, newThisMonth: 0 });
  const [analytics, setAnalytics] = useState<EmployeeAnalytics | null>(null);

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<{
    contract?: any;
    contractHistory?: any[];
    guarantors?: any[];
    documents?: any[];
    files?: any[];
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create/Edit employee form rendered as an in-page modal (no navigation).
  const [showFormModal, setShowFormModal] = useState(false);
  const [formEmployee, setFormEmployee] = useState<Employee | null>(null);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Employee | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [statusError, setStatusError] = useState('');
  const [changingStatus, setChangingStatus] = useState(false);

  useEffect(() => { fetchEmployees(); }, [page, search, roleFilter, statusFilter]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      if (roleFilter) params.category = roleFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/employees', { params });
      setEmployees(res.data.data);
      setTotalPages(res.data.pagination.totalPages);

      const analyticsRes = await api.get('/employees/analytics/summary', { params: { months: 6 } }).catch(() => null);
      const a: EmployeeAnalytics | null = analyticsRes?.data?.data || null;
      setAnalytics(a);
      if (a) {
        setStats({
          total: a.total,
          guards: a.byCategory?.GUARD?.total || 0,
          staff: a.byCategory?.OFFICE_STAFF?.total || 0,
          onLeave: a.byStatus?.ON_LEAVE || 0,
          newThisMonth: a.trend?.length > 0 ? a.trend[a.trend.length - 1].newHires : 0,
        });
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const openFormModal = (emp?: Employee | null) => {
    setFormEmployee(emp ?? null);
    setShowFormModal(true);
  };

  const handleFormSaved = (emp: any) => {
    fetchEmployees();
    if (selectedEmployee && emp?._id === selectedEmployee._id) handleView(emp);
  };

  const openStatusModal = (emp: Employee) => {
    setStatusTarget(emp);
    setNewStatus('');
    setStatusReason('');
    setStatusError('');
    setShowStatusModal(true);
  };

  const handleStatusChange = async () => {
    if (!statusTarget) return;
    if (!newStatus) { setStatusError(t('selectNewStatusError')); return; }
    if (statusReason.trim().length < 3) { setStatusError(t('reasonMinError')); return; }
    setChangingStatus(true);
    setStatusError('');
    try {
      const res = await api.put(`/employees/${statusTarget._id}/status`, { status: newStatus, reason: statusReason.trim() });
      const updated = res.data.data as Employee;
      setShowStatusModal(false);
      setStatusTarget(null);
      if (selectedEmployee && selectedEmployee._id === updated._id) setSelectedEmployee(updated);
      fetchEmployees();
    } catch (e: any) {
      setStatusError(e.response?.data?.message || t('failedStatusChange'));
    } finally {
      setChangingStatus(false);
    }
  };

  const statusOptions = ['ACTIVE', 'CONTRACTED', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'];

  const fileUrl = (path: string) => `${getApiBaseUrl()}${path.startsWith('/') ? '' : '/'}${path}`;

  const handleView = async (emp: Employee) => {
    setSelectedEmployee(emp);
    setDetail(null);
    setDetailLoading(true);
    try {
      // Full profile: employee + active contract + contract salary history +
      // guarantors + documents, so everything is visible in one view.
      const res = await api.get(`/employees/${emp._id}/detail`);
      setSelectedEmployee(res.data.data?.employee ?? res.data.data);
      setDetail(res.data.data ?? null);
    } catch (e) {
      try {
        const res = await api.get(`/employees/${emp._id}`);
        setSelectedEmployee(res.data.data);
      } catch {
        console.error('Failed to load employee details');
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEmployee) return;
    if (!confirm(t('deleteConfirm', { name: `${selectedEmployee.firstName} ${selectedEmployee.lastName}` }))) return;
    setDeleting(true);
    try {
      await api.delete(`/employees/${selectedEmployee._id}`);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (e: any) {
      alert(e.response?.data?.message || t('failedDelete'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-line items-center justify-between" data-tour="emp-tabs">
        <div className="flex gap-1 overflow-x-auto" data-tour="emp-toolbar">
          {tabs.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                activeTab === i
                  ? 'border-primary-600 text-primary-600 bg-primary-500/5'
                  : 'border-transparent text-muted hover:text-ink hover:border-line'
              }`}
            >
              {t(tab)}
            </button>
          ))}
        </div>
        {activeTab === 0 && (
          <button
            onClick={() => openFormModal()}
            className="h-9 px-4 flex items-center gap-2 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 transition-colors shadow-xs shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {t('createEmployee')}
          </button>
        )}
      </div>

      {activeTab === 2 ? (
        <ContractList />
      ) : activeTab === 1 ? (
        <GuarantorTab />
      ) : activeTab === 3 ? (
        <AttendanceTab />
      ) : activeTab === 4 ? (
        <PerformanceTab />
      ) : (
      <>
      {/* Summary Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-subtle text-xs font-medium text-ink">
          {t('totalBadge', { count: (analytics?.total ?? stats.total).toLocaleString() })}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success-subtle text-xs font-medium text-success-text">
          {t('activeBadge', { count: analytics?.activeTotal ?? 0 })}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-subtle border border-line text-xs font-medium text-muted">
          {t('inactiveBadge', { count: analytics?.inactiveTotal ?? 0 })}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning-subtle text-xs font-medium text-warning-text">
          {t('onLeaveBadge', { count: stats.onLeave })}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-info-subtle text-xs font-medium text-info-text">
          {t('newThisMonthBadge', { count: stats.newThisMonth })}
        </span>
        <InfoTooltip content={t('directoryNote')} />
      </div>

      {/* Filters + Add Button */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder={t('searchNameOrId')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className={inputCls}
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className={selectCls}
        >
          <option value="">{t('allRoles')}</option>
          <option value="GUARD">{t('guard')}</option>
          <option value="OFFICE_STAFF">{t('officeStaff')}</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className={selectCls}
        >
          <option value="">{t('activeStatusFilter')}</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{t(STATUS_KEYS[s] ?? 'status')}</option>
          ))}
        </select>

        <div className="flex-1" />

        <button
          onClick={() => setShowImportModal(true)}
          className="h-10 px-4 flex items-center gap-2 rounded-lg border border-primary-500/30 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 text-sm font-semibold hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors shadow-sm"
        >
          <FileSpreadsheet className="w-4 h-4 text-primary-600" />
          <span>{lang === 'am' ? 'ከ Excel አስገባ' : 'Import Excel'}</span>
        </button>

        <button
          onClick={async () => {
            // Export must go through the authenticated axios client: window.open
            // cannot send the JWT Authorization header, so the API returned 401.
            try {
              await downloadReport('/employees/export', `employees-${new Date().toISOString().split('T')[0]}.csv`);
            } catch (err: any) {
              alert(err?.response?.data?.message || err?.message || 'Export failed');
            }
          }}
          className="h-10 px-5 flex items-center gap-2 rounded-lg border border-line bg-surface text-sm font-medium text-ink hover:bg-subtle transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          {t('exportCsv')}
        </button>
      </div>

      {/* Employee Table */}
      <div className="bg-surface rounded-xl border border-line overflow-hidden">
          <div className="px-6 py-4 border-b border-line">
            <h3 className="text-base font-semibold text-ink">{t('workforceDirectory')}</h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">{spinner}</div>
          ) : employees.length === 0 ? (
            <div className="py-20 text-center">
              <svg className="w-12 h-12 mx-auto text-line-strong mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <p className="text-sm text-muted">{t('noEmployees')}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line">
                      <th className={thCls}>{t('employeeId')}</th>
                      <th className={thCls}>{t('fullName')}</th>
                      <th className={thCls}>{t('roleType')}</th>
                      <th className={thCls}>{t('status')}</th>
                      <th className={thCls}>{t('joinDate')}</th>
                      <th className={thR}>{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp._id} className="border-b border-line hover:bg-surface-hover transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-medium text-primary-600 dark:text-primary-400">{emp.employeeCode}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {emp.firstName?.[0]}{emp.lastName?.[0]}
                            </div>
                            <div>
                              {/* Imported Amharic names carry a middle name —
                                  show the full stored name, not just first+last */}
                              <p className="font-medium text-ink">{[emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(' ')}</p>
                              <p className="text-xs text-subtext">{emp.phone || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryChip[emp.category] || 'bg-subtle text-muted'}`}>
                            {t(categoryLabels[emp.category] ?? 'employee')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusChip[emp.status] || 'bg-subtle text-muted border-line'}`}>
                            {t(STATUS_KEYS[emp.status] ?? 'status')}
                          </span>
                        </td>
                        <td className={tdMuted}>
                          {emp.joinDate ? formatDate(lang, emp.joinDate) : emp.hireDate ? formatDate(lang, emp.hireDate) : '—'}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <button onClick={() => handleView(emp)} className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 hover:underline">
                            {t('view')}
                          </button>
                          <span className="text-line-strong mx-2">|</span>
                          <button onClick={() => openStatusModal(emp)} className="text-sm font-medium text-warning-text hover:underline">
                            {t('status')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center px-6 py-4 border-t border-line">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 text-sm font-medium text-muted border border-line rounded-lg hover:bg-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t('previous')}
                </button>
                <span className="text-sm text-muted">{t('page')} {page} {t('of')} {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 text-sm font-medium text-muted border border-line rounded-lg hover:bg-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t('next')}
                </button>
              </div>
            </>
          )}
      </div>
      </>
      )}

      {/* Employee Detail Sidebar */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedEmployee(null)} />
          <div className="relative w-full max-w-lg bg-surface shadow-xl overflow-y-auto">
            {detailLoading ? (
              <div className="flex items-center justify-center h-full">{spinner}</div>
            ) : (
              <div className="p-6 space-y-6" data-tour="emp-detail">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-lg font-bold">
                      {selectedEmployee.firstName?.[0]}{selectedEmployee.lastName?.[0]}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-ink">{selectedEmployee.firstName} {selectedEmployee.lastName}</h2>
                      <p className="text-sm text-muted">{selectedEmployee.employeeCode}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedEmployee(null)} className="p-2 rounded-lg hover:bg-subtle text-muted hover:text-ink">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusChip[selectedEmployee.status] || 'bg-subtle text-muted border-line'}`}>
                    {t(STATUS_KEYS[selectedEmployee.status] ?? 'status')}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${categoryChip[selectedEmployee.category] || 'bg-subtle text-muted'}`}>
                    {t(categoryLabels[selectedEmployee.category] ?? 'employee')}
                  </span>
                  {selectedEmployee.status === 'TERMINATED' && selectedEmployee.terminationDate && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-danger-subtle text-danger-text border border-danger-line">
                      {t('terminatedOn', { date: formatDate(lang, selectedEmployee.terminationDate) })}
                    </span>
                  )}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => openFormModal(selectedEmployee)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    {t('edit')}
                  </button>
                  <button onClick={() => openStatusModal(selectedEmployee)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-warning-line text-warning-text text-sm font-medium hover:bg-warning-subtle transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    {t('status')}
                  </button>
                  <button onClick={handleDelete} disabled={deleting}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-danger-line text-danger-text text-sm font-medium hover:bg-danger-subtle transition-colors disabled:opacity-50">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    {deleting ? t('deleting') : t('delete')}
                  </button>
                </div>

                {/* Status History */}
                <div className="bg-canvas  rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-ink mb-3">{t('statusHistory')}</h3>
                  {(selectedEmployee.statusHistory || []).length === 0 ? (
                    <p className="text-xs text-subtext">{t('noStatusChanges')}</p>
                  ) : (
                    <div className="space-y-3">
                      {[...(selectedEmployee.statusHistory || [])].reverse().map((h, i) => (
                        <div key={i} className="flex gap-3 text-xs">
                          <div className="flex flex-col items-center">
                            <span className="w-2 h-2 rounded-full bg-warning mt-1" />
                            {i < (selectedEmployee.statusHistory || []).length - 1 && <span className="w-px flex-1 bg-line" />}
                          </div>
                          <div className="pb-1">
                            <p className="font-semibold text-ink">{t(STATUS_KEYS[h.from] ?? 'status')} → {t(STATUS_KEYS[h.to] ?? 'status')}</p>
                            <p className="text-muted mt-0.5">{h.reason}</p>
                            <p className="text-subtext mt-0.5">{h.changedAt ? formatDate(lang, h.changedAt) : ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-canvas  rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-ink">{t('personalInfo')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: t('firstName'), value: selectedEmployee.firstName },
                      { label: t('lastName'), value: selectedEmployee.lastName },
                      { label: t('phone'), value: selectedEmployee.phone || '—' },
                      { label: t('email'), value: selectedEmployee.email || '—' },
                      { label: t('gender'), value: selectedEmployee.gender || '—' },
                      { label: t('dateOfBirth'), value: selectedEmployee.dateOfBirth ? formatDate(lang, selectedEmployee.dateOfBirth) : '—' },
                    ].map((f) => (
                      <div key={f.label}>
                        <p className="text-[11px] text-subtext uppercase tracking-wider">{f.label}</p>
                        <p className="text-sm font-medium text-ink mt-0.5">{f.value}</p>
                      </div>
                    ))}
                  </div>
                  {selectedEmployee.address && (
                    <div>
                      <p className="text-[11px] text-subtext uppercase tracking-wider">{t('address')}</p>
                      <p className="text-sm font-medium text-ink mt-0.5">{selectedEmployee.address}</p>
                    </div>
                  )}
                </div>

                <div className="bg-canvas  rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-ink">{t('employmentDetails')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: t('employeeId'), value: selectedEmployee.employeeCode },
                      { label: t('department'), value: selectedEmployee.department || '—' },
                      { label: t('position'), value: selectedEmployee.position || '—' },
                      { label: t('joinDate'), value: (selectedEmployee as any).joinDate ? formatDate(lang, (selectedEmployee as any).joinDate) : selectedEmployee.hireDate ? formatDate(lang, selectedEmployee.hireDate) : '—' },
                      { label: t('category'), value: t(categoryLabels[selectedEmployee.category] ?? 'employee') },
                      { label: t('status'), value: t(STATUS_KEYS[selectedEmployee.status] ?? 'status') },
                    ].map((f) => (
                      <div key={f.label}>
                        <p className="text-[11px] text-subtext uppercase tracking-wider">{f.label}</p>
                        <p className="text-sm font-medium text-ink mt-0.5">{f.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Compensation — taken from the ACTIVE CONTRACT (the source of truth for pay) */}
                {(() => {
                  const c = detail?.contract;
                  const money = (n?: number) => (n != null && n !== 0 ? `ETB ${Number(n).toLocaleString()}` : '—');
                  return (
                    <div className="bg-canvas  rounded-xl p-5 space-y-4">
                      <h3 className="text-sm font-semibold text-ink">{t('compensation')}</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: t('salary'), value: c ? money(c.wage) : (selectedEmployee.salary ? `ETB ${selectedEmployee.salary.toLocaleString()}` : '—') },
                          { label: t('transportAllowance'), value: c ? money(c.transportAllowance) : (selectedEmployee.transportAllowance ? `ETB ${selectedEmployee.transportAllowance.toLocaleString()}` : '—') },
                          ...(c && selectedEmployee.category !== 'GUARD' ? [
                            { label: t('responsibilityAllowanceEtb'), value: money(c.responsibilityAllowance) },
                            { label: t('teleAllowanceEtb'), value: money(c.teleAllowance) },
                          ] : []),
                          { label: t('bankName'), value: selectedEmployee.bankName || '—' },
                          { label: t('accountNumber'), value: selectedEmployee.accountNumber || '—' },
                        ].map((f) => (
                          <div key={f.label}>
                            <p className="text-[11px] text-subtext uppercase tracking-wider">{f.label}</p>
                            <p className="text-sm font-medium text-ink mt-0.5">{f.value}</p>
                          </div>
                        ))}
                      </div>
                      {/* Old salary kept from contract updates — full history visible */}
                      {(detail?.contractHistory || []).length > 1 && (
                        <div className="pt-3 border-t border-line">
                          <p className="text-[11px] text-subtext uppercase tracking-wider mb-2">Salary history</p>
                          <div className="space-y-1.5">
                            {detail!.contractHistory!.slice(0, 5).map((h: any, i: number) => (
                              <div key={h._id || i} className="flex items-center justify-between text-xs">
                                <span className="text-muted">
                                  {h.previous ? `${t('salary')}: ETB ${Number(h.previous.wage).toLocaleString()}` : t('newContract') || 'Contract created'}
                                </span>
                                <span className="font-medium text-ink">
                                  → ETB {Number(h.current?.wage ?? 0).toLocaleString()}
                                  <span className="text-subtext ml-1.5">{h.effectiveFrom ? formatDate(lang, h.effectiveFrom) : ''}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {selectedEmployee.category === 'GUARD' && selectedEmployee.guardInfo && (
                  <div className="bg-canvas  rounded-xl p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-ink">{t('guardInformation')}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: t('employmentType'), value: selectedEmployee.guardInfo.employmentType || '—' },
                        { label: t('idCardNumber'), value: selectedEmployee.guardInfo.idCardNumber || '—' },
                      ].map((f) => (
                        <div key={f.label}>
                          <p className="text-[11px] text-subtext uppercase tracking-wider">{f.label}</p>
                          <p className="text-sm font-medium text-ink mt-0.5">{f.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents uploaded for this employee — visible & downloadable */}
                {(() => {
                  const docs = [
                    ...((detail?.documents as any[]) || []),
                    ...((detail?.files as any[]) || []).map((f) => ({
                      title: f.title || f.description || f.originalName,
                      url: f.path,
                      fileName: f.fileName || f.originalName,
                      uploadedAt: f.createdAt,
                    })),
                  ];
                  const seen = new Set<string>();
                  const unique = docs.filter((d) => d.url && !seen.has(d.url) && seen.add(d.url));
                  return unique.length > 0 ? (
                    <div className="bg-canvas  rounded-xl p-5">
                      <h3 className="text-sm font-semibold text-ink mb-3">{t('documents')}</h3>
                      <div className="space-y-2">
                        {unique.map((d: any, i: number) => (
                          <a
                            key={i}
                            href={fileUrl(d.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 p-2.5 rounded-lg border border-line hover:bg-subtle transition-colors"
                          >
                            <svg className="w-4 h-4 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-ink truncate">{d.title || d.fileName}</p>
                              {d.uploadedAt && <p className="text-[10px] text-subtext">{formatDate(lang, d.uploadedAt)}</p>}
                            </div>
                            <svg className="w-4 h-4 text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Guarantors on file for this employee */}
                {(detail?.guarantors || []).length > 0 && (
                  <div className="bg-canvas  rounded-xl p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-ink">{t('tabGuarantor')}</h3>
                    {detail!.guarantors!.map((g: any) => (
                      <div key={g._id} className="p-3 rounded-lg border border-line">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-ink">{g.fullName}</p>
                            <p className="text-xs text-muted">{g.phone}{g.relationship ? ` • ${g.relationship}` : ''}</p>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            g.verificationStatus === 'VERIFIED' ? 'bg-success-subtle text-success-text'
                            : g.verificationStatus === 'REJECTED' ? 'bg-danger-subtle text-danger-text'
                            : 'bg-warning-subtle text-warning-text'}`}>
                            {g.verificationStatus}
                          </span>
                        </div>
                        {(g.documents || []).length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {g.documents.map((d: any, i: number) => (
                              <a key={i} href={fileUrl(d.url)} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface rounded text-[10px] text-primary-600 dark:text-primary-400 hover:underline">
                                {d.description || d.fileName} ↓
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    <Link to={`/employees/${selectedEmployee._id}/guarantor`} className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline">
                      {t('guarantorManagement')} →
                    </Link>
                  </div>
                )}

                {/* Termination record — when & why this employee was terminated */}
                {selectedEmployee.status === 'TERMINATED' && (
                  <div className="bg-danger-subtle border border-danger-line rounded-xl p-5 space-y-2">
                    <h3 className="text-sm font-semibold text-danger-text">{t('terminationRecord')}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[11px] text-danger-text opacity-70 uppercase tracking-wider">{t('terminationDateCol')}</p>
                        <p className="text-sm font-medium text-ink mt-0.5">
                          {selectedEmployee.terminationDate ? formatDate(lang, selectedEmployee.terminationDate) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-danger-text opacity-70 uppercase tracking-wider">{t('reason')}</p>
                        <p className="text-sm font-medium text-ink mt-0.5">{selectedEmployee.terminationReason || '—'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Guarantor Quick Link */}
                <Link to={`/employees/${selectedEmployee._id}/guarantor`}
                  className="flex items-center gap-3 p-4 bg-primary-500/10 rounded-xl border border-primary-500/20 hover:bg-primary-500/15 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-600 dark:text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary-700 dark:text-primary-300">{t('guarantorManagement')}</p>
                    <p className="text-xs text-primary-600 dark:text-primary-400">{t('guarantorManagementSub')}</p>
                  </div>
                  <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create / Edit Employee Modal */}
      <EmployeeFormModal
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        employee={formEmployee}
        onSaved={handleFormSaved}
      />

      {/* Change Status Modal */}
      {showStatusModal && statusTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { if (!changingStatus) { setShowStatusModal(false); setStatusTarget(null); } }} />
          <div className="relative w-full max-w-md bg-surface rounded-2xl shadow-2xl p-6">
            <h3 className="text-base font-bold text-ink">{t('changeStatus')}</h3>
            <p className="text-sm text-muted mt-1">
              {statusTarget.firstName} {statusTarget.lastName} ({statusTarget.employeeCode}) — {t('currently')}{' '}
              <span className="font-semibold text-ink">{t(STATUS_KEYS[statusTarget.status] ?? 'status')}</span>
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">{t('newStatus')} *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-line bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-warning/30 focus:border-warning"
                >
                  <option value="">{t('selectStatus')}</option>
                  {statusOptions.filter((s) => s !== statusTarget.status).map((s) => (
                    <option key={s} value={s}>{t(STATUS_KEYS[s] ?? 'status')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">{t('reason')} *</label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  rows={3}
                  placeholder={t('reasonPlaceholder')}
                  className="w-full px-3 py-2.5 rounded-xl border border-line bg-surface text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-warning/30 focus:border-warning resize-none"
                />
              </div>
              {statusError && (
                <div className="text-xs text-danger-text bg-danger-subtle border border-danger-line rounded-xl px-4 py-2.5">{statusError}</div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { if (!changingStatus) { setShowStatusModal(false); setStatusTarget(null); } }}
                  className="flex-1 h-10 rounded-xl border border-line text-sm font-medium text-muted hover:bg-subtle transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleStatusChange}
                  disabled={changingStatus}
                  className="flex-1 h-10 rounded-xl bg-warning text-white text-sm font-medium hover:brightness-95 transition-[filter] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {changingStatus && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {changingStatus ? t('saving') : t('changeStatus')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <GuardImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={fetchEmployees}
      />
    </div>
  );
}/* ============================================================
   GUARANTOR TAB
   ============================================================ */
function GuarantorTab() {
  const t = useT();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [guarantorCounts, setGuarantorCounts] = useState<Record<string, number>>({});

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: 200 };
      if (search) params.search = search;
      const res = await api.get('/employees', { params });
      const emps = res.data.data || [];
      setEmployees(emps);

      const counts: Record<string, number> = {};
      await Promise.all(emps.map(async (emp: Employee) => {
        try {
          const gRes = await api.get(`/guarantors/employee/${emp._id}`);
          counts[emp._id] = (gRes.data.data || []).length;
        } catch { counts[emp._id] = 0; }
      }));
      setGuarantorCounts(counts);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const filtered = employees.filter(emp => {
    if (statusFilter === 'has_guarantor') return (guarantorCounts[emp._id] || 0) > 0;
    if (statusFilter === 'no_guarantor') return (guarantorCounts[emp._id] || 0) === 0;
    return true;
  });

  const withGuarantor = Object.values(guarantorCounts).filter(c => c > 0).length;
  const withoutGuarantor = employees.length - withGuarantor;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className={statCardCls}>
          <p className="text-xs text-subtext uppercase tracking-wide mb-1">{t('totalEmployees')}</p>
          <p className="text-2xl font-bold text-ink">{employees.length}</p>
        </div>
        <div className={statCardCls}>
          <p className="text-xs text-subtext uppercase tracking-wide mb-1">{t('withGuarantor')}</p>
          <p className="text-2xl font-bold text-success-text">{withGuarantor}</p>
        </div>
        <div className={statCardCls}>
          <p className="text-xs text-subtext uppercase tracking-wide mb-1">{t('withoutGuarantor')}</p>
          <p className="text-2xl font-bold text-warning-text">{withoutGuarantor}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder={t('searchEmployeeName')} value={search} onChange={e => setSearch(e.target.value)}
            className={inputCls} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls}>
          <option value="">{t('allEmployees')}</option>
          <option value="has_guarantor">{t('withGuarantor')}</option>
          <option value="no_guarantor">{t('withoutGuarantor')}</option>
        </select>
      </div>

      <div className={cardCls}>
        <div className="px-6 py-4 border-b border-line">
          <h3 className="text-base font-semibold text-ink">{t('guarantorStatus')}</h3>
          <p className="text-xs text-muted mt-0.5">{t('guarantorHint')}</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">{spinner}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-subtext text-sm">{t('noEmployees')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className={thCls}>{t('employee')}</th>
                  <th className={thCls}>{t('category')}</th>
                  <th className={thCls}>{t('status')}</th>
                  <th className={thC}>{t('guarantorsCol')}</th>
                  <th className={thR}>{t('action')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => {
                  const count = guarantorCounts[emp._id] || 0;
                  return (
                    <tr key={emp._id} className="border-b border-line hover:bg-surface-hover transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {emp.firstName?.[0]}{emp.lastName?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-ink">{emp.firstName} {emp.lastName}</p>
                            <p className="text-xs text-subtext">{emp.employeeCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryChip[emp.category] || 'bg-subtle text-muted'}`}>
                          {t(categoryLabels[emp.category] ?? 'employee')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusChip[emp.status] || 'bg-subtle text-muted border-line'}`}>
                          {t(STATUS_KEYS[emp.status] ?? 'status')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {count > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-subtle text-success-text border border-success-line">
                            {t('onFileCount', { count })}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-subtle text-warning-text border border-warning-line">
                            {t('none')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/employees/${emp._id}/guarantor`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-500/10 transition-colors">
                          {count > 0 ? t('view') : t('addGuarantor')}
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   ATTENDANCE TAB
   ============================================================ */
function AttendanceTab() {
  const t = useT();
  const lang = useLang();
  const [summaries, setSummaries] = useState<AttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [deptFilter, setDeptFilter] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/staff-attendance/summary?year=${year}&month=${month}`);
      setSummaries(res.data.data?.summaries || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = summaries.filter(s => {
    const name = `${s.employee.firstName} ${s.employee.lastName}`.toLowerCase();
    const q = search.toLowerCase();
    const matchSearch = !q || name.includes(q) || s.employee.employeeCode.toLowerCase().includes(q);
    const matchDept = deptFilter === 'all' || s.employee.department === deptFilter;
    return matchSearch && matchDept;
  });

  const presentToday = filtered.filter(s => s.counts.PRESENT > 0).length;
  const lateCount = filtered.filter(s => s.counts.HALF_DAY > 0).length;
  const absentCount = filtered.filter(s => s.counts.ABSENT > 0).length;
  const onLeaveCount = filtered.filter(s => (s.counts.PAID_LEAVE || 0) + (s.counts.UNPAID_LEAVE || 0) + (s.counts.SICK_LEAVE || 0) > 0).length;

  const departments = [...new Set(summaries.map(s => s.employee.department).filter(Boolean))].sort();

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const months = getMonthNames(lang);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className={statCardCls}>
          <p className="text-xs text-subtext uppercase tracking-wide mb-1">{t('presentToday')}</p>
          <p className="text-2xl font-bold text-ink">{presentToday}</p>
          <p className="text-xs text-muted mt-0.5">{t('ofOfficeStaff', { count: summaries.length })}</p>
        </div>
        <div className={statCardCls}>
          <p className="text-xs text-subtext uppercase tracking-wide mb-1">{t('late')}</p>
          <p className="text-2xl font-bold text-ink">{lateCount}</p>
          <p className="text-xs text-muted mt-0.5">{t('halfDayMarks')}</p>
        </div>
        <div className={statCardCls}>
          <p className="text-xs text-subtext uppercase tracking-wide mb-1">{t('absent')}</p>
          <p className="text-2xl font-bold text-ink">{absentCount}</p>
          <p className="text-xs text-muted mt-0.5">{t('unexplained')}</p>
        </div>
        <div className={statCardCls}>
          <p className="text-xs text-subtext uppercase tracking-wide mb-1">{t('statusOnLeave')}</p>
          <p className="text-2xl font-bold text-ink">{onLeaveCount}</p>
          <p className="text-xs text-muted mt-0.5">{t('approvedLeave')}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder={t('searchNameOrId')} value={search} onChange={e => setSearch(e.target.value)}
            className={inputCls} />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-lg text-muted hover:text-ink hover:bg-subtle">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-sm font-medium text-ink min-w-[120px] text-center">{months[month - 1]} {year}</span>
          <button onClick={nextMonth} className="p-2 rounded-lg text-muted hover:text-ink hover:bg-subtle">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className={selectCls}>
          <option value="all">{t('allDepartments')}</option>
          {departments.map(d => <option key={d} value={d!}>{d}</option>)}
        </select>
      </div>

      <div className="bg-surface rounded-xl border border-line overflow-hidden">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-ink">{t('staffAttendanceLog')}</h3>
            <InfoTooltip content={t('staffAttendanceLogHint')} />
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">{spinner}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-subtle border-b border-line">
                  <th className={thCls}>{t('employee')}</th>
                  <th className={thCls}>{t('department')}</th>
                  <th className={thC}>{t('colPresent')}</th>
                  <th className={thC}>{t('colAbsent')}</th>
                  <th className={thC}>{t('colHalfDay')}</th>
                  <th className={thC}>{t('colLeave')}</th>
                  <th className={thC}>{t('colPayableDays')}</th>
                  <th className={thC}>{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-subtext text-sm">{t('noAttendanceData')}</td></tr>
                ) : filtered.map(s => {
                  const hasAbsence = s.counts.ABSENT > 0;
                  const hasLeave = (s.counts.PAID_LEAVE || 0) + (s.counts.UNPAID_LEAVE || 0) + (s.counts.SICK_LEAVE || 0) > 0;
                  const isHalfDay = s.counts.HALF_DAY > 0;
                  let status = t('onTime');
                  let statusColor = 'bg-success-subtle text-success-text';
                  if (hasAbsence) { status = t('absent'); statusColor = 'bg-danger-subtle text-danger-text'; }
                  else if (hasLeave) { status = t('onLeaveStatus'); statusColor = 'bg-info-subtle text-info-text'; }
                  else if (isHalfDay) { status = t('late'); statusColor = 'bg-warning-subtle text-warning-text'; }

                  return (
                    <tr key={s.employee._id} className="hover:bg-surface-hover transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-sm font-semibold">
                            {s.employee.firstName[0]}{s.employee.lastName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-ink">{s.employee.firstName} {s.employee.lastName}</p>
                            <p className="text-xs text-subtext">{s.employee.employeeCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className={tdMuted}>{s.employee.department || '—'}</td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-ink">{s.counts.PRESENT || 0}</td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-danger-text">{s.counts.ABSENT || 0}</td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-warning-text">{s.counts.HALF_DAY || 0}</td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-info-text">
                        {(s.counts.PAID_LEAVE || 0) + (s.counts.UNPAID_LEAVE || 0) + (s.counts.SICK_LEAVE || 0)}
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-bold text-success-text">{s.payableDays}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>{status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   PERFORMANCE TAB
   ============================================================ */
function PerformanceTab() {
  const t = useT();
  const [records, setRecords] = useState<PerfRecord[]>([]);
  const [stats, setStats] = useState<PerfStats>({ avgScore: 0, topDepartment: '—', openFlags: 0, reviewsDue: 0 });
  const [topPerformers, setTopPerformers] = useState<PerfRecord[]>([]);
  const [reviewsDue, setReviewsDue] = useState<PerfRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [perfForm, setPerfForm] = useState({ employeeId: '', period: '2026-Q3', attendanceRate: 95, punctualityRate: 90, score: 85, notes: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, statsRes, topRes, dueRes] = await Promise.all([
        api.get('/performance'),
        api.get('/performance/stats'),
        api.get('/performance/top-performers'),
        api.get('/performance/reviews-due'),
      ]);
      setRecords(recRes.data.data || []);
      setStats(statsRes.data.data || { avgScore: 0, topDepartment: '—', openFlags: 0, reviewsDue: 0 });
      setTopPerformers(topRes.data.data || []);
      setReviewsDue(dueRes.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadEmployees = async () => {
    try {
      const res = await api.get('/employees', { params: { limit: 200 } });
      setEmployees(res.data.data || []);
    } catch (e) { console.error(e); }
  };

  const handleAddPerformance = async () => {
    try {
      await api.post('/performance', perfForm);
      setShowAddModal(false);
      fetchData();
    } catch (e: any) { alert(e.response?.data?.message || t('genericFailed')); }
  };

  const filtered = records.filter(r => {
    if (!search) return true;
    const emp = typeof r.employeeId === 'object' ? r.employeeId : null;
    const q = search.toLowerCase();
    return emp ? `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) : false;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className={statCardCls}>
          <p className="text-xs text-subtext uppercase tracking-wide mb-1">{t('avgPerformanceScore')}</p>
          <p className="text-2xl font-bold text-ink">{stats.avgScore}</p>
          <p className="text-xs text-muted mt-0.5">{t('acrossAllStaff')}</p>
        </div>
        <div className={statCardCls}>
          <p className="text-xs text-subtext uppercase tracking-wide mb-1">{t('topRatedDepartment')}</p>
          <p className="text-2xl font-bold text-ink">{stats.topDepartment}</p>
          <p className="text-xs text-muted mt-0.5">{t('highestAvgScore')}</p>
        </div>
        <div className={statCardCls}>
          <p className="text-xs text-subtext uppercase tracking-wide mb-1">{t('openFlags')}</p>
          <p className="text-2xl font-bold text-ink">{stats.openFlags}</p>
          <p className="text-xs text-muted mt-0.5">{t('underHrReview')}</p>
        </div>
        <div className={statCardCls}>
          <p className="text-xs text-subtext uppercase tracking-wide mb-1">{t('reviewsDue')}</p>
          <p className="text-2xl font-bold text-ink">{stats.reviewsDue}</p>
          <p className="text-xs text-muted mt-0.5">{t('next30Days')}</p>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder={t('searchEmployeeShort')} value={search} onChange={e => setSearch(e.target.value)}
                className={inputCls} />
            </div>
            <button onClick={() => { setShowAddModal(true); loadEmployees(); }}
              className="h-10 px-4 flex items-center gap-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              {t('addReview')}
            </button>
          </div>

          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <div className="px-6 py-4 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-ink">{t('staffPerformance')}</h3>
                <InfoTooltip content={t('staffPerformanceHint')} />
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center py-12">{spinner}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-subtle border-b border-line">
                      <th className={thCls}>{t('employee')}</th>
                      <th className={thCls}>{t('department')}</th>
                      <th className={thC}>{t('colAttendance')}</th>
                      <th className={thC}>{t('colPunctuality')}</th>
                      <th className={thC}>{t('colScore')}</th>
                      <th className={thC}>{t('colTrend')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-subtext text-sm">{t('noPerformanceData')}</td></tr>
                    ) : filtered.map(r => {
                      const emp = typeof r.employeeId === 'object' ? r.employeeId : null;
                      if (!emp) return null;
                      return (
                        <tr key={r._id} className="hover:bg-surface-hover transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-sm font-semibold">
                                {emp.firstName[0]}{emp.lastName[0]}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-ink">{emp.firstName} {emp.lastName}</p>
                                <p className="text-xs text-subtext">{emp.employeeCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className={tdMuted}>{emp.department || '—'}</td>
                          <td className="px-6 py-4 text-center text-sm font-medium text-ink">{r.attendanceRate}%</td>
                          <td className="px-6 py-4 text-center text-sm font-medium text-ink">{r.punctualityRate}%</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`text-sm font-bold ${r.score >= 80 ? 'text-success-text' : r.score >= 60 ? 'text-warning-text' : 'text-danger-text'}`}>{r.score}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {r.trend > 0 && <span className="text-xs font-medium text-success-text">▲ {r.trend}</span>}
                            {r.trend < 0 && <span className="text-xs font-medium text-danger-text">▼ {Math.abs(r.trend)}</span>}
                            {r.trend === 0 && <span className="text-xs text-subtext">— 0</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="w-72 flex-shrink-0 space-y-4 hidden lg:block">
          <div className={statCardCls}>
            <h4 className="text-sm font-semibold text-ink mb-4">{t('topPerformers')}</h4>
            {topPerformers.length === 0 ? (
              <p className="text-xs text-subtext">{t('noDataYet')}</p>
            ) : (
              <div className="space-y-3">
                {topPerformers.map((r, i) => {
                  const emp = typeof r.employeeId === 'object' ? r.employeeId : null;
                  if (!emp) return null;
                  return (
                    <div key={r._id} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-subtext w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{emp.firstName} {emp.lastName}</p>
                      </div>
                      <span className="text-sm font-bold text-success-text">{r.score}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className={statCardCls}>
            <h4 className="text-sm font-semibold text-ink mb-4">{t('reviewsDueSoon')}</h4>
            {reviewsDue.length === 0 ? (
              <p className="text-xs text-subtext">{t('noReviewsDue')}</p>
            ) : (
              <div className="space-y-3">
                {reviewsDue.map(r => {
                  const emp = typeof r.employeeId === 'object' ? r.employeeId : null;
                  if (!emp) return null;
                  const dueDate = r.reviewDueDate ? new Date(r.reviewDueDate) : null;
                  const isOverdue = dueDate && dueDate < new Date();
                  const daysLeft = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
                  return (
                    <div key={r._id} className="flex items-center justify-between">
                      <p className="text-sm text-muted">{emp.firstName} {emp.lastName}</p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        isOverdue ? 'bg-danger-subtle text-danger-text' : daysLeft <= 7 ? 'bg-warning-subtle text-warning-text' : 'bg-info-subtle text-info-text'
                      }`}>
                        {isOverdue ? t('overdue') : t('dueInDays', { count: daysLeft })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-ink">{t('addPerformanceReview')}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">{t('employee')} *</label>
                <select value={perfForm.employeeId} onChange={e => setPerfForm({ ...perfForm, employeeId: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-line bg-surface text-sm text-ink">
                  <option value="">{t('selectEmployee')}</option>
                  {employees.map((e: any) => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">{t('period')}</label>
                <input value={perfForm.period} onChange={e => setPerfForm({ ...perfForm, period: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-line bg-surface text-sm text-ink" placeholder="2026-Q3" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">{t('attendancePct')}</label>
                  <input type="number" value={perfForm.attendanceRate} onChange={e => setPerfForm({ ...perfForm, attendanceRate: Number(e.target.value) })}
                    className="w-full h-9 px-3 rounded-lg border border-line bg-surface text-sm text-ink" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">{t('punctualityPct')}</label>
                  <input type="number" value={perfForm.punctualityRate} onChange={e => setPerfForm({ ...perfForm, punctualityRate: Number(e.target.value) })}
                    className="w-full h-9 px-3 rounded-lg border border-line bg-surface text-sm text-ink" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">{t('score')}</label>
                  <input type="number" value={perfForm.score} onChange={e => setPerfForm({ ...perfForm, score: Number(e.target.value) })}
                    className="w-full h-9 px-3 rounded-lg border border-line bg-surface text-sm text-ink" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">{t('notes')}</label>
                <textarea value={perfForm.notes} onChange={e => setPerfForm({ ...perfForm, notes: e.target.value })} rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-line bg-surface text-sm text-ink resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-muted border border-line rounded-lg hover:bg-subtle">{t('cancel')}</button>
              <button onClick={handleAddPerformance} disabled={!perfForm.employeeId}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                {t('addReview')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
