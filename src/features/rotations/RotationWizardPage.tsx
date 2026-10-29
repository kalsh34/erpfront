import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Button, Card, LoadingSpinner, InfoTooltip } from '../../components/ui';
import api from '../../lib/api';
import { useT } from '../../i18n';
import { rotationsApi } from './api';
import type { ShiftDefinition, RestRule } from './types';

interface Site { _id: string; siteName: string; siteCode: string; }
interface GuardRow {
  _id: string;
  employee: { _id: string; firstName: string; lastName: string; employeeCode: string; status: string; category?: string };
  currentAssignments?: { siteId: any; isPrimary?: boolean }[];
}

const DEFAULT_REST: RestRule[] = [
  { maxShiftHours: 12, minRestHours: 24 },
  { maxShiftHours: 24, minRestHours: 48 },
];

/** Small themed control — keeps every input/select identical inside the wizard. */
const FIELD_CLS =
  'w-full px-3 py-2 rounded-lg border border-line bg-surface text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400';
const COMPACT_FIELD_CLS =
  'w-full px-2 py-1.5 rounded-lg border border-line bg-surface text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400';

function shiftKeyFromName(name: string, fallback: string): string {
  const n = name.trim().toUpperCase();
  if (!n) return fallback;
  if (n.includes('NIGHT')) return 'NIGHT';
  if (n.includes('DAY')) return 'DAY';
  // keep short unique key
  return n.replace(/[^A-Z0-9]+/g, '_').slice(0, 16) || fallback;
}

export default function RotationWizardPage() {
  const navigate = useNavigate();
  const t = useT();
  const [step, setStep] = useState(1);
  const [sites, setSites] = useState<Site[]>([]);
  const [guards, setGuards] = useState<GuardRow[]>([]);
  const [guardsLoading, setGuardsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fairness, setFairness] = useState<any>(null);

  // Step 1
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [siteId, setSiteId] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');

  // Step 2 — shift design
  const [is24h, setIs24h] = useState(false);
  const [dayCount, setDayCount] = useState(1);
  const [nightCount, setNightCount] = useState(2);
  const [dayStart, setDayStart] = useState('06:00');
  const [dayEnd, setDayEnd] = useState('18:00');
  const [nightStart, setNightStart] = useState('18:00');
  const [nightEnd, setNightEnd] = useState('06:00');
  const [customShifts, setCustomShifts] = useState<ShiftDefinition[]>([]);
  const [useCustom, setUseCustom] = useState(false);
  const [restRules, setRestRules] = useState<RestRule[]>(DEFAULT_REST);

  // Step 3 — pool
  const [selectedGuards, setSelectedGuards] = useState<string[]>([]);
  const [floaters, setFloaters] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const sRes = await api.get('/sites');
        setSites(sRes.data.data || []);
      } catch (e) {
        setError(t('rotFailedLoadOptions'));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  // Only guards currently assigned to the selected site are eligible for the
  // cycle — the pool list follows the chosen site (empty until a site is set).
  useEffect(() => {
    if (!siteId) { setGuards([]); return; }
    let stale = false;
    setGuardsLoading(true);
    api.get('/guards', { params: { siteId } })
      .then((r) => { if (!stale) setGuards(r.data.data || []); })
      .catch(() => { if (!stale) setError(t('rotFailedLoadOptions')); })
      .finally(() => { if (!stale) setGuardsLoading(false); });
    return () => { stale = true; };
  }, [siteId, t]);

  // Changing the site invalidates the previous pool selection.
  useEffect(() => {
    setSelectedGuards([]);
    setFloaters([]);
  }, [siteId]);

  const totalRequired = useMemo(() => {
    if (useCustom) return customShifts.reduce((s, d) => s + (Number(d.requiredCount) || 0), 0);
    if (is24h) return Math.max(0, dayCount);
    return Math.max(0, dayCount) + Math.max(0, nightCount);
  }, [useCustom, customShifts, is24h, dayCount, nightCount]);

  useEffect(() => {
    const poolSize = selectedGuards.length;
    api.get('/rotations/utils/fairness', { params: { poolSize, slotCount: totalRequired } })
      .then((r) => setFairness(r.data.data))
      .catch(() => setFairness(null));
  }, [selectedGuards.length, totalRequired]);

  const toggleGuard = (id: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const addCustomShift = () => {
    setCustomShifts((prev) => [
      ...prev,
      {
        key: `SHIFT_${prev.length + 1}`,
        name: `Shift ${prev.length + 1}`,
        startTime: '08:00',
        endTime: '16:00',
        requiredCount: 1,
      },
    ]);
  };

  const updateCustom = (i: number, patch: Partial<ShiftDefinition>) => {
    setCustomShifts((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const canNext1 = name.trim().length > 0 && !!siteId && !!startDate;
  const canNext2 = totalRequired >= 1
    && (useCustom
      ? customShifts.every((s) => s.key && s.name && s.startTime && s.endTime && Number(s.requiredCount) >= 0)
      : true);
  const canCreate = selectedGuards.length >= 1;

  const buildDefinitions = (): ShiftDefinition[] => {
    if (useCustom) {
      return customShifts
        .filter((s) => Number(s.requiredCount) > 0)
        .map((s) => ({ ...s, key: shiftKeyFromName(s.key || s.name, s.key), requiredCount: Math.max(0, Number(s.requiredCount)) }));
    }
    if (is24h) {
      return [{ key: 'DAY', name: 'Day Shift', startTime: dayStart, endTime: dayStart, requiredCount: Math.max(1, dayCount) }];
    }
    const defs: ShiftDefinition[] = [];
    if (dayCount > 0) {
      defs.push({ key: 'DAY', name: 'Day Shift', startTime: dayStart, endTime: dayEnd, requiredCount: dayCount });
    }
    if (nightCount > 0) {
      defs.push({ key: 'NIGHT', name: 'Night Shift', startTime: nightStart, endTime: nightEnd, requiredCount: nightCount });
    }
    return defs;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canCreate) return;
    setSaving(true);
    setError('');
    try {
      const defs = buildDefinitions();
      const body: any = {
        name: name.trim(),
        description: description.trim() || undefined,
        siteId,
        startDate,
        endDate: endDate || undefined,
        shiftMode: useCustom ? 'CUSTOM' : is24h ? 'SINGLE_24H' : 'STANDARD_12H',
        shiftDefinitions: defs,
        restRules,
        dayShiftCount: defs.find((d) => d.key === 'DAY')?.requiredCount ?? dayCount,
        nightShiftCount: is24h ? 0 : (defs.find((d) => d.key === 'NIGHT')?.requiredCount ?? nightCount),
        dayStartTime: dayStart,
        dayEndTime: dayEnd,
        nightStartTime: nightStart,
        nightEndTime: nightEnd,
      };
      const rot = await rotationsApi.create(body);
      if (selectedGuards.length) await rotationsApi.addGuards(rot._id, selectedGuards);
      if (floaters.length) await api.post(`/rotations/${rot._id}/floaters`, { guardIds: floaters });
      navigate(`/rotations/${rot._id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || t('rotFailedCreate'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6"><LoadingSpinner text={t('rotLoadingForm')} /></div>;

  const steps: { label: string; done: boolean }[] = [
    { label: t('rotStepBasics'), done: step > 1 },
    { label: t('rotStepShifts'), done: step > 2 },
    { label: t('rotStepPool'), done: false },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title={t('rotNew')}
        subtitle={t('rotWizardSubtitle')}
        action={<Button variant="ghost" onClick={() => navigate('/rotations')} type="button">{t('cancel')}</Button>}
      />

      {/* Stepper */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {steps.map((s, i) => {
          const n = i + 1;
          const active = step === n;
          const done = s.done;
          return (
            <div key={s.label} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { if (n < step) setStep(n); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  active
                    ? 'border-primary-400 text-primary-700 dark:text-primary-300 bg-primary-500/10'
                    : done
                    ? 'border-success-line text-success-text bg-success-subtle'
                    : 'border-line text-subtext bg-surface'
                }`}
              >
                <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center ${
                  active ? 'bg-primary-600 text-white' : done ? 'bg-success text-white' : 'bg-subtle-hover text-muted'
                }`}>{done ? '✓' : n}</span>
                {s.label}
              </button>
              {i < steps.length - 1 && <div className="w-6 h-px bg-line" />}
            </div>
          );
        })}
      </div>

      {error && <div className="mb-4 px-4 py-3 rounded-lg bg-danger-subtle border border-danger-line text-sm text-danger-text">{error}</div>}

      <form onSubmit={submit}>
        {step === 1 && (
          <Card>
            <h2 className="font-semibold text-ink mb-4">{t('rotBasics')}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="v-label v-label--required">{t('rotNameRequired')}</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('rotNamePlaceholder')}
                  className={FIELD_CLS}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="v-label">{t('rotDescriptionLabel')}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className={`${FIELD_CLS} resize-y`}
                  placeholder={t('rotOptionalNotes')}
                />
              </div>
              <div>
                <label className="v-label v-label--required">{t('rotSiteRequired')}</label>
                <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className={FIELD_CLS}>
                  <option value="">{t('rotSelectSite')}</option>
                  {sites.map((s) => <option key={s._id} value={s._id}>{s.siteName}</option>)}
                </select>
              </div>
              <div>
                <label className="v-label v-label--required">{t('rotStartDateRequired')}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={FIELD_CLS}
                />
              </div>
              <div>
                <label className="v-label">{t('rotEndDateOptional')}</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={FIELD_CLS}
                />
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <Button type="button" disabled={!canNext1} onClick={() => setStep(2)}>
                {t('rotNextShifts')}
              </Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <div className="flex items-center gap-1.5 mb-4">
              <h2 className="font-semibold text-ink">{t('rotShiftDesign')}</h2>
              <InfoTooltip content={t('rotShiftDesignHint')} />
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {(
                [
                  { label: t('rotModeStandard'), active: !useCustom && !is24h, pick: () => { setUseCustom(false); setIs24h(false); } },
                  { label: t('rotMode24h'), active: !useCustom && is24h, pick: () => { setUseCustom(false); setIs24h(true); } },
                  { label: t('rotModeCustom'), active: useCustom, pick: () => setUseCustom(true) },
                ]
              ).map((mode) => (
                <button
                  key={mode.label}
                  type="button"
                  onClick={mode.pick}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    mode.active
                      ? 'border-primary-400 text-primary-700 dark:text-primary-300 bg-primary-500/10'
                      : 'border-line text-muted hover:bg-subtle'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {!useCustom && !is24h && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 rounded-lg border border-line bg-subtle">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-ink">{t('rotDayShift')}</span>
                    <label className="flex items-center gap-2 text-xs text-muted">
                      {t('rotGuardsWord')}
                      <input
                        type="number"
                        min={0}
                        value={dayCount}
                        onChange={(e) => setDayCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className={`${COMPACT_FIELD_CLS} w-16 text-center`}
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-muted mb-0.5">{t('rotStartLabel')}</label>
                      <input type="time" value={dayStart} onChange={(e) => setDayStart(e.target.value)} className={COMPACT_FIELD_CLS} />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted mb-0.5">{t('rotEndLabel')}</label>
                      <input type="time" value={dayEnd} onChange={(e) => setDayEnd(e.target.value)} className={COMPACT_FIELD_CLS} />
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-line bg-subtle">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-ink">{t('rotNightShift')}</span>
                    <label className="flex items-center gap-2 text-xs text-muted">
                      {t('rotGuardsWord')}
                      <input
                        type="number"
                        min={0}
                        value={nightCount}
                        onChange={(e) => setNightCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className={`${COMPACT_FIELD_CLS} w-16 text-center`}
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-muted mb-0.5">{t('rotStartLabel')}</label>
                      <input type="time" value={nightStart} onChange={(e) => setNightStart(e.target.value)} className={COMPACT_FIELD_CLS} />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted mb-0.5">{t('rotEndMayBeNextDay')}</label>
                      <input type="time" value={nightEnd} onChange={(e) => setNightEnd(e.target.value)} className={COMPACT_FIELD_CLS} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!useCustom && is24h && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="v-label v-label--required">{t('rotGuardsRequired')}</label>
                  <input
                    type="number"
                    min={1}
                    value={dayCount}
                    onChange={(e) => setDayCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className={FIELD_CLS}
                  />
                </div>
                <div>
                  <label className="v-label">{t('rotStartEnd24')}</label>
                  <input type="time" value={dayStart} onChange={(e) => setDayStart(e.target.value)} className={FIELD_CLS} />
                  <p className="text-[10px] text-subtext mt-1">{t('rotEndEqualsStart')}</p>
                </div>
              </div>
            )}

            {useCustom && (
              <div className="space-y-3">
                {customShifts.map((s, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 border border-line rounded-lg bg-subtle">
                    <div className="col-span-3">
                      <label className="block text-[10px] text-muted">{t('rotKey')}</label>
                      <input value={s.key} onChange={(e) => updateCustom(i, { key: e.target.value })} className={COMPACT_FIELD_CLS} />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[10px] text-muted">{t('rotNameLabel')}</label>
                      <input value={s.name} onChange={(e) => updateCustom(i, { name: e.target.value })} className={COMPACT_FIELD_CLS} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] text-muted">{t('rotStartLabel')}</label>
                      <input type="time" value={s.startTime} onChange={(e) => updateCustom(i, { startTime: e.target.value })} className={COMPACT_FIELD_CLS} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] text-muted">{t('rotEndLabel')}</label>
                      <input type="time" value={s.endTime} onChange={(e) => updateCustom(i, { endTime: e.target.value })} className={COMPACT_FIELD_CLS} />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[10px] text-muted">{t('rotQty')}</label>
                      <input
                        type="number"
                        min={0}
                        value={s.requiredCount}
                        onChange={(e) => updateCustom(i, { requiredCount: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                        className={COMPACT_FIELD_CLS}
                      />
                    </div>
                    <div className="col-span-1">
                      <button
                        type="button"
                        onClick={() => setCustomShifts((prev) => prev.filter((_, idx) => idx !== i))}
                        className="w-full py-1.5 text-xs text-danger-text hover:bg-danger-subtle rounded"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="secondary" size="sm" onClick={addCustomShift}>{t('rotAddShift')}</Button>
                {customShifts.length === 0 && <p className="text-xs text-warning-text">{t('rotNeedAtLeastOneShift')}</p>}
              </div>
            )}

            {/* Rest rules */}
            <div className="mt-6 pt-4 border-t border-line">
              <div className="flex items-center gap-1.5 mb-3">
                <h3 className="text-sm font-semibold text-ink">{t('rotRecoveryRules')}</h3>
                <InfoTooltip content={t('rotRecoveryHint')} />
              </div>
              <div className="space-y-2">
                {restRules.map((r, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-muted text-xs w-40">{t('rotShiftUpTo')}</span>
                    <input
                      type="number"
                      min={1}
                      value={r.maxShiftHours}
                      onChange={(e) => setRestRules((prev) => prev.map((x, idx) => idx === i ? { ...x, maxShiftHours: parseInt(e.target.value, 10) || 1 } : x))}
                      className={`${COMPACT_FIELD_CLS} w-20`}
                    />
                    <span className="text-muted text-xs">{t('rotHoursToRest')}</span>
                    <input
                      type="number"
                      min={0}
                      value={r.minRestHours}
                      onChange={(e) => setRestRules((prev) => prev.map((x, idx) => idx === i ? { ...x, minRestHours: parseInt(e.target.value, 10) || 0 } : x))}
                      className={`${COMPACT_FIELD_CLS} w-20`}
                    />
                    <span className="text-muted text-xs">{t('rotHours')}</span>
                    <button
                      type="button"
                      onClick={() => setRestRules((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-danger-text text-xs hover:underline"
                    >
                      {t('rotRemove')}
                    </button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setRestRules((prev) => [...prev, { maxShiftHours: 8, minRestHours: 16 }])}
              >
                {t('rotAddRule')}
              </Button>
            </div>

            <div className="flex justify-between mt-6">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>{t('back')}</Button>
              <Button type="button" disabled={!canNext2} onClick={() => setStep(3)}>
                {t('rotNextPool')}
              </Button>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="font-semibold text-ink">{t('rotGuardPool')}</h2>
                <p className="text-xs text-muted mt-0.5">
                  {siteId
                    ? t('rotPoolSiteScope', { site: sites.find((s) => s._id === siteId)?.siteName || '' })
                    : t('rotSelectSiteFirst')}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {t('rotDailyRequirement')}: <strong className="text-primary-600 dark:text-primary-300">{totalRequired}</strong> ·{' '}
                  {t('rotSelected')}:{' '}
                  <strong className={selectedGuards.length >= totalRequired ? 'text-success-text' : 'text-warning-text'}>
                    {selectedGuards.length}
                  </strong>
                </p>
              </div>
              {fairness && (
                <div className={`text-xs px-3 py-1.5 rounded-lg border ${fairness.isFair ? 'bg-success-subtle border-success-line text-success-text' : 'bg-warning-subtle border-warning-line text-warning-text'}`}>
                  {fairness.isFair
                    ? t('rotFairCycle', { days: fairness.cycleDays, pct: fairness.dutyPercent })
                    : fairness.message}
                </div>
              )}
            </div>

            {guardsLoading && <div className="py-4"><LoadingSpinner /></div>}
            {!guardsLoading && (
            <div className="max-h-72 overflow-y-auto border border-line rounded-lg divide-y divide-line">
              {guards.map((g) => {
                const emp = g.employee;
                const selected = selectedGuards.includes(emp._id);
                const floater = floaters.includes(emp._id);
                const inactive = emp.status !== 'ACTIVE' && emp.status !== 'CONTRACTED';
                const assignments = g.currentAssignments || [];
                const isPrimaryHere = assignments.some((a) =>
                  String((a.siteId && a.siteId._id) || a.siteId || '') === siteId && a.isPrimary
                );
                return (
                  <label
                    key={emp._id}
                    className={`flex flex-wrap items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-surface-hover ${inactive ? 'opacity-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={inactive}
                      onChange={() => toggleGuard(emp._id, selectedGuards, setSelectedGuards)}
                      className="rounded border-line text-primary-600 focus:ring-primary-500/30"
                    />
                    <span className="font-medium text-ink">{emp.firstName} {emp.lastName}</span>
                    <span className="text-xs text-subtext">{emp.employeeCode}</span>
                    {isPrimaryHere && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-info-subtle text-info-text border border-info-line">
                        {t('guardsPrimary')}
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-subtle text-muted border border-line">{emp.status}</span>
                    {emp.category && <span className="text-[10px] text-subtext">{emp.category}</span>}
                    {selected && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); toggleGuard(emp._id, floaters, setFloaters); }}
                        className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border ${
                          floater
                            ? 'bg-warning-subtle border-warning-line text-warning-text'
                            : 'border-line text-subtext hover:border-line-strong'
                        }`}
                      >
                        {floater ? t('rotFloaterMarked') : t('rotMarkFloater')}
                      </button>
                    )}
                  </label>
                );
              })}
              {guards.length === 0 && (
                <p className="p-4 text-sm text-muted">{siteId ? t('rotNoGuards') : t('rotSelectSiteFirst')}</p>
              )}
            </div>
            )}

            <div className="flex justify-between mt-6">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>{t('back')}</Button>
              <Button type="submit" disabled={!canCreate || saving}>
                {saving ? t('rotCreating') : t('rotCreate')}
              </Button>
            </div>
          </Card>
        )}
      </form>
    </div>
  );
}
