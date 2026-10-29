import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Square, QrCode, Clock, CalendarDays, ChevronRight } from 'lucide-react';
import GuardLayout from './GuardLayout';
import {
  fetchMyShifts, clockOut, errorMessage, fmtTime, fmtDate, fmtHours,
  MyShiftsData, GuardShiftRow,
} from './guardApi';
import { useT } from '../../i18n';

function elapsedSince(iso: string, now: number): string {
  const ms = Math.max(0, now - new Date(iso).getTime());
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export default function GuardDashboardPage() {
  const t = useT();
  const [data, setData] = useState<MyShiftsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    try {
      setData(await fetchMyShifts());
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Failed to load your shifts'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(tick);
  }, [load]);

  const onClockOut = async () => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const res = await clockOut();
      setSuccess(`${t('shiftEnded')} — ${fmtHours(res.hours)}`);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Clock out failed'));
    } finally {
      setBusy(false);
    }
  };

  const openShift: GuardShiftRow | null = data?.openShift || null;
  const todayHours = (data?.todayRecords || []).reduce((s, r) => s + (r.hoursWorked || 0), 0);

  return (
    <GuardLayout>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {success && (
          <div className="bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 rounded-xl px-4 py-3 text-sm">
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="v-card p-10 text-center text-muted text-sm">{t('loading')}</div>
        ) : openShift ? (
          /* ── ON SHIFT ─────────────────────────────── */
          <div className="v-card p-6 text-center border-l-4 border-green-500">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {t('onShift')}
            </span>
            <h2 className="text-xl font-bold text-ink mt-3">{openShift.siteId?.siteName || 'Site'}</h2>
            <p className="text-sm text-muted font-mono">{openShift.siteId?.siteCode}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="bg-subtle rounded-xl p-3">
                <p className="text-muted text-xs">{t('shiftStarted')}</p>
                <p className="font-semibold text-ink mt-0.5">{fmtTime(openShift.clockInAt)}</p>
              </div>
              <div className="bg-subtle rounded-xl p-3">
                <p className="text-muted text-xs">{t('elapsed')}</p>
                <p className="font-semibold text-ink mt-0.5">{elapsedSince(openShift.clockInAt, now)}</p>
              </div>
            </div>
            <button
              onClick={onClockOut}
              disabled={busy}
              className="mt-5 w-full py-4 rounded-2xl bg-red-600 text-white font-bold text-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <Square className="w-5 h-5" />
              {busy ? t('saving') : t('clockOut')}
            </button>
          </div>
        ) : (
          /* ── NOT ON SHIFT ─────────────────────────── */
          <div className="v-card p-6 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-subtle border border-line text-muted text-xs font-semibold">
              {t('notOnShift')}
            </span>
            <h2 className="text-lg font-bold text-ink mt-3">{t('scanQrSub')}</h2>
            <Link
              to="/guard/scan"
              className="mt-5 w-full py-4 rounded-2xl bg-green-600 text-white font-bold text-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              {t('clockIn')}
            </Link>
            <Link
              to="/guard/scan"
              className="mt-3 w-full py-3 rounded-2xl border border-line text-ink font-medium hover:bg-subtle transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <QrCode className="w-4 h-4" />
              {t('scanQr')}
            </Link>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="v-card p-4">
            <div className="flex items-center gap-2 text-muted text-xs">
              <CalendarDays className="w-4 h-4" />
              {t('workedToday')}
            </div>
            <p className="text-2xl font-bold text-ink mt-1">{fmtHours(todayHours)}</p>
          </div>
          <div className="v-card p-4">
            <div className="flex items-center gap-2 text-muted text-xs">
              <Clock className="w-4 h-4" />
              {t('hoursThisMonth')}
            </div>
            <p className="text-2xl font-bold text-ink mt-1">{fmtHours(data?.monthHours)}</p>
          </div>
        </div>

        {/* Recent shifts */}
        <div className="v-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-ink">{t('recentShifts')}</h3>
            <Link to="/guard/shifts" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-0.5">
              {t('view')}
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {(data?.shifts || []).slice(0, 5).map((s) => (
            <div key={s._id} className="flex items-center justify-between py-2 border-b border-line last:border-0 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-ink truncate">{s.siteId?.siteName || 'Site'}</p>
                <p className="text-xs text-muted">{fmtDate(s.clockInAt)} · {fmtTime(s.clockInAt)} → {s.clockOutAt ? fmtTime(s.clockOutAt) : '—'}</p>
              </div>
              <span className={`flex-shrink-0 ml-3 text-xs font-semibold px-2 py-1 rounded-full ${
                s.status === 'OPEN'
                  ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400'
                  : 'bg-subtle border border-line text-muted'
              }`}>
                {s.status === 'OPEN' ? t('onShift') : fmtHours(s.computedHours)}
              </span>
            </div>
          ))}
          {(data?.shifts || []).length === 0 && (
            <p className="text-sm text-muted text-center py-4">{t('noShifts')}</p>
          )}
        </div>
      </div>
    </GuardLayout>
  );
}
