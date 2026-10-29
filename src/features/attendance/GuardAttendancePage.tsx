import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Info, X } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';
import { Badge, Button, Card, EmptyState, FormField, LoadingSpinner, Modal, Select, Tabs } from '../../components/ui';
import { InfoTooltip } from '../../components/ui/Tooltip';
import { formatDisplayDate, todayYmd, toYmd } from '../../lib/dates';
import { useT } from '../../i18n';

interface SiteOption { _id: string; siteName: string; siteCode?: string }

interface RosterRow {
  guard: { _id: string; employeeCode: string; firstName: string; lastName: string; status: string };
  assignment: { _id: string; role: string; isPrimary: boolean; effectiveFrom: string; rate: number };
  attendable: boolean;
  record: { _id: string; hoursWorked: number; isHoliday: boolean; notes?: string } | null;
  otherSiteHours: number;
  otherSiteDetail: { siteName: string; hours: number }[];
}

interface DayRoster {
  site: { _id: string; siteName: string; siteCode?: string };
  date: string;
  config: { maxDailyHours: number; expectedDailyHours: number };
  futureDate: boolean;
  editable: boolean;
  rows: RosterRow[];
}

interface Draft {
  hours: string;
  isHoliday: boolean;
  touched: boolean;
}

interface MonthlyRow {
  guard: { _id: string; employeeCode: string; firstName: string; lastName: string; status: string };
  primarySiteId: string | null;
  primarySiteName?: string;
  warnings?: string[];
  sites: { siteId: string; siteName: string; siteCode: string; isPrimary: boolean; totalHours: number; normalHours: number; sundayHours: number; holidayHours: number; source?: string; dayCount: number }[];
  totalHours: number;
}

interface MonthlyTotals {
  config: { maxDailyHours: number; expectedDailyHours: number };
  rows: MonthlyRow[];
  missingAttendance: { _id: string; employeeCode: string; firstName: string; lastName: string }[];
  grandTotal: number;
}

interface Readiness {
  guardsWithAttendance: number;
  ready: boolean;
  issues: { guard: { employeeCode?: string; firstName?: string; lastName?: string }; type: string; message: string }[];
}

/** One guard × site row of the monthly hours worksheet. */
interface MonthlySheetRow {
  assignment: { _id: string; role: string; isPrimary: boolean; effectiveFrom: string };
  guard: { _id: string; employeeCode: string; firstName: string; lastName: string; status: string };
  site: { _id: string; siteName: string; siteCode: string };
  sheet: { _id: string; normalHours: number; holidayHours: number; sundayHours: number; notes: string } | null;
  daily: { totalHours: number; holidayHours: number; normalHours: number } | null;
  warnings: string[];
}

interface MonthlySheet {
  rows: MonthlySheetRow[];
  stats: {
    assignedRows: number;
    savedSheets: number;
    guardsWithDaily: number;
    totalNormal: number;
    totalHoliday: number;
    totalSunday: number;
  };
}

const monthName = (m: number) =>
  ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1];

const HOURS_SECTIONS = [
  { key: 'normalHours' as const, badge: 'normal', inputCls: 'border-line focus:ring-primary-500' },
  { key: 'holidayHours' as const, badge: 'holiday', inputCls: 'border-warning-line focus:ring-warning/30' },
  { key: 'sundayHours' as const, badge: 'sunday', inputCls: 'border-info-line focus:ring-info/30' },
];

export default function GuardAttendancePage() {
  const { user } = useAuthStore();
  const [guardSearch, setGuardSearch] = useState('');
  const [primaryFilter, setPrimaryFilter] = useState('');
  const [additionalFilter, setAdditionalFilter] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState('');
  const t = useT();
  const [tab, setTab] = useState<'daily' | 'monthly' | 'hours'>('daily');

  const canManage = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.HR_ADMIN || user?.role === UserRole.OPERATIONS;
  const canFuture = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.HR_ADMIN;

  const [sites, setSites] = useState<SiteOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // ── Daily entry state ─────────────────────────────────────────────
  const [siteId, setSiteId] = useState('');
  const [date, setDate] = useState(todayYmd());
  const [roster, setRoster] = useState<DayRoster | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [voidTarget, setVoidTarget] = useState<{ recordId: string; guardName: string; hours: number } | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  // ── Monthly totals state ─────────────────────────────────────────
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [siteFilter, setSiteFilter] = useState('');
  const [totals, setTotals] = useState<MonthlyTotals | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  // ── Monthly hours (new input mode) state ─────────────────────────
  const [sheet, setSheet] = useState<MonthlySheet | null>(null);
  const [sheetDrafts, setSheetDrafts] = useState<Record<string, { normalHours: string; holidayHours: string; sundayHours: string; notes: string; touched: boolean }>>({});
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [sheetRowErrors, setSheetRowErrors] = useState<Record<string, string>>({});
  const [sheetOnly, setSheetOnly] = useState(false);

  // Guard-payroll lock for the viewed month (replaces the removed "periods" API).
  const [periodLock, setPeriodLock] = useState<{ locked: boolean; runStatus: string | null } | null>(null);

  const errMsg = (e: any, fallback: string) => e?.response?.data?.message || e?.message || fallback;
  const rowKey = (guardId: string, sId: string) => `${guardId}:${sId}`;

  // Payroll lock + month label for whichever period is on screen.
  useEffect(() => {
    const pk = tab === 'daily' ? date.slice(0, 7) : `${year}-${String(month).padStart(2, '0')}`;
    api.get('/guard-payroll/attendance-lock', { params: { periodKey: pk } })
      .then((res) => setPeriodLock({ locked: !!res.data.data?.locked, runStatus: res.data.data?.runStatus || null }))
      .catch(() => setPeriodLock(null));
  }, [year, month, date, tab]);
  const periodLabel = `${monthName(month)} ${year}`;
  const dayPeriodLabel = (dateStr: string) => `${monthName(Number(dateStr.slice(5, 7)))} ${dateStr.slice(0, 4)}`;

  // ── Loaders ──────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/sites')
      .then((res) => {
        const list: SiteOption[] = res.data.data || [];
        setSites(list);
        if (list.length > 0 && !siteId) setSiteId(list[0]._id);
      })
      .catch((e) => setError(errMsg(e, t('attendanceFailedLoadMonthly'))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDay = useCallback(async () => {
    if (!siteId || !date) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/attendance/day?siteId=${siteId}&date=${date}`);
      const data: DayRoster = res.data.data;
      setRoster(data);
      const next: Record<string, Draft> = {};
      for (const row of data.rows) {
        next[row.guard._id] = {
          hours: row.record ? String(row.record.hoursWorked) : '',
          isHoliday: row.record ? !!row.record.isHoliday : false,
          touched: false,
        };
      }
      setDrafts(next);
      setRowErrors({});
      setNotice(null);
    } catch (e) {
      setRoster(null);
      setError(errMsg(e, t('attendanceFailedLoadRoster')));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, date]);

  useEffect(() => { loadDay(); }, [loadDay]);

  const loadMonthly = useCallback(async () => {
    setMonthlyLoading(true);
    try {
      const qs = `year=${year}&month=${month}${siteFilter ? `&siteId=${siteFilter}` : ''}`;
      const [tRes, rRes] = await Promise.all([
        api.get(`/attendance/monthly?${qs}`),
        api.get(`/attendance/payroll-readiness?year=${year}&month=${month}`),
      ]);
      setTotals(tRes.data.data);
      setReadiness(rRes.data.data);
    } catch (e: any) {
      setTotals(null);
      setReadiness(null);
      const msg = errMsg(e, t('attendanceFailedLoadMonthly'));
      if (msg.includes('Route not found') || e?.response?.status === 404) {
        setError(null);
      } else {
        setError(msg);
      }
    } finally {
      setMonthlyLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, siteFilter]);

  const loadSheet = useCallback(async () => {
    setSheetLoading(true);
    setError(null);
    try {
      const qs = `year=${year}&month=${month}${siteFilter ? `&siteId=${siteFilter}` : ''}`;
      const res = await api.get(`/attendance/monthly-sheet?${qs}`);
      const data: MonthlySheet = res.data.data;
      setSheet(data);
      const next: typeof sheetDrafts = {};
      for (const row of data.rows) {
        next[rowKey(row.guard._id, row.site._id)] = {
          normalHours: row.sheet ? String(row.sheet.normalHours || '') : '',
          holidayHours: row.sheet ? String(row.sheet.holidayHours || '') : '',
          sundayHours: row.sheet ? String(row.sheet.sundayHours || '') : '',
          notes: row.sheet?.notes || '',
          touched: false,
        };
      }
      setSheetDrafts(next);
      setSheetRowErrors({});
      setNotice(null);
    } catch (e: any) {
      const msg = errMsg(e, t('attendanceFailedLoadMonthly'));
      if (msg.includes('Route not found') || e?.response?.status === 404) {
        setSheet({
          rows: [],
          stats: {
            assignedRows: 0,
            savedSheets: 0,
            guardsWithDaily: 0,
            totalNormal: 0,
            totalHoliday: 0,
            totalSunday: 0,
          },
        });
        setError(null);
      } else {
        setSheet(null);
        setError(msg);
      }
    } finally {
      setSheetLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, siteFilter]);

  useEffect(() => { if (tab === 'monthly') loadMonthly(); }, [tab, loadMonthly]);
  useEffect(() => { if (tab === 'hours') loadSheet(); }, [tab, loadSheet]);

  // ── Daily entry handlers ─────────────────────────────────────────
  const setDraft = (guardId: string, patch: Partial<Draft>) => {
    setDrafts((prev) => ({ ...prev, [guardId]: { ...(prev[guardId] || { hours: '', isHoliday: false, touched: false }), ...patch, touched: true } }));
  };

  const validateDraft = (guardId: string, value: string, rosterData: DayRoster): string => {
    if (value === '') return '';
    const h = Number(value);
    const max = rosterData.config.maxDailyHours;
    if (!Number.isFinite(h)) return t('attendanceNotANumber');
    if (h <= 0) return t('attendanceMustBeAbove0');
    if (Math.round(h * 100) / 100 !== h) return t('attendanceMax2Decimals');
    if (h > max) return t('attendanceMaxPerDay', { max: String(max) });
    const row = rosterData.rows.find((r) => r.guard._id === guardId);
    if (row && Math.round((h + row.otherSiteHours) * 100) / 100 > max) {
      return t('attendanceAlsoOtherSite', { hours: String(row.otherSiteHours) });
    }
    return '';
  };

  const saveDay = async () => {
    if (!roster) return;
    const errors: Record<string, string> = {};
    const entries: { guardId: string; hoursWorked: number; isHoliday: boolean }[] = [];
    for (const row of roster.rows) {
      const draft = drafts[row.guard._id];
      if (!draft || draft.hours === '') continue;
      const msg = validateDraft(row.guard._id, draft.hours, roster);
      if (msg) { errors[row.guard._id] = msg; continue; }
      entries.push({ guardId: row.guard._id, hoursWorked: Number(draft.hours), isHoliday: draft.isHoliday });
    }
    setRowErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError(t('attendanceFixRowsBeforeSave'));
      return;
    }
    if (entries.length === 0) { setError(t('attendanceEnterAtLeastOne')); return; }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api.post('/attendance/day', { siteId, date, entries });
      const failed: { guardId: string; message: string }[] = res.data.data?.failed || [];
      const savedCount: number = (res.data.data?.saved || []).length;
      if (failed.length > 0) {
        const names = failed.map((f) => {
          const row = roster.rows.find((r) => r.guard._id === f.guardId);
          const name = row ? `${row.guard.firstName} ${row.guard.lastName}` : f.guardId;
          return `${name}: ${f.message}`;
        });
        setError(t('attendanceSavedWithRejected', { saved: String(savedCount), rejected: String(failed.length), detail: names.join(' | ') }));
      } else {
        setNotice(t('attendanceSavedDaily', { count: String(savedCount), date: formatDisplayDate(date) }));
      }
      await loadDay();
    } catch (e) {
      setError(errMsg(e, t('attendanceFailedSave')));
    } finally {
      setSaving(false);
    }
  };

  const voidRecord = async () => {
    if (!voidTarget || !voidReason.trim()) return;
    setVoiding(true);
    setError(null);
    try {
      await api.post(`/attendance/${voidTarget.recordId}/void`, { reason: voidReason.trim() });
      setVoidTarget(null);
      setVoidReason('');
      setNotice(t('attendanceVoidedNotice'));
      await loadDay();
    } catch (e) {
      setError(errMsg(e, t('attendanceFailedVoid')));
    } finally {
      setVoiding(false);
    }
  };

  // ── Monthly hours handlers ───────────────────────────────────────
  const setSheetDraft = (key: string, patch: Partial<{ normalHours: string; holidayHours: string; sundayHours: string; notes: string }>) => {
    setSheetDrafts((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || { normalHours: '', holidayHours: '', sundayHours: '', notes: '', touched: false }), ...patch, touched: true },
    }));
  };

  const validateSheetDraft = (value: string): string => {
    if (value === '') return '';
    const h = Number(value);
    if (!Number.isFinite(h)) return t('attendanceNotANumber');
    if (h < 0) return t('attendanceNegativeNotAllowed');
    if (Math.round(h * 100) / 100 !== h) return t('attendanceMax2Decimals');
    return '';
  };

  const sheetDirty = Object.values(sheetDrafts).some((d) => d.touched);

  const saveMonthlySheet = async () => {
    if (!sheet) return;
    const errors: Record<string, string> = {};
    const entries: { guardId: string; siteId: string; normalHours: number; holidayHours: number; sundayHours: number; notes?: string }[] = [];
    for (const row of sheet.rows) {
      const key = rowKey(row.guard._id, row.site._id);
      const draft = sheetDrafts[key];
      if (!draft || !draft.touched) continue;
      const rowErrs = HOURS_SECTIONS.map((s) => ({ key: s.key, msg: validateSheetDraft(draft[s.key]) })).filter((x) => x.msg);
      if (rowErrs.length > 0) { errors[key] = rowErrs[0].msg; continue; }
      const normal = draft.normalHours === '' ? 0 : Number(draft.normalHours);
      const holiday = draft.holidayHours === '' ? 0 : Number(draft.holidayHours);
      const sunday = draft.sundayHours === '' ? 0 : Number(draft.sundayHours);
      const existing = row.sheet;
      const unchanged =
        existing &&
        existing.normalHours === normal &&
        existing.holidayHours === holiday &&
        existing.sundayHours === sunday &&
        (draft.notes || '') === (existing.notes || '');
      if (unchanged) continue;
      if (normal + holiday + sunday <= 0) { errors[key] = t('attendanceEnterAtLeastOneSection'); continue; }
      entries.push({ guardId: row.guard._id, siteId: row.site._id, normalHours: normal, holidayHours: holiday, sundayHours: sunday, notes: draft.notes || undefined });
    }
    setSheetRowErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError(t('attendanceFixRowsBeforeSave'));
      return;
    }
    if (entries.length === 0) { setError(t('attendanceNoMonthlyChanges')); return; }

    setSheetSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api.post('/attendance/monthly-sheet', { year, month, entries });
      const failed: { guardId: string; siteId?: string; message: string }[] = res.data.data?.failed || [];
      const savedCount: number = (res.data.data?.saved || []).length;
      if (failed.length > 0) {
        const names = failed.map((f) => {
          const r = sheet.rows.find((x) => x.guard._id === f.guardId && x.site._id === f.siteId);
          const name = r ? `${r.guard.firstName} ${r.guard.lastName}` : f.guardId;
          return `${name}: ${f.message}`;
        });
        setError(t('attendanceSavedWithRejected', { saved: String(savedCount), rejected: String(failed.length), detail: names.join(' | ') }));
      } else {
        setNotice(t('attendanceSavedMonthly', { count: String(savedCount), period: `${monthName(month)} ${year}` }));
      }
      const feedback = failed.length > 0 ? null : t('attendanceSavedMonthly', { count: String(savedCount), period: `${monthName(month)} ${year}` });
      const saveError = failed.length > 0 ? t('attendanceSavedWithRejected', { saved: String(savedCount), rejected: String(failed.length), detail: failed.map(f => f.message).join(' | ') }) : null;
      await loadSheet();
      setNotice(feedback);
      setError(saveError);
    } catch (e) {
      setError(errMsg(e, t('attendanceFailedSave')));
    } finally {
      setSheetSaving(false);
    }
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  };

  const dirty = roster
    ? roster.rows.some((row) => {
        const d = drafts[row.guard._id];
        if (!d || !d.touched) return false;
        const rec = row.record;
        if (d.hours === '') return false;
        return !rec || String(rec.hoursWorked) !== d.hours || !!rec.isHoliday !== d.isHoliday;
      })
    : false;

  const summary = useMemo(() => {
    if (!roster) return { present: 0, hours: 0, holiday: 0, records: 0 };
    let present = 0, hours = 0, holiday = 0, records = 0;
    for (const row of roster.rows) {
      const rec = row.record;
      const draft = drafts[row.guard._id];
      const h = draft && draft.hours !== '' ? Number(draft.hours) : rec ? rec.hoursWorked : 0;
      const isHol = draft && draft.hours !== '' ? draft.isHoliday : rec ? rec.isHoliday : false;
      if (h > 0) { present += 1; records += 1; hours += h; if (isHol) holiday += h; }
    }
    return { present, hours: Math.round(hours * 100) / 100, holiday: Math.round(holiday * 100) / 100, records };
  }, [roster, drafts]);

  const locked = roster ? !roster.editable : false;
  const sheetLocked = !!periodLock?.locked;

  const visibleSheetRows = useMemo(() => {
    if (!sheet) return [];
    if (!sheetOnly) return sheet.rows;
    return sheet.rows.filter((r) => r.sheet);
  }, [sheet, sheetOnly]);

  return (
    <div className="p-6 space-y-5">
      <div className="border-b border-line flex items-center justify-between" data-tour="att-tabs">
        <Tabs
          tabs={[
            { key: 'daily', label: t('attendanceTabDaily') },
            { key: 'hours', label: t('attendanceTabMonthlyHours') },
            { key: 'monthly', label: t('attendanceTabMonthlyTotals') },
          ]}
          active={tab}
          onChange={(k) => setTab(k as 'daily' | 'monthly' | 'hours')}
        />
        <div className="pr-2 pb-2">
          <InfoTooltip position="left" content={t('attendanceSubtitle')} />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-danger-line bg-danger-subtle px-4 py-3 text-sm text-danger">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-danger opacity-60 hover:opacity-100"><X size={14} /></button>
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-success-line bg-success-subtle px-4 py-3 text-sm text-success">
          <CheckCircle2 size={16} />
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice(null)} className="text-success opacity-60 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      {/* ───────────────────────── DAILY ENTRY ───────────────────────── */}
      {tab === 'daily' && (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[240px] flex-1">
                <Select label={t('attendanceSite')} value={siteId} onChange={(e) => setSiteId(e.target.value)} placeholder={t('attendanceSelectSite')}>
                  {sites.map((s) => (
                    <option key={s._id} value={s._id}>{s.siteName}{s.siteCode ? ` (${s.siteCode})` : ''}</option>
                  ))}
                </Select>
              </div>
              <div className="w-44">
                <FormField
                  label={t('attendanceDate')}
                  type="date"
                  value={date}
                  max={canFuture ? undefined : todayYmd()}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="md" onClick={() => setDate(toYmd(new Date()))}>{t('attendanceToday')}</Button>
                <Button variant="secondary" size="md" onClick={() => setDate(toYmd(new Date(Date.now() - 86400000)))}>{t('attendanceYesterday')}</Button>
              </div>
              {roster && (
                <div className="ml-auto flex items-center gap-4 text-sm text-muted">
                  <span><b className="text-ink">{summary.present}</b> {t('attendanceGuards')}</span>
                  <span><b className="text-ink">{summary.hours}</b> {t('attendanceTotalHours')}</span>
                  {summary.holiday > 0 && <span><b className="text-warning">{summary.holiday}</b> {t('attendanceHolidayHoursShort')}</span>}
                </div>
              )}
            </div>
            {roster && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                <Badge variant={periodLock?.locked ? 'danger' : 'success'}>
                  {t('attendancePayrollPeriodLabel', { period: dayPeriodLabel(roster.date), status: periodLock?.locked ? 'LOCKED' : 'OPEN' })}
                </Badge>
                <span>{t('attendanceDailyLimits', { expected: String(roster.config.expectedDailyHours), max: String(roster.config.maxDailyHours) })}</span>
                {roster.futureDate && <Badge variant="warning">{t('attendanceFutureDate')}</Badge>}
              </div>
            )}
          </Card>

          {locked && roster && (
            <div className="rounded-lg border border-danger-line bg-danger-subtle px-4 py-3 text-sm text-danger">
              {t('attendancePeriodLockedDaily', { period: dayPeriodLabel(roster.date) })}
            </div>
          )}

          {loading && <LoadingSpinner text={t('attendanceLoadingRoster')} />}

          {!loading && roster && roster.rows.length === 0 && (
            <Card>
              <EmptyState
                icon={<CalendarDays size={40} />}
                title={t('attendanceNoGuardsAssigned')}
                description={t('attendanceAssignGuardsHint')}
              />
            </Card>
          )}

          {!loading && roster && roster.rows.length > 0 && (
            <Card padding={false} className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-subtle text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="px-4 py-3">{t('attendanceGuard')}</th>
                    <th className="px-4 py-3">{t('attendanceRole')}</th>
                    <th className="px-4 py-3 text-right">{t('attendanceOtherSitesToday')}</th>
                    <th className="px-4 py-3 w-40">{t('attendanceHoursWorked')}</th>
                    <th className="px-4 py-3 text-center">{t('attendanceHoliday')}</th>
                    <th className="px-4 py-3 text-right">{t('status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {roster.rows.map((row) => {
                    const draft = drafts[row.guard._id] || { hours: '', isHoliday: false, touched: false };
                    const rowErr = rowErrors[row.guard._id];
                    const h = draft.hours === '' ? null : Number(draft.hours);
                    const warn = h !== null && Number.isFinite(h) && h > roster.config.expectedDailyHours && !rowErr;
                    const changed = row.record ? String(row.record.hoursWorked) !== draft.hours || !!row.record.isHoliday !== draft.isHoliday : false;
                    const totalToday = (h && Number.isFinite(h) ? h : 0) + row.otherSiteHours;
                    return (
                      <tr key={row.guard._id} className={`transition-colors ${rowErr ? 'bg-danger-subtle/60' : changed ? 'bg-info-subtle/40' : 'hover:bg-subtle/60'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-ink">{row.guard.firstName} {row.guard.lastName}</span>
                            <span className="text-xs text-subtext font-mono">{row.guard.employeeCode}</span>
                            {row.assignment.isPrimary && <Badge variant="info">{t('attendancePrimary')}</Badge>}
                          </div>
                          {!row.attendable && (
                            <span className="text-xs text-danger">{t('attendanceNotAttendable', { status: row.guard.status })}</span>
                          )}
                          {rowErr && <span className="text-xs text-danger">{rowErr}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${row.assignment.role === 'SUPERVISOR' ? 'bg-warning-subtle text-warning' : 'bg-subtle text-muted'}`}>
                            {row.assignment.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.otherSiteHours > 0 ? (
                            <span className={totalToday > roster.config.maxDailyHours ? 'text-danger font-semibold' : 'text-muted'}>
                              {row.otherSiteHours}h
                              <span className="block text-[10px] text-subtext">
                                {row.otherSiteDetail.map((d) => d.siteName).join(', ')}
                              </span>
                            </span>
                          ) : (
                            <span className="text-subtext opacity-50">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              step="0.25"
                              disabled={locked || !canManage || !row.attendable}
                              value={draft.hours}
                              onChange={(e) => setDraft(row.guard._id, { hours: e.target.value })}
                              placeholder="0"
                              className={`v-input disabled:opacity-50 ${
                                rowErr ? 'border-danger-line focus:ring-danger/30' : warn ? 'border-warning-line focus:ring-warning/30' : ''
                              }`}
                            />
                            {warn && (
                              <span className="absolute -top-5 right-0 text-[10px] font-medium text-warning">
                                {t('attendanceAboveExpected', { expected: String(roster.config.expectedDailyHours) })}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            disabled={locked || !canManage}
                            checked={draft.isHoliday}
                            onChange={(e) => setDraft(row.guard._id, { isHoliday: e.target.checked })}
                            className="h-4 w-4 rounded border-line text-primary-600 focus:ring-primary-500 bg-surface"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {row.record && (
                              <>
                                <Badge variant={row.record.isHoliday ? 'warning' : 'success'}>
                                  {row.record.hoursWorked}h{row.record.isHoliday ? ` · ${t('attendanceHoliday')}` : ''}
                                </Badge>
                                {canManage && !locked && (
                                  <button
                                    onClick={() => setVoidTarget({ recordId: row.record!._id, guardName: `${row.guard.firstName} ${row.guard.lastName}`, hours: row.record!.hoursWorked })}
                                    className="text-xs text-danger hover:underline"
                                  >
                                    {t('attendanceVoid')}
                                  </button>
                                )}
                              </>
                            )}
                            {!row.record && <span className="text-xs text-subtext">{t('attendanceNoEntry')}</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}

          {!loading && roster && roster.rows.length > 0 && (
            <div className="flex justify-end" data-tour="att-save-daily">
              <Button onClick={saveDay} disabled={saving || locked || !canManage || !dirty}>
                {saving ? t('attendanceSaving') : t('attendanceSaveAttendance')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────── MONTHLY HOURS (NEW) ─────────────────────── */}
      {tab === 'hours' && (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => shiftMonth(-1)}><ChevronLeft size={16} /></Button>
                <span className="min-w-[150px] text-center text-sm font-semibold text-ink">{monthName(month)} {year}</span>
                <Button variant="secondary" size="sm" onClick={() => shiftMonth(1)}><ChevronRight size={16} /></Button>
              </div>
              <div className="w-56">
                <Select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} placeholder={t('attendanceAllSites')}>
                  {sites.map((s) => (
                    <option key={s._id} value={s._id}>{s.siteName}</option>
                  ))}
                </Select>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={sheetOnly}
                  onChange={(e) => setSheetOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-line text-primary-600 focus:ring-primary-500 bg-surface"
                />
                {t('attendanceOnlyWithSheets')}
              </label>
              {sheet && (
                <div className="ml-auto flex items-center gap-4 text-sm text-muted">
                  <span><b className="text-ink">{sheet.stats.savedSheets}</b> {t('attendanceSheetsSaved')}</span>
                  <Badge variant={periodLock?.locked ? 'danger' : 'info'}>{periodLock?.locked ? 'LOCKED' : 'OPEN'}</Badge>
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-info-line bg-info-subtle px-3 py-2 text-xs text-ink">
              <Info size={14} className="text-info flex-shrink-0" />
              <span className="text-muted">{t('attendanceMonthlyHoursHint')}</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary-500" />{t('attendanceSectionNormal')}</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" />{t('attendanceSectionHoliday')}</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-info" />{t('attendanceSectionSunday')}</span>
            </div>
          </Card>

          {sheetLocked && sheet && (
            <div className="rounded-lg border border-danger-line bg-danger-subtle px-4 py-3 text-sm text-danger">
              {t('attendancePeriodLockedMonthly', { period: periodLabel })}
            </div>
          )}

          {sheetLoading && <LoadingSpinner text={t('attendanceLoadingMonthlyHours')} />}

          {!sheetLoading && sheet && sheet.rows.length === 0 && (
            <Card>
              <EmptyState
                icon={<ClipboardList size={40} />}
                title={t('attendanceNoAssignedGuards')}
                description={t('attendanceAssignGuardsHint')}
              />
            </Card>
          )}

          {!sheetLoading && sheet && visibleSheetRows.length > 0 && (
            <Card padding={false} className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-subtle text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="px-4 py-3">{t('attendanceGuard')}</th>
                    <th className="px-4 py-3">{t('attendanceSite')}</th>
                    <th className="px-4 py-3 w-28 text-right bg-primary-500/5 text-primary-600">{t('attendanceColNormalHours')}</th>
                    <th className="px-4 py-3 w-28 text-right bg-warning/5 text-warning">{t('attendanceColHolidayHours')}</th>
                    <th className="px-4 py-3 w-28 text-right bg-info/5 text-info">{t('attendanceColSundayHours')}</th>
                    <th className="px-4 py-3 w-28 text-right">{t('attendanceColMonthlyTotal')}</th>
                    <th className="px-4 py-3 text-right">{t('attendanceColDailyRecords')}</th>
                    <th className="px-4 py-3">{t('attendanceNotes')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visibleSheetRows.map((row) => {
                    const key = rowKey(row.guard._id, row.site._id);
                    const draft = sheetDrafts[key] || { normalHours: '', holidayHours: '', sundayHours: '', notes: '', touched: false };
                    const rowErr = sheetRowErrors[key];
                    const n = draft.normalHours === '' ? 0 : Number(draft.normalHours) || 0;
                    const h = draft.holidayHours === '' ? 0 : Number(draft.holidayHours) || 0;
                    const s = draft.sundayHours === '' ? 0 : Number(draft.sundayHours) || 0;
                    const total = Math.round((n + h + s) * 100) / 100;
                    const changed = !!draft.touched;
                    return (
                      <tr key={key} className={`transition-colors ${rowErr ? 'bg-danger-subtle/60' : changed ? 'bg-info-subtle/40' : 'hover:bg-subtle/60'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-ink">{row.guard.firstName} {row.guard.lastName}</span>
                            <span className="text-xs text-subtext font-mono">{row.guard.employeeCode}</span>
                            {row.assignment.isPrimary && <Badge variant="info">{t('attendancePrimary')}</Badge>}
                          </div>
                          {rowErr && <span className="text-xs text-danger">{rowErr}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-ink">{row.site.siteName}</span>
                          {row.site.siteCode && <span className="ml-1.5 text-xs text-subtext font-mono">{row.site.siteCode}</span>}
                        </td>
                        {HOURS_SECTIONS.map((section) => (
                          <td key={section.key} className="px-4 py-3">
                            <input
                              type="number"
                              min={0}
                              step="0.25"
                              disabled={sheetLocked || !canManage}
                              value={draft[section.key]}
                              onChange={(e) => setSheetDraft(key, { [section.key]: e.target.value })}
                              placeholder="0"
                              className={`v-input text-right disabled:opacity-50 ${section.inputCls} ${rowErr ? 'border-danger-line' : ''}`}
                            />
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right font-semibold text-ink">{total || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          {row.daily ? (
                            <span className={row.warnings.length > 0 ? 'font-semibold text-warning' : 'text-muted'}>
                              {row.daily.totalHours}h
                              {row.daily.holidayHours > 0 && (
                                <span className="block text-[10px] text-warning">{t('attendanceHolidayHoursShort')}: {row.daily.holidayHours}h</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-subtext opacity-50">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            disabled={sheetLocked || !canManage}
                            value={draft.notes}
                            onChange={(e) => setSheetDraft(key, { notes: e.target.value })}
                            className="v-input text-xs disabled:opacity-50"
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {visibleSheetRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-subtext">
                        {t('attendanceNoSheetsForPeriod', { period: `${monthName(month)} ${year}` })}
                      </td>
                    </tr>
                  )}
                </tbody>
                {sheet.stats.savedSheets > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-line bg-subtle text-sm font-semibold text-ink">
                      <td className="px-4 py-3" colSpan={2}>{t('attendanceTotalsAllSheets')}</td>
                      <td className="px-4 py-3 text-right text-primary-600">{sheet.stats.totalNormal}</td>
                      <td className="px-4 py-3 text-right text-warning">{sheet.stats.totalHoliday}</td>
                      <td className="px-4 py-3 text-right text-info">{sheet.stats.totalSunday}</td>
                      <td className="px-4 py-3 text-right">{Math.round((sheet.stats.totalNormal + sheet.stats.totalHoliday + sheet.stats.totalSunday) * 100) / 100}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </Card>
          )}

          {!sheetLoading && sheet && sheet.rows.length > 0 && (
            <div className="flex justify-end">
              <Button onClick={saveMonthlySheet} disabled={sheetSaving || sheetLocked || !canManage || !sheetDirty}>
                {sheetSaving ? t('attendanceSaving') : t('attendanceSaveMonthlyHours')}
              </Button>
            </div>
          )}

          {!sheetLoading && sheet && sheet.rows.some((r) => r.warnings.length > 0) && (
            <Card>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                <AlertTriangle size={15} className="text-warning" />
                {t('attendanceDifferencesTitle')}
              </p>
              <ul className="space-y-1.5 text-sm text-muted">
                {sheet.rows.filter((r) => r.warnings.length > 0).flatMap((r) =>
                  r.warnings.map((w, i) => (
                    <li key={`${r.guard._id}-${r.site._id}-${i}`} className="flex items-start gap-2">
                      <AlertTriangle size={13} className="mt-1 flex-shrink-0 text-warning" />
                      <span>
                        <b className="text-ink">{r.guard.employeeCode} {r.guard.firstName} {r.guard.lastName}</b> · {r.site.siteName}: {w}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* ───────────────────────── MONTHLY TOTALS ───────────────────────── */}
      {tab === 'monthly' && (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => shiftMonth(-1)}><ChevronLeft size={16} /></Button>
                <span className="min-w-[150px] text-center text-sm font-semibold text-ink">{monthName(month)} {year}</span>
                <Button variant="secondary" size="sm" onClick={() => shiftMonth(1)}><ChevronRight size={16} /></Button>
              </div>
              <div className="w-56">
                <Select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} placeholder={t('attendanceAllSites')}>
                  {sites.map((s) => (
                    <option key={s._id} value={s._id}>{s.siteName}</option>
                  ))}
                </Select>
              </div>
              {totals && (
                <div className="ml-auto flex items-center gap-4 text-sm text-muted">
                  <span><b className="text-ink">{totals.rows.length}</b> {t('attendanceGuards')}</span>
                  <span><b className="text-ink">{totals.grandTotal}</b> {t('attendanceTotalHours')}</span>
                  <Badge variant={periodLock?.locked ? 'danger' : 'info'}>{periodLock?.locked ? 'LOCKED' : 'OPEN'}</Badge>
                </div>
              )}
              {readiness && (
                <Badge variant={readiness.ready ? 'success' : 'warning'}>
                  {readiness.ready ? t('attendancePayrollReady') : t('attendanceIssuesCount', { count: String(readiness.issues.length) })}
                </Badge>
              )}
            </div>
          </Card>

          {monthlyLoading && <LoadingSpinner text={t('attendanceLoadingMonthly')} />}

          {!monthlyLoading && totals && (
            <>
              <Card className="p-3 flex flex-wrap gap-3">
                <input aria-label="Search attendance guard" placeholder="Guard name or identifier" className="v-input max-w-xs" value={guardSearch} onChange={(e) => setGuardSearch(e.target.value)} />
                <select aria-label="Primary site filter" className="v-input max-w-xs" value={primaryFilter} onChange={(e) => setPrimaryFilter(e.target.value)}><option value="">All primary sites</option>{sites.map((s) => <option key={s._id} value={s._id}>{s.siteName}</option>)}</select>
                <select aria-label="Additional site filter" className="v-input max-w-xs" value={additionalFilter} onChange={(e) => setAdditionalFilter(e.target.value)}><option value="">All additional sites</option>{sites.map((s) => <option key={s._id} value={s._id}>{s.siteName}</option>)}</select>
                <select aria-label="Attendance status filter" className="v-input max-w-xs" value={attendanceStatus} onChange={(e) => setAttendanceStatus(e.target.value)}><option value="">All attendance statuses</option><option value="recorded">Recorded attendance</option><option value="missing">Missing attendance</option></select>
                <p className="w-full text-xs text-muted">Canonical payroll hours: each site’s monthly sheet overrides only that site’s daily records. Guard/site filters retain all relevant additional-site hours.</p>
              </Card>
              <Card padding={false} className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-subtle text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      <th className="px-4 py-3">{t('attendanceGuard')}</th>
                      <th className="px-4 py-3">{t('attendanceSite')}</th>
                      <th className="px-4 py-3 text-right">Normal / Sunday hours</th>
                      <th className="px-4 py-3 text-right">{t('attendanceColHolidayHours')}</th>
                      <th className="px-4 py-3 text-right">{t('attendanceTotalHours')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {totals.rows.filter((row) => `${row.guard.firstName} ${row.guard.lastName} ${row.guard.employeeCode}`.toLowerCase().includes(guardSearch.toLowerCase()) &&
                      (!primaryFilter || row.primarySiteId === primaryFilter) &&
                      (!additionalFilter || row.sites.some((s) => !s.isPrimary && s.siteId === additionalFilter)) &&
                      (!attendanceStatus || (attendanceStatus === 'missing' ? row.totalHours === 0 : row.totalHours > 0))).map((row) =>
                      (row.sites.length ? row.sites : [{ siteId: 'missing', siteName: row.primarySiteName || 'Unresolved primary', siteCode: '', isPrimary: true, normalHours: 0, sundayHours: 0, holidayHours: 0, totalHours: 0, dayCount: 0, source: 'NO ATTENDANCE' }]).map((s, idx) => (
                        <tr key={`${row.guard._id}-${s.siteId}`} className="hover:bg-subtle/60">
                          <td className="px-4 py-3 align-top">
                            {idx === 0 && (
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-ink">{row.guard.firstName} {row.guard.lastName}</span>
                                <span className="text-xs text-subtext font-mono">{row.guard.employeeCode}</span>
                                <span className="text-xs text-muted">Primary: {row.primarySiteName || 'Unresolved'} · Overall {row.totalHours}h {row.warnings?.join(' ')}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-ink">{s.siteName}</span>
                              {s.isPrimary && <Badge variant="info">{t('attendancePrimary')}</Badge>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-muted tabular-nums">{s.normalHours} / {s.sundayHours}<small className="block">{s.source}</small></td>
                          <td className="px-4 py-3 text-right text-warning">{s.holidayHours || '—'}</td>
                          <td className="px-4 py-3 text-right font-semibold text-ink">{s.totalHours}</td>
                        </tr>
                      ))
                    )}
                    {totals.rows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-subtext">
                          {t('attendanceNoAttendanceForPeriod', { period: `${monthName(month)} ${year}` })}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-line bg-subtle text-sm font-semibold text-ink">
                      <td className="px-4 py-3" colSpan={4}>All loaded guards — filters above do not change this total</td>
                      <td className="px-4 py-3 text-right">{totals.grandTotal}</td>
                    </tr>
                  </tfoot>
                </table>
              </Card>

              {totals.missingAttendance.length > 0 && (
                <Card>
                  <div className="flex items-start gap-2 text-sm text-warning">
                    <AlertTriangle size={16} className="mt-0.5" />
                    <div>
                      <span className="font-semibold">{t('attendanceNoAttendanceThisPeriod')}</span>{' '}
                      {totals.missingAttendance.map((g) => `${g.employeeCode} ${g.firstName} ${g.lastName}`).join(', ')}
                    </div>
                  </div>
                </Card>
              )}

              {readiness && readiness.issues.length > 0 && (
                <Card>
                  <p className="mb-2 text-sm font-semibold text-ink">{t('attendancePayrollReadiness')}</p>
                  <ul className="space-y-1 text-sm text-muted">
                    {readiness.issues.slice(0, 20).map((issue, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <AlertTriangle size={14} className="mt-1 flex-shrink-0 text-warning" />
                        <span>
                          {issue.guard.employeeCode ? `${issue.guard.employeeCode} ${issue.guard.firstName} ${issue.guard.lastName}: ` : ''}
                          {issue.message}
                        </span>
                      </li>
                    ))}
                    {readiness.issues.length > 20 && (
                      <li className="text-xs text-subtext">{t('attendanceAndMore', { count: String(readiness.issues.length - 20) })}</li>
                    )}
                  </ul>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      <Modal open={!!voidTarget} onClose={() => { setVoidTarget(null); setVoidReason(''); }} title={t('attendanceVoidEntryTitle')}>
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {t('attendanceVoidEntryBody', {
              guard: voidTarget?.guardName || '',
              hours: String(voidTarget?.hours ?? ''),
              date: roster ? formatDisplayDate(roster.date) : '',
            })}
          </p>
          <FormField
            label={t('attendanceReason')}
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            placeholder={t('attendanceVoidReasonPlaceholder')}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setVoidTarget(null); setVoidReason(''); }}>{t('cancel')}</Button>
            <Button variant="danger" onClick={voidRecord} disabled={voiding || !voidReason.trim()}>
              {voiding ? t('attendanceVoiding') : t('attendanceVoidEntry')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
