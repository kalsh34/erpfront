import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import api from '../../lib/api';
import { LoadingSpinner } from '../../components/ui';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { InfoTooltip } from '../../components/ui/Tooltip';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';
import { useLang, formatDate } from '../../i18n';
import { useRepT } from './reportStrings';
import { downloadCsv } from '../payroll-shared/export';

/**
 * MODULE REPORTS — one filterable report per module. The endpoint is gated by
 * REPORT_READ, which every in-charge role holds (SUPER_ADMIN, SYSTEM_ADMIN,
 * HR_ADMIN, FINANCE_OFFICER, OPERATIONS, HEAD, CEO) and GUARD does not.
 */

type Tab = 'HR' | 'SITES' | 'GUARDS' | 'GUARD_ATT' | 'STAFF_ATT' | 'PAYROLL' | 'AUDIT' | 'USERS';

interface ReportResult {
  report: string;
  summary: Record<string, any>;
  rows: Record<string, any>[];
}

const fmtMoney = (n: unknown) =>
  (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = (n: unknown) => (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
const fmtDate = (iso: unknown, lang: 'en' | 'am') => (iso ? formatDate(lang, String(iso)) : '—');

const TABS: { key: Tab; labelKey: string }[] = [
  { key: 'HR', labelKey: 'repTabHr' },
  { key: 'SITES', labelKey: 'repTabSites' },
  { key: 'GUARDS', labelKey: 'repTabGuards' },
  { key: 'GUARD_ATT', labelKey: 'repTabGuardAtt' },
  { key: 'STAFF_ATT', labelKey: 'repTabStaffAtt' },
  { key: 'PAYROLL', labelKey: 'repTabPayroll' },
  { key: 'AUDIT', labelKey: 'repTabAudit' },
  { key: 'USERS', labelKey: 'repTabUsers' },
];

const inputCls =
  'h-10 px-3.5 rounded-lg border border-line bg-surface text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400';
const thCls = 'text-left px-6 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider whitespace-nowrap bg-subtle/50 border-b border-line';
const tdCls = 'px-6 py-4 text-sm text-ink whitespace-nowrap border-b border-line';

export default function ModuleReportsPage() {
  const { user } = useAuthStore();
  const lang = useLang();
  const t = useRepT(lang);
  const canSee = user?.role !== UserRole.GUARD; // backend enforces REPORT_READ; guard role has none

  const [tab, setTab] = useState<Tab>('HR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ReportResult | null>(null);

  // filters per tab (kept separate so switching tabs preserves each module's filters)
  const [hr, setHr] = useState({ category: '', status: '', department: '', search: '', joinedFrom: '', joinedTo: '' });
  const [sites, setSites] = useState({ status: '', siteType: '', search: '' });
  const [guards, setGuards] = useState({ status: '', siteId: '', month: '' });
  const [guardAtt, setGuardAtt] = useState({ month: '', siteId: '', status: '' });
  const [staffAtt, setStaffAtt] = useState({ month: '', status: '', department: '' });
  const [payroll, setPayroll] = useState({ module: 'GUARD', periodKey: '', runStatus: '', search: '' });
  const [audit, setAudit] = useState({ action: '', entity: '', from: '', to: '' });
  const [users, setUsers] = useState({ role: '', isActive: '', search: '' });

  const endpoint = useMemo(() => {
    const p = new URLSearchParams();
    const add = (m: Record<string, string>) => {
      for (const [k, v] of Object.entries(m)) if (v) p.set(k, v);
    };
    switch (tab) {
      case 'HR': add(hr); return `/module-reports/hr?${p}`;
      case 'SITES': add(sites); return `/module-reports/sites?${p}`;
      case 'GUARDS': add(guards); return `/module-reports/guards?${p}`;
      case 'GUARD_ATT': add(guardAtt); return `/module-reports/guard-attendance?${p}`;
      case 'STAFF_ATT': add(staffAtt); return `/module-reports/staff-attendance?${p}`;
      case 'PAYROLL': add(payroll); return `/module-reports/payroll?${p}`;
      case 'AUDIT': add(audit); return `/module-reports/audit?${p}`;
      case 'USERS': add(users); return `/module-reports/users?${p}`;
    }
  }, [tab, hr, sites, guards, guardAtt, staffAtt, payroll, audit, users]);

  const fetchReport = useCallback(async () => {
    if (!endpoint) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(endpoint);
      setResult(res.data?.data ?? null);
    } catch (e: any) {
      if (e?.response?.status === 404) {
        try {
          if (tab === 'HR') {
            const res = await api.get('/employees');
            const emps = res.data?.data || res.data || [];
            const rows = (Array.isArray(emps) ? emps : []).map((emp: any) => ({
              employeeCode: emp.employeeCode || emp.code || '—',
              fullName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '—',
              category: emp.category || '—',
              status: emp.status || 'ACTIVE',
              joinDate: emp.hireDate ? String(emp.hireDate).slice(0, 10) : '—',
              basicSalary: emp.compensation?.basicSalary || emp.salary || 0,
              department: emp.department?.name || emp.department || '—',
              phone: emp.phone || '—',
              bankName: emp.bankInfo?.bankName || '—',
              accountNumber: emp.bankInfo?.accountNumber || '—',
            }));
            setResult({
              report: 'HR',
              summary: { totalEmployees: rows.length, active: rows.filter((r: any) => r.status === 'ACTIVE' || r.status === 'CONTRACTED').length },
              rows,
            });
            setError('');
            return;
          } else if (tab === 'SITES') {
            const res = await api.get('/sites');
            const sitesList = res.data?.data || res.data || [];
            const rows = (Array.isArray(sitesList) ? sitesList : []).map((s: any) => ({
              siteCode: s.siteCode || '—',
              siteName: s.siteName || '—',
              client: s.client || '—',
              location: s.location || '—',
              siteType: s.siteType || 'COMMERCIAL',
              status: s.status || 'ACTIVE',
              agreedManpower: s.agreedManpower || 0,
              actualManpower: s.actualManpower || 0,
              currentCompensation: s.currentCompensation?.amount || 0,
            }));
            setResult({
              report: 'SITES',
              summary: { totalSites: rows.length },
              rows,
            });
            setError('');
            return;
          } else if (tab === 'GUARDS') {
            const res = await api.get('/guards');
            const guardsList = res.data?.data || res.data || [];
            const rows = (Array.isArray(guardsList) ? guardsList : []).map((g: any) => ({
              employeeCode: g.employeeCode || g.employeeId?.employeeCode || '—',
              fullName: `${g.firstName || g.employeeId?.firstName || ''} ${g.lastName || g.employeeId?.lastName || ''}`.trim() || '—',
              status: g.status || g.employeeId?.status || 'CONTRACTED',
              siteName: g.homeSite?.siteName || g.primarySite?.siteName || '—',
              phone: g.phone || g.employeeId?.phone || '—',
            }));
            setResult({
              report: 'GUARDS',
              summary: { totalGuards: rows.length },
              rows,
            });
            setError('');
            return;
          } else if (tab === 'PAYROLL') {
            const res = await api.get('/reports/payroll-summary');
            const pData = res.data?.data || res.data || {};
            setResult({
              report: 'PAYROLL',
              summary: pData.summary || { totalPaid: pData.totalPaid || 0 },
              rows: pData.history || pData.records || [],
            });
            setError('');
            return;
          } else if (tab === 'USERS') {
            const res = await api.get('/users');
            const usersList = res.data?.data || res.data || [];
            const rows = (Array.isArray(usersList) ? usersList : []).map((u: any) => ({
              email: u.email,
              fullName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || '—',
              role: u.role,
              isActive: u.isActive !== false ? 'Active' : 'Inactive',
            }));
            setResult({
              report: 'USERS',
              summary: { totalUsers: rows.length },
              rows,
            });
            setError('');
            return;
          }
        } catch {
          // ignore and fallback to error below
        }
      }
      setError(e?.response?.data?.message || 'Failed to load report');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    if (canSee) fetchReport();
  }, [fetchReport, canSee]);

  const run = () => fetchReport();

  const exportCsv = () => {
    if (!result?.rows?.length) return;
    const cols = csvColumns(tab, result.rows[0]);
    const header = cols.map((c) => t(c.labelKey));
    const rows = result.rows.map((r) => cols.map((c) => (typeof r[c.key] === 'object' && r[c.key] !== null ? JSON.stringify(r[c.key]) : (r[c.key] ?? ''))));
    downloadCsv(`${result.report.toLowerCase()}-report.csv`, [header, ...rows]);
  };

  const printReport = () => {
    if (!result) return;
    const win = window.open('', '_blank', 'width=980,height=760');
    if (!win) return;
    const cols = csvColumns(tab, result.rows[0] || {});
    const summaryHtml = Object.entries(result.summary)
      .filter(([, v]) => v !== null && typeof v !== 'object')
      .map(([k, v]) => `<div class="chip"><b>${k}</b>: ${String(v)}</div>`)
      .join('');
    const moneyKey = /(pay|amount|salary|compensation|pension|tax|deduction|net|gross)/i;
    const tableHtml = `
      <table>
        <thead><tr>${cols.map((c) => `<th>${t(c.labelKey as never)}</th>`).join('')}</tr></thead>
        <tbody>
          ${result.rows
            .map(
              (r) =>
                `<tr>${cols
                  .map((c) => {
                    const v = r[c.key];
                    const s = typeof v === 'number' && moneyKey.test(c.key) ? fmtMoney(v) : v == null ? '' : String(v);
                    return `<td>${s}</td>`;
                  })
                  .join('')}</tr>`,
            )
            .join('')}
        </tbody>
      </table>`;
    win.document.write(`<!doctype html><html><head><title>${result.report} report</title><style>
      body{font-family:'Segoe UI',Arial,sans-serif;margin:24px;color:#111}
      h1{font-size:16px;margin:0 0 4px}.sub{color:#666;font-size:11px;margin-bottom:12px}
      .chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
      .chip{border:1px solid #ddd;border-radius:10px;padding:2px 10px;font-size:11px}
      table{border-collapse:collapse;width:100%}
      th{background:#f3f4f6;text-align:left;font-size:10px;text-transform:uppercase;padding:6px 8px;border:1px solid #e5e7eb}
      td{font-size:11px;padding:5px 8px;border:1px solid #e5e7eb;white-space:nowrap}
      @media print{body{margin:8mm}}
    </style></head><body>
      <h1>${result.report} — ${t('repTitle')}</h1>
      <div class="sub">${new Date().toLocaleString()}</div>
      <div class="chips">${summaryHtml}</div>
      ${tableHtml}
      <script>window.onload = () => window.print()</script>
    </body></html>`);
    win.document.close();
  };

  if (!canSee) {
    return (
      <div className="p-6">
        <div className="bg-surface rounded-xl border border-line p-8 text-center text-muted shadow-xs">
          {t('repNoAccess')}
        </div>
      </div>
    );
  }

  const summaryEntries = result
    ? Object.entries(result.summary).filter(([, v]) => v !== null && typeof v !== 'object')
    : [];

  return (
    <div className="p-6 space-y-6">
      {/* Category Tabs (styled exactly like HR & Payroll subtabs) */}
      <div className="flex flex-wrap gap-1 border-b border-line">
        {TABS.map((x) => (
          <button
            key={x.key}
            onClick={() => setTab(x.key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === x.key
                ? 'border-primary-600 text-primary-600 dark:text-primary-400 bg-primary-500/5'
                : 'border-transparent text-muted hover:text-ink hover:border-line'
            }`}
          >
            {t(x.labelKey)}
          </button>
        ))}
      </div>

      {/* Overview Card (matching HR's overview banner card) */}
      <div className="bg-surface rounded-xl border border-line p-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-ink">
              {t(TABS.find((x) => x.key === tab)?.labelKey || 'repTitle')}
            </h2>
            <InfoTooltip content={t('repSubtitle')} />
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-subtle text-xs font-medium text-ink">
              Total: {result?.rows?.length ?? 0}
            </span>
            {summaryEntries.map(([k, v]) => {
              const isPositive = /active|paid|present/i.test(k);
              return (
                <span
                  key={k}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                    isPositive
                      ? 'bg-success-subtle text-success-text'
                      : 'bg-subtle border border-line text-muted'
                  }`}
                >
                  <span className="capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</span>: {String(v)}
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={exportCsv}
            disabled={!result?.rows?.length}
            className="h-10 px-4 flex items-center gap-2 rounded-lg border border-line bg-surface hover:bg-subtle text-ink text-sm font-medium transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 text-muted" />
            {t('exportCsv')}
          </button>
          <button
            onClick={printReport}
            disabled={!result?.rows?.length}
            className="h-10 px-4 flex items-center gap-2 rounded-lg border border-line bg-surface hover:bg-subtle text-ink text-sm font-medium transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4 text-muted" />
            {t('print')}
          </button>
        </div>
      </div>

      {/* Filter Bar Card */}
      <div className="bg-surface rounded-xl border border-line p-5 shadow-xs">
        <div className="flex flex-wrap items-end gap-3">
          {tab === 'HR' && (
            <>
              <Select label={t('category')} value={hr.category} onChange={(v) => setHr({ ...hr, category: v })} options={[['GUARD', 'GUARD'], ['OFFICE_STAFF', 'OFFICE_STAFF']]} />
              <Select label={t('status')} value={hr.status} onChange={(v) => setHr({ ...hr, status: v })} options={[['ACTIVE', 'ACTIVE'], ['INACTIVE', 'INACTIVE'], ['TERMINATED', 'TERMINATED'], ['ON_LEAVE', 'ON_LEAVE'], ['CONTRACTED', 'CONTRACTED']]} />
              <Field label={t('department')} value={hr.department} onChange={(v) => setHr({ ...hr, department: v })} />
              <Field label={t('search')} value={hr.search} onChange={(v) => setHr({ ...hr, search: v })} />
              <Field label={t('repJoinedFrom')} value={hr.joinedFrom} onChange={(v) => setHr({ ...hr, joinedFrom: v })} type="date" />
              <Field label={t('repJoinedTo')} value={hr.joinedTo} onChange={(v) => setHr({ ...hr, joinedTo: v })} type="date" />
            </>
          )}
          {tab === 'SITES' && (
            <>
              <Select label={t('status')} value={sites.status} onChange={(v) => setSites({ ...sites, status: v })} options={[['ACTIVE', 'ACTIVE'], ['INACTIVE', 'INACTIVE'], ['SUSPENDED', 'SUSPENDED']]} />
              <Select label={t('repSiteType')} value={sites.siteType} onChange={(v) => setSites({ ...sites, siteType: v })} options={[['COMMERCIAL', 'COMMERCIAL'], ['RESIDENTIAL', 'RESIDENTIAL'], ['INDUSTRIAL', 'INDUSTRIAL'], ['GOVERNMENT', 'GOVERNMENT']]} />
              <Field label={t('search')} value={sites.search} onChange={(v) => setSites({ ...sites, search: v })} />
            </>
          )}
          {tab === 'GUARDS' && (
            <>
              <Select label={t('status')} value={guards.status} onChange={(v) => setGuards({ ...guards, status: v })} options={[['ACTIVE', 'ACTIVE'], ['CONTRACTED', 'CONTRACTED'], ['INACTIVE', 'INACTIVE'], ['TERMINATED', 'TERMINATED']]} />
              <Field label={t('repSiteId')} value={guards.siteId} onChange={(v) => setGuards({ ...guards, siteId: v })} />
              <Field label={t('month')} value={guards.month} onChange={(v) => setGuards({ ...guards, month: v })} placeholder="2026-12" />
            </>
          )}
          {tab === 'GUARD_ATT' && (
            <>
              <Field label={t('month')} value={guardAtt.month} onChange={(v) => setGuardAtt({ ...guardAtt, month: v })} placeholder="2026-12" />
              <Field label={t('repSiteId')} value={guardAtt.siteId} onChange={(v) => setGuardAtt({ ...guardAtt, siteId: v })} />
              <Select label={t('status')} value={guardAtt.status} onChange={(v) => setGuardAtt({ ...guardAtt, status: v })} options={[['ACTIVE', 'ACTIVE'], ['VOID', 'VOID']]} />
            </>
          )}
          {tab === 'STAFF_ATT' && (
            <>
              <Field label={t('month')} value={staffAtt.month} onChange={(v) => setStaffAtt({ ...staffAtt, month: v })} placeholder="2026-12" />
              <Select label={t('status')} value={staffAtt.status} onChange={(v) => setStaffAtt({ ...staffAtt, status: v })} options={[['PRESENT', 'PRESENT'], ['ABSENT', 'ABSENT'], ['PAID_LEAVE', 'PAID_LEAVE'], ['UNPAID_LEAVE', 'UNPAID_LEAVE'], ['SICK_LEAVE', 'SICK_LEAVE'], ['HALF_DAY', 'HALF_DAY'], ['HOLIDAY', 'HOLIDAY']]} />
              <Field label={t('department')} value={staffAtt.department} onChange={(v) => setStaffAtt({ ...staffAtt, department: v })} />
            </>
          )}
          {tab === 'PAYROLL' && (
            <>
              <Select label={t('repModule')} value={payroll.module} onChange={(v) => setPayroll({ ...payroll, module: v })} options={[['GUARD', 'GUARD'], ['STAFF', 'STAFF']]} />
              <Field label={t('period')} value={payroll.periodKey} onChange={(v) => setPayroll({ ...payroll, periodKey: v })} placeholder="2026-12" />
              <Select label={t('status')} value={payroll.runStatus} onChange={(v) => setPayroll({ ...payroll, runStatus: v })} options={[['DRAFT', 'DRAFT'], ['CALCULATED', 'CALCULATED'], ['SUBMITTED', 'SUBMITTED'], ['CHECKED', 'CHECKED'], ['APPROVED', 'APPROVED'], ['PAYMENT_PROCESSING', 'PAYMENT_PROCESSING'], ['PAID', 'PAID'], ['RETURNED', 'RETURNED']]} />
              <Field label={t('search')} value={payroll.search} onChange={(v) => setPayroll({ ...payroll, search: v })} />
            </>
          )}
          {tab === 'AUDIT' && (
            <>
              <Field label={t('repAction')} value={audit.action} onChange={(v) => setAudit({ ...audit, action: v })} placeholder="EMPLOYEE_CREATE" />
              <Field label={t('repEntity')} value={audit.entity} onChange={(v) => setAudit({ ...audit, entity: v })} placeholder="Employee" />
              <Field label={t('repFrom')} value={audit.from} onChange={(v) => setAudit({ ...audit, from: v })} type="date" />
              <Field label={t('repTo')} value={audit.to} onChange={(v) => setAudit({ ...audit, to: v })} type="date" />
            </>
          )}
          {tab === 'USERS' && (
            <>
              <Select label={t('role')} value={users.role} onChange={(v) => setUsers({ ...users, role: v })} options={[['SUPER_ADMIN', 'SUPER_ADMIN'], ['SYSTEM_ADMIN', 'SYSTEM_ADMIN'], ['HR_ADMIN', 'HR_ADMIN'], ['FINANCE_OFFICER', 'FINANCE_OFFICER'], ['OPERATIONS', 'OPERATIONS'], ['HEAD', 'HEAD'], ['CEO', 'CEO'], ['GUARD', 'GUARD']]} />
              <Select label={t('status')} value={users.isActive} onChange={(v) => setUsers({ ...users, isActive: v })} options={[['true', t('active')], ['false', 'Inactive']]} />
              <Field label={t('search')} value={users.search} onChange={(v) => setUsers({ ...users, search: v })} />
            </>
          )}
          <button
            onClick={run}
            disabled={loading}
            className="h-10 px-6 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors shadow-xs disabled:opacity-50 shrink-0 self-end"
          >
            {t('repApply')}
          </button>
        </div>
      </div>

      {loading && <LoadingSpinner />}
      {error && <div className="p-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 text-sm shadow-xs">{error}</div>}
      {!loading && !error && result && <ReportTable tab={tab} result={result} lang={lang} />}
      {!loading && !error && result && result.rows.length === 0 && (
        <div className="bg-surface rounded-xl border border-line p-12 text-center text-muted text-sm shadow-xs">
          {t('noData')}
        </div>
      )}
    </div>
  );
}

// ── table body per module ───────────────────────────────────────────
function ReportTable({ tab, result, lang }: { tab: Tab; result: ReportResult; lang: 'en' | 'am' }) {
  const t = useRepT(lang);
  const rows = result.rows;
  if (!rows.length) return null;

  const th = (k: string, labelKey: string) => <th key={k} className={thCls}>{t(labelKey)}</th>;
  const money = (v: unknown) => fmtMoney(v as number);

  return (
    <div className="bg-surface rounded-xl border border-line shadow-xs overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-subtle/50">
          <tr>
            {tab === 'HR' && (<>{th('employeeCode', 'employeeId')}{th('fullName', 'fullName')}{th('category', 'category')}{th('status', 'status')}{th('joinDate', 'joinDate')}{th('basicSalary', 'repBasic')}{th('department', 'department')}{th('phone', 'phone')}{th('bankName', 'repBank')}{th('accountNumber', 'repAccount')}</>)}
            {tab === 'SITES' && (<>{th('siteCode', 'employeeId')}{th('siteName', 'repSiteName')}{th('client', 'repClient')}{th('location', 'repLocation')}{th('siteType', 'repSiteType')}{th('status', 'status')}{th('agreedManpower', 'repAgreed')}{th('actualManpower', 'repActual')}{th('currentCompensation', 'repComp')}{th('agreementStartDate', 'repAgreeFrom')}{th('agreementEndDate', 'repAgreeTo')}</>)}
            {tab === 'GUARDS' && (<>{th('employeeCode', 'employeeId')}{th('fullName', 'fullName')}{th('status', 'status')}{th('siteName', 'repPrimarySite')}{th('compensation', 'repComp')}{th('normalHours', 'repNormalH')}{th('holidayHours', 'repHolidayH')}{th('sundayHours', 'repSundayH')}{th('phone', 'phone')}</>)}
            {tab === 'GUARD_ATT' && (<>{th('date', 'repDate')}{th('guardCode', 'employeeId')}{th('guardName', 'fullName')}{th('siteName', 'repSiteName')}{th('hoursWorked', 'repHours')}{th('isHoliday', 'repHoliday')}{th('status', 'status')}{th('source', 'repSource')}</>)}
            {tab === 'STAFF_ATT' && (<>{th('date', 'repDate')}{th('employeeCode', 'employeeId')}{th('employeeName', 'fullName')}{th('department', 'department')}{th('status', 'status')}{th('leaveType', 'repLeave')}{th('notes', 'repNotes')}</>)}
            {tab === 'PAYROLL' && (<>{th('periodKey', 'period')}{th('employeeCode', 'employeeId')}{th('employeeName', 'fullName')}{th('siteName', 'repSiteName')}{th('runStatus', 'status')}{th('grossEarnings', 'repGross')}{th('taxableEarnings', 'repTaxable')}{th('employeePension', 'repEmpPension')}{th('incomeTax', 'repTax')}{th('totalDeductions', 'repDeductions')}{th('netPay', 'repNet')}</>)}
            {tab === 'AUDIT' && (<>{th('createdAt', 'repDate')}{th('userName', 'repUser')}{th('action', 'repAction')}{th('entity', 'repEntity')}{th('entityId', 'repEntityId')}{th('reason', 'repReason')}{th('ipAddress', 'repIp')}</>)}
            {tab === 'USERS' && (<>{th('email', 'repEmail')}{th('fullName', 'fullName')}{th('role', 'role')}{th('isActive', 'status')}{th('lastLogin', 'repLastLogin')}</>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-subtle/40 transition-colors">
              {tab === 'HR' && (<>
                <td className={tdCls}>{r.employeeCode}</td>
                <td className={tdCls}>{r.fullName}</td>
                <td className={tdCls}><StatusBadge status={r.category} /></td>
                <td className={tdCls}><StatusBadge status={r.status} /></td>
                <td className={tdCls}>{fmtDate(r.joinDate, lang)}</td>
                <td className={tdCls + ' text-right'}>{r.basicSalary != null ? money(r.basicSalary) : '—'}</td>
                <td className={tdCls}>{r.department || '—'}</td>
                <td className={tdCls}>{r.phone || '—'}</td>
                <td className={tdCls}>{r.bankName || '—'}</td>
                <td className={tdCls}>{r.accountNumber || '—'}</td>
              </>)}
              {tab === 'SITES' && (<>
                <td className={tdCls}>{r.siteCode}</td>
                <td className={tdCls}>{r.siteName}</td>
                <td className={tdCls}>{r.client || '—'}</td>
                <td className={tdCls}>{r.location || '—'}</td>
                <td className={tdCls}>{r.siteType}</td>
                <td className={tdCls}><StatusBadge status={r.status} /></td>
                <td className={tdCls + ' text-right'}>{r.agreedManpower ?? 0}</td>
                <td className={tdCls + ' text-right'}>{r.actualManpower ?? 0}</td>
                <td className={tdCls + ' text-right'}>{r.currentCompensation != null ? money(r.currentCompensation) : '—'}</td>
                <td className={tdCls}>{fmtDate(r.agreementStartDate, lang)}</td>
                <td className={tdCls}>{fmtDate(r.agreementEndDate, lang)}</td>
              </>)}
              {tab === 'GUARDS' && (<>
                <td className={tdCls}>{r.employeeCode}</td>
                <td className={tdCls}>{r.fullName}</td>
                <td className={tdCls}><StatusBadge status={r.status} /></td>
                <td className={tdCls}>{r.siteName || '—'}</td>
                <td className={tdCls + ' text-right'}>{r.compensation != null ? money(r.compensation) : '—'}</td>
                <td className={tdCls + ' text-right'}>{r.normalHours ?? '—'}</td>
                <td className={tdCls + ' text-right'}>{r.holidayHours ?? '—'}</td>
                <td className={tdCls + ' text-right'}>{r.sundayHours ?? '—'}</td>
                <td className={tdCls}>{r.phone || '—'}</td>
              </>)}
              {tab === 'GUARD_ATT' && (<>
                <td className={tdCls}>{String(r.date || '').slice(0, 10)}</td>
                <td className={tdCls}>{r.guardCode}</td>
                <td className={tdCls}>{r.guardName}</td>
                <td className={tdCls}>{r.siteName}</td>
                <td className={tdCls + ' text-right'}>{fmtNum(r.hoursWorked)}</td>
                <td className={tdCls}>{r.isHoliday ? '✓' : ''}</td>
                <td className={tdCls}><StatusBadge status={r.status} /></td>
                <td className={tdCls}>{r.source}</td>
              </>)}
              {tab === 'STAFF_ATT' && (<>
                <td className={tdCls}>{String(r.date || '').slice(0, 10)}</td>
                <td className={tdCls}>{r.employeeCode}</td>
                <td className={tdCls}>{r.employeeName}</td>
                <td className={tdCls}>{r.department || '—'}</td>
                <td className={tdCls}><StatusBadge status={r.status} /></td>
                <td className={tdCls}>{r.leaveType || '—'}</td>
                <td className={tdCls}>{r.notes || ''}</td>
              </>)}
              {tab === 'PAYROLL' && (<>
                <td className={tdCls}>{r.periodKey}</td>
                <td className={tdCls}>{r.employeeCode}</td>
                <td className={tdCls}>{r.employeeName}</td>
                <td className={tdCls}>{r.siteName || '—'}</td>
                <td className={tdCls}><StatusBadge status={r.runStatus} /></td>
                <td className={tdCls + ' text-right'}>{money(r.grossEarnings)}</td>
                <td className={tdCls + ' text-right'}>{money(r.taxableEarnings)}</td>
                <td className={tdCls + ' text-right'}>{money(r.employeePension)}</td>
                <td className={tdCls + ' text-right'}>{money(r.incomeTax)}</td>
                <td className={tdCls + ' text-right'}>{money(r.totalDeductions)}</td>
                <td className={tdCls + ' text-right font-semibold'}>{money(r.netPay)}</td>
              </>)}
              {tab === 'AUDIT' && (<>
                <td className={tdCls}>{new Date(String(r.createdAt)).toLocaleString()}</td>
                <td className={tdCls}>{r.userName || '—'}</td>
                <td className={tdCls}>{r.action}</td>
                <td className={tdCls}>{r.entity}</td>
                <td className={tdCls}>{r.entityId ? String(r.entityId).slice(-6) : '—'}</td>
                <td className={tdCls}>{r.reason || ''}</td>
                <td className={tdCls}>{r.ipAddress || '—'}</td>
              </>)}
              {tab === 'USERS' && (<>
                <td className={tdCls}>{r.email}</td>
                <td className={tdCls}>{r.fullName}</td>
                <td className={tdCls}>{r.role}</td>
                <td className={tdCls}>{r.isActive ? t('active') : 'Inactive'}</td>
                <td className={tdCls}>{r.lastLogin ? new Date(String(r.lastLogin)).toLocaleString() : '—'}</td>
              </>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── filter widgets ──────────────────────────────────────────────────
function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 min-w-[170px] flex-1 sm:flex-initial">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <input className={inputCls} type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][];
}) {
  return (
    <label className="flex flex-col gap-1.5 min-w-[170px] flex-1 sm:flex-initial">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}

// ── CSV/print columns ───────────────────────────────────────────────
type Col = { key: string; labelKey: string };
function csvColumns(tab: Tab, sample: Record<string, unknown>): Col[] {
  const all: Record<Tab, Col[]> = {
    HR: [
      { key: 'employeeCode', labelKey: 'employeeId' }, { key: 'fullName', labelKey: 'fullName' },
      { key: 'category', labelKey: 'category' }, { key: 'status', labelKey: 'status' },
      { key: 'joinDate', labelKey: 'joinDate' }, { key: 'basicSalary', labelKey: 'repBasic' },
      { key: 'department', labelKey: 'department' }, { key: 'phone', labelKey: 'phone' },
      { key: 'bankName', labelKey: 'repBank' }, { key: 'accountNumber', labelKey: 'repAccount' },
    ],
    SITES: [
      { key: 'siteCode', labelKey: 'employeeId' }, { key: 'siteName', labelKey: 'repSiteName' },
      { key: 'client', labelKey: 'repClient' }, { key: 'location', labelKey: 'repLocation' },
      { key: 'siteType', labelKey: 'repSiteType' }, { key: 'status', labelKey: 'status' },
      { key: 'agreedManpower', labelKey: 'repAgreed' }, { key: 'actualManpower', labelKey: 'repActual' },
      { key: 'currentCompensation', labelKey: 'repComp' },
      { key: 'agreementStartDate', labelKey: 'repAgreeFrom' }, { key: 'agreementEndDate', labelKey: 'repAgreeTo' },
    ],
    GUARDS: [
      { key: 'employeeCode', labelKey: 'employeeId' }, { key: 'fullName', labelKey: 'fullName' },
      { key: 'status', labelKey: 'status' }, { key: 'siteName', labelKey: 'repPrimarySite' },
      { key: 'compensation', labelKey: 'repComp' }, { key: 'normalHours', labelKey: 'repNormalH' },
      { key: 'holidayHours', labelKey: 'repHolidayH' }, { key: 'sundayHours', labelKey: 'repSundayH' },
      { key: 'phone', labelKey: 'phone' },
    ],
    GUARD_ATT: [
      { key: 'date', labelKey: 'repDate' }, { key: 'guardCode', labelKey: 'employeeId' },
      { key: 'guardName', labelKey: 'fullName' }, { key: 'siteName', labelKey: 'repSiteName' },
      { key: 'hoursWorked', labelKey: 'repHours' }, { key: 'isHoliday', labelKey: 'repHoliday' },
      { key: 'status', labelKey: 'status' }, { key: 'source', labelKey: 'repSource' },
    ],
    STAFF_ATT: [
      { key: 'date', labelKey: 'repDate' }, { key: 'employeeCode', labelKey: 'employeeId' },
      { key: 'employeeName', labelKey: 'fullName' }, { key: 'department', labelKey: 'department' },
      { key: 'status', labelKey: 'status' }, { key: 'leaveType', labelKey: 'repLeave' },
      { key: 'notes', labelKey: 'repNotes' },
    ],
    PAYROLL: [
      { key: 'periodKey', labelKey: 'period' }, { key: 'employeeCode', labelKey: 'employeeId' },
      { key: 'employeeName', labelKey: 'fullName' }, { key: 'siteName', labelKey: 'repSiteName' },
      { key: 'runStatus', labelKey: 'status' }, { key: 'grossEarnings', labelKey: 'repGross' },
      { key: 'taxableEarnings', labelKey: 'repTaxable' }, { key: 'employeePension', labelKey: 'repEmpPension' },
      { key: 'incomeTax', labelKey: 'repTax' }, { key: 'totalDeductions', labelKey: 'repDeductions' },
      { key: 'netPay', labelKey: 'repNet' },
    ],
    AUDIT: [
      { key: 'createdAt', labelKey: 'repDate' }, { key: 'userName', labelKey: 'repUser' },
      { key: 'action', labelKey: 'repAction' }, { key: 'entity', labelKey: 'repEntity' },
      { key: 'entityId', labelKey: 'repEntityId' }, { key: 'reason', labelKey: 'repReason' },
      { key: 'ipAddress', labelKey: 'repIp' },
    ],
    USERS: [
      { key: 'email', labelKey: 'repEmail' }, { key: 'fullName', labelKey: 'fullName' },
      { key: 'role', labelKey: 'role' }, { key: 'isActive', labelKey: 'status' },
      { key: 'lastLogin', labelKey: 'repLastLogin' },
    ],
  };
  const cols = all[tab];
  if (!sample) return cols;
  return cols.filter((c) => c.key in sample || ['notes', 'reason'].includes(c.key));
}
