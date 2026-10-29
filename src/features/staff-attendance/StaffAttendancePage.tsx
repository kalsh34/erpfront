import { useEffect, useState, useCallback } from 'react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { UserRole, StaffAttendanceStatus } from '../../types';
import { Button, Card, LoadingSpinner, Modal } from '../../components/ui';
import { InfoTooltip } from '../../components/ui/Tooltip';
import { useT, useLang, getMonthNames } from '../../i18n';
import type { DictKey } from '../../i18n';

interface Employee {
  _id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  status?: string;
  department?: string;
  position?: string;
}

interface DayCell {
  day: number;
  status: StaffAttendanceStatus | null;
  isWeekend: boolean;
}

interface GridRow {
  employee: Employee;
  days: DayCell[];
}

interface StatusCounts {
  PRESENT: number;
  ABSENT: number;
  PAID_LEAVE: number;
  UNPAID_LEAVE: number;
  SICK_LEAVE: number;
  HALF_DAY: number;
  HOLIDAY: number;
  WEEKEND: number;
}

interface StaffSummary {
  employee: Employee;
  counts: StatusCounts;
  payableDays: number;
  totalDaysInMonth: number;
}

const STATUS_OPTIONS: { value: StaffAttendanceStatus; label: string; color: string; titleKey: DictKey }[] = [
  { value: StaffAttendanceStatus.PRESENT, label: 'P', color: 'bg-green-500 text-white', titleKey: 'colPresent' },
  { value: StaffAttendanceStatus.ABSENT, label: 'A', color: 'bg-red-500 text-white', titleKey: 'colAbsent' },
  { value: StaffAttendanceStatus.PAID_LEAVE, label: 'PL', color: 'bg-blue-500 text-white', titleKey: 'stPaidLeave' },
  { value: StaffAttendanceStatus.UNPAID_LEAVE, label: 'UL', color: 'bg-orange-400 text-white', titleKey: 'stUnpaidLeave' },
  { value: StaffAttendanceStatus.SICK_LEAVE, label: 'SL', color: 'bg-yellow-400 text-black', titleKey: 'stSickLeave' },
  { value: StaffAttendanceStatus.HALF_DAY, label: 'HD', color: 'bg-purple-500 text-white', titleKey: 'halfDay' },
  { value: StaffAttendanceStatus.HOLIDAY, label: 'H', color: 'bg-blue-300 text-blue-900', titleKey: 'stHoliday' },
  { value: StaffAttendanceStatus.WEEKEND, label: 'W', color: 'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-200', titleKey: 'stWeekend' },
];

const STATUS_MAP = new Map(STATUS_OPTIONS.map((s) => [s.value, s]));

const WEEKDAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Real HR status of the employee (from the Employee record), shown in the log. */
const EMPLOYEE_STATUS_KEYS: Record<string, DictKey> = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  TERMINATED: 'statusTerminated',
  ON_LEAVE: 'statusOnLeave',
  CONTRACTED: 'statusContracted',
};
const EMPLOYEE_STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-success-subtle text-success-text border-success-line',
  CONTRACTED: 'bg-info-subtle text-info-text border-info-line',
  ON_LEAVE: 'bg-warning-subtle text-warning-text border-warning-line',
  INACTIVE: 'bg-subtle text-muted border-line',
  TERMINATED: 'bg-danger-subtle text-danger-text border-danger-line',
};

export default function StaffAttendancePage() {
  const { user } = useAuthStore();
  const t = useT();
  const lang = useLang();
  const monthNames = getMonthNames(lang);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [grid, setGrid] = useState<GridRow[]>([]);
  const [daysInMonth, setDaysInMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMenu, setShowMenu] = useState<{ employeeId: string; day: number } | null>(null);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'summary'>('grid');
  const [summaries, setSummaries] = useState<StaffSummary[]>([]);

  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [bulkDay, setBulkDay] = useState<number | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  const isHR = user?.role === UserRole.HR_ADMIN || user?.role === UserRole.FINANCE_OFFICER;
  const isAdmin = user?.role === UserRole.SUPER_ADMIN;
  const canManage = isHR || isAdmin;

  const statusLabel = (status: StaffAttendanceStatus) => STATUS_MAP.get(status)?.titleKey
    ? t(STATUS_MAP.get(status)!.titleKey)
    : status;

  const loadGrid = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/staff-attendance/grid?year=${year}&month=${month}`);
      const data = res.data.data;
      setGrid(data.grid || []);
      setDaysInMonth(data.daysInMonth || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [year, month]);

  const loadSummary = useCallback(async () => {
    try {
      const res = await api.get(`/staff-attendance/summary?year=${year}&month=${month}`);
      setSummaries(res.data.data.summaries || []);
    } catch (e) { console.error(e); }
  }, [year, month]);

  useEffect(() => { loadGrid(); loadSummary(); setSelectedEmployees(new Set()); setBulkDay(null); }, [loadGrid, loadSummary]);

  const filteredGrid = grid.filter((row) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${row.employee.firstName} ${row.employee.lastName}`.toLowerCase();
    const code = row.employee.employeeCode.toLowerCase();
    return name.includes(q) || code.includes(q);
  });

  const filteredSummary = summaries.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${s.employee.firstName} ${s.employee.lastName}`.toLowerCase();
    const code = s.employee.employeeCode.toLowerCase();
    return name.includes(q) || code.includes(q);
  });

  const handleStatusChange = async (employeeId: string, day: number, status: StaffAttendanceStatus) => {
    setSaving(true);
    try {
      await api.post('/staff-attendance/day', { employeeId, year, month, dayOfMonth: day, status });
      setShowMenu(null);
      await loadGrid();
      await loadSummary();
    } catch (e: any) { alert(e.response?.data?.message || t('genericFailed')); }
    finally { setSaving(false); }
  };

  const handleBulkMark = async (status: StaffAttendanceStatus, day?: number) => {
    const targetDay = day || showMenu?.day;
    if (!targetDay) return;
    if (!confirm(t('markAllConfirm', { status: statusLabel(status), day: targetDay }))) return;
    setSaving(true);
    try {
      await api.post('/staff-attendance/bulk', { year, month, dayOfMonth: targetDay, status });
      setShowMenu(null);
      await loadGrid();
      await loadSummary();
    } catch (e: any) { alert(e.response?.data?.message || t('genericFailed')); }
    finally { setSaving(false); }
  };

  const handleQuickMarkAll = async (status: StaffAttendanceStatus) => {
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
    const targetDay = isCurrentMonth ? today.getDate() : 1;
    if (!confirm(t('markAllConfirmDate', { status: statusLabel(status), day: targetDay, date: `${monthNames[month - 1]} ${targetDay}` }))) return;
    setSaving(true);
    try {
      await api.post('/staff-attendance/bulk', { year, month, dayOfMonth: targetDay, status });
      await loadGrid();
      await loadSummary();
    } catch (e: any) { alert(e.response?.data?.message || t('genericFailed')); }
    finally { setSaving(false); }
  };

  const handleBulkApplyStatus = async (status: StaffAttendanceStatus) => {
    if (!bulkDay || selectedEmployees.size === 0) return;
    setBulkSaving(true);
    try {
      await Promise.all(
        Array.from(selectedEmployees).map((employeeId) =>
          api.post('/staff-attendance/day', { employeeId, year, month, dayOfMonth: bulkDay, status })
        )
      );
      await loadGrid();
      await loadSummary();
    } catch (e: any) { alert(e.response?.data?.message || t('failedApplyStatus')); }
    finally { setBulkSaving(false); }
  };

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allIds = filteredGrid.map((r) => r.employee._id);
    setSelectedEmployees((prev) => {
      if (allIds.length > 0 && allIds.every((id) => prev.has(id))) {
        return new Set();
      }
      return new Set(allIds);
    });
  };

  const allSelected = filteredGrid.length > 0 && filteredGrid.every((r) => selectedEmployees.has(r.employee._id));

  const handlePrint = () => {
    const printContent = document.getElementById(view === 'grid' ? 'attendance-grid' : 'summary-table');
    if (!printContent) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const title = view === 'grid' ? 'Staff Attendance' : 'Staff Attendance Summary';
    win.document.write(`
      <html><head><title>${title} - ${monthNames[month-1]} ${year}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        h2 { font-size: 14px; color: #666; margin-top: 0; }
        table { border-collapse: collapse; width: 100%; font-size: 11px; }
        th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: center; }
        th { background: #f3f4f6; font-weight: 600; }
        .staff-name { text-align: left; font-weight: 500; min-width: 120px; }
        .weekend { background: #f3f4f6; }
        .p { background: #22c55e; color: white; }
        .a { background: #ef4444; color: white; }
        .pl { background: #3b82f6; color: white; }
        .ul { background: #fb923c; color: white; }
        .sl { background: #facc15; color: #111; }
        .hd { background: #a855f7; color: white; }
        .h { background: #93c5fd; color: #1e3a5f; }
        .w { background: #d1d5db; color: #374151; }
        .summary { font-weight: 700; }
        .legend { margin-top: 12px; font-size: 10px; }
        .legend span { margin-right: 12px; }
        .no-print { display: none; }
        @media print { .no-print { display: none; } }
      </style></head><body>
      <h1>Vital Security PLC — ${t('navStaffAttendance')}</h1>
      <h2>${monthNames[month-1]} ${year}</h2>
      ${printContent.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else { setMonth(month - 1); }
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else { setMonth(month + 1); }
  };

  const viewToggleCls = (active: boolean) =>
    `px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
      active ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
    }`;

  return (
    <div className="p-6 space-y-4">
      {/* View Toggle + Month Nav + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={prevMonth}>&larr; {t('previous')}</Button>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-ink">{monthNames[month - 1]} {year}</h2>
            <InfoTooltip content={view === 'grid' ? t('markDailyStatus') : t('payableDaysSummary')} />
          </div>
          <Button variant="ghost" size="sm" onClick={nextMonth}>{t('next')} &rarr;</Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-subtle p-0.5 rounded-lg border border-line">
            <button
              onClick={() => setView('grid')}
              className={viewToggleCls(view === 'grid')}
            >
              {t('grid')}
            </button>
            <button
              onClick={() => setView('summary')}
              className={viewToggleCls(view === 'summary')}
            >
              {t('summaryView')}
            </button>
          </div>

          <Button variant="secondary" size="sm" onClick={handlePrint}>
            {t('print')}
          </Button>

          {canManage && view === 'grid' && (
            <>
              <Button variant="ghost" size="sm" onClick={() => handleQuickMarkAll(StaffAttendanceStatus.PRESENT)} disabled={saving}>
                {t('markAllPresentToday')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleQuickMarkAll(StaffAttendanceStatus.ABSENT)} disabled={saving}>
                {t('markAllAbsentToday')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder={t('searchNameCode')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-line bg-surface text-ink placeholder-muted rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
              &times;
            </button>
          )}
        </div>
        {search && <p className="text-xs text-muted mt-1">{t('showingOf', { count: view === 'grid' ? filteredGrid.length : filteredSummary.length, total: view === 'grid' ? grid.length : summaries.length })}</p>}
      </div>

      {/* Bulk Action Toolbar */}
      {!loading && view === 'grid' && canManage && selectedEmployees.size > 0 && (
        <div className="mb-3 flex items-center gap-3 p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg flex-wrap">
          <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
            {t('staffSelected', { count: selectedEmployees.size })}
          </span>
          {bulkDay ? (
            <>
              <span className="text-xs text-primary-600 dark:text-primary-400">{t('forDay', { day: bulkDay })}</span>
              <button onClick={() => setBulkDay(null)} className="text-xs text-primary-500 hover:text-primary-700 underline">{t('clearDay')}</button>
            </>
          ) : (
            <span className="text-xs text-primary-500 italic">{t('clickDayHint')}</span>
          )}
          <div className="flex-1" />
          {STATUS_OPTIONS.filter((s) => s.value !== StaffAttendanceStatus.WEEKEND).map((s) => (
            <button
              key={s.value}
              onClick={() => handleBulkApplyStatus(s.value)}
              disabled={!bulkDay || bulkSaving}
              className={`px-2.5 py-1 rounded text-xs font-medium ${s.color} hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity`}
              title={bulkDay ? t('markSelectedAs', { status: t(s.titleKey), day: bulkDay }) : t('selectDayFirst')}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {loading && <LoadingSpinner text={t('loadingAttendance')} />}

      {!loading && view === 'grid' && (
        <div id="attendance-grid">
          <Card padding={false} className="overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr className="bg-subtle">
                  {canManage && (
                    <th className="px-2 py-2 border border-line sticky left-0 bg-subtle z-20 w-8">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="w-3.5 h-3.5 rounded border-line-strong text-primary-600 focus:ring-primary-500 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="text-left px-3 py-2 border border-line font-medium sticky left-0 bg-subtle z-10 min-w-[140px] text-ink">
                    {t('staff')}
                  </th>
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const dayNum = i + 1;
                    const dayOfWeek = new Date(year, month - 1, dayNum).getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const isSelected = bulkDay === dayNum;
                    return (
                      <th
                        key={i}
                        onClick={() => { if (canManage) setBulkDay(isSelected ? null : dayNum); }}
                        className={`px-2 py-2 border border-line text-center font-medium min-w-[36px] text-ink ${
                          isWeekend ? 'bg-canvas' : ''
                        } ${isSelected ? 'bg-primary-500/20 ring-2 ring-primary-400 ring-inset' : canManage ? 'cursor-pointer hover:bg-primary-500/10' : ''}`}
                        title={canManage ? t('clickDayHint') : ''}
                      >
                        {dayNum}
                        <div className={`text-[10px] font-normal ${isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-subtext'}`}>
                          {WEEKDAY_SHORT[dayOfWeek]}
                        </div>
                      </th>
                    );
                  })}
                  <th className="px-3 py-2 border border-line font-medium text-center bg-subtle text-ink">P</th>
                  <th className="px-3 py-2 border border-line font-medium text-center bg-subtle text-ink">A</th>
                  <th className="px-3 py-2 border border-line font-medium text-center bg-subtle text-ink">PL</th>
                  <th className="px-3 py-2 border border-line font-medium text-center bg-subtle text-ink">HD</th>
                </tr>
              </thead>
              <tbody>
                {filteredGrid.map((row) => {
                  const counts = { PRESENT: 0, ABSENT: 0, PAID_LEAVE: 0, HALF_DAY: 0 };
                  row.days.forEach((d) => {
                    if (d.status === 'PRESENT') counts.PRESENT++;
                    else if (d.status === 'ABSENT') counts.ABSENT++;
                    else if (d.status === 'PAID_LEAVE') counts.PAID_LEAVE++;
                    else if (d.status === 'HALF_DAY') counts.HALF_DAY++;
                  });
                  const isChecked = selectedEmployees.has(row.employee._id);
                  return (
                    <tr key={row.employee._id} className={`hover:bg-surface-hover transition-colors ${isChecked ? 'bg-primary-500/10' : ''}`}>
                      {canManage && (
                        <td className="px-2 py-1.5 border border-line sticky left-0 bg-surface z-10 w-8 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleEmployeeSelection(row.employee._id)}
                            className="w-3.5 h-3.5 rounded border-line-strong text-primary-600 focus:ring-primary-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-3 py-1.5 border border-line sticky left-0 bg-surface z-10">
                        <div className="font-medium text-sm text-ink">{row.employee.firstName} {row.employee.lastName}</div>
                        <div className="text-[10px] text-subtext flex items-center gap-1.5">
                          <span>{row.employee.employeeCode}</span>
                          <span className={`inline-flex px-1.5 py-px rounded-full text-[9px] font-medium border ${EMPLOYEE_STATUS_STYLE[row.employee.status || 'INACTIVE'] || 'bg-subtle text-muted border-line'}`}>
                            {t(EMPLOYEE_STATUS_KEYS[row.employee.status || 'INACTIVE'] ?? 'status')}
                          </span>
                        </div>
                      </td>
                      {row.days.map((d) => {
                        const statusInfo = d.status ? STATUS_MAP.get(d.status) : null;
                        return (
                          <td
                            key={d.day}
                            className={`px-1 py-1 border border-line text-center cursor-pointer hover:ring-2 hover:ring-primary-400 ${
                              d.isWeekend ? 'bg-canvas' : ''
                            } ${statusInfo?.color || 'bg-surface'}`}
                            onClick={() => {
                              if (canManage) setShowMenu({ employeeId: row.employee._id, day: d.day });
                            }}
                            title={statusInfo ? t(statusInfo.titleKey) : t('forDay', { day: d.day })}
                          >
                            {statusInfo?.label || ''}
                          </td>
                        );
                      })}
                      <td className="px-2 py-1.5 border border-line text-center font-semibold text-ink">{counts.PRESENT}</td>
                      <td className="px-2 py-1.5 border border-line text-center font-semibold text-danger-text">{counts.ABSENT}</td>
                      <td className="px-2 py-1.5 border border-line text-center font-semibold text-primary-600 dark:text-primary-400">{counts.PAID_LEAVE}</td>
                      <td className="px-2 py-1.5 border border-line text-center font-semibold text-purple-600 dark:text-purple-400">{counts.HALF_DAY}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredGrid.length === 0 && <div className="p-8 text-center text-muted">{search ? t('noMatchingStaff') : t('noStaffFound')}</div>}
          </Card>

          <div className="mt-4 flex flex-wrap gap-3 text-xs print:hidden">
            {STATUS_OPTIONS.map((s) => (
              <div key={s.value} className="flex items-center gap-1">
                <span className={`w-4 h-4 rounded ${s.color} flex items-center justify-center text-[8px] font-bold`}>{s.label}</span>
                <span className="text-muted">{t(s.titleKey)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && view === 'summary' && (
        <div id="summary-table">
          <Card padding={false} className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-subtle">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-subtext uppercase tracking-wider">{t('employee')}</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-subtext uppercase tracking-wider">{t('codeCol')}</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-subtext uppercase tracking-wider">{t('status')}</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-subtext uppercase tracking-wider">{t('daysCol')}</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-success-text uppercase tracking-wider">{t('colPresent')}</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-danger-text uppercase tracking-wider">{t('colAbsent')}</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-primary-700 dark:text-primary-300 uppercase tracking-wider">{t('stPaidLeave')}</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wider">{t('unpaid')}</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wider">{t('sick')}</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider">{t('halfDay')}</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{t('stWeekend')}</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-info-text uppercase tracking-wider">{t('stHoliday')}</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-success-text uppercase tracking-wider bg-success-subtle">
                    <span className="inline-flex items-center justify-center gap-1">
                      {t('payableDays')}
                      <InfoTooltip content={`${t('payrollFormula')}: payable_days = PRESENT + HOLIDAY + PAID_LEAVE + SICK_LEAVE + WEEKEND + (HALF_DAY × 0.5). ${t('formulaNote')}`} />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredSummary.length === 0 ? (
                  <tr><td colSpan={13} className="px-4 py-8 text-center text-muted">{search ? t('noMatchingStaff') : t('noData')}</td></tr>
                ) : filteredSummary.map((s) => (
                  <tr key={s.employee._id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3 text-left">
                      <p className="font-medium text-ink">{s.employee.firstName} {s.employee.lastName}</p>
                    </td>
                    <td className="px-3 py-3 text-center text-muted text-xs font-mono">{s.employee.employeeCode}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${EMPLOYEE_STATUS_STYLE[s.employee.status || 'INACTIVE'] || 'bg-subtle text-muted border-line'}`}>
                        {t(EMPLOYEE_STATUS_KEYS[s.employee.status || 'INACTIVE'] ?? 'status')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center text-muted">{s.totalDaysInMonth}</td>
                    <td className="px-3 py-3 text-center font-medium text-ink">{s.counts.PRESENT}</td>
                    <td className="px-3 py-3 text-center font-medium text-danger-text">{s.counts.ABSENT}</td>
                    <td className="px-3 py-3 text-center font-medium text-primary-600 dark:text-primary-400">{s.counts.PAID_LEAVE}</td>
                    <td className="px-3 py-3 text-center font-medium text-orange-600 dark:text-orange-400">{s.counts.UNPAID_LEAVE}</td>
                    <td className="px-3 py-3 text-center font-medium text-yellow-600 dark:text-yellow-400">{s.counts.SICK_LEAVE}</td>
                    <td className="px-3 py-3 text-center font-medium text-purple-600 dark:text-purple-400">{s.counts.HALF_DAY}</td>
                    <td className="px-3 py-3 text-center font-medium text-muted">{s.counts.WEEKEND}</td>
                    <td className="px-3 py-3 text-center font-medium text-info-text">{s.counts.HOLIDAY}</td>
                    <td className="px-3 py-3 text-center bg-success-subtle">
                      <span className="text-lg font-bold text-success-text">{s.payableDays}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}


      {showMenu && (
        <Modal open={!!showMenu} onClose={() => setShowMenu(null)} title={t('daySelectStatus', { day: showMenu.day })}>
          <div className="grid grid-cols-2 gap-1.5">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => handleStatusChange(showMenu.employeeId, showMenu.day, s.value)}
                disabled={saving}
                className={`px-2 py-1.5 rounded text-xs font-medium text-left ${s.color} hover:opacity-80 disabled:opacity-50`}
              >
                {s.label} — {t(s.titleKey)}
              </button>
            ))}
          </div>
          {canManage && (
            <div className="mt-3 pt-2 border-t border-line">
              <p className="text-[10px] text-subtext mb-1.5">{t('bulkMarkAll', { day: showMenu.day })}</p>
              <div className="flex flex-wrap gap-1">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => handleBulkMark(s.value)}
                    disabled={saving}
                    className="px-2 py-0.5 bg-subtle rounded text-[10px] text-ink hover:bg-surface-hover disabled:opacity-50"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
