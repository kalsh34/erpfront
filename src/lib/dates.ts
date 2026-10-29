/**
 * Calendar-date helpers for attendance UI.
 * Dates are calendar days (YYYY-MM-DD), never UTC-shifted via toISOString().
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** Format Date as local YYYY-MM-DD. */
export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today as local YYYY-MM-DD. */
export function todayYmd(): string {
  return toYmd(new Date());
}

/** Parse YYYY-MM-DD (or ISO) → local Date for display math. */
export function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '').trim());
  if (!m) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
}

/**
 * Calendar components for a stored attendance/rotation date.
 * Stored values are local midnight (may serialize as previous-day 21:00Z).
 */
export function ymdParts(dateInput: string | Date): { y: number; m: number; d: number } | null {
  if (typeof dateInput === 'string') {
    const parsed = parseYmd(dateInput);
    if (!parsed) return null;
    return { y: parsed.getFullYear(), m: parsed.getMonth() + 1, d: parsed.getDate() };
  }
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
}

/** Build YYYY-MM-DD from year/month/day numbers. */
export function ymd(y: number, month: number, day: number): string {
  return `${y}-${pad(month)}-${pad(day)}`;
}

/** Pretty display: "01 Sep 2026". */
export function formatDisplayDate(dateInput: string | Date): string {
  const parts = ymdParts(dateInput);
  if (!parts) return String(dateInput);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${pad(parts.d)} ${months[parts.m - 1]} ${parts.y}`;
}

/** Long display: "September 1, 2026". */
export function formatLongDate(dateInput: string | Date): string {
  const parts = ymdParts(dateInput);
  if (!parts) return String(dateInput);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[parts.m - 1]} ${parts.d}, ${parts.y}`;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0)) return 29;
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}
