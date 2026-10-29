import { AlertTriangle, Calculator, ChevronDown, ChevronLeft, ChevronUp, CirclePlus, Download, Eye, FileText, Printer, Undo2, Wallet } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import api from '../../lib/api';
import { Badge, Button, Card, EmptyState, LoadingSpinner, Modal, Select, Tabs } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';
import { useT } from '../../i18n';
import { fmtMoney, monthNameOf, StaffRecord, StaffRun, statusVariant } from './staffPayroll.types';
import { StaffPayrollRecordDetail } from './StaffPayrollRecordDetail';
import { EntriesTab } from './EntriesTab';
import { DeductionsTab } from './DeductionsTab';
import { StaffConfigTab } from './StaffConfigTab';
import { AttendanceSummarySection, StaffAttRow, GuardAttRow, RunAttendanceSummary } from '../payroll-shared/AttendanceSummarySection';
import { AddDeductionModal } from '../payroll-shared/AddDeductionModal';
import { PayrollAuditCard } from '../payroll-shared/PayrollAuditCard';
import { downloadCsv, downloadReport, printPayslip } from '../payroll-shared/export';
import PayslipModal from '../../components/payroll/PayslipModal';

const now = new Date();
const YEARS = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 2 + i);

export default function StaffPayrollPage() {
  const t = useT();
  const { user } = useAuthStore();
  const [tab, setTab] = useState('runs');

  // Same role gates as guard payroll (shared finance/head separation).
  const canCalculate = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.FINANCE_OFFICER;
  const canCheck = canCalculate;
  const canApprove = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.HEAD;
  const canPay = canCalculate;
  const canReturn = canCalculate || user?.role === UserRole.HEAD;

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [runs, setRuns] = useState<StaffRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [calculating, setCalculating] = useState(false);

  const [detail, setDetail] = useState<{ run: StaffRun; records: StaffRecord[]; attendance?: RunAttendanceSummary } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [record, setRecord] = useState<StaffRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionModal, setActionModal] = useState<{ type: 'return' | 'pay'; runId: string } | null>(null);
  const [actionText, setActionText] = useState('');
  const [dedModal, setDedModal] = useState<{
    employeeId: string;
    name: string;
    amount?: number | null;
    label?: string;
  } | null>(null);
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);
  // Attendance summary stays collapsed until explicitly opened.
  const [showAttendance, setShowAttendance] = useState(false);
  const [payslipRecordId, setPayslipRecordId] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const handleExportBank = async (bank: string) => {
    if (!detail?.run._id) return;
    const filterQuery = bank !== 'ALL' ? `?bank=${encodeURIComponent(bank)}` : '';
    await downloadReport(`/staff-payroll/runs/${detail.run._id}/export/bank${filterQuery}`, `staff-bank-disbursement-${bank}-${detail.run.periodKey}.csv`);
    setExportMenuOpen(false);
  };

  const handleExportTax = async () => {
    if (!detail?.run._id) return;
    await downloadReport(`/staff-payroll/runs/${detail.run._id}/export/tax`, `staff-tax-declaration-${detail.run.periodKey}.csv`);
    setExportMenuOpen(false);
  };

  const handleExportPension = async () => {
    if (!detail?.run._id) return;
    await downloadReport(`/staff-payroll/runs/${detail.run._id}/export/pension`, `staff-pension-poessa-${detail.run.periodKey}.csv`);
    setExportMenuOpen(false);
  };

  const errMsg = (e: any, fallback: string) => e?.response?.data?.message || e?.message || fallback;

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/staff-payroll/runs');
      setRuns(res.data.data || []);
      setError(null);
    } catch (e: any) {
      try {
        const fb = await api.get('/payroll-runs');
        if (fb.data?.data) {
          setRuns(fb.data.data);
          setError(null);
          return;
        }
      } catch {
        // ignore
      }
      const msg = errMsg(e, t('loading'));
      if (msg.includes('Route not found') || msg.includes('Cast to ObjectId') || e?.response?.status === 404 || e?.response?.status === 500) {
        setRuns([]);
        setError(null);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  const loadDetail = useCallback(async (runId: string) => {
    setDetailLoading(true);
    setShowAttendance(false);
    try {
      const res = await api.get(`/staff-payroll/runs/${runId}`);
      setDetail(res.data.data);
      setError(null);
    } catch (e) {
      setError(errMsg(e, 'Failed to load run'));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const calculate = async () => {
    const periodKey = `${year}-${String(month).padStart(2, '0')}`;
    setCalculating(true);
    setError(null);
    try {
      let res;
      try {
        res = await api.post('/staff-payroll/runs', { periodKey });
      } catch (err: any) {
        if (err?.response?.status === 404) {
          res = await api.post(`/staff-payroll/generate/${periodKey}`);
        } else {
          throw err;
        }
      }
      setNotice(`${t('spRuns')} · ${periodKey}`);
      await loadRuns();
      setDetail(res.data.data);
    } catch (e) {
      setError(errMsg(e, 'Calculation failed'));
    } finally {
      setCalculating(false);
    }
  };

  const runAction = async (runId: string, action: string, body?: object) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post(`/staff-payroll/runs/${runId}/${action}`, body || {});
      setDetail(res.data.data);
      await loadRuns();
      setActionModal(null);
      setActionText('');
    } catch (e) {
      setError(errMsg(e, `Failed to ${action}`));
    } finally {
      setBusy(false);
    }
  };

  const run = detail?.run;
  const canInputDeductions = canCalculate;

  /** "2026-11" → "November 2026" — month names instead of raw period keys. */
  const monthLabelOf = (periodKey?: string) => {
    const [y, m] = (periodKey || '').split('-').map(Number);
    return y && m ? `${monthNameOf(m)} ${y}` : periodKey || '';
  };

  /** Audit-ready payroll register: one row per employee with all money lines. */
  const exportRegister = () => {
    if (!detail) return;
    const rows: (string | number | null | undefined)[][] = [
      ['Code', 'Name', 'Basic', 'Overtime', 'Gross', 'Taxable', 'Pension EE', 'Tax', 'Deductions', 'Net pay', 'Bonus', 'Final paid'],
      ...detail.records.map((r) => [
        r.snapshot.employeeCode,
        r.snapshot.fullName,
        r.snapshot.basic,
        r.overtimeAmount,
        r.grossEarnings,
        r.taxableEarnings,
        r.employeePension,
        r.incomeTax,
        r.totalDeductions,
        r.netPay,
        r.bonus,
        r.finalAmountPaid,
      ]),
      [
        'TOTAL',
        `${detail.records.length} employees`,
        '',
        '',
        run?.totals.grossEarnings ?? '',
        '',
        run?.totals.employeePension ?? '',
        run?.totals.incomeTax ?? '',
        run?.totals.totalDeductions ?? '',
        run?.totals.netPay ?? '',
        run?.totals.bonus ?? '',
        run?.totals.finalAmountPaid ?? '',
      ],
    ];
    downloadCsv(`staff-payroll-register-${detail.run.periodKey}.csv`, rows);
  };

  /** Printable payslip for one staff record. */
  const openPayslip = (rec: StaffRecord) => {
    const s = rec.snapshot;
    printPayslip({
      title: `Payslip — ${s.fullName} — ${rec.periodKey}`,
      periodLabel: monthLabelOf(rec.periodKey),
      employeeLine: `${s.fullName} · ${s.employeeCode}${s.jobPosition ? ` · ${s.jobPosition}` : ''}`,
      meta: [
        ['Pension', s.pensionEnrolled ? 'Enrolled (7%)' : 'Not enrolled'],
        ['Contract', s.contractType || '—'],
      ],
      sections: [
        {
          heading: 'Earnings',
          rows: [
            ['Basic salary', fmtMoney(s.basic)],
            ['Responsibility allowance', fmtMoney(s.responsibilityAllowance)],
            ['Telephone allowance', fmtMoney(s.teleAllowance)],
            ['Transport (non-taxable)', fmtMoney(s.nonTaxableTransport)],
            ['Transport (taxable)', fmtMoney(s.taxableTransport)],
            ['Overtime', fmtMoney(rec.overtimeAmount)],
            ['Gross earnings', fmtMoney(rec.grossEarnings), true],
          ],
        },
        {
          heading: 'Deductions',
          rows: [
            ['Income tax', fmtMoney(rec.incomeTax)],
            ['Employee pension', fmtMoney(rec.employeePension)],
            ...rec.deductions.map((d) => [`${d.type} — ${d.label}`, fmtMoney(d.amount)] as [string, string, boolean?]),
            ['Total deductions', fmtMoney(rec.totalDeductions), true],
          ],
        },
        {
          heading: 'Payment',
          rows: [
            ['Net pay', fmtMoney(rec.netPay), true],
            ['Bonus (outside formula)', fmtMoney(rec.bonus)],
            ['FINAL AMOUNT PAID', fmtMoney(rec.finalAmountPaid), true],
          ],
        },
      ],
      footer: 'Computer-generated payslip — snapshots at calculation time. Employer pension is not deducted from the employee.',
    });
  };

  const attNameOf = useCallback(
    (employeeId: string) => {
      const rec = detail?.records.find((r) => r.employeeId?.toString() === employeeId);
      return rec ? `${rec.snapshot.fullName} (${rec.snapshot.employeeCode})` : employeeId;
    },
    [detail]
  );

  const openAttendanceDeduction = (row: StaffAttRow | GuardAttRow) => {
    setDedModal({
      employeeId: row.employeeId,
      name: attNameOf(row.employeeId),
      amount: row.suggestedAmount,
      label: row.suggestedAmount != null ? t('attBasedDeduction') : '',
    });
  };

  return (
    <div className="p-6 space-y-5">
      {detail ? (
        <button
          onClick={() => setDetail(null)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-surface text-sm font-medium text-muted hover:text-ink hover:bg-subtle transition-colors mb-2"
        >
          <ChevronLeft size={16} />
          {t('back')}
        </button>
      ) : (
        <div className="border-b border-line">
          <Tabs
            tabs={[
              { key: 'runs', label: t('spRuns') },
              { key: 'entries', label: t('spOvertimeBonus') },
              { key: 'deductions', label: t('spDeductionsTab') },
              { key: 'config', label: t('spConfigTab') },
            ]}
            active={tab}
            onChange={setTab}
          />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-danger-subtle border border-danger-line text-danger-text text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}
      {notice && (
        <div className="p-3 rounded-lg bg-success-subtle border border-success-line text-success-text text-sm">{notice}</div>
      )}

      {tab === 'runs' && !detail && (
        <div className="space-y-4">
          <Card className="p-4" data-tour="sp-runs">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs font-medium text-subtext block mb-1">{t('spYear')}</label>
                <Select value={String(year)} onChange={(e) => setYear(Number(e.target.value))}>
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-subtext block mb-1">{t('spMonth')}</label>
                <Select value={String(month)} onChange={(e) => setMonth(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{monthNameOf(m)}</option>
                  ))}
                </Select>
              </div>
              {canCalculate && (
                <Button onClick={calculate} disabled={calculating}>
                  <Calculator size={15} className="mr-1.5" />
                  {calculating ? t('calculating') : t('spCalculate')}
                </Button>
              )}
              <div className="flex-1" />
            </div>
          </Card>

          {loading ? <LoadingSpinner text={t('loading')} /> : runs.length === 0 ? (
            <EmptyState title={t('spNoRuns')} description={t('spNoRunsHint')} />
          ) : (
            <Card padding={false}>
              <table className="w-full text-sm">
                <thead className="bg-subtle">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-subtext uppercase">{t('spPeriod')}</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-subtext uppercase">{t('status')}</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-subtext uppercase">{t('spEmployees')}</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-subtext uppercase">{t('spGross')}</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-subtext uppercase">{t('spNetTotal')}</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-subtext uppercase">{t('spBonusTotal')}</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-subtext uppercase">{t('spFinalTotal')}</th>
                    <th className="text-right px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {runs.map((r) => (
                    <tr key={r._id} className="hover:bg-surface-hover transition-colors">
                      <td className="px-4 py-3 font-medium text-ink">{monthLabelOf(r.periodKey)}</td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                        {r.problems.length > 0 && <AlertTriangle size={13} className="inline ml-1.5 text-warning-text" />}
                      </td>
                      <td className="px-3 py-3 text-center text-muted">{r.totals?.employees ?? 0}</td>
                      <td className="px-3 py-3 text-right text-ink">{fmtMoney(r.totals?.grossEarnings)}</td>
                      <td className="px-3 py-3 text-right font-medium text-ink">{fmtMoney(r.totals?.netPay)}</td>
                      <td className="px-3 py-3 text-right text-success-text">{fmtMoney(r.totals?.bonus)}</td>
                      <td className="px-3 py-3 text-right font-bold text-ink">{fmtMoney(r.totals?.finalAmountPaid)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => loadDetail(r._id)}><Eye size={14} className="mr-1" />{t('view')}</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'runs' && detail && (
        <div className="space-y-4">
          {detailLoading && <LoadingSpinner text={t('loading')} />}
          {!detailLoading && run && (
            <>
              <div className="flex flex-wrap items-center gap-3" data-tour="sp-actions">
                <h2 className="text-lg font-semibold text-ink">{t('spRuns')} · {monthLabelOf(run.periodKey)}</h2>
                <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
                <div className="flex-1" />
                {run.status === 'CALCULATED' && canCalculate && (
                  <Button size="sm" disabled={busy} onClick={() => runAction(run._id, 'submit')}>{t('gpSubmit')}</Button>
                )}
                {run.status === 'SUBMITTED' && canCheck && (
                  <Button size="sm" disabled={busy} onClick={() => runAction(run._id, 'check')}>{t('gpCheck')}</Button>
                )}
                {run.status === 'CHECKED' && canApprove && (
                  <Button size="sm" disabled={busy} onClick={() => runAction(run._id, 'approve')}>{t('gpApprove')}</Button>
                )}
                {run.status === 'APPROVED' && canPay && (
                  <Button size="sm" disabled={busy} onClick={() => { setActionText(''); setActionModal({ type: 'pay', runId: run._id }); }}>{t('gpMarkPaid')}</Button>
                )}
                {(run.status === 'SUBMITTED' || run.status === 'CHECKED' || run.status === 'APPROVED') && canReturn && (
                  <Button variant="secondary" size="sm" disabled={busy} onClick={() => { setActionText(''); setActionModal({ type: 'return', runId: run._id }); }}>
                    <Undo2 size={14} className="mr-1" />{t('gpReturn')}
                  </Button>
                )}
                {['DRAFT', 'CALCULATED', 'RETURNED'].includes(run.status) && canCalculate && (
                  <Button variant="secondary" size="sm" disabled={busy} onClick={() => runAction(run._id, 'recalculate')}>{t('gpRecalculate')}</Button>
                )}
                <div className="relative inline-block text-left">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setExportMenuOpen(!exportMenuOpen)}
                    className="flex items-center gap-1.5"
                  >
                    <Download size={14} />
                    Export
                  </Button>
                  {exportMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-surface border border-line rounded-xl shadow-card z-50 py-2 divide-y divide-line/60">
                      <div className="py-1">
                        <p className="px-4 py-1 text-[10px] font-bold text-muted uppercase tracking-wider">Bank Batch Transfers</p>
                        <button onClick={() => handleExportBank('CBE')} className="w-full text-left px-4 py-1.5 text-xs text-ink hover:bg-subtle transition-colors">
                          Commercial Bank of Ethiopia (CBE)
                        </button>
                        <button onClick={() => handleExportBank('Awash')} className="w-full text-left px-4 py-1.5 text-xs text-ink hover:bg-subtle transition-colors">
                          Awash Bank Batch
                        </button>
                        <button onClick={() => handleExportBank('ALL')} className="w-full text-left px-4 py-1.5 text-xs text-ink hover:bg-subtle transition-colors">
                          All Banks Combined
                        </button>
                      </div>
                      <div className="py-1">
                        <p className="px-4 py-1 text-[10px] font-bold text-muted uppercase tracking-wider">Statutory Compliance</p>
                        <button onClick={handleExportTax} className="w-full text-left px-4 py-1.5 text-xs text-ink hover:bg-subtle transition-colors">
                          Tax Declaration Schedule (ERCA)
                        </button>
                        <button onClick={handleExportPension} className="w-full text-left px-4 py-1.5 text-xs text-ink hover:bg-subtle transition-colors">
                          POESSA Pension Remittance (18%)
                        </button>
                      </div>
                      <div className="py-1">
                        <button onClick={() => { exportRegister(); setExportMenuOpen(false); }} className="w-full text-left px-4 py-1.5 text-xs text-ink hover:bg-subtle transition-colors font-semibold">
                          Full Payroll Register (CSV)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
                {[
                  { label: t('spEmployees'), value: run.totals.employees },
                  { label: t('spGross'), value: fmtMoney(run.totals.grossEarnings) },
                  { label: t('spIncomeTax'), value: fmtMoney(run.totals.incomeTax) },
                  { label: t('spEmployeePension'), value: fmtMoney(run.totals.employeePension) },
                  { label: t('spNetTotal'), value: fmtMoney(run.totals.netPay) },
                  { label: t('spFinalTotal'), value: fmtMoney(run.totals.finalAmountPaid), highlight: true },
                ].map((c) => (
                  <Card key={c.label} className="p-4">
                    <p className="text-[11px] uppercase tracking-wide text-subtext">{c.label}</p>
                    <p className={`text-lg font-bold tabular-nums mt-1 ${c.highlight ? 'text-primary-600 dark:text-primary-400' : 'text-ink'}`}>{c.value}</p>
                  </Card>
                ))}
              </div>

              {run.problems.length > 0 && (
                <Card className="border-danger-line">
                  <div className="px-5 py-4 border-b border-danger-line">
                    <h3 className="text-base font-semibold text-danger-text flex items-center gap-2">
                      <AlertTriangle size={16} /> {t('spProblems')} ({run.problems.length})
                    </h3>
                  </div>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-line">
                      {run.problems.map((p, i) => (
                        <tr key={i}>
                          <td className="px-5 py-3 text-ink">{p.employeeName} <span className="text-muted">({p.employeeCode})</span></td>
                          <td className="px-3 py-3"><Badge variant="danger">{p.code}</Badge></td>
                          <td className="px-5 py-3 text-muted text-xs">{p.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}

              {run.returnHistory.length > 0 && (
                <Card>
                  <div className="px-5 py-4 border-b border-line">
                    <h3 className="text-base font-semibold text-ink">{t('gpProblems') === 'Problems' ? 'Returned for correction' : 'ለማስተካከል ተመለሰ'}</h3>
                  </div>
                  <div className="px-5 py-3 space-y-2">
                    {run.returnHistory.map((h, i) => (
                      <p key={i} className="text-xs text-warning-text">“{h.reason}”</p>
                    ))}
                  </div>
                </Card>
              )}

              {/* Attendance summary — collapsed until opened via the toggle button */}
              {detail.attendance && (
                <div>
                  <button
                    onClick={() => setShowAttendance((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-line bg-surface text-sm font-medium text-muted hover:text-ink hover:bg-subtle transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      {showAttendance ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      {showAttendance ? 'Hide attendance summary' : 'Show attendance summary'}
                    </span>
                    <span className="text-xs text-subtext">{detail.attendance.rows?.length ?? 0} rows</span>
                  </button>
                  {showAttendance && (
                    <div className="mt-3">
                      <AttendanceSummarySection
                        kind="STAFF"
                        rows={detail.attendance.rows}
                        daysInMonth={detail.attendance.daysInMonth}
                        nameOf={attNameOf}
                        onAddDeduction={openAttendanceDeduction}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Audit trail — lifecycle events for this run */}
              <PayrollAuditCard runId={run._id} />

              {/* Records */}
              <Card padding={false}>
                <table className="w-full text-sm">
                  <thead className="bg-subtle">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-subtext uppercase">{t('spEmployee')}</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-subtext uppercase">{t('spBasic')}</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-subtext uppercase">{t('spOvertime')}</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-subtext uppercase">{t('spGross')}</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-subtext uppercase">{t('spTaxable')}</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-subtext uppercase">{t('spPension')}</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-subtext uppercase">{t('spIncomeTax')}</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-subtext uppercase">{t('spDeductions')}</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-subtext uppercase">{t('spNetPay')}</th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-subtext uppercase">{t('spBonus')}</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-subtext uppercase">{t('spFinalPaid')}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {detail.records.map((rec) => (
                      <tr key={rec._id} className="hover:bg-surface-hover transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-ink">{rec.snapshot.fullName}</div>
                          <div className="text-[11px] text-subtext">{rec.snapshot.employeeCode}{!rec.snapshot.pensionEnrolled ? ` · ${t('spNoPension')}` : ''}</div>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">{fmtMoney(rec.snapshot.basic)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{fmtMoney(rec.overtimeAmount)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{fmtMoney(rec.grossEarnings)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-muted">{fmtMoney(rec.taxableEarnings)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-danger-text">{fmtMoney(rec.employeePension)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-danger-text">{fmtMoney(rec.incomeTax)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-danger-text">{fmtMoney(rec.totalDeductions)}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-semibold text-ink">{fmtMoney(rec.netPay)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-success-text">{rec.bonus > 0 ? fmtMoney(rec.bonus) : '—'}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold text-ink">{fmtMoney(rec.finalAmountPaid)}</td>
                        <td className="px-2 py-3 text-right">
                          {canInputDeductions && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setDedModal({
                                  employeeId: rec.employeeId.toString(),
                                  name: `${rec.snapshot.fullName} (${rec.snapshot.employeeCode})`,
                                })
                              }
                            >
                              <CirclePlus size={14} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPayslipRecordId(rec._id);
                              setPayslipModalOpen(true);
                            }}
                            title="Official Payslip"
                          >
                            <FileText size={14} className="text-primary-600" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openPayslip(rec)} title={t('payslip')}>
                            <Printer size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setRecord(rec)}><Eye size={14} /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </div>
      )}

      {tab === 'entries' && <EntriesTab />}
      {tab === 'deductions' && <DeductionsTab />}
      {tab === 'config' && <StaffConfigTab />}

      {/* Per-employee deduction input (attendance / penalty / loan) */}
      <AddDeductionModal
        open={!!dedModal}
        onClose={() => setDedModal(null)}
        onSaved={async () => {
          if (detail) await loadDetail(detail.run._id);
        }}
        employeeId={dedModal?.employeeId || ''}
        employeeName={dedModal?.name || ''}
        periodKey={detail?.run.periodKey || ''}
        defaultAmount={dedModal?.amount ?? null}
        defaultLabel={dedModal?.label}
      />

      {/* Record breakdown modal */}
      <Modal open={!!record} onClose={() => setRecord(null)} title={record ? `${record.snapshot.fullName} · ${monthLabelOf(record.periodKey)}` : ''} size="xl">
        {record && <StaffPayrollRecordDetail record={record} />}
      </Modal>

      {/* Return-for-correction / mark-paid modal */}
      <Modal
        open={!!actionModal}
        onClose={() => setActionModal(null)}
        title={actionModal?.type === 'return' ? t('gpReturn') : t('gpMarkPaid')}
      >
        <div className="space-y-4">
          {actionModal?.type === 'return' ? (
            <>
              <p className="text-sm text-muted">{t('gpReturnReason')}</p>
              <textarea
                value={actionText}
                onChange={(e) => setActionText(e.target.value)}
                rows={3}
                className="v-input w-full"
                placeholder="…"
              />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setActionModal(null)}>{t('cancel')}</Button>
                <Button
                  size="sm"
                  disabled={!actionText.trim() || busy}
                  onClick={() => actionModal && runAction(actionModal.runId, 'return', { reason: actionText.trim() })}
                >
                  {t('gpReturn')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">{t('gpPaymentRef')}</p>
              <input value={actionText} onChange={(e) => setActionText(e.target.value)} className="v-input w-full" placeholder="REF-…" />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setActionModal(null)}>{t('cancel')}</Button>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => actionModal && runAction(actionModal.runId, 'pay', actionText ? { paymentRef: actionText } : {})}
                >
                  <Wallet size={14} className="mr-1" />{t('gpMarkPaid')}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Official Payslip Modal with Print/Download */}
      <PayslipModal
        isOpen={payslipModalOpen}
        onClose={() => setPayslipModalOpen(false)}
        recordId={payslipRecordId}
        type="STAFF"
      />
    </div>
  );
}
