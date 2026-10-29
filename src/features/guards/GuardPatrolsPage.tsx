import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Clock, MapPin, Route, ShieldCheck, Users } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import api from '../../lib/api';
import { useT } from '../../i18n';
import { errorMessage, fmtTime, fmtDate, fmtHours, GuardSiteRef } from '../guard/guardApi';

interface Person {
  _id: string;
  firstName: string;
  lastName: string;
  employeeCode?: string;
}

interface ActivityShift {
  _id: string;
  employeeId: Person | null;
  siteId: GuardSiteRef | null;
  date: string;
  clockInAt: string;
  clockOutAt?: string;
  computedHours?: number;
  status: 'OPEN' | 'CLOSED';
}

interface ActivityScan {
  _id: string;
  employeeId: Person | null;
  siteId: GuardSiteRef | null;
  scannedAt: string;
}

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const personName = (p: Person | null) => (p ? `${p.firstName} ${p.lastName}` : '—');

export default function GuardPatrolsPage() {
  const t = useT();
  const today = ymd(new Date());

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [siteFilter, setSiteFilter] = useState('');
  const [guardFilter, setGuardFilter] = useState('');
  const [tab, setTab] = useState<'shifts' | 'scans'>('shifts');
  const [shifts, setShifts] = useState<ActivityShift[]>([]);
  const [scans, setScans] = useState<ActivityScan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/attendance/shifts/activity', { params: { from, to } });
      setShifts(res.data.data.shifts || []);
      setScans(res.data.data.patrols || []);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load guard activity'));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  // Filter options come from the loaded activity so they only list relevant sites and guards.
  const sites = useMemo(() => {
    const bySite = new Map<string, GuardSiteRef>();
    for (const r of [...shifts, ...scans]) {
      if (r.siteId) bySite.set(r.siteId._id, r.siteId);
    }
    return [...bySite.values()].sort((a, b) => a.siteName.localeCompare(b.siteName));
  }, [shifts, scans]);

  const guards = useMemo(() => {
    const byGuard = new Map<string, Person>();
    for (const r of [...shifts, ...scans]) {
      if (r.employeeId) byGuard.set(r.employeeId._id, r.employeeId);
    }
    return [...byGuard.values()].sort((a, b) => a.firstName.localeCompare(b.firstName));
  }, [shifts, scans]);

  const fShifts = useMemo(
    () => shifts.filter((s) =>
      (!siteFilter || s.siteId?._id === siteFilter) && (!guardFilter || s.employeeId?._id === guardFilter)),
    [shifts, siteFilter, guardFilter]
  );

  const fScans = useMemo(
    () => scans.filter((s) =>
      (!siteFilter || s.siteId?._id === siteFilter) && (!guardFilter || s.employeeId?._id === guardFilter)),
    [scans, siteFilter, guardFilter]
  );

  const openShifts = fShifts.filter((s) => s.status === 'OPEN').length;
  const sitesCovered = new Set(
    [...fShifts, ...fScans].map((r) => r.siteId?._id).filter(Boolean)
  ).size;

  const kpis = [
    { label: t('pmOpenShifts'), value: openShifts, icon: ShieldCheck, tone: 'text-green-600' },
    { label: t('pmShiftsTotal'), value: fShifts.length, icon: Clock, tone: 'text-ink' },
    { label: t('pmScansTotal'), value: fScans.length, icon: Route, tone: 'text-ink' },
    { label: t('pmSitesCovered'), value: sitesCovered, icon: MapPin, tone: 'text-ink' },
  ];

  const tabBtn = (key: 'shifts' | 'scans', label: string) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        tab === key ? 'border-primary-600 text-ink' : 'border-transparent text-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('pmTitle')}
        subtitle={t('pmSub')}
        breadcrumbs={[{ label: t('moduleOperations') }, { label: t('pmTitle') }]}
        action={
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            {t('pmRefresh')}
          </Button>
        }
      />

      {/* Filters */}
      <Card className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="v-label">{t('pmFrom')}</label>
          <input type="date" className="v-input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="v-label">{t('pmTo')}</label>
          <input type="date" className="v-input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Select label={t('pmSite')} value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}>
          <option value="">{t('pmAllSites')}</option>
          {sites.map((s) => (
            <option key={s._id} value={s._id}>{s.siteName}</option>
          ))}
        </Select>
        <Select label={t('pmGuard')} value={guardFilter} onChange={(e) => setGuardFilter(e.target.value)}>
          <option value="">{t('pmAllGuards')}</option>
          {guards.map((g) => (
            <option key={g._id} value={g._id}>{`${g.firstName} ${g.lastName}`}</option>
          ))}
        </Select>
      </Card>

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-subtle">
              <k.icon className={`w-5 h-5 ${k.tone}`} />
            </div>
            <div>
              <p className="text-xs text-muted">{k.label}</p>
              <p className="text-xl font-bold text-ink">{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Tables */}
      <Card padding={false}>
        <div className="flex items-center gap-2 px-4 border-b border-line">
          {tabBtn('shifts', t('pmShiftsTab'))}
          {tabBtn('scans', t('pmScansTab'))}
        </div>

        {loading ? (
          <div className="p-10 text-center text-muted text-sm">{t('loading')}</div>
        ) : tab === 'shifts' ? (
          fShifts.length === 0 ? (
            <div className="p-10 text-center text-muted text-sm">{t('pmNoShifts')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-subtle text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">{t('pmGuard')}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t('pmSite')}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t('date')}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t('pmClockIn')}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t('pmClockOut')}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t('pmHours')}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t('pmStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {fShifts.map((s) => (
                    <tr key={s._id} className="border-t border-line hover:bg-subtle/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{personName(s.employeeId)}</p>
                        <p className="text-xs text-muted font-mono">{s.employeeId?.employeeCode}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-ink">{s.siteId?.siteName || '—'}</p>
                        <p className="text-xs text-muted font-mono">{s.siteId?.siteCode}</p>
                      </td>
                      <td className="px-4 py-3 text-ink">{fmtDate(s.clockInAt)}</td>
                      <td className="px-4 py-3 font-mono text-ink">{fmtTime(s.clockInAt)}</td>
                      <td className="px-4 py-3 font-mono text-ink">{s.clockOutAt ? fmtTime(s.clockOutAt) : '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-ink">{fmtHours(s.computedHours)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={s.status === 'OPEN' ? 'success' : 'default'}>
                          {s.status === 'OPEN' ? t('onShift') : t('shiftEnded')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : fScans.length === 0 ? (
          <div className="p-10 text-center text-muted text-sm">{t('pmNoScans')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-subtle text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">{t('pmGuard')}</th>
                  <th className="px-4 py-3 text-left font-semibold">{t('pmSite')}</th>
                  <th className="px-4 py-3 text-left font-semibold">{t('date')}</th>
                  <th className="px-4 py-3 text-left font-semibold">{t('pmScanTime')}</th>
                </tr>
              </thead>
              <tbody>
                {fScans.map((s) => (
                  <tr key={s._id} className="border-t border-line hover:bg-subtle/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted" />
                        <span className="font-medium text-ink">{personName(s.employeeId)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-ink">{s.siteId?.siteName || '—'}</p>
                      <p className="text-xs text-muted font-mono">{s.siteId?.siteCode}</p>
                    </td>
                    <td className="px-4 py-3 text-ink">{fmtDate(s.scannedAt)}</td>
                    <td className="px-4 py-3 font-mono text-ink">{fmtTime(s.scannedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
