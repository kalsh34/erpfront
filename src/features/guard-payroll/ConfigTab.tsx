import { useCallback, useEffect, useMemo, useState } from 'react';
import { Percent, Save, MapPin } from 'lucide-react';
import api from '../../lib/api';
import { Badge, Button, Card, FormField, LoadingSpinner, Select } from '../../components/ui';
import { can, useAuthStore } from '../../stores/authStore';
import { useT } from '../../i18n';
import { fmtMoney } from './guardPayroll.types';

interface ConfigShape {
  transportPercent: number;
  standardMonthlyHours: number;
  sundayStructuralHours: number;
  basicHourlyDivisor: number;
}

interface TaxTable {
  _id: string;
  name: string;
  effectiveFrom: string;
  brackets: { min: number; max: number | null; rate: number }[];
}

interface PensionRuleRow {
  _id: string;
  name: string;
  employeePercent: number;
  employerPercent: number;
  effectiveFrom: string;
}

interface SiteOption { _id: string; siteName: string; siteCode?: string }

interface SiteRateRow {
  _id: string;
  siteId: SiteOption | string;
  compensationAmount: number;
  effectiveFrom: string;
  isCurrent: boolean;
  formula?: {
    transportPercent?: number | null;
    standardMonthlyHours?: number | null;
    sundayStructuralHours?: number | null;
    basicHourlyDivisor?: number | null;
  };
}

/** Payroll settings: engine constants, tax tables, pension rules + a rate preview. */
export function ConfigTab({ onError }: { onError: (msg: string | null) => void }) {
  const t = useT();
  const { user } = useAuthStore();
  const canEdit = can(user?.permissions, 'guard-payroll.rates');

  const [config, setConfig] = useState<ConfigShape | null>(null);
  const [taxTables, setTaxTables] = useState<TaxTable[]>([]);
  const [pensionRules, setPensionRules] = useState<PensionRuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [taxForm, setTaxForm] = useState({ name: '', effectiveFrom: '', brackets: '0,2000,0\n2000,4000,15\n4000,7000,20\n7000,10000,25\n10000,14000,30\n14000,,35' });
  const [pensionForm, setPensionForm] = useState({ name: '', employeePercent: '7', employerPercent: '11', effectiveFrom: '' });
  const [previewComp, setPreviewComp] = useState('12000');

  // Per-site compensation rates — the actual payroll rate source. There is
  // intentionally NO single shared rate: every site carries its own current
  // row (DB-enforced one-current-per-site).
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [compRows, setCompRows] = useState<SiteRateRow[]>([]);
  const [newRate, setNewRate] = useState({ siteId: '', amount: '', from: '' });
  const [savingRate, setSavingRate] = useState(false);

  const errMsg = (e: any) => e?.response?.data?.message || e?.message || 'Request failed';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, taxRes, pensionRes, sitesRes, compRes] = await Promise.all([
        api.get('/guard-payroll/config'),
        api.get('/payroll-common/tax-brackets', { params: { kind: 'GUARD' } }),
        api.get('/payroll-common/pension-rules', { params: { kind: 'GUARD' } }),
        api.get('/sites', { params: { limit: 1000 } }),
        api.get('/guard-payroll/compensations'),
      ]);
      setConfig(cfgRes.data.data);
      setTaxTables(taxRes.data.data || []);
      setPensionRules(pensionRes.data.data || []);
      setSites(sitesRes.data.data || []);
      setCompRows(compRes.data.data || []);
      onError(null);
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.put('/guard-payroll/config', {
        transportPercent: Number(config.transportPercent),
        standardMonthlyHours: Number(config.standardMonthlyHours),
        sundayStructuralHours: Number(config.sundayStructuralHours),
        basicHourlyDivisor: Number(config.basicHourlyDivisor),
      });
      onError(null);
      await load();
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const addTaxTable = async () => {
    const brackets = taxForm.brackets
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [min, max, rate] = line.split(',').map((s) => s.trim());
        return { min: Number(min), max: max === '' || max === undefined ? null : Number(max), rate: Number(rate) };
      });
    try {
      await api.post('/payroll-common/tax-brackets', {
        name: taxForm.name,
        effectiveFrom: taxForm.effectiveFrom,
        brackets,
      });
      setTaxForm({ ...taxForm, name: '', effectiveFrom: '' });
      await load();
    } catch (e) {
      onError(errMsg(e));
    }
  };

  const addPensionRule = async () => {
    try {
      await api.post('/payroll-common/pension-rules', {
        name: pensionForm.name,
        employeePercent: Number(pensionForm.employeePercent),
        employerPercent: Number(pensionForm.employerPercent),
        effectiveFrom: pensionForm.effectiveFrom,
      });
      setPensionForm({ ...pensionForm, name: '', effectiveFrom: '' });
      await load();
    } catch (e) {
      onError(errMsg(e));
    }
  };

  /** Set or change one site's compensation rate (same-day change amends the current row). */
  const saveNewRate = async () => {
    if (!newRate.siteId || !newRate.amount || !newRate.from) return;
    setSavingRate(true);
    try {
      await api.post('/guard-payroll/compensations', {
        siteId: newRate.siteId,
        compensationAmount: Number(newRate.amount),
        effectiveFrom: newRate.from,
        notes: 'Set from payroll settings',
      });
      setNewRate({ siteId: '', amount: '', from: '' });
      onError(null);
      await load();
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setSavingRate(false);
    }
  };

  /** Current rate row per site id. */
  const currentRateBySite = useMemo(() => {
    const map = new Map<string, SiteRateRow>();
    for (const row of compRows) {
      const sid = typeof row.siteId === 'object' ? row.siteId?._id : row.siteId;
      if (row.isCurrent && sid) map.set(sid, row);
    }
    return map;
  }, [compRows]);

  const preview = useMemo(() => {
    if (!config) return null;
    const comp = Number(previewComp);
    if (!Number.isFinite(comp) || comp <= 0) return null;
    const otRate = comp / config.standardMonthlyHours;
    const sundayStructural = otRate * config.sundayStructuralHours;
    const remaining = comp - sundayStructural;
    const transport = (remaining * config.transportPercent) / 100;
    const basic = remaining - transport;
    const basicHourly = basic / config.basicHourlyDivisor;
    return { otRate, sundayStructural, remaining, transport, basic, basicHourly };
  }, [config, previewComp]);

  if (loading) return <LoadingSpinner />;
  if (!config) return <p className="text-sm text-danger-text">Payroll settings could not be loaded. <button className="underline" onClick={load}>Retry</button></p>;

  return (
    <div className="space-y-4">
      {/* Engine constants */}
      <Card className="p-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-ink mb-3">
          <Percent size={15} />
          {t('gpSettings')}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <FormField label={t('gpTransportPercent')}>
            <input
              className="v-input w-full"
              type="number"
              min="0"
              max="100"
              step="0.5"
              disabled={!canEdit}
              value={config.transportPercent}
              onChange={(e) => setConfig({ ...config, transportPercent: Number(e.target.value) })}
            />
          </FormField>
          <FormField label={t('gpStandardMonthlyHours')}>
            <input
              className="v-input w-full"
              type="number"
              min="1"
              disabled={!canEdit}
              value={config.standardMonthlyHours}
              onChange={(e) => setConfig({ ...config, standardMonthlyHours: Number(e.target.value) })}
            />
          </FormField>
          <FormField label={t('gpSundayStructuralHours')}>
            <input
              className="v-input w-full"
              type="number"
              min="0"
              disabled={!canEdit}
              value={config.sundayStructuralHours}
              onChange={(e) => setConfig({ ...config, sundayStructuralHours: Number(e.target.value) })}
            />
          </FormField>
          <FormField label={t('gpBasicHourlyDivisor')}>
            <input
              className="v-input w-full"
              type="number"
              min="1"
              disabled={!canEdit}
              value={config.basicHourlyDivisor}
              onChange={(e) => setConfig({ ...config, basicHourlyDivisor: Number(e.target.value) })}
            />
          </FormField>
        </div>
        {canEdit && (
          <div className="mt-3 flex justify-end">
            <Button onClick={saveConfig} disabled={saving} className="flex items-center gap-2">
              <Save size={14} />
              {t('save')}
            </Button>
          </div>
        )}

        {/* Rate preview */}
        {preview && (
          <div className="mt-4 rounded-xl border border-line bg-subtle p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-subtext mb-2">{t('gpRatePreview')}</p>
            <div className="max-w-xs mb-2">
              <FormField label={t('gpCompensation')}>
                <input className="v-input w-full" type="number" min="0" value={previewComp} onChange={(e) => setPreviewComp(e.target.value)} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs text-muted">
              <span>OT: <b className="text-ink">{fmtMoney(preview.otRate)}</b></span>
              <span>Sunday ×32: <b className="text-ink">{fmtMoney(preview.sundayStructural)}</b></span>
              <span>Remaining: <b className="text-ink">{fmtMoney(preview.remaining)}</b></span>
              <span>Transport: <b className="text-ink">{fmtMoney(preview.transport)}</b></span>
              <span>Basic: <b className="text-ink">{fmtMoney(preview.basic)}</b></span>
              <span>Hourly ÷{config.basicHourlyDivisor}: <b className="text-ink">{fmtMoney(preview.basicHourly)}</b></span>
            </div>
          </div>
        )}
      </Card>

      {/* Per-site compensation rates — one rate belongs to one site, by design. */}
      <Card className="p-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-ink mb-1">
          <MapPin size={15} />
          {t('gpSiteRatesTitle')}
        </h4>
        <p className="text-xs text-muted mb-3">{t('gpSiteRatesSub')}</p>
        <div className="overflow-x-auto mb-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-subtext">
                <th className="px-3 py-2">{t('gpSite')}</th>
                <th className="px-3 py-2 text-right">{t('gpCompensation')}</th>
                <th className="px-3 py-2 text-right">{t('gpOtRate')}</th>
                <th className="px-3 py-2">{t('gpEffectiveFrom')}</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => {
                const row = currentRateBySite.get(s._id);
                return (
                  <tr key={s._id} className="border-b border-line">
                    <td className="px-3 py-2 font-medium text-ink">{s.siteName}{s.siteCode ? <span className="text-xs text-subtext ml-1.5">({s.siteCode})</span> : null}</td>
                    <td className="px-3 py-2 text-right font-semibold">{row ? row.compensationAmount.toLocaleString() : <span className="text-danger-text text-xs">{t('gpNoRate')}</span>}</td>
                    <td className="px-3 py-2 text-right text-muted">{row ? (row.compensationAmount / (row.formula?.standardMonthlyHours || config?.standardMonthlyHours || 240)).toFixed(2) : '—'}</td>
                    <td className="px-3 py-2 text-muted">{row ? new Date(row.effectiveFrom).toLocaleDateString() : '—'}</td>
                  </tr>
                );
              })}
              {sites.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-center text-muted">—</td></tr>}
            </tbody>
          </table>
        </div>
        {canEdit && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end border-t border-line pt-3">
            <Select label={t('gpSite')} value={newRate.siteId} onChange={(e) => setNewRate({ ...newRate, siteId: e.target.value })}>
              <option value="">{t('gpSelectSite')}</option>
              {sites.map((s) => (
                <option key={s._id} value={s._id}>{s.siteName}{currentRateBySite.has(s._id) ? '' : ` — ${t('gpNoRate')}`}</option>
              ))}
            </Select>
            <FormField label={t('gpCompensation')}>
              <input className="v-input w-full" type="number" min="0.01" step="0.01" value={newRate.amount} onChange={(e) => setNewRate({ ...newRate, amount: e.target.value })} />
            </FormField>
            <FormField label={t('gpEffectiveFrom')}>
              <input className="v-input w-full" type="date" value={newRate.from} onChange={(e) => setNewRate({ ...newRate, from: e.target.value })} />
            </FormField>
            <Button onClick={saveNewRate} disabled={savingRate || !newRate.siteId || !(Number(newRate.amount) > 0) || !newRate.from}>{savingRate ? t('saving') : t('save')}</Button>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tax tables */}
        <Card className="p-4">
          <h4 className="text-sm font-semibold text-ink mb-3">{t('gpTaxTables')}</h4>
          <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
            {taxTables.map((tb) => (
              <div key={tb._id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-ink">{tb.name}</p>
                  <p className="text-xs text-subtext">
                    {new Date(tb.effectiveFrom).toLocaleDateString()} · {tb.brackets.length} brackets
                  </p>
                </div>
                <Badge variant="info">{tb.brackets[0]?.rate ?? 0}%…{tb.brackets[tb.brackets.length - 1]?.rate ?? 0}%</Badge>
              </div>
            ))}
            {taxTables.length === 0 && <p className="text-xs text-muted">—</p>}
          </div>
          {canEdit && (
            <div className="space-y-2 border-t border-line pt-3">
              <div className="grid grid-cols-2 gap-2">
                <input className="v-input" placeholder={t('gpLabel')} value={taxForm.name} onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })} />
                <input className="v-input" type="date" value={taxForm.effectiveFrom} onChange={(e) => setTaxForm({ ...taxForm, effectiveFrom: e.target.value })} />
              </div>
              <textarea
                className="v-input font-mono text-xs"
                rows={4}
                value={taxForm.brackets}
                onChange={(e) => setTaxForm({ ...taxForm, brackets: e.target.value })}
                placeholder={'min,max,rate — one bracket per line'}
              />
              <p className="text-[11px] text-subtext">min,max,rate per line — empty max = ∞</p>
              <div className="flex justify-end">
                <Button onClick={addTaxTable} disabled={!taxForm.name || !taxForm.effectiveFrom}>{t('save')}</Button>
              </div>
            </div>
          )}
        </Card>

        {/* Pension rules */}
        <Card className="p-4">
          <h4 className="text-sm font-semibold text-ink mb-3">{t('gpPensionRules')}</h4>
          <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
            {pensionRules.map((pr) => (
              <div key={pr._id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-ink">{pr.name}</p>
                  <p className="text-xs text-subtext">{new Date(pr.effectiveFrom).toLocaleDateString()}</p>
                </div>
                <Badge variant="success">{pr.employeePercent}% / {pr.employerPercent}%</Badge>
              </div>
            ))}
            {pensionRules.length === 0 && <p className="text-xs text-muted">—</p>}
          </div>
          {canEdit && (
            <div className="space-y-2 border-t border-line pt-3">
              <div className="grid grid-cols-2 gap-2">
                <input className="v-input" placeholder={t('gpLabel')} value={pensionForm.name} onChange={(e) => setPensionForm({ ...pensionForm, name: e.target.value })} />
                <input className="v-input" type="date" value={pensionForm.effectiveFrom} onChange={(e) => setPensionForm({ ...pensionForm, effectiveFrom: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className="v-input" type="number" placeholder="EE %" value={pensionForm.employeePercent} onChange={(e) => setPensionForm({ ...pensionForm, employeePercent: e.target.value })} />
                <input className="v-input" type="number" placeholder="ER %" value={pensionForm.employerPercent} onChange={(e) => setPensionForm({ ...pensionForm, employerPercent: e.target.value })} />
              </div>
              <div className="flex justify-end">
                <Button onClick={addPensionRule} disabled={!pensionForm.name || !pensionForm.effectiveFrom}>{t('save')}</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
