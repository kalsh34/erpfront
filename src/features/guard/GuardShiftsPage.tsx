import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, Route } from 'lucide-react';
import GuardLayout from './GuardLayout';
import { fetchMyShifts, errorMessage, fmtTime, fmtDate, fmtHours, MyShiftsData } from './guardApi';
import { useT } from '../../i18n';

interface SiteHistoryRow {
  id: string;
  name: string;
  code: string;
  location?: string;
  visits: number;
  hours: number;
  patrols: number;
  lastShift: string;
}

export default function GuardShiftsPage() {
  const t = useT();
  const [data, setData] = useState<MyShiftsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await fetchMyShifts());
    } catch (err) {
      setError(errorMessage(err, 'Failed to load your shifts'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const monthLabel = data?.periodKey
    ? new Date(`${data.periodKey}-01T00:00:00`).toLocaleDateString([], { month: 'long', year: 'numeric' })
    : '';

  // Sites the guard has worked, built from the shift history already loaded.
  const siteHistory = useMemo<SiteHistoryRow[]>(() => {
    const bySite = new Map<string, SiteHistoryRow>();
    for (const s of data?.shifts || []) {
      if (!s.siteId) continue;
      const key = s.siteId._id;
      const row = bySite.get(key) || {
        id: key,
        name: s.siteId.siteName,
        code: s.siteId.siteCode,
        location: s.siteId.location,
        visits: 0,
        hours: 0,
        patrols: 0,
        lastShift: s.clockInAt,
      };
      row.visits += 1;
      row.hours += s.computedHours || 0;
      row.patrols += s.patrolCount || 0;
      if (s.clockInAt > row.lastShift) row.lastShift = s.clockInAt;
      bySite.set(key, row);
    }
    return [...bySite.values()].sort((a, b) => b.lastShift.localeCompare(a.lastShift));
  }, [data]);

  return (
    <GuardLayout>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center gap-3">
          <Link to="/guard" className="p-2 rounded-lg text-muted hover:text-ink hover:bg-subtle transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-ink">{t('myShifts')}</h1>
            <p className="text-xs text-muted">{t('myShiftsSub')}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Summary */}
        <div className="v-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted text-sm">
            <Clock className="w-4 h-4" />
            {t('hoursThisMonth')} {monthLabel && <span className="text-xs">({monthLabel})</span>}
          </div>
          <p className="text-2xl font-bold text-ink">{fmtHours(data?.monthHours)}</p>
        </div>

        {/* Site history */}
        {!loading && siteHistory.length > 0 && (
          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted" /> {t('siteHistory')}
              </h2>
              <p className="text-xs text-muted">{t('siteHistorySub')}</p>
            </div>
            {siteHistory.map((site) => (
              <div key={site.id} className="v-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">{site.name}</p>
                    <p className="text-xs text-muted font-mono">{site.code}</p>
                  </div>
                  <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-subtle border border-line text-ink">
                    <Route className="w-3.5 h-3.5" /> {site.patrols} {t('patrols')}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted">{t('visits')}</p>
                    <p className="font-medium text-ink">{site.visits}</p>
                  </div>
                  <div>
                    <p className="text-muted">{t('hoursTotal')}</p>
                    <p className="font-medium text-ink">{fmtHours(site.hours)}</p>
                  </div>
                  <div>
                    <p className="text-muted">{t('lastShift')}</p>
                    <p className="font-medium text-ink">{fmtDate(site.lastShift)}</p>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Shift history */}
        {loading ? (
          <div className="v-card p-10 text-center text-muted text-sm">{t('loading')}</div>
        ) : (data?.shifts || []).length === 0 ? (
          <div className="v-card p-10 text-center text-muted text-sm">{t('noShifts')}</div>
        ) : (
          <div className="space-y-3">
            {data!.shifts.map((s) => (
              <div
                key={s._id}
                className={`v-card p-4 border-l-4 ${
                  s.status === 'OPEN' ? 'border-l-green-500' : 'border-l-line'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">{s.siteId?.siteName || 'Site'}</p>
                    <p className="text-xs text-muted font-mono">{s.siteId?.siteCode}</p>
                  </div>
                  <span
                    className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      s.status === 'OPEN'
                        ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400'
                        : 'bg-subtle border border-line text-muted'
                    }`}
                  >
                    {s.status === 'OPEN' ? t('onShift') : fmtHours(s.computedHours)}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <p className="text-muted">{t('date')}</p>
                    <p className="font-medium text-ink">{fmtDate(s.clockInAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted">{t('clockIn')}</p>
                    <p className="font-medium text-ink">{fmtTime(s.clockInAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted">{t('clockOut')}</p>
                    <p className="font-medium text-ink">{s.clockOutAt ? fmtTime(s.clockOutAt) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted">{t('patrols')}</p>
                    <p className="font-medium text-ink">{s.patrolCount ?? 0}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </GuardLayout>
  );
}
