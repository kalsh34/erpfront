import { AlertTriangle } from 'lucide-react';
import { Badge } from '../../components/ui';
import { useT } from '../../i18n';
import { fmtMoney, StaffRecord } from './staffPayroll.types';

const Row = ({ label, value, strong, danger, muted }: { label: string; value: string; strong?: boolean; danger?: boolean; muted?: boolean }) => (
  <div className={`flex items-center justify-between py-1.5 ${strong ? 'border-t border-line mt-1 pt-2.5' : ''}`}>
    <span className={`text-sm ${muted ? 'text-muted' : 'text-ink'} ${strong ? 'font-semibold' : ''}`}>{label}</span>
    <span className={`text-sm tabular-nums ${strong ? 'font-bold text-ink' : danger ? 'text-danger-text' : 'text-ink'}`}>{value}</span>
  </div>
);

/** Per-employee staff payroll breakdown — follows the frozen formula order. */
export function StaffPayrollRecordDetail({ record }: { record: StaffRecord }) {
  const t = useT();
  const s = record.snapshot;

  return (
    <div className="space-y-4">
      {/* Employee + contract snapshot */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-subtle">
        <div>
          <p className="text-base font-semibold text-ink">{s.fullName}</p>
          <p className="text-xs text-muted mt-0.5">
            {s.employeeCode}{s.jobPosition ? ` · ${s.jobPosition}` : ''}{s.department ? ` · ${s.department}` : ''}
          </p>
          <p className="text-xs text-muted mt-0.5">
            {s.contractType} · {t('spContractSnapshot')}
          </p>
        </div>
        <Badge variant={s.pensionEnrolled ? 'success' : 'default'}>
          {s.pensionEnrolled ? t('spPensionEnrolled') : t('spPensionNotEnrolled')}
        </Badge>
      </div>

      {/* 1. Gross earnings */}
      <div className="p-4 rounded-xl border border-line">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-subtext mb-2">{t('spGrossEarnings')}</h4>
        <Row label={t('spBasic')} value={fmtMoney(s.basic)} />
        <Row label={t('spResponsibility')} value={fmtMoney(s.responsibilityAllowance)} />
        <Row label={t('spTele')} value={fmtMoney(s.teleAllowance)} />
        <Row label={t('spNonTaxTransport')} value={fmtMoney(s.nonTaxableTransport)} />
        <Row label={t('spTaxTransport')} value={fmtMoney(s.taxableTransport)} />
        <Row label={t('spOvertime')} value={fmtMoney(record.overtimeAmount)} />
        <Row label={t('spGrossTotal')} value={fmtMoney(record.grossEarnings)} strong />
      </div>

      {/* 2–4. Taxable, pension, tax */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-line">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-subtext mb-2">{t('spTaxable')}</h4>
          <p className="text-lg font-bold text-ink tabular-nums">{fmtMoney(record.taxableEarnings)}</p>
          <p className="text-[11px] text-muted mt-1">{t('spTaxableHint')}</p>
        </div>
        <div className="p-4 rounded-xl border border-line">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-subtext mb-2">{t('spPension')}</h4>
          <Row label={t('spEmployee7')} value={fmtMoney(record.employeePension)} />
          <Row label={t('spEmployer11')} value={fmtMoney(record.employerPension)} />
          <p className="text-[11px] text-muted mt-1">{t('spPensionBaseHint')}</p>
        </div>
        <div className="p-4 rounded-xl border border-line">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-subtext mb-2">{t('spIncomeTax')}</h4>
          <p className="text-lg font-bold text-ink tabular-nums">{fmtMoney(record.incomeTax)}</p>
        </div>
      </div>

      {/* 5. Deductions */}
      <div className="p-4 rounded-xl border border-line">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-subtext mb-2">{t('spDeductions')}</h4>
        <Row label={t('spIncomeTax')} value={fmtMoney(record.incomeTax)} danger />
        <Row label={t('spEmployeePension')} value={fmtMoney(record.employeePension)} danger />
        {record.deductions.map((d) => (
          <Row key={d.deductionId} label={`${d.type} — ${d.label}`} value={fmtMoney(d.amount)} danger />
        ))}
        <Row label={t('spTotalDeduction')} value={fmtMoney(record.totalDeductions)} strong />
      </div>

      {/* 6–7. Net pay + bonus */}
      <div className="p-4 rounded-xl border border-line bg-primary-500/5">
        <Row label={t('spNetPay')} value={fmtMoney(record.netPay)} strong />
        <Row label={`${t('spBonus')} (${t('spBonusOutside')})`} value={fmtMoney(record.bonus)} />
        <div className="border-t-2 border-primary-500/30 mt-2 pt-3 flex items-center justify-between">
          <span className="text-sm font-bold text-ink">{t('spFinalPaid')}</span>
          <span className="text-xl font-bold text-primary-600 dark:text-primary-400 tabular-nums">{fmtMoney(record.finalAmountPaid)}</span>
        </div>
      </div>

      {record.warnings.length > 0 && (
        <div className="p-3 rounded-lg bg-warning-subtle border border-warning-line">
          {record.warnings.map((w, i) => (
            <p key={i} className="text-xs text-warning-text flex items-start gap-1.5">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
