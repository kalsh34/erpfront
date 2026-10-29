import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, LoadingSpinner, EmptyState, Badge, InfoTooltip } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { UserRole, PERMISSIONS, ROLE_PERMISSIONS } from '../../types';
import { formatDate, useLang, useT, type DictKey } from '../../i18n';
import { rotationsApi } from './api';
import { STATUS_STYLES, type Rotation, type RotationStatus } from './types';

function canManage(role?: UserRole): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes(PERMISSIONS.ROTATION_MANAGE as any);
}

const STATUS_FILTERS: { value: string; labelKey: DictKey }[] = [
  { value: '', labelKey: 'rotAllStatuses' },
  { value: 'DRAFT', labelKey: 'rotStatusDraft' },
  { value: 'REVIEW', labelKey: 'rotStatusReview' },
  { value: 'APPROVED', labelKey: 'rotStatusApproved' },
  { value: 'PUBLISHED', labelKey: 'rotStatusPublished' },
  { value: 'ACTIVE', labelKey: 'rotStatusActive' },
  { value: 'PAUSED', labelKey: 'rotStatusPaused' },
  { value: 'COMPLETED', labelKey: 'rotStatusCompleted' },
  { value: 'CANCELLED', labelKey: 'rotStatusCancelled' },
  { value: 'ARCHIVED', labelKey: 'rotStatusArchived' },
];

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

export default function RotationListPage() {
  const navigate = useNavigate();
  const t = useT();
  const lang = useLang();
  const { user } = useAuthStore();
  const manage = canManage(user?.role);

  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: { status?: string; search?: string } = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      setRotations(await rotationsApi.list(params));
    } catch (e: any) {
      setError(e?.response?.data?.message || t('rotFailedLoadList'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, t]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 space-y-4">
      {/* Compact Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('rotSearchPlaceholder')}
            className="v-input"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="v-input w-auto min-w-[180px]"
        >
          {STATUS_FILTERS.map((s) => <option key={s.value} value={s.value}>{t(s.labelKey)}</option>)}
        </select>
        <InfoTooltip content={t('rotListSubtitle')} />

        <div className="flex-1" />

        {manage && (
          <Link to="/rotations/new">
            <Button>{t('rotNew')}</Button>
          </Link>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-danger-subtle border border-danger-line text-sm text-danger-text">{error}</div>
      )}

      {loading ? (
        <LoadingSpinner text={t('rotLoadingSchedules')} />
      ) : rotations.length === 0 ? (
        <div className="bg-surface rounded-xl border border-line p-10">
          <EmptyState
            title={t('rotNoRotations')}
            description={manage ? t('rotNoRotationsHint') : t('rotNoMatches')}
            action={manage ? (
              <Link to="/rotations/new">
                <Button>{t('rotCreate')}</Button>
              </Link>
            ) : undefined}
          />
        </div>
      ) : (
        <div className="grid gap-3">
          {rotations.map((r) => {
            const site = typeof r.siteId === 'object' && r.siteId ? r.siteId : null;
            const poolCount = r.guardPool.filter((g) => g.status === 'ACTIVE').length;
            const defs = r.shiftDefinitions?.length
              ? r.shiftDefinitions.filter((d) => d.requiredCount > 0).map((d) => `${d.requiredCount}×${d.key}`).join(' · ')
              : `${r.dayShiftCount}D+${r.nightShiftCount}N`;
            const stale = r.generation?.stale;
            const feasibility = r.generation?.feasibility;
            return (
              <button
                key={r._id}
                type="button"
                onClick={() => navigate(`/rotations/${r._id}`)}
                className="v-card-interactive text-left w-full p-5 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-ink truncate">{r.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${STATUS_STYLES[r.status] || ''}`}>
                        {t(STATUS_LABEL_KEYS[r.status])}
                      </span>
                      {stale && <Badge variant="warning">{t('rotStale')}</Badge>}
                      {feasibility === 'FULLY_COMPLIANT' && <Badge variant="success">{t('rotCompliant')}</Badge>}
                      {feasibility === 'BEST_POSSIBLE' && <Badge variant="warning">{t('rotBestPossible')}</Badge>}
                    </div>
                    <p className="text-xs text-muted mt-1.5">
                      {site?.siteName || t('rotUnknownSite')} · {t('rotGuardsCount', { count: poolCount })} · {defs} ·{' '}
                      {t('rotStarts', { date: formatDate(lang, r.startDate) })}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-subtext shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { STATUS_STYLES };
export type { Rotation, RotationStatus };
