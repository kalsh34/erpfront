import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PageHeader, Button, Card, LoadingSpinner, Badge, Modal, Tabs, EmptyState,
} from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { UserRole, PERMISSIONS, ROLE_PERMISSIONS } from '../../types';
import { formatDate, useLang, useT, type DictKey } from '../../i18n';
import { rotationsApi } from './api';
import {
  SEVERITY_STYLES, SHIFT_COLORS, STATUS_STYLES,
  type Cell, type ConflictIssue, type PreviewResult, type Rotation,
  type RotationAssignmentRec, type RotationStatus, type Severity, type StatsReport,
  type ShiftDefinition,
} from './types';

function hasPerm(role: UserRole | undefined, perm: string): boolean {
  if (!role) return false;
  return ((ROLE_PERMISSIONS[role] || []) as string[]).includes(perm);
}

const DAY_MS = 86400000;

/** Local YYYY-MM-DD so grid keys match the engine's stored calendar dates. */
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const FIELD_CLS =
  'w-full px-3 py-2 rounded-lg border border-line bg-surface text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400';
const COMPACT_FIELD_CLS =
  'w-20 px-2 py-1 rounded-lg border border-line bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400';

const STATUS_LABEL_KEYS: Record<RotationStatus, DictKey> = {
  DRAFT: 'rotStatusDraft',
  GENERATING: 'rotStatusGenerating',
  GENERATED: 'rotStatusGenerated',
  REVIEW: 'rotStatusReview',
  APPROVED: 'rotStatusApproved',
  PUBLISHED: 'rotStatusPublished',
  ACTIVE: 'rotStatusActive',
  PAUSED: 'rotStatusPaused',
  COMPLETED: 'rotStatusCompleted',
  CANCELLED: 'rotStatusCancelled',
  ARCHIVED: 'rotStatusArchived',
};

const SEVERITY_LABEL_KEYS: Record<Severity, DictKey> = {
  CRITICAL: 'rotSeverityCritical',
  REST: 'rotSeverityRest',
  STAFFING: 'rotSeverityStaffing',
  INFO: 'rotSeverityInfo',
};

/** Single-letter abbreviation used inside the schedule grid. */
function cellLabel(key: string): string {
  if (key === 'DAY') return 'D';
  if (key === 'NIGHT') return 'N';
  if (key === 'REST') return '·';
  return key.slice(0, 3).toUpperCase();
}

/** Shift chip colours keyed off the shift name, so the grid matches the legend. */
function shiftClass(key: string): string {
  const k = key.toUpperCase();
  if (k.includes('NIGHT')) return SHIFT_COLORS.night;
  if (k.includes('DAY')) return SHIFT_COLORS.day;
  if (k.includes('EVEN')) return SHIFT_COLORS.evening;
  if (k.includes('MORN')) return SHIFT_COLORS.morning;
  return SHIFT_COLORS.default;
}

function guardName(poolEntry: any, fallback: string): string {
  const g = poolEntry?.guardId;
  if (g && typeof g === 'object') {
    return `${g.firstName || ''} ${g.lastName || ''}`.trim() || g.employeeCode || fallback;
  }
  return fallback;
}

function guardIdOf(poolEntry: any): string {
  const g = poolEntry?.guardId;
  return g && typeof g === 'object' ? g._id : String(g || '');
}

export default function RotationDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const t = useT();
  const lang = useLang();
  const { user } = useAuthStore();

  const canManage = hasPerm(user?.role, PERMISSIONS.ROTATION_MANAGE);
  const canGenerate = hasPerm(user?.role, PERMISSIONS.ROTATION_GENERATE);
  const canApprove = hasPerm(user?.role, PERMISSIONS.ROTATION_APPROVE);
  const canPublish = hasPerm(user?.role, PERMISSIONS.ROTATION_PUBLISH);
  const canOverride = hasPerm(user?.role, PERMISSIONS.ROTATION_OVERRIDE);

  const [rot, setRot] = useState<Rotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('schedule');
  const [previewDays, setPreviewDays] = useState(14);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [assignments, setAssignments] = useState<RotationAssignmentRec[]>([]);
  const [stats, setStats] = useState<(StatsReport & { stale?: boolean }) | null>(null);
  const [conflicts, setConflicts] = useState<ConflictIssue[]>([]);

  const [moveOpen, setMoveOpen] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await rotationsApi.get(id);
      setRot(r);
      const genDays = r.generation?.days || 14;
      setPreviewDays(genDays);
      if (r.generation?.stats) setStats({ ...(r.generation.stats as StatsReport), stale: !!r.generation.stale });
      else setStats(null);
      if (r.generation?.conflicts) setConflicts(r.generation.conflicts as ConflictIssue[]);
      else setConflicts([]);

      // Always try stored assignments (legacy docs may have rows without generation meta).
      const start = new Date(r.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start.getTime() + genDays * DAY_MS - 1);
      try {
        const rows = await rotationsApi.assignments(id, ymd(start), ymd(end));
        setAssignments(rows);
      } catch {
        setAssignments([]);
      }
      if (r.generation && !r.generation.stale) {
        rotationsApi.stats(id, genDays).then(setStats).catch(() => undefined);
        rotationsApi.conflicts(id).then((c) => setConflicts(c.conflicts || [])).catch(() => undefined);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || t('rotFailedLoadOne'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => { load(); }, [load]);

  const runPreview = async () => {
    setPreviewing(true);
    setError('');
    try {
      setPreview(await rotationsApi.preview(id, previewDays));
    } catch (e: any) {
      setError(e?.response?.data?.message || t('rotPreviewFailed'));
    } finally {
      setPreviewing(false);
    }
  };

  const runAction = async (action: string, fn: () => Promise<any>, okMsg?: string) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(okMsg || t('rotActionSucceeded', { action }));
      await load();
      if (preview) setPreview(null);
    } catch (e: any) {
      const v = e?.response?.data?.violations;
      if (Array.isArray(v) && v.length) {
        setError(`${e.response.data.message}\n• ${v.join('\n• ')}`);
      } else {
        setError(e?.response?.data?.message || t('rotActionFailed', { action }));
      }
    } finally {
      setBusy(false);
    }
  };

  const doGenerate = () => runAction(
    t('rotGenerate'),
    () => rotationsApi.generateFor(id, { days: previewDays }),
    t('rotGeneratedSchedule', { days: previewDays }),
  );

  const doApprove = () => runAction(t('rotApprove'), () => rotationsApi.approve(id), t('rotScheduleApproved'));
  const doPublish = () => runAction(t('rotPublish'), () => rotationsApi.publish(id), t('rotSchedulePublished'));
  const doDelete = async () => {
    if (!window.confirm(t('rotDeleteConfirm'))) return;
    setBusy(true);
    try {
      await rotationsApi.remove(id);
      navigate('/rotations');
    } catch (e: any) {
      setError(e?.response?.data?.message || t('rotDeleteFailed'));
      setBusy(false);
    }
  };

  const status = rot?.status || 'DRAFT';
  const site = rot && typeof rot.siteId === 'object' ? rot.siteId : null;
  const pool = rot?.guardPool || [];
  const activePool = pool.filter((g) => g.status === 'ACTIVE');
  const defs: ShiftDefinition[] = rot?.shiftDefinitions?.length
    ? rot.shiftDefinitions
    : [];

  const guardList = useMemo(() => activePool.map((g, i) => ({
    id: guardIdOf(g),
    name: guardName(g, t('guard')),
    order: g.order ?? i,
  })), [activePool, t]);

  const previewCells = preview?.cells || [];
  const statsData = stats || preview?.stats || null;
  const conflictList = conflicts.length ? conflicts : (preview?.conflicts || []);

  const dates = useMemo(() => {
    if (!rot) return [];
    const start = new Date(rot.startDate);
    start.setHours(0, 0, 0, 0);
    const n = preview?.days || previewDays;
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(start.getTime() + i * DAY_MS);
      return { index: i, date: d, key: ymd(d) };
    });
  }, [rot, previewDays, preview?.days]);

  // Grid from stored assignments or preview cells
  const grid = useMemo(() => {
    const map = new Map<string, Cell>();
    if (previewCells.length) {
      for (const c of previewCells) map.set(`${c.guardId}|${c.date}`, c);
      return map;
    }
    for (const a of assignments) {
      const g = a.guardId;
      const gid = g && typeof g === 'object' ? g._id : String(g);
      const d = new Date(a.date);
      const key = `${gid}|${ymd(d)}`;
      const start = a.startAt ? new Date(a.startAt) : new Date(d);
      const end = a.endAt ? new Date(a.endAt) : new Date(start.getTime() + 12 * 3600000);
      map.set(key, {
        guardId: gid,
        dayIndex: 0,
        date: ymd(d),
        shiftKey: a.shiftType,
        shiftName: a.shiftName || a.shiftType,
        slotIndex: 0,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      });
    }
    return map;
  }, [previewCells, assignments]);

  const onCellClick = (c: Cell | null, guardId: string, dateKey: string) => {
    if (!canManage || !['DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'ACTIVE', 'REVIEW'].includes(status)) {
      if (c) setSelectedCell(c);
      return;
    }
    if (c) setSelectedCell(c);
    else {
      // empty cell — still open move to assign? only meaningful for existing cells
      setSelectedCell(null);
    }
    void guardId;
    void dateKey;
    if (c) setMoveOpen(true);
  };

  if (loading) return <div className="p-6"><LoadingSpinner text={t('rotLoadingOne')} /></div>;
  if (!rot) {
    return (
      <div className="p-6">
        <div className="bg-danger-subtle border border-danger-line rounded-xl p-8 text-center">
          <p className="text-danger-text mb-4">{error || t('rotNotFound')}</p>
          <Button onClick={() => navigate('/rotations')}>{t('rotBackToList')}</Button>
        </div>
      </div>
    );
  }

  const statusActions: React.ReactNode = (
    <div className="flex flex-wrap gap-2">
      {canManage && ['DRAFT', 'REVIEW', 'APPROVED'].includes(status) && (
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} disabled={busy}>{t('edit')}</Button>
      )}
      {canGenerate && ['DRAFT', 'GENERATED', 'REVIEW', 'APPROVED'].includes(status) && (
        <Button size="sm" onClick={doGenerate} disabled={busy}>
          {busy ? t('rotWorking') : t('rotGenerate')}
        </Button>
      )}
      {canApprove && status === 'REVIEW' && (
        <Button size="sm" onClick={doApprove} disabled={busy} className="!bg-success hover:!bg-success/85">{t('rotApprove')}</Button>
      )}
      {canPublish && status === 'APPROVED' && (
        <Button size="sm" onClick={() => setPublishOpen(true)} disabled={busy} className="!bg-primary-700 hover:!bg-primary-800">{t('rotPublish')}</Button>
      )}
      {canManage && status === 'PAUSED' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => runAction(t('rotResume'), () => rotationsApi.activate(id), t('rotActionSucceeded', { action: t('rotResume') }))}
          disabled={busy}
        >
          {t('rotResume')}
        </Button>
      )}
      {canManage && status === 'ACTIVE' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => runAction(t('rotPause'), () => rotationsApi.pause(id), t('rotActionSucceeded', { action: t('rotPause') }))}
          disabled={busy}
        >
          {t('rotPause')}
        </Button>
      )}
      {canManage && ['PUBLISHED', 'ACTIVE', 'PAUSED'].includes(status) && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => runAction(t('rotComplete'), () => rotationsApi.complete(id), t('rotActionSucceeded', { action: t('rotComplete') }))}
          disabled={busy}
        >
          {t('rotComplete')}
        </Button>
      )}
      {canManage && !['COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(status) && (
        <Button size="sm" variant="danger" onClick={doDelete} disabled={busy}>{t('delete')}</Button>
      )}
    </div>
  );

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title={rot.name}
        subtitle={`${site?.siteName || t('rotSiteFallback')} · ${t('rotGuardsCount', { count: activePool.length })} · ${t('rotStarts', { date: formatDate(lang, rot.startDate) })}`}
        breadcrumbs={[{ label: t('rotTabSchedule'), path: '/rotations' }, { label: rot.name }]}
        action={statusActions}
      />

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className={`px-2.5 py-1 rounded-full border text-xs font-bold ${STATUS_STYLES[status]}`}>
          {t(STATUS_LABEL_KEYS[status])}
        </span>
        {rot.generation?.feasibility === 'FULLY_COMPLIANT' && <Badge variant="success">{t('rotFullyCompliant')}</Badge>}
        {rot.generation?.feasibility === 'BEST_POSSIBLE' && <Badge variant="warning">{t('rotBestPossible')}</Badge>}
        {rot.generation?.stale && <Badge variant="warning">{t('rotStaleAfterEdits')}</Badge>}
        {rot.generation?.algorithmVersion && (
          <span className="text-[10px] text-subtext">
            {rot.generation.algorithmVersion} · rules {rot.generation.rulesFingerprint}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-danger-subtle border border-danger-line text-sm text-danger-text whitespace-pre-line">{error}</div>
      )}
      {notice && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-success-subtle border border-success-line text-sm text-success-text">{notice}</div>
      )}

      {/* Overview cards */}
      {statsData && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <OverviewCard label={t('rotCoverage')} value={`${statsData.coverage.overallPct}%`} accent={statsData.coverage.overallPct === 100} />
          <OverviewCard label={t('rotRestCompliance')} value={`${statsData.rest.compliancePct}%`} accent={statsData.rest.compliancePct === 100} />
          <OverviewCard label={t('rotFairness')} value={`${statsData.fairness.index}`} accent={statsData.fairness.index >= 90} />
          <OverviewCard label={t('rotConflicts')} value={String(conflictList.filter((c) => c.severity === 'CRITICAL' || c.severity === 'REST').length)} accent={conflictList.filter((c) => c.severity === 'CRITICAL' || c.severity === 'REST').length === 0} />
          <OverviewCard label={t('rotPoolNeeded')} value={`${statsData.staffing.currentPool}/${statsData.staffing.estimatedMinPool}`} accent={statsData.staffing.sufficient} />
          <OverviewCard label={t('rotTotalHours')} value={String(statsData.totalHours)} accent />
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_340px] gap-4">
        <div className="space-y-4">
          <Tabs
            tabs={[
              { key: 'schedule', label: t('rotTabSchedule') },
              { key: 'conflicts', label: t('rotConflicts'), count: conflictList.length },
              { key: 'workload', label: t('rotTabWorkload') },
              { key: 'setup', label: t('rotTabSetup') },
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === 'schedule' && (
            <Card padding={false}>
              <div className="flex flex-wrap items-center gap-3 p-4 border-b border-line">
                <label className="text-xs text-muted">{t('rotPeriodDays')}</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={previewDays}
                  onChange={(e) => setPreviewDays(Math.min(90, Math.max(1, parseInt(e.target.value, 10) || 14)))}
                  className={`${COMPACT_FIELD_CLS} w-16`}
                />
                <Button size="sm" variant="outline" onClick={runPreview} disabled={previewing}>
                  {previewing ? t('rotPreviewing') : t('rotPreview')}
                </Button>
                {preview && (
                  <Badge variant="info">{t('rotPreviewMode')}</Badge>
                )}
                {canGenerate && !preview && ['DRAFT', 'GENERATED', 'REVIEW', 'APPROVED'].includes(status) && (
                  <Button size="sm" onClick={doGenerate} disabled={busy}>
                    {t('rotGenerateSave')}
                  </Button>
                )}
                {canManage && ['DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'ACTIVE'].includes(status) && (
                  <Button size="sm" variant="outline" onClick={() => setRotateOpen(true)} disabled={busy}>
                    {t('rotRotateDay')}
                  </Button>
                )}
                <div className="ml-auto flex flex-wrap gap-2 text-[10px] text-muted">
                  {(preview?.shiftDefinitions?.length ? preview.shiftDefinitions : defs).map((d) => (
                    <span key={d.key} className="flex items-center gap-1">
                      <span className={`w-3 h-3 rounded border border-line ${shiftClass(d.key)}`} />
                      {d.name} ({d.startTime}–{d.endTime})
                    </span>
                  ))}
                  <span className="flex items-center gap-1">
                    <span className={`w-3 h-3 rounded ${SHIFT_COLORS.rest}`} />
                    {t('rotRest')}
                  </span>
                </div>
              </div>

              {guardList.length === 0 ? (
                <EmptyState title={t('rotNoGuardsInPool')} description={t('rotNoGuardsInPoolHint')} />
              ) : grid.size === 0 && !preview ? (
                <EmptyState
                  title={t('rotNoScheduleYet')}
                  description={canGenerate ? t('rotNoScheduleCanGen') : t('rotNoScheduleCannot')}
                  action={canGenerate ? (
                    <Button size="sm" onClick={doGenerate} disabled={busy}>
                      {busy ? t('rotWorking') : t('rotGenerateSave')}
                    </Button>
                  ) : undefined}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="sticky left-0 bg-surface border-b border-line px-3 py-2 text-left font-semibold text-muted min-w-[140px] z-10">
                          {t('guard')}
                        </th>
                        {dates.map((d) => (
                          <th key={d.key} className="border-b border-l border-line px-1 py-2 text-center font-medium text-muted min-w-[36px]">
                            <div>{d.date.toLocaleDateString('en-GB', { weekday: 'narrow' })}</div>
                            <div className="text-[9px] text-subtext">{d.date.getDate()}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {guardList.map((g) => (
                        <tr key={g.id} className="hover:bg-surface-hover">
                          <td className="sticky left-0 bg-surface border-b border-line px-3 py-1.5 font-medium text-ink z-10 truncate max-w-[140px]">
                            {g.name}
                          </td>
                          {dates.map((d) => {
                            const cell = grid.get(`${g.id}|${d.key}`) || null;
                            return (
                              <td key={d.key} className="border-b border-l border-line p-0.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => onCellClick(cell, g.id, d.key)}
                                  title={cell ? `${cell.shiftName} ${new Date(cell.startAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}–${new Date(cell.endAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : t('rotRest')}
                                  className={`w-full h-7 rounded text-[10px] font-bold transition-colors ${
                                    cell ? `${shiftClass(cell.shiftKey)} hover:opacity-80` : SHIFT_COLORS.rest
                                  }`}
                                >
                                  {cell ? cellLabel(cell.shiftKey) : '·'}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {preview && preview.warnings?.length > 0 && (
                <div className="p-4 border-t border-warning-line bg-warning-subtle space-y-1">
                  {preview.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-warning-text">⚠ {w}</p>
                  ))}
                </div>
              )}
            </Card>
          )}

          {tab === 'conflicts' && (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="font-semibold text-ink">{t('rotConflictCenter')}</h3>
                {rot.generation?.stale && <Badge variant="warning">{t('rotStaleGeneration')}</Badge>}
              </div>
              {conflictList.length === 0 ? (
                <EmptyState
                  title={t('rotNoConflicts')}
                  description={preview ? t('rotPreviewCompliant') : t('rotGenerateToSeeConflicts')}
                />
              ) : (
                <div className="space-y-3">
                  {conflictList.map((c) => (
                    <div key={c.id} className={`p-3 rounded-lg border ${SEVERITY_STYLES[c.severity]}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide">{t(SEVERITY_LABEL_KEYS[c.severity])} · {c.title}</p>
                          <p className="text-sm mt-1">{c.message}</p>
                          {c.date && <p className="text-[10px] mt-1 opacity-70">{c.date}{c.shiftKey ? ` · ${c.shiftKey}` : ''}</p>}
                        </div>
                      </div>
                      {c.suggestions && c.suggestions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {c.suggestions.map((s, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-surface/70 border border-current/20">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {tab === 'workload' && statsData && (
            <Card padding={false}>
              <div className="p-4 border-b border-line">
                <h3 className="font-semibold text-ink">{t('rotWorkloadBalance')}</h3>
                <p className="text-xs text-muted">
                  {t('rotFairnessIndex')} <strong className="text-primary-600 dark:text-primary-300">{statsData.fairness.index}</strong> ·{' '}
                  {t('rotHourSpread')} {statsData.fairness.hourSpread}h · {t('rotNightSpread')} {statsData.fairness.nightSpread}
                </p>
              </div>
              <div className="p-4 space-y-3">
                {statsData.workloads.map((w) => {
                  const maxH = Math.max(...statsData.workloads.map((x) => x.hours), 1);
                  const pct = Math.round((w.hours / maxH) * 100);
                  return (
                    <div key={w.guardId}>
                      <div className="flex justify-between gap-3 text-xs mb-1">
                        <span className="font-medium text-ink">{w.name}</span>
                        <span className="text-muted text-right">
                          {w.hours}h · {w.shifts} {t('rotShiftsWord')} · {w.dayShifts}D/{w.nightShifts}N · {t('rotRestDaysShort')} {w.restDays}d
                          {w.shortestRestHours !== null && ` · ${t('rotMinRest')} ${w.shortestRestHours}h`}
                        </span>
                      </div>
                      <div className="h-2.5 bg-subtle rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all bg-gradient-to-r from-primary-700 to-primary-400"
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {tab === 'setup' && (
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <h3 className="font-semibold text-ink mb-3">{t('rotShiftDefinitions')}</h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted border-b border-line">
                      <th className="py-1.5">{t('rotKey')}</th><th>{t('rotNameLabel')}</th><th>{t('rotTimeCol')}</th><th className="text-right">{t('rotReqPerDay')}</th>
                    </tr>
                  </thead>
                  <tbody className="text-ink">
                    {(defs.length ? defs : [{ key: 'DAY', name: 'Day', startTime: rot.dayStartTime, endTime: rot.dayEndTime || '18:00', requiredCount: rot.dayShiftCount },
                      ...(rot.nightShiftCount > 0 ? [{ key: 'NIGHT', name: 'Night', startTime: rot.nightStartTime || '18:00', endTime: rot.nightEndTime, requiredCount: rot.nightShiftCount }] : [])]).map((d) => (
                      <tr key={d.key} className="border-b border-line">
                        <td className="py-1.5 font-mono">{d.key}</td>
                        <td>{d.name}</td>
                        <td>{d.startTime}–{d.endTime}</td>
                        <td className="text-right font-semibold">{d.requiredCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <h3 className="font-semibold text-ink mt-5 mb-2">{t('rotRecoveryRulesShort')}</h3>
                <ul className="text-xs text-muted space-y-1">
                  {(rot.restRules?.length ? rot.restRules : [{ maxShiftHours: 12, minRestHours: 24 }, { maxShiftHours: 24, minRestHours: 48 }]).map((r, i) => (
                    <li key={i}>{t('rotRestRuleLine', { max: r.maxShiftHours, min: r.minRestHours })}</li>
                  ))}
                </ul>
              </Card>
              <Card>
                <h3 className="font-semibold text-ink mb-3">{t('rotGuardPool')} ({activePool.length})</h3>
                <ol className="text-sm space-y-1.5">
                  {guardList.map((g, i) => (
                    <li key={g.id} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary-500/15 text-primary-700 dark:text-primary-300 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                      <span className="text-ink">{g.name}</span>
                      {canManage && ['DRAFT', 'REVIEW'].includes(status) && (
                        <button
                          type="button"
                          onClick={() => runAction(t('rotRemove'), () => rotationsApi.removeGuard(id, g.id), t('rotActionSucceeded', { action: t('rotRemove') }))}
                          className="ml-auto text-[10px] text-danger-text hover:underline"
                        >
                          {t('rotRemove')}
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
                <h3 className="font-semibold text-ink mt-5 mb-2">{t('rotActivityLog')}</h3>
                <div className="space-y-1 max-h-40 overflow-y-auto text-[11px] text-muted">
                  {(rot.changeLog || []).slice().reverse().map((e, i) => (
                    <div key={i}>
                      <span className="text-subtext">{new Date(e.at).toLocaleString()}</span> — <strong>{e.action}</strong>
                      {e.details ? ` · ${e.details}` : ''}
                    </div>
                  ))}
                  {(rot.changeLog || []).length === 0 && <p>{t('rotNoActivity')}</p>}
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold text-ink mb-2 text-sm">{t('rotLifecycle')}</h3>
            <ol className="space-y-1.5 text-xs">
              {(['DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'ACTIVE', 'COMPLETED'] as const).map((s) => {
                const order = ['DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'ACTIVE', 'COMPLETED'];
                const curIdx = order.indexOf(status === 'PAUSED' ? 'ACTIVE' : status === 'GENERATED' ? 'DRAFT' : status);
                const idx = order.indexOf(s);
                const done = curIdx >= idx && curIdx >= 0;
                const current = order[curIdx] === s;
                return (
                  <li key={s} className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-full text-[9px] flex items-center justify-center ${
                      current ? 'bg-primary-600 text-white' : done ? 'bg-success text-white' : 'bg-subtle-hover text-subtext'
                    }`}>{done && !current ? '✓' : ''}</span>
                    <span className={current ? 'font-bold text-primary-700 dark:text-primary-300' : done ? 'text-ink' : 'text-subtext'}>
                      {t(STATUS_LABEL_KEYS[s])}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Card>

          <Card>
            <h3 className="font-semibold text-ink mb-2 text-sm">{t('rotCoverageByShift')}</h3>
            {statsData?.coverage.byShift.map((s) => (
              <div key={s.key} className="mb-2">
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-muted">{s.name}</span>
                  <span className={s.pct === 100 ? 'text-success-text font-semibold' : 'text-warning-text font-semibold'}>{s.pct}%</span>
                </div>
                <div className="h-1.5 bg-subtle rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${s.pct === 100 ? 'bg-success' : 'bg-warning'}`}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-subtext mt-0.5">
                  {t('rotPerDayCount', { assigned: s.assignedPerDayAvg.toFixed(1), required: s.requiredPerDay })}
                  {s.shortageDays > 0 ? ` · ${t('rotShortDays', { days: s.shortageDays })}` : ''}
                </p>
              </div>
            ))}
            {!statsData && <p className="text-xs text-subtext">{t('rotGenerateToSeeCoverage')}</p>}
          </Card>

          {statsData && !statsData.staffing.sufficient && (
            <Card className="border-warning-line bg-warning-subtle">
              <h3 className="font-semibold text-warning-text mb-1 text-sm">{t('rotStaffingGap')}</h3>
              <p className="text-xs text-warning-text">
                {t('rotStaffingGapBody', {
                  needed: statsData.staffing.estimatedMinPool,
                  current: statsData.staffing.currentPool,
                  add: statsData.staffing.recommendedAdditional,
                })}
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Move modal */}
      <Modal open={moveOpen && !!selectedCell} onClose={() => setMoveOpen(false)} title={t('rotMoveSwapTitle')}>
        {selectedCell && (
          <MoveModalBody
            cell={selectedCell}
            guards={guardList}
            date={selectedCell.date}
            onCancel={() => setMoveOpen(false)}
            onDone={async (from, to, override) => {
              setMoveOpen(false);
              setBusy(true);
              try {
                const fn = override ? rotationsApi.moveOverride : rotationsApi.move;
                await fn(id, { date: selectedCell.date, fromGuardId: from, toGuardId: to, shiftKey: selectedCell.shiftKey });
                setNotice(override ? t('rotMovedOverride') : t('rotMoved'));
                await load();
              } catch (e: any) {
                const v = e?.response?.data?.violations;
                if (Array.isArray(v) && v.length) {
                  setError(`${e.response.data.message}\n• ${v.join('\n• ')}`);
                } else {
                  setError(e?.response?.data?.message || t('rotMoveFailed'));
                }
              } finally {
                setBusy(false);
              }
            }}
            canOverride={canOverride}
          />
        )}
      </Modal>

      {/* Rotate modal */}
      <Modal open={rotateOpen} onClose={() => setRotateOpen(false)} title={t('rotRotateDayTitle')}>
        <RotateModalBody
          dates={dates}
          onCancel={() => setRotateOpen(false)}
          onDone={async (date, steps) => {
            setRotateOpen(false);
            await runAction(t('rotRotate'), () => rotationsApi.rotate(id, { date, steps }), t('rotDayRotated'));
          }}
        />
      </Modal>

      {/* Publish confirm */}
      <Modal open={publishOpen} onClose={() => setPublishOpen(false)} title={t('rotPublishConfirmTitle')}>
        <p className="text-sm text-muted mb-4">
          {t('rotPublishConfirmBody', { count: assignments.length || previewCells.length || '—' })}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setPublishOpen(false)}>{t('cancel')}</Button>
          <Button
            onClick={async () => { setPublishOpen(false); await doPublish(); }}
            disabled={busy}
            className="!bg-primary-700 hover:!bg-primary-800"
          >
            {t('rotPublish')}
          </Button>
        </div>
      </Modal>

      {/* Edit modal */}
      <EditRotationModal
        open={editOpen}
        rotation={rot}
        onClose={() => setEditOpen(false)}
        onSave={async (body) => {
          setEditOpen(false);
          await runAction(t('rotUpdate'), () => rotationsApi.update(id, body), t('rotUpdated'));
        }}
      />
    </div>
  );
}

function OverviewCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`bg-surface rounded-xl border p-4 ${accent ? 'border-primary-300 dark:border-primary-500/40' : 'border-line'}`}>
      <p className="text-[10px] uppercase tracking-wide text-subtext font-semibold">{label}</p>
      <p className={`text-xl font-bold mt-1 ${accent ? 'text-primary-700 dark:text-primary-300' : 'text-ink'}`}>{value}</p>
    </div>
  );
}

function MoveModalBody({
  cell, guards, date, onCancel, onDone, canOverride,
}: {
  cell: Cell;
  guards: { id: string; name: string }[];
  date: string;
  onCancel: () => void;
  onDone: (from: string, to: string, override: boolean) => void;
  canOverride: boolean;
}) {
  const t = useT();
  const [to, setTo] = useState('');
  const working = cell.guardId;
  const restGuards = guards.filter((g) => g.id !== working);
  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-subtle border border-line text-sm">
        <p className="text-muted text-xs mb-1">{date} · {cell.shiftName}</p>
        <p className="font-semibold text-ink">
          {guards.find((g) => g.id === working)?.name || working}
        </p>
      </div>
      <div>
        <label className="v-label">{t('rotMoveToSwap')}</label>
        <select value={to} onChange={(e) => setTo(e.target.value)} className={FIELD_CLS}>
          <option value="">{t('rotSelectGuard')}</option>
          {restGuards.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <p className="text-[10px] text-subtext mt-1">{t('rotMoveHint')}</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} type="button">{t('cancel')}</Button>
        <Button
          disabled={!to}
          onClick={() => onDone(working, to, false)}
          type="button"
        >
          {t('rotMove')}
        </Button>
        {canOverride && (
          <Button
            disabled={!to}
            variant="outline"
            className="!text-warning-text !border-warning-line hover:!bg-warning-subtle"
            onClick={() => onDone(working, to, true)}
            type="button"
          >
            {t('rotOverride')}
          </Button>
        )}
      </div>
    </div>
  );
}

function RotateModalBody({
  dates, onCancel, onDone,
}: {
  dates: { key: string; date: Date }[];
  onCancel: () => void;
  onDone: (date: string, steps: number) => void;
}) {
  const t = useT();
  const [date, setDate] = useState(dates[0]?.key || '');
  const [steps, setSteps] = useState(1);
  return (
    <div className="space-y-4">
      <div>
        <label className="v-label">{t('rotDayLabel')}</label>
        <select value={date} onChange={(e) => setDate(e.target.value)} className={FIELD_CLS}>
          {dates.map((d) => (
            <option key={d.key} value={d.key}>{d.date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="v-label">{t('rotStepsCyclic')}</label>
        <input
          type="number"
          min={1}
          value={steps}
          onChange={(e) => setSteps(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className={`${COMPACT_FIELD_CLS} w-24`}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} type="button">{t('cancel')}</Button>
        <Button disabled={!date} onClick={() => onDone(date, steps)} type="button">
          {t('rotRotate')}
        </Button>
      </div>
    </div>
  );
}

function EditRotationModal({
  open, rotation, onClose, onSave,
}: {
  open: boolean;
  rotation: Rotation;
  onClose: () => void;
  onSave: (body: any) => Promise<void>;
}) {
  const t = useT();
  const [name, setName] = useState(rotation.name);
  const [description, setDescription] = useState(rotation.description || '');
  const [startDate, setStartDate] = useState(rotation.startDate.slice(0, 10));
  const [endDate, setEndDate] = useState((rotation.endDate || '').slice(0, 10));
  const [dayCount, setDayCount] = useState(rotation.dayShiftCount);
  const [nightCount, setNightCount] = useState(rotation.nightShiftCount);
  const [dayStart, setDayStart] = useState(rotation.dayStartTime);
  const [dayEnd, setDayEnd] = useState(rotation.dayEndTime || '18:00');
  const [nightStart, setNightStart] = useState(rotation.nightStartTime || '18:00');
  const [nightEnd, setNightEnd] = useState(rotation.nightEndTime || '06:00');

  useEffect(() => {
    if (open) {
      setName(rotation.name);
      setDescription(rotation.description || '');
      setStartDate(rotation.startDate.slice(0, 10));
      setEndDate((rotation.endDate || '').slice(0, 10));
      setDayCount(rotation.dayShiftCount);
      setNightCount(rotation.nightShiftCount);
      setDayStart(rotation.dayStartTime);
      setDayEnd(rotation.dayEndTime || '18:00');
      setNightStart(rotation.nightStartTime || '18:00');
      setNightEnd(rotation.nightEndTime || '06:00');
    }
  }, [open, rotation]);

  return (
    <Modal open={open} onClose={onClose} title={t('rotEditTitle')}>
      <div className="space-y-3">
        <div>
          <label className="v-label">{t('rotNameLabel')}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={FIELD_CLS} />
        </div>
        <div>
          <label className="v-label">{t('rotDescriptionLabel')}</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`${FIELD_CLS} resize-y`} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="v-label">{t('rotStartLabel')}</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={FIELD_CLS} />
          </div>
          <div>
            <label className="v-label">{t('rotEndLabel')}</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={FIELD_CLS} />
          </div>
        </div>
        {(!rotation.shiftDefinitions || rotation.shiftDefinitions.length <= 2) && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="v-label">{t('rotDayGuards')}</label>
              <input type="number" min={0} value={dayCount} onChange={(e) => setDayCount(Math.max(0, parseInt(e.target.value, 10) || 0))} className={FIELD_CLS} />
            </div>
            <div>
              <label className="v-label">{t('rotNightGuards')}</label>
              <input type="number" min={0} value={nightCount} onChange={(e) => setNightCount(Math.max(0, parseInt(e.target.value, 10) || 0))} className={FIELD_CLS} />
            </div>
            <div>
              <label className="v-label">{t('rotDayStart')}</label>
              <input type="time" value={dayStart} onChange={(e) => setDayStart(e.target.value)} className={FIELD_CLS} />
            </div>
            <div>
              <label className="v-label">{t('rotDayEnd')}</label>
              <input type="time" value={dayEnd} onChange={(e) => setDayEnd(e.target.value)} className={FIELD_CLS} />
            </div>
            <div>
              <label className="v-label">{t('rotNightStart')}</label>
              <input type="time" value={nightStart} onChange={(e) => setNightStart(e.target.value)} className={FIELD_CLS} />
            </div>
            <div>
              <label className="v-label">{t('rotNightEnd')}</label>
              <input type="time" value={nightEnd} onChange={(e) => setNightEnd(e.target.value)} className={FIELD_CLS} />
            </div>
          </div>
        )}
        <p className="text-[10px] text-warning-text bg-warning-subtle border border-warning-line rounded px-2 py-1.5">
          {t('rotEditDraftWarning')}
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} type="button">{t('cancel')}</Button>
          <Button
            type="button"
            onClick={() => onSave({
              name: name.trim() || rotation.name,
              description,
              startDate,
              endDate: endDate || undefined,
              dayShiftCount: dayCount,
              nightShiftCount: nightCount,
              dayStartTime: dayStart,
              dayEndTime: dayEnd,
              nightStartTime: nightStart,
              nightEndTime: nightEnd,
            })}
          >
            {t('save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
