import { AlertTriangle, Building2 } from 'lucide-react';
import { Badge, Card, InfoTooltip } from '../../components/ui';
import { useT } from '../../i18n';
import { AdditionalSiteSnapshot, fmtHours, fmtMoney, PayrollRecord, PrimarySiteSnapshot } from './guardPayroll.types';

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 py-1.5 text-sm ${strong ? 'font-semibold text-ink' : 'text-muted'}`}>
      <span>{label}</span>
      <span className={strong ? 'text-ink' : 'text-ink'}>{value}</span>
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-primary-600">{icon}</span>
      <h4 className="text-sm font-semibold uppercase tracking-wide text-muted">{children}</h4>
    </div>
  );
}

/** Site-by-site breakdown for ONE guard's payroll record. */
export function PayrollRecordDetail({ record }: { record: PayrollRecord }) {
  const t = useT();
  const p: PrimarySiteSnapshot = record.primarySite;
  const primarySiteName = typeof p.siteId === 'object' && p.siteId?.siteName ? p.siteId.siteName : p.siteName;

  return (
    <div className="space-y-4">
      {/* Guard snapshot */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <span className="font-semibold text-ink">{record.snapshot.fullName}</span>
          <span className="text-muted">{record.snapshot.employeeCode}</span>
          {record.snapshot.bankName && <span className="text-muted">{record.snapshot.bankName}</span>}
          {record.snapshot.accountNumber && <span className="text-muted">···{record.snapshot.accountNumber.slice(-4)}</span>}
          <Badge variant={record.snapshot.pensionEnrolled ? 'success' : 'default'}>
            {t('gpPension')}: {record.snapshot.pensionEnrolled ? '✓' : '—'}
          </Badge>
          {record.snapshot.contractType && <span className="text-muted">{record.snapshot.contractType}</span>}
          <InfoTooltip content={t('gpSnapshotNote')} />
        </div>
        {record.warnings.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {record.warnings.map((w, i) => (
              <p key={i} className="flex items-start gap-1.5 text-xs text-warning-text">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                {w}
              </p>
            ))}
          </div>
        )}
      </Card>

      {/* PRIMARY SITE */}
      <Card className="p-4 border-l-4 border-l-primary-500">
        <SectionTitle icon={<Building2 size={15} />}>
          {t('gpPrimarySite')} — {primarySiteName}{p.siteCode ? ` (${p.siteCode})` : ''}
        </SectionTitle>
        <p className="text-xs text-muted mb-3">Structural Sunday allocation decomposes the agreed amount; it is not added again to earnings. Transport is paid once when primary-site attendance exists. Pension uses primary-site normal pay plus actual Sunday pay; holiday pay, additional-site earnings and transport are excluded.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <Row label={t('gpCompensation')} value={fmtMoney(p.compensationAmount)} />
            <Row label={`${t('gpOtRate')} (${p.compensationAmount} ÷ ${p.standardMonthlyHours})`} value={fmtMoney(p.otRate)} />
            <Row label={`${t('gpSundayStructuralHours')} (${p.otRate} × ${p.sundayStructuralHours})`} value={fmtMoney(p.sundayStructuralAllocation)} />
            <Row label="Remaining after structural allocation" value={fmtMoney(p.remaining)} />
            <Row label="Full transport allowance (non-taxable)" value={fmtMoney(p.transportFull)} />
            <Row label={t('gpTransportPercent')} value={`${p.transportPercent}%`} />
            <Row label={t('gpBasicSalary')} value={fmtMoney(p.basicSalary)} strong />
            <Row label={`${t('gpBasicHourlyRate')} (÷ ${p.basicHourlyDivisor})`} value={p.basicHourlyRate.toFixed(4)} strong />
          </div>
          <div>
            <Row label={`${t('gpNormalHours')} × ${fmtMoney(p.basicHourlyRate)}`} value={`${fmtHours(p.normalHours)} → ${fmtMoney(p.normalPay)}`} />
            <Row label={`${t('gpHolidayHours')} × ${fmtMoney(p.otRate)}`} value={`${fmtHours(p.holidayHours)} → ${fmtMoney(p.holidayPay)}`} />
            <Row label={`${t('gpSundayHours')} × ${fmtMoney(p.otRate)}`} value={`${fmtHours(p.sundayHours)} → ${fmtMoney(p.sundayPay)}`} />
            <Row label={t('gpTransport')} value={fmtMoney(p.transportPaid)} />
            <div className="border-t border-line mt-2 pt-2">
              <Row label={t('gpSiteEarnings')} value={fmtMoney(p.siteEarnings)} strong />
            </div>
          </div>
        </div>
      </Card>

      {/* ADDITIONAL SITES */}
      {record.additionalSites.map((site: AdditionalSiteSnapshot, idx: number) => {
        const siteName = typeof site.siteId === 'object' && site.siteId?.siteName ? site.siteId.siteName : site.siteName;
        return (
          <Card key={idx} className="p-4 border-l-4 border-l-info">
            <SectionTitle icon={<Building2 size={15} />}>
              {t('gpAdditionalSites')} {idx + 1} — {siteName}{site.siteCode ? ` (${site.siteCode})` : ''}
            </SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <Row label={t('gpCompensation')} value={fmtMoney(site.compensationAmount)} />
                <Row label={t('gpOtRate')} value={fmtMoney(site.otRate)} />
              </div>
              <div>
                <Row label={`${t('gpTotalHours')} × ${fmtMoney(site.otRate)}`} value={`${fmtHours(site.totalHours)} → ${fmtMoney(site.siteEarnings)}`} />
                <Row label={t('gpNormalHours')} value={fmtHours(site.normalHours)} />
                <Row label={`${t('gpHolidayHours')} / ${t('gpSundayHours')}`} value={`${fmtHours(site.holidayHours)} / ${fmtHours(site.sundayHours)}`} />
              </div>
            </div>
          </Card>
        );
      })}

      {/* TOTALS */}
      <Card className="p-4">
        <SectionTitle icon={<span className="text-base font-bold">Σ</span>}>{t('gpNet')}</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <Row label={t('gpGross')} value={fmtMoney(record.grossEarnings)} strong />
            <Row label={`${t('gpPension')} (${t('gpPensionBase')} ${fmtMoney(record.pensionBase)})`} value={`−${fmtMoney(record.employeePension)}`} />
            <Row label={t('gpTaxable')} value={fmtMoney(record.taxableEarnings)} />
            <Row label={t('gpTax')} value={`−${fmtMoney(record.incomeTax)}`} />
          </div>
          <div>
            {record.deductions.map((d) => (
              <Row key={d.deductionId} label={`${d.label} (${d.type})`} value={`−${fmtMoney(d.amount)}`} />
            ))}
            {record.deductions.length === 0 && <Row label={t('gpDeductions')} value="0.00" />}
            <Row label={t('gpPension')} value={`(employer ${fmtMoney(record.employerPension)})`} />
            <div className="border-t border-line mt-2 pt-2">
              <Row label={t('gpNet')} value={fmtMoney(record.netPay)} strong />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
