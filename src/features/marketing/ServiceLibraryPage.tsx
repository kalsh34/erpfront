import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../lib/api';
import { useAuthStore, can } from '../../stores/authStore';
import { useT, type DictKey } from '../../i18n';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { FormField } from '../../components/ui/FormField';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import {
  Search, Plus, RefreshCw, Edit2, Eye, Ban, RotateCcw, Shield, ScanLine, Video, Building, DoorOpen, Shapes, Coins,
} from 'lucide-react';

/* ── API shapes (mirror erpback/src/models/ServiceLibraryItem.ts) ──────────── */

interface DetailRow { key: string; label: string; value: string }
interface EquipmentItem { name: string; quantity: number; unit: string; notes?: string }

interface ServiceItem {
  _id: string;
  code: string;
  name: string;
  description: string;
  category: string;      // ServiceCategory
  unit: string;
  pricingModel: string;  // PricingModel
  defaultUnitPrice: number | null;
  currency: string;
  structuredDetails: DetailRow[];
  maleGuardsPerDay?: number | null;
  femaleGuardsPerDay?: number | null;
  maleGuardsPerMonth?: number | null;
  femaleGuardsPerMonth?: number | null;
  monthlySalaryBeforeVatMale?: number | null;
  monthlySalaryBeforeVatFemale?: number | null;
  shiftNote?: string;
  equipmentItems: EquipmentItem[];
  installationNote?: string;
  isActive: boolean;
  deactivatedAt?: string | null;
  updatedAt: string;
}

const CATEGORIES = [
  { value: 'GUARD_SERVICE', icon: Shield },
  { value: 'CCTV', icon: Video },
  { value: 'ALARM', icon: Building },
  { value: 'QR_PATROL', icon: ScanLine },
  { value: 'ACCESS_CONTROL', icon: DoorOpen },
  { value: 'CUSTOM', icon: Shapes },
] as const;

const PRICING_MODELS = ['MONTHLY_PER_GUARD', 'PER_DAY', 'PER_UNIT', 'PER_INSTALLATION', 'CUSTOM'] as const;

/** Keys the backend derives/mirrors automatically — never POST these as user detail rows. */
const RESERVED_DETAIL_KEYS = new Set([
  'maleguardsperday', 'femaleguardsperday', 'maleguardspermonth', 'femaleguardspermonth',
  'monthlysalarybeforevatmale', 'monthlysalarybeforevatfemale', 'shiftnote', 'installationnote', 'defaultunitprice',
]);

const fmtMoney = (n: number | null | undefined): string =>
  n == null ? '' : n.toLocaleString(undefined, { maximumFractionDigits: 2 });

/** Safe i18n cast for the en/am dictionary keys added with this page. */
const tc = (key: string): DictKey => key as DictKey;

/* ── Page ──────────────────────────────────────────────────────────────────── */

export function ServiceLibraryPage() {
  const t = useT();
  const user = useAuthStore((s) => s.user);

  // Backend authorities: reads need service.read, writes service.manage
  // (SUPER_ADMIN gets READ by role default but MANAGE only via an explicit
  // marketing module grant; CEO is mandatorily denied MANAGE). A bare nav
  // link grants nothing — real permission data decides what renders.
  const hasRead = user ? can(user.permissions, 'service.read') : false;
  const hasManage = user ? can(user.permissions, 'service.manage') : false;

  const [items, setItems] = useState<ServiceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active');

  const [detailsItem, setDetailsItem] = useState<ServiceItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [confirm, setConfirm] = useState<{ item: ServiceItem; mode: 'deactivate' | 'reactivate' } | null>(null);
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    const id = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  const fetchItems = useCallback(async () => {
    if (!hasRead) return;
    setLoading(true);
    setError('');
    try {
      const params: Record<string, unknown> = { page, limit: 12 };
      if (search) params.search = search;
      if (category) params.category = category;
      // Backend reads `active` as the string 'true'/'false'.
      if (status !== 'all') params.active = status === 'active' ? 'true' : 'false';
      const res = await api.get('/marketing/service-library', { params });
      setItems(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (err: any) {
      const httpStatus = err?.response?.status;
      const serverMsg = typeof err?.response?.data?.message === 'string' ? err.response.data.message : '';
      setError(
        httpStatus === 403
          ? t('svcNoPermission')
          : serverMsg || t('svcLoadFailed')
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, category, status, t, hasRead]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  if (!hasRead) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmptyState
          icon={<Shield size={26} />}
          title={t('svcNoPermissionTitle')}
          description={t('svcNoPermission')}
        />
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / 12));

  const runStatusChange = async () => {
    if (!confirm) return;
    const { item, mode } = confirm;
    setBusyId(item._id);
    setConfirm(null);
    try {
      if (mode === 'deactivate') {
        await api.delete(`/marketing/service-library/${item._id}`);
        setBanner({ kind: 'success', text: t('svcSuccessDeactivated', { name: item.name }) });
      } else {
        await api.post(`/marketing/service-library/${item._id}/reactivate`);
        setBanner({ kind: 'success', text: t('svcSuccessReactivated', { name: item.name }) });
      }
      if (items.length === 1 && page > 1) setPage(page - 1); else fetchItems();
    } catch (err: any) {
      const serverMsg = typeof err?.response?.data?.message === 'string' ? err.response.data.message : '';
      setBanner({ kind: 'error', text: serverMsg || t('svcStatusChangeFailed') });
    } finally {
      setBusyId('');
    }
  };

  const onSaved = (msgKey: string) => {
    setFormOpen(false);
    setBanner({ kind: 'success', text: t(msgKey as DictKey) });
    fetchItems();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="text-xl font-bold text-ink flex items-center gap-2.5">
            <Coins size={22} className="text-primary-600" />
            {t('svcTitle')}
          </h1>
          <p className="text-sm text-muted mt-0.5">{t('svcSubtitle')}</p>
        </div>
        {hasManage && (
          <Button
            onClick={() => { setEditing(null); setFormOpen(true); }}
            className="shrink-0"
          >
            <Plus size={16} />
            {t('svcNew')}
          </Button>
        )}
      </div>

      {/* Success / error banner */}
      {banner && (
        <div
          className={`flex items-center justify-between gap-3 p-3 text-sm rounded-lg border ${
            banner.kind === 'success'
              ? 'text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-500/10 dark:border-green-500/20'
              : 'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-500/10 dark:border-red-500/20'
          }`}
        >
          <span>{banner.text}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setBanner(null)} className="font-bold opacity-70 hover:opacity-100">×</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-surface p-4 rounded-xl border border-line shadow-card">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder={t('svcSearch')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="v-input !pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="!w-auto text-xs" aria-label={t('svcFieldCategory')}>
            <option value="">{t('svcAllCategories')}</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{t(tc(`svcCat_${c.value}`))}</option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }} className="!w-auto text-xs" aria-label={t('svcStatus')}>
            <option value="active">{t('svcStatusActive')}</option>
            <option value="inactive">{t('svcStatusInactive')}</option>
            <option value="all">{t('svcStatusAll')}</option>
          </Select>
          <button
            onClick={fetchItems}
            title={t('svcRefresh')}
            className="p-2 rounded-lg text-muted hover:text-ink hover:bg-canvas border border-line transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <LoadingSpinner text={t('svcLoading')} />
      ) : error ? (
        <div className="py-12 flex flex-col items-center gap-3">
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 dark:text-red-300 dark:bg-red-500/10 dark:border-red-500/20 rounded-lg px-4 py-3">{error}</p>
          <Button variant="outline" onClick={fetchItems}>{t('svcRetry')}</Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Shapes size={26} />}
          title={search || category ? t('svcEmptySearch') : status === 'inactive' ? t('svcEmptyInactive') : t('svcEmptyActive')}
          description={hasManage && !search && !category && status === 'active' ? t('svcEmptyActiveHint') : undefined}
          action={hasManage && !search && !category && status === 'active' ? (
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus size={16} /> {t('svcNew')}
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {items.map((item) => (
            <ServiceCard
              key={item._id}
              item={item}
              hasManage={hasManage}
              busy={busyId === item._id}
              onView={() => setDetailsItem(item)}
              onEdit={() => { setEditing(item); setFormOpen(true); }}
              onDeactivate={() => setConfirm({ item, mode: 'deactivate' })}
              onReactivate={() => setConfirm({ item, mode: 'reactivate' })}
            />
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                {t('previous')}
              </Button>
              <span className="text-xs text-muted">{t('svcPageOf', { page, total: totalPages })}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                {t('next')}
              </Button>
            </div>
          )}

          <p className="text-center text-xs text-muted pb-2">{t('svcVatNote')}</p>
        </div>
      )}

      {/* Details */}
      <ServiceDetailsModal item={detailsItem} onClose={() => setDetailsItem(null)} />

      {/* Create / Edit */}
      {formOpen && (
        <ServiceFormModal editing={editing} onClose={() => setFormOpen(false)} onSaved={onSaved} />
      )}

      {/* Deactivate / Reactivate confirmation */}
      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.mode === 'deactivate' ? t('svcDeactivateConfirmTitle') : t('svcReactivateConfirmTitle')}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirm(null)}>{t('cancel')}</Button>
            <Button variant={confirm?.mode === 'deactivate' ? 'danger' : 'primary'} onClick={runStatusChange} disabled={!!busyId}>
              {confirm?.mode === 'deactivate' ? t('svcDeactivate') : t('svcReactivate')}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted leading-relaxed">
          {confirm?.mode === 'deactivate'
            ? t('svcDeactivateConfirmBody', { name: confirm?.item.name || '' })
            : t('svcReactivateConfirmBody', { name: confirm?.item.name || '' })}
        </p>
      </Modal>
    </div>
  );
}

/* ── List row card ─────────────────────────────────────────────────────────── */

function ServiceCard({
  item, hasManage, busy, onView, onEdit, onDeactivate, onReactivate,
}: {
  item: ServiceItem;
  hasManage: boolean;
  busy: boolean;
  onView: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
}) {
  const t = useT();
  const catIcon = CATEGORIES.find((c) => c.value === item.category)?.icon || Shapes;

  const pricing = useMemo(() => {
    const cur = item.currency || 'ETB';
    if (item.category === 'GUARD_SERVICE') {
      const salaries = [item.monthlySalaryBeforeVatMale, item.monthlySalaryBeforeVatFemale].filter(
        (n): n is number => n != null && n > 0
      );
      if (salaries.length) {
        const min = Math.min(...salaries);
        const span = salaries[0] !== salaries[1] && salaries.length > 1
          ? `${cur} ${fmtMoney(min)} – ${fmtMoney(Math.max(...salaries))}`
          : `${cur} ${fmtMoney(min)}`;
        return `${span} · ${t('svcPerGuardMonth')}`;
      }
      return t('svcPriceNone');
    }
    if (item.defaultUnitPrice != null) {
      return `${cur} ${fmtMoney(item.defaultUnitPrice)} / ${item.unit.toLowerCase()}`;
    }
    return t('svcPriceNone');
  }, [item, t]);

  return (
    <div className={`bg-surface border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-all ${
      item.isActive ? 'border-line hover:border-primary-300 shadow-card' : 'border-line bg-canvas/40 opacity-80'
    }`}>
      <div className="w-10 h-10 rounded-lg bg-subtle border border-line flex items-center justify-center shrink-0 text-muted">
        {React.createElement(catIcon, { size: 18 })}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-ink">{item.name}</p>
          <span className="text-xs text-muted font-mono">{item.code}</span>
          {!item.isActive && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-subtle text-muted border border-line">
              {t('svcStatusInactive')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-1 text-xs text-muted">
          <span>{t(tc(`svcCat_${item.category}`))}</span>
          <span className="text-muted/40">·</span>
          <span className="font-medium text-ink/70">{pricing}</span>
          {!item.isActive && item.deactivatedAt && (
            <>
              <span className="text-muted/40">·</span>
              <span>{t('svcDeactivatedOn', { date: new Date(item.deactivatedAt).toLocaleDateString() })}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button variant="ghost" size="sm" onClick={onView}>
          <Eye size={14} /> {t('view')}
        </Button>
        {hasManage && item.isActive && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit2 size={14} /> {t('edit')}
          </Button>
        )}
        {hasManage && item.isActive && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={onDeactivate} title={t('svcDeactivate')} className="hover:!bg-red-50 dark:hover:!bg-red-500/10">
            <Ban size={14} className="text-red-500" /> {t('svcDeactivate')}
          </Button>
        )}
        {hasManage && !item.isActive && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={onReactivate}>
            <RotateCcw size={14} /> {t('svcReactivate')}
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── Details modal ─────────────────────────────────────────────────────────── */

function ServiceDetailsModal({ item, onClose }: { item: ServiceItem | null; onClose: () => void }) {
  const t = useT();
  if (!item) return null;
  const cur = item.currency || 'ETB';
  const isGuard = item.category === 'GUARD_SERVICE';

  return (
    <Modal open onClose={onClose} title={item.name} subtitle={`${item.code} · ${t(tc(`svcCat_${item.category}`))}`} size="lg">
      <div className="space-y-5 text-sm">
        {/* Status + description */}
        <div className={`rounded-lg border px-3 py-2 text-xs font-semibold inline-flex ${
          item.isActive
            ? 'text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-500/10 dark:border-green-500/20'
            : 'bg-subtle text-muted border-line'
        }`}>
          {item.isActive ? t('svcStatusActive') : t('svcStatusInactive')}
        </div>
        {item.description && <p className="text-muted leading-relaxed">{item.description}</p>}

        {/* Pricing */}
        <div className="bg-subtle border border-line rounded-xl p-4">
          <p className="text-[11px] font-bold text-subtext uppercase tracking-wider mb-2">{t('svcFormPricingSection')}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-muted">{t('svcFieldDefaultPrice')}</p>
              <p className="font-bold text-ink">
                {item.defaultUnitPrice != null ? `${cur} ${fmtMoney(item.defaultUnitPrice)}` : t('svcPriceNone')}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted">{t('svcFieldPricingModel')}</p>
              <p className="font-semibold text-ink">{t(tc(`svcPm_${item.pricingModel}`))}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted">{t('svcFieldUnit')}</p>
              <p className="font-semibold text-ink">{item.unit}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted">{t('svcFieldCurrency')}</p>
              <p className="font-semibold text-ink">{cur}</p>
            </div>
          </div>
          <p className="text-[10px] text-muted mt-3">{t('svcVatNote')}</p>
        </div>

        {/* Guard staffing */}
        {isGuard && (
          <div>
            <p className="text-[11px] font-bold text-subtext uppercase tracking-wider mb-2">{t('svcFormGuardSection')}</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                [t('svcFormMalePerDay'), item.maleGuardsPerDay],
                [t('svcFormFemalePerDay'), item.femaleGuardsPerDay],
                [t('svcFormMalePerMonth'), item.maleGuardsPerMonth],
                [t('svcFormFemalePerMonth'), item.femaleGuardsPerMonth],
                [t('svcFormSalaryMale'), item.monthlySalaryBeforeVatMale],
                [t('svcFormSalaryFemale'), item.monthlySalaryBeforeVatFemale],
              ] as [string, number | null | undefined][]).map(([label, value]) => (
                <div key={label} className="bg-subtle border border-line rounded-lg px-3 py-2 flex items-center justify-between">
                  <span className="text-xs text-muted">{label}</span>
                  <span className="text-sm font-semibold text-ink">
                    {value == null ? '—' : fmtMoney(value)}
                  </span>
                </div>
              ))}
            </div>
            {item.shiftNote && (
              <p className="text-xs text-muted mt-2 leading-relaxed">{item.shiftNote}</p>
            )}
          </div>
        )}

        {/* Equipment */}
        {!isGuard && item.equipmentItems?.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-subtext uppercase tracking-wider mb-2">{t('svcDetailsEquipment')}</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="py-2 pr-2 font-medium">{t('svcFormEquipmentName')}</th>
                  <th className="py-2 pr-2 font-medium">{t('svcFormQuantity')}</th>
                  <th className="py-2 pr-2 font-medium">{t('svcFieldUnit')}</th>
                  <th className="py-2 font-medium">{t('svcFormDetailNotes')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {item.equipmentItems.map((it, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-2 font-medium text-ink">{it.name}</td>
                    <td className="py-2 pr-2">{it.quantity}</td>
                    <td className="py-2 pr-2">{it.unit}</td>
                    <td className="py-2 text-muted">{it.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {item.installationNote && (
              <p className="text-xs text-muted mt-2 leading-relaxed">{item.installationNote}</p>
            )}
          </div>
        )}

        {/* Additional detail rows (mirrors + free-form user rows) */}
        {item.structuredDetails?.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-subtext uppercase tracking-wider mb-2">{t('svcDetailsExtraDetails')}</p>
            <div className="space-y-1.5">
              {item.structuredDetails.map((d) => (
                <div key={`${d.key}-${d.label}`} className="flex items-start justify-between gap-4 bg-subtle border border-line rounded-lg px-3 py-2">
                  <span className="text-xs text-muted shrink-0">{d.label}</span>
                  <span className="text-xs font-medium text-ink text-right">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ── Create / Edit form (category-adaptive) ────────────────────────────────── */

type FormState = {
  code: string; name: string; description: string; category: string;
  unit: string; pricingModel: string; defaultUnitPrice: string; currency: string;
  maleGuardsPerDay: string; femaleGuardsPerDay: string;
  maleGuardsPerMonth: string; femaleGuardsPerMonth: string;
  monthlySalaryBeforeVatMale: string; monthlySalaryBeforeVatFemale: string;
  shiftNote: string;
  equipmentItems: { name: string; quantity: string; unit: string; notes: string }[];
  installationNote: string;
  detailRows: { label: string; value: string }[];
};

const emptyForm: FormState = {
  code: '', name: '', description: '', category: 'GUARD_SERVICE', unit: 'MONTH',
  pricingModel: 'MONTHLY_PER_GUARD', defaultUnitPrice: '', currency: 'ETB',
  maleGuardsPerDay: '', femaleGuardsPerDay: '', maleGuardsPerMonth: '', femaleGuardsPerMonth: '',
  monthlySalaryBeforeVatMale: '', monthlySalaryBeforeVatFemale: '', shiftNote: '',
  equipmentItems: [], installationNote: '', detailRows: [],
};

/** '' → undefined means "leave alone"; only set null when the field was cleared. */
function numOrNull(v: string): number | null {
  return v.trim() === '' ? null : Number(v);
}

/** Existing detail rows the backend mirrors from conveniences — not editable as free rows. */
function isMirroredRow(key: string): boolean {
  const k = key.toLowerCase();
  if (RESERVED_DETAIL_KEYS.has(k)) return true;
  return k.startsWith('equipment:');
}

function toForm(item: ServiceItem): FormState {
  return {
    code: item.code, name: item.name, description: item.description || '',
    category: item.category, unit: item.unit || 'MONTH', pricingModel: item.pricingModel || 'CUSTOM',
    defaultUnitPrice: item.defaultUnitPrice == null ? '' : String(item.defaultUnitPrice),
    currency: item.currency || 'ETB',
    maleGuardsPerDay: item.maleGuardsPerDay == null ? '' : String(item.maleGuardsPerDay),
    femaleGuardsPerDay: item.femaleGuardsPerDay == null ? '' : String(item.femaleGuardsPerDay),
    maleGuardsPerMonth: item.maleGuardsPerMonth == null ? '' : String(item.maleGuardsPerMonth),
    femaleGuardsPerMonth: item.femaleGuardsPerMonth == null ? '' : String(item.femaleGuardsPerMonth),
    monthlySalaryBeforeVatMale: item.monthlySalaryBeforeVatMale == null ? '' : String(item.monthlySalaryBeforeVatMale),
    monthlySalaryBeforeVatFemale: item.monthlySalaryBeforeVatFemale == null ? '' : String(item.monthlySalaryBeforeVatFemale),
    shiftNote: item.shiftNote || '',
    equipmentItems: (item.equipmentItems || []).map((it) => ({ name: it.name, quantity: String(it.quantity), unit: it.unit, notes: it.notes || '' })),
    installationNote: item.installationNote || '',
    detailRows: (item.structuredDetails || []).filter((d) => !isMirroredRow(d.key)).map((d) => ({ label: d.label, value: d.value })),
  };
}

function ServiceFormModal({
  editing, onClose, onSaved,
}: {
  editing: ServiceItem | null;
  onClose: () => void;
  onSaved: (msgKey: string) => void;
}) {
  const t = useT();
  const [form, setForm] = useState<FormState>(editing ? toForm(editing) : emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isGuard = form.category === 'GUARD_SERVICE';

  const set = (k: keyof FormState, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const buildPayload = (): Record<string, unknown> => {
    const payload: Record<string, unknown> = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      category: form.category,
      unit: form.unit.trim() || 'MONTH',
      pricingModel: form.pricingModel,
      description: form.description.trim(),
      shiftNote: form.shiftNote.trim(),
      installationNote: form.installationNote.trim(),
      structuredDetails: form.detailRows
        .filter((r) => r.label.trim() && r.value.trim())
        .map((r) => ({ key: r.label.trim(), label: r.label.trim(), value: r.value.trim() })),
      equipmentItems: form.equipmentItems
        .filter((it) => it.name.trim())
        .map((it) => ({
          name: it.name.trim(),
          quantity: numOrNull(it.quantity) ?? 0,
          unit: it.unit.trim() || 'PCS',
          ...(it.notes.trim() ? { notes: it.notes.trim() } : {}),
        })),
    };
    // Explicit nulls CLEAR guard/price fields on edit; numbers are validated client-side + server-side.
    (['maleGuardsPerDay', 'femaleGuardsPerDay', 'maleGuardsPerMonth', 'femaleGuardsPerMonth',
      'monthlySalaryBeforeVatMale', 'monthlySalaryBeforeVatFemale', 'defaultUnitPrice'] as const)
      .forEach((k) => { payload[k] = numOrNull(form[k] as string); });
    return payload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // Light UX checks ONLY — /api/marketing/service-library remains the
    // authoritative validator (login + SERVICE_MANAGE guard every write).
    if (!form.name.trim()) return setError(t('svcFormErrName'));
    if (!form.code.trim() || !/^[A-Z0-9][A-Z0-9._/-]{1,63}$/i.test(form.code.trim())) {
      return setError(t('svcFormErrCode'));
    }
    for (const it of form.equipmentItems) {
      if (it.name.trim() && (it.quantity.trim() === '' || isNaN(Number(it.quantity)) || Number(it.quantity) < 0)) {
        return setError(t('svcFormErrQuantity'));
      }
    }
    if (isGuard) {
      const day = [form.maleGuardsPerDay, form.femaleGuardsPerDay].every((v) => v.trim() === '' || v.trim() === '0');
      const month = [form.maleGuardsPerMonth, form.femaleGuardsPerMonth].every((v) => v.trim() === '' || v.trim() === '0');
      if (day && month) return setError(t('svcFormErrStaffing'));
    }
    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (editing) {
        await api.put(`/marketing/service-library/${editing._id}`, payload);
        onSaved('svcSuccessUpdated');
      } else {
        await api.post('/marketing/service-library', payload);
        onSaved('svcSuccessCreated');
      }
    } catch (err: any) {
      const serverMsg = typeof err?.response?.data?.message === 'string' ? err.response.data.message : '';
      setError(serverMsg || (err?.response?.status === 403 ? t('svcNoPermission') : t('svcSaveFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? t('svcFormEditTitle') : t('svcFormCreateTitle')}
      subtitle={editing ? `${editing.code} · ${t(tc(`svcCat_${editing.category}`))}` : undefined}
      size="xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? t('svcFormSaving') : t('save')}
          </Button>
        </div>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-5">
        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 dark:text-red-300 dark:bg-red-500/10 dark:border-red-500/20 rounded-lg">{error}</div>
        )}

        {/* Identity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            name="code" label={t('svcFieldCode')} required
            placeholder="SVC-GUARD-M" value={form.code}
            onChange={(e) => set('code', e.target.value.toUpperCase())}
            hint={t('svcFieldCodeHint')}
          />
          <FormField name="name" label={t('svcFieldName')} required value={form.name} onChange={(e) => set('name', e.target.value)} />
          <FormField label={t('svcFieldCategory')}>
            <Select value={form.category} onChange={(e) => {
              const cat = e.target.value;
              setForm((f) => ({
                ...f,
                category: cat,
                pricingModel: cat === 'GUARD_SERVICE' ? 'MONTHLY_PER_GUARD' : (f.pricingModel === 'MONTHLY_PER_GUARD' ? 'CUSTOM' : f.pricingModel),
                maleGuardsPerDay: '', femaleGuardsPerDay: '', maleGuardsPerMonth: '', femaleGuardsPerMonth: '',
                monthlySalaryBeforeVatMale: '', monthlySalaryBeforeVatFemale: '', shiftNote: '',
              }));
            }}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{t(tc(`svcCat_${c.value}`))}</option>
              ))}
            </Select>
          </FormField>
          <FormField name="unit" label={t('svcFieldUnit')} value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="MONTH" />
        </div>

        <FormField label={t('svcFieldDescription')}>
          <textarea
            className="v-input min-h-[72px]"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </FormField>

        {/* Pricing defaults */}
        <div className="bg-subtle border border-line rounded-xl p-4">
          <p className="text-[11px] font-bold text-subtext uppercase tracking-wider mb-3">{t('svcFormPricingSection')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label={t('svcFieldPricingModel')}>
              <Select value={form.pricingModel} onChange={(e) => set('pricingModel', e.target.value)}>
                {PRICING_MODELS.map((pm) => (
                  <option key={pm} value={pm}>{t(tc(`svcPm_${pm}`))}</option>
                ))}
              </Select>
            </FormField>
            <FormField
              name="defaultUnitPrice" label={t('svcFieldDefaultPrice')}
              type="number" min={0} step="0.01"
              value={form.defaultUnitPrice}
              onChange={(e) => set('defaultUnitPrice', e.target.value)}
              hint={t('svcFieldPriceHint')}
            />
            <FormField name="currency" label={t('svcFieldCurrency')} value={form.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} />
          </div>
        </div>

        {/* Guard staffing — only for GUARD_SERVICE */}
        {isGuard && (
          <div className="bg-subtle border border-line rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold text-subtext uppercase tracking-wider">{t('svcFormGuardSection')}</p>
              <p className="text-[10px] text-muted">{t('svcFormStaffingHint')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField name="maleGuardsPerDay" label={t('svcFormMalePerDay')} type="number" min={0} step="1" value={form.maleGuardsPerDay} onChange={(e) => set('maleGuardsPerDay', e.target.value)} />
              <FormField name="femaleGuardsPerDay" label={t('svcFormFemalePerDay')} type="number" min={0} step="1" value={form.femaleGuardsPerDay} onChange={(e) => set('femaleGuardsPerDay', e.target.value)} />
              <FormField name="maleGuardsPerMonth" label={t('svcFormMalePerMonth')} type="number" min={0} step="1" value={form.maleGuardsPerMonth} onChange={(e) => set('maleGuardsPerMonth', e.target.value)} hint={t('svcFormPerMonthHint')} />
              <FormField name="femaleGuardsPerMonth" label={t('svcFormFemalePerMonth')} type="number" min={0} step="1" value={form.femaleGuardsPerMonth} onChange={(e) => set('femaleGuardsPerMonth', e.target.value)} />
              <FormField name="monthlySalaryBeforeVatMale" label={t('svcFormSalaryMale')} type="number" min={0} step="0.01" value={form.monthlySalaryBeforeVatMale} onChange={(e) => set('monthlySalaryBeforeVatMale', e.target.value)} hint={t('svcFieldPriceHint')} />
              <FormField name="monthlySalaryBeforeVatFemale" label={t('svcFormSalaryFemale')} type="number" min={0} step="0.01" value={form.monthlySalaryBeforeVatFemale} onChange={(e) => set('monthlySalaryBeforeVatFemale', e.target.value)} hint={t('svcFieldPriceHint')} />
            </div>
            <FormField label={t('svcFormShiftNote')}>
              <textarea
                className="v-input min-h-[56px]"
                placeholder={t('svcFormShiftNotePlaceholder')}
                value={form.shiftNote}
                onChange={(e) => set('shiftNote', e.target.value)}
              />
            </FormField>
          </div>
        )}

        {/* Equipment — non-guard categories */}
        {!isGuard && (
          <div className="bg-subtle border border-line rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold text-subtext uppercase tracking-wider">{t('svcFormEquipmentSection')}</p>
              <Button variant="outline" size="sm" type="button" onClick={() => set('equipmentItems', [...form.equipmentItems, { name: '', quantity: '1', unit: 'PCS', notes: '' }])}>
                <Plus size={13} /> {t('svcFormEquipmentAdd')}
              </Button>
            </div>
            {form.equipmentItems.length === 0 && (
              <p className="text-xs text-muted mb-2">{t('svcFormEquipmentEmpty')}</p>
            )}
            <div className="space-y-2">
              {form.equipmentItems.map((it, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_5rem_5rem_1fr_auto] gap-2 items-start">
                  <input className="v-input" aria-label={t('svcFormEquipmentName')} placeholder={t('svcFormEquipmentName')} value={it.name} onChange={(e) => set('equipmentItems', form.equipmentItems.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))} />
                  <input className="v-input" type="number" min={0} aria-label={t('svcFormQuantity')} placeholder="Qty" value={it.quantity} onChange={(e) => set('equipmentItems', form.equipmentItems.map((r, j) => (j === i ? { ...r, quantity: e.target.value } : r)))} />
                  <input className="v-input" aria-label={t('svcFieldUnit')} placeholder="PCS" value={it.unit} onChange={(e) => set('equipmentItems', form.equipmentItems.map((r, j) => (j === i ? { ...r, unit: e.target.value } : r)))} />
                  <input className="v-input" aria-label={t('svcFormDetailNotes')} placeholder={t('svcFormDetailNotes')} value={it.notes} onChange={(e) => set('equipmentItems', form.equipmentItems.map((r, j) => (j === i ? { ...r, notes: e.target.value } : r)))} />
                  <button
                    type="button" aria-label="Remove item"
                    onClick={() => set('equipmentItems', form.equipmentItems.filter((_, j) => j !== i))}
                    className="p-2 rounded-lg text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-line"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <FormField label={t('svcFormInstallNote')}>
                <textarea
                  className="v-input min-h-[56px]"
                  value={form.installationNote}
                  onChange={(e) => set('installationNote', e.target.value)}
                />
              </FormField>
            </div>
          </div>
        )}

        {/* Additional detail lines */}
        <div className="bg-subtle border border-line rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold text-subtext uppercase tracking-wider">{t('svcFormDetailSection')}</p>
            <Button variant="outline" size="sm" type="button" onClick={() => set('detailRows', [...form.detailRows, { label: '', value: '' }])}>
              <Plus size={13} /> {t('svcFormDetailAdd')}
            </Button>
          </div>
          {form.detailRows.length === 0 && <p className="text-xs text-muted mb-2">{t('svcFormDetailEmpty')}</p>}
          <div className="space-y-2">
            {form.detailRows.map((r, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_auto] gap-2">
                <input className="v-input" aria-label={t('svcFormDetailLabel')} placeholder={t('svcFormDetailLabel')} value={r.label} onChange={(e) => set('detailRows', form.detailRows.map((row, j) => (j === i ? { ...row, label: e.target.value } : row)))} />
                <input className="v-input" aria-label={t('svcFormDetailValue')} placeholder={t('svcFormDetailValue')} value={r.value} onChange={(e) => set('detailRows', form.detailRows.map((row, j) => (j === i ? { ...row, value: e.target.value } : row)))} />
                <button
                  type="button" aria-label="Remove detail"
                  onClick={() => set('detailRows', form.detailRows.filter((_, j) => j !== i))}
                  className="p-2 rounded-lg text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-line"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
