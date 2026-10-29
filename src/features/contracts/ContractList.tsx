import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useT, useLang, formatDate } from '../../i18n';
import type { DictKey } from '../../i18n';
import { EmployeeCategory } from '../../types';

interface Employee {
  _id: string;
  employeeCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  category: string;
  status: string;
  department?: string;
}

interface Contract {
  _id: string;
  employeeId: { _id: string; firstName: string; middleName?: string; lastName: string; employeeCode: string } | string;
  contractStartDate: string;
  contractEndDate?: string;
  contractType: string;
  wage: number;
  status: string;
}

const CONTRACT_STATUS_KEYS: Record<string, DictKey> = {
  ACTIVE: 'active',
  EXPIRED: 'statusExpired',
  TERMINATED: 'statusTerminated',
};

const statusChip: Record<string, string> = {
  ACTIVE: 'bg-success-subtle text-success-text border-success-line',
  EXPIRED: 'bg-subtle text-muted border-line',
  TERMINATED: 'bg-danger-subtle text-danger-text border-danger-line',
};

const CONTRACT_TYPES = ['Full-Time', 'Part-Time', 'Contract', 'Temporary', 'Internship'];
const EMPLOYEE_STATUSES = ['ACTIVE', 'CONTRACTED', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'];

const filterSelect =
  'h-10 px-3 pr-8 rounded-lg border border-line bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 appearance-none cursor-pointer';

export default function ContractList() {
  const navigate = useNavigate();
  const t = useT();
  const lang = useLang();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [contractMap, setContractMap] = useState<Record<string, Contract>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters: department / employee status / contract type / role type (category)
  const [departments, setDepartments] = useState<string[]>([]);
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (search) params.search = search;

      const [empRes, contractRes] = await Promise.all([
        api.get('/employees', { params }),
        api.get('/contracts', { params: { limit: 200 } }).catch(() => ({ data: { data: [] } })),
      ]);

      const emps = empRes.data.data || [];
      const ctrs = contractRes.data.data || [];

      setEmployees(emps);
      setTotalPages(empRes.data.pagination?.totalPages || 1);

      const map: Record<string, Contract> = {};
      ctrs.forEach((c: Contract) => {
        const empId = typeof c.employeeId === 'object' ? c.employeeId._id : c.employeeId;
        if (!map[empId]) map[empId] = c;
      });
      setContractMap(map);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    try {
      api.get('/departments').then((r) => setDepartments((r.data.data || []).map((d: any) => d.name))).catch(() => {});
    } catch { /* optional lookup */ }
  }, []);

  /** Client-side filtering across department / employee status / contract type / role type. */
  const filteredEmployees = useMemo(() => employees.filter((emp) => {
    if (deptFilter && (emp.department || '') !== deptFilter) return false;
    if (statusFilter && emp.status !== statusFilter) return false;
    if (roleFilter && emp.category !== roleFilter) return false;
    if (typeFilter) {
      const contract = contractMap[emp._id];
      if (typeFilter === '__none__' ? !!contract : (!contract || contract.contractType !== typeFilter)) return false;
    }
    return true;
  }), [employees, contractMap, deptFilter, statusFilter, typeFilter, roleFilter]);

  const activeCount = Object.values(contractMap).filter((c) => c.status === 'ACTIVE').length;
  const expiredCount = Object.values(contractMap).filter((c) => c.status === 'EXPIRED').length;
  const noContractCount = employees.filter((e) => !contractMap[e._id]).length;

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: t('totalEmployees'), value: employees.length, dot: 'bg-primary-500' },
          { label: t('activeContracts'), value: activeCount, dot: 'bg-success' },
          { label: t('expiredContracts'), value: expiredCount, dot: 'bg-warning' },
          { label: t('noContract'), value: noContractCount, dot: 'bg-danger' },
        ].map((s) => (
          <div key={s.label} className="bg-surface rounded-xl border border-line px-4 py-3">
            <p className="text-[10px] font-semibold text-subtext uppercase tracking-wider mb-1.5">{s.label}</p>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className="text-xl font-bold text-ink">{s.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder={t('searchEmployeeShort')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-line bg-surface text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
          />
        </div>

        {/* Filters: department · employee status · contract type · role type */}
        <div className="flex flex-wrap items-center gap-2">
          <select value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }} className={filterSelect}>
            <option value="">{t('allDepartments')}</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={filterSelect}>
            <option value="">{t('activeStatusFilter')}</option>
            {EMPLOYEE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className={filterSelect}>
            <option value="">{t('contractType')}</option>
            <option value="__none__">{t('noContract')}</option>
            {CONTRACT_TYPES.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
          </select>
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className={filterSelect}>
            <option value="">{t('allRoles')}</option>
            <option value={EmployeeCategory.GUARD}>{t('guard')}</option>
            <option value={EmployeeCategory.OFFICE_STAFF}>{t('officeStaff')}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-line overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted">{t('noEmployees')}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{t('employee')}</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{t('department')}</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{t('contractType')}</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{t('status')}</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{t('wage')}</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{t('startDate')}</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{t('action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => {
                    const contract = contractMap[emp._id];
                    return (
                      <tr key={emp._id} className="border-b border-line hover:bg-surface-hover transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                              {emp.firstName?.[0]}{emp.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-medium text-ink text-sm">{[emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(' ')}</p>
                              <p className="text-[10px] text-subtext font-mono">{emp.employeeCode}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-muted">{emp.department || '—'}</td>
                        <td className="px-5 py-3.5">
                          {contract ? (
                            <span className="text-sm text-ink">{contract.contractType}</span>
                          ) : (
                            <span className="text-xs text-subtext">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {contract ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusChip[contract.status] || 'bg-subtle text-muted border-line'}`}>
                              {t(CONTRACT_STATUS_KEYS[contract.status] ?? 'status')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-subtle text-warning-text border border-warning-line">
                              {t('noContract')}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-ink">
                          {contract ? `ETB ${contract.wage.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-muted">
                          {contract?.contractStartDate ? formatDate(lang, contract.contractStartDate) : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => navigate(`/contracts/${emp._id}`)}
                            className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 hover:underline"
                          >
                            {contract ? t('update') : t('create')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-between items-center px-5 py-3 border-t border-line">
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
            )}
          </>
        )}
      </div>
    </div>
  );
}
