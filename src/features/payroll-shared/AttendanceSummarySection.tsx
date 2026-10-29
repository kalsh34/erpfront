import { useMemo, useState } from 'react';
import { CalendarClock, Eye, UserX } from 'lucide-react';
import { Badge, Button, Card, InfoTooltip } from '../../components/ui';
import { useT } from '../../i18n';

export interface StaffAttRow {
  employeeId: string;
  present: number;
  absent: number;
  paidLeave: number;
  unpaidLeave: number;
  halfDay: number;
  attendanceRate: number;
  absentDays: number;
  hasAttendance: boolean;
  suggestedAmount: number | null;
}

export interface GuardAttRow {
  employeeId: string;
  source: 'MONTHLY' | 'DAILY' | 'NONE' | 'SNAPSHOT';
  sites?: { siteId: string; siteName: string; isPrimary: boolean; normalHours: number; sundayHours: number; holidayHours: number }[];
  normalHours: number;
  holidayHours: number;
  sundayHours: number;
  totalHours: number;
  standardMonthlyHours: number | null;
  percentageOfStandard: number | null;
  hasAttendance: boolean;
  suggestedAmount: number | null;
}

export interface RunAttendanceSummary {
  periodKey: string;
  daysInMonth: number;
  kind: 'GUARD' | 'STAFF';
  rows: (StaffAttRow | GuardAttRow)[];
}

interface Props {
  kind: 'GUARD' | 'STAFF';
  rows: (StaffAttRow | GuardAttRow)[];
  daysInMonth: number;
  /** employeeId → display name, resolved from the run's records. */
  nameOf: (employeeId: string) => string;
  onAddDeduction: (row: StaffAttRow | GuardAttRow) => void;
}

/**
 * Attendance summary inside a payroll run: shows Finance exactly how much each
 * employee worked (guards: hours vs standard; staff: day status counts) and
 * offers a one-click deduction entry pre-filled with a suggestion.
 */
export function AttendanceSummarySection({ kind, rows, daysInMonth, nameOf, onAddDeduction }: Props) {
  const t = useT();
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');
  const [site, setSite] = useState('');

  const flagged = useMemo(() => {
    if (kind === 'STAFF') {
      return rows.filter((r) => (r as StaffAttRow).absentDays > 0 || !(r as StaffAttRow).hasAttendance);
    }
    return rows.filter(
      (r) => !(r as GuardAttRow).hasAttendance || ((r as GuardAttRow).percentageOfStandard ?? 100) < 100
    );
  }, [rows, kind]);

  const siteNames = Array.from(new Set(rows.flatMap((r) => (r as GuardAttRow).sites?.map((s) => s.siteName) || []))).sort();
  const visible = (showAll ? rows : flagged).filter((r) => nameOf(r.employeeId).toLowerCase().includes(search.toLowerCase()) &&
    (!site || (r as GuardAttRow).sites?.some((s) => s.siteName === site)));
  const fmt = (n: number | null | undefined) =>
    (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <CalendarClock size={15} className="text-primary-600" />
            {t('attSummary')}
            <span className="text-xs font-normal text-subtext">· {t('attPeriodDays', { days: daysInMonth })}</span>
          </h4>
          <InfoTooltip content={t('attSummaryNote')} />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={flagged.length > 0 ? 'warning' : 'success'}>
            {kind === 'STAFF'
              ? `${flagged.filter((r) => (r as StaffAttRow).absentDays > 0).length} ${t('attWithAbsence')}`
              : `${flagged.filter((r) => !(r as GuardAttRow).hasAttendance || ((r as GuardAttRow).percentageOfStandard ?? 100) < 100).length} ${t('attBelowStandard')}`}
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)}>
            <Eye size={13} className="mr-1" />
            {showAll ? t('attShowFlagged') : t('attShowAll')}
          </Button>
        </div>
      </div>

      <div className="p-3 flex flex-wrap gap-3 border-b border-line">
        <input aria-label="Filter guard or employee" placeholder="Search guard / employee" className="v-input max-w-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
        {kind === 'GUARD' && <select aria-label="Filter attendance site" className="v-input max-w-xs" value={site} onChange={(e) => setSite(e.target.value)}>
          <option value="">All primary and additional sites</option>{siteNames.map((name) => <option key={name}>{name}</option>)}
        </select>}
        {kind === 'GUARD' && <p className="text-xs text-muted">Saved payroll hours; site filters retain the guard’s complete breakdown. Earnings already reflect recorded hours; no automatic absence penalty.</p>}
      </div>
      {visible.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted text-center">{kind === 'STAFF' ? t('attNoAbsence') : t('attNoShortfall')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-subtext">
                <th className="px-4 py-2.5">{kind === 'STAFF' ? t('spEmployee') : t('gpGuards')}</th>
                {kind === 'GUARD' ? (
                  <>
                    <th className="px-3 py-2.5 text-center">{t('attSource')}</th>
                    <th className="px-3 py-2.5 text-right">{t('attNormalH')}</th>
                    <th className="px-3 py-2.5 text-right">{t('attHolidayH')}</th>
                    <th className="px-3 py-2.5 text-right">{t('attSundayH')}</th>
                    <th className="px-3 py-2.5 text-right">{t('attTotalH')}</th>
                    <th className="px-3 py-2.5 text-right">{t('attOfStandard')}</th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-2.5 text-center">{t('attPresent')}</th>
                    <th className="px-3 py-2.5 text-center">{t('absent')}</th>
                    <th className="px-3 py-2.5 text-center">{t('attPaidLeave')}</th>
                    <th className="px-3 py-2.5 text-center">{t('attHalfDay')}</th>
                    <th className="px-3 py-2.5 text-right">{t('attRate')}</th>
                  </>
                )}
                <th className="px-3 py-2.5 text-right">{t('attSuggested')}</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const flaggedRow =
                  kind === 'STAFF'
                    ? (row as StaffAttRow).absentDays > 0 || !(row as StaffAttRow).hasAttendance
                    : !(row as GuardAttRow).hasAttendance || ((row as GuardAttRow).percentageOfStandard ?? 100) < 100;
                return (
                  <tr key={row.employeeId} className={`border-b border-line last:border-0 ${flaggedRow ? 'bg-warning-subtle/40' : ''}`}>
                    <td className="px-4 py-2.5 font-medium text-ink">{nameOf(row.employeeId)}
                      {kind === 'GUARD' && <details className="mt-2 text-xs font-normal text-muted"><summary className="cursor-pointer">Site-level hours</summary>
                        {(row as GuardAttRow).sites?.map((s) => <div key={s.siteId} className="mt-1 border-l-2 border-line pl-2">
                          <b>{s.siteName}</b> · {s.isPrimary ? 'Primary' : 'Additional'}<br />Normal {fmt(s.normalHours)}h · Sunday {fmt(s.sundayHours)}h · Holiday {fmt(s.holidayHours)}h
                        </div>)}
                      </details>}
                    </td>
                    {kind === 'GUARD' ? (
                      <>
                        <td className="px-3 py-2.5 text-center">
                          <Badge variant={(row as GuardAttRow).source === 'MONTHLY' ? 'info' : (row as GuardAttRow).source === 'DAILY' ? 'default' : 'danger'}>
                            {(row as GuardAttRow).source}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{fmt((row as GuardAttRow).normalHours)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{fmt((row as GuardAttRow).holidayHours)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{fmt((row as GuardAttRow).sundayHours)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-medium">{fmt((row as GuardAttRow).totalHours)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {(row as GuardAttRow).percentageOfStandard == null ? '—' : `${(row as GuardAttRow).percentageOfStandard}%`}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2.5 text-center tabular-nums">{(row as StaffAttRow).present}</td>
                        <td className={`px-3 py-2.5 text-center tabular-nums ${(row as StaffAttRow).absent > 0 ? 'text-danger-text font-semibold' : ''}`}>
                          {(row as StaffAttRow).absent}
                        </td>
                        <td className="px-3 py-2.5 text-center tabular-nums">{(row as StaffAttRow).paidLeave}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums">{(row as StaffAttRow).halfDay}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {(row as StaffAttRow).hasAttendance ? `${(row as StaffAttRow).attendanceRate}%` : '—'}
                        </td>
                      </>
                    )}
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {row.suggestedAmount != null ? <span className="text-warning-text">{fmt(row.suggestedAmount)}</span> : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {flaggedRow && kind === 'STAFF' && (
                        <Button variant="secondary" size="sm" onClick={() => onAddDeduction(row)} className="flex items-center gap-1 ml-auto">
                          <UserX size={13} />
                          {t('attDeductBtn')}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
