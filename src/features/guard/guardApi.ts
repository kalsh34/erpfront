import api from '../../lib/api';

export interface GuardSiteRef {
  _id: string;
  siteName: string;
  siteCode: string;
  location?: string;
}

export interface GuardShiftRow {
  _id: string;
  siteId: GuardSiteRef | null;
  date: string;
  clockInAt: string;
  clockOutAt?: string;
  computedHours?: number;
  status: 'OPEN' | 'CLOSED';
  patrolCount?: number;
}

export interface GuardPatrolScanRow {
  _id: string;
  siteId: GuardSiteRef | null;
  scannedAt: string;
}

export interface GuardTodayRecord {
  _id: string;
  siteId: GuardSiteRef | null;
  hoursWorked: number;
  isHoliday: boolean;
}

export interface MyShiftsData {
  shifts: GuardShiftRow[];
  openShift: GuardShiftRow | null;
  todayRecords: GuardTodayRecord[];
  monthHours: number;
  periodKey: string;
}

export async function fetchMyShifts(): Promise<MyShiftsData> {
  const res = await api.get('/attendance/shifts/my', { params: { limit: 100 } });
  return res.data.data;
}

export async function clockIn(siteId: string): Promise<GuardShiftRow> {
  const res = await api.post('/attendance/shifts/clock-in', { siteId });
  return res.data.data;
}

export async function fetchScanSite(siteId: string): Promise<GuardSiteRef & { status: string }> {
  const res = await api.get(`/attendance/shifts/site/${siteId}`);
  return res.data.data;
}

export async function patrolScan(siteId: string): Promise<GuardPatrolScanRow> {
  const res = await api.post('/attendance/shifts/patrol', { siteId });
  return res.data.data;
}

export async function clockOut(): Promise<{ shift: GuardShiftRow; hours: number }> {
  const res = await api.post('/attendance/shifts/clock-out');
  return res.data.data;
}

export function errorMessage(err: any, fallback: string): string {
  return err?.response?.data?.message || err?.message || fallback;
}

export const fmtTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

export const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }) : '—';

export const fmtHours = (h?: number) => (typeof h === 'number' ? `${h.toFixed(2)}h` : '—');
