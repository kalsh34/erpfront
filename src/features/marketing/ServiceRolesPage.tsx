import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Plus, Search, RefreshCw, Pencil, Ban, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { FormField } from '../../components/ui/FormField';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuthStore, can } from '../../stores/authStore';
import { marketing, apiError } from './api';
import {
  CATEGORY_LABELS,
  GENDER_LABELS,
  RATE_TYPES,
  ROLE_CATEGORIES,
  ROLE_GENDERS,
  SHIFT_LABELS,
  SHIFT_PATTERNS,
  STATUS_CLASSES,
  fmtMoney,
  type ServiceRole,
} from './types';

interface RoleForm {
  roleCode: string;
  roleName: string;
  gender: string;
  category: string;
  description: string;
  defaultMonthlyRate: string;
  rateType: string;
  vatApplicable: boolean;
  allowRateOverride: boolean;
  shiftPattern: string;
  multiplier: string;
  restDaysRule: string;
}

const emptyForm = (): RoleForm => ({
  roleCode: '',
  roleName: '',
  gender: 'UNISEX',
  category: 'MANPOWER',
  description: '',
  defaultMonthlyRate: '',
  rateType: 'MONTHLY',
  vatApplicable: true,
  allowRateOverride: false,
  shiftPattern: 'CONTINUOUS_24_48',
  multiplier: '3',
  restDaysRule: '',
});

const toForm = (role: ServiceRole): RoleForm => ({
  roleCode: role.roleCode,
  roleName: role.roleName,
  gender: role.gender,
  category: role.category,
  description: role.description ?? '',
  defaultMonthlyRate: String(role.defaultMonthlyRate ?? ''),
  rateType: role.rateType,
  vatApplicable: !!role.vatApplicable,
  allowRateOverride: !!role.allowRateOverride,
  shiftPattern: role.shiftPattern,
  multiplier: String(role.multiplier ?? '3'),
  restDaysRule: role.restDaysRule ?? '',
});

export default function ServiceRolesPage() {
  const user = useAuthStore((s) => s.user);
  const canWrite = user ? can(user.permissions, 'service.manage', 'proforma.issue') : false;

  const [rows, setRows] = useState<ServiceRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRole | null>(null);
  const [form, setForm] = useState<RoleForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await marketing.roles.list({ search: search || undefined, status });
      setRows(result.data);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const set = <K extends keyof RoleForm>(key: K, value: RoleForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError('');
    setOpen(true);
  };

  const openEdit = (role: ServiceRole) => {
    setEditing(role);
    setForm(toForm(role));
    setFormError('');
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setFormError('');
    try {
      const body = {
        ...form,
        roleCode: form.roleCode.toUpperCase(),
        defaultMonthlyRate: Number(form.defaultMonthlyRate),
        multiplier: Number(form.multiplier),
      };
      if (editing) await marketing.roles.update(editing._id, body);
      else await marketing.roles.create(body);
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (role: ServiceRole) => {
    try {
      await marketing.roles.update(role._id, { status: role.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
      await load();
    } catch (e) {
      setError(apiError(e));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <PageHeader
        title="Service Roles"
        subtitle="The catalog behind every proforma line: guard roles, rates, multipliers and shift rules."
        action={
          canWrite ? (
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4" /> Register Role
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="v-input !pl-9"
            placeholder="Search role code, name or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="v-input sm:w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active only</option>
          <option value="INACTIVE">Inactive only</option>
        </select>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-surface border border-line rounded-2xl overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Loading service roles…" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="w-7 h-7" />}
            title="No service roles yet"
            description="Register guard roles (MG, FG, SL, K9, CCTV…) with their monthly rate, multiplier and shift pattern."
            action={canWrite ? <Button onClick={openCreate}><Plus className="w-4 h-4" /> Register Role</Button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-canvas border-b border-line">
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold text-right">Default rate</th>
                  <th className="px-4 py-3 font-semibold text-center">Multiplier</th>
                  <th className="px-4 py-3 font-semibold">Shift pattern</th>
                  <th className="px-4 py-3 font-semibold text-center">VAT</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((role) => (
                  <tr key={role._id} className="border-b border-line last:border-0 hover:bg-canvas/60">
                    <td className="px-4 py-3 font-mono text-xs text-ink">{role.roleCode}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{role.roleName}</div>
                      <div className="text-xs text-muted">{GENDER_LABELS[role.gender] ?? role.gender}</div>
                    </td>
                    <td className="px-4 py-3 text-muted">{CATEGORY_LABELS[role.category] ?? role.category}</td>
                    <td className="px-4 py-3 text-right text-ink">{fmtMoney(role.defaultMonthlyRate)}</td>
                    <td className="px-4 py-3 text-center text-muted">{role.multiplier}</td>
                    <td className="px-4 py-3 text-muted">
                      <div>{SHIFT_LABELS[role.shiftPattern] ?? role.shiftPattern}</div>
                      {role.restDaysRule && <div className="text-xs">{role.restDaysRule}</div>}
                    </td>
                    <td className="px-4 py-3 text-center text-muted">{role.vatApplicable ? '15%' : 'Exempt'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[role.status] ?? ''}`}>
                        {role.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canWrite && (
                          <>
                            <button
                              className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-canvas"
                              title="Edit role"
                              onClick={() => openEdit(role)}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-canvas"
                              title={role.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                              onClick={() => void toggleStatus(role)}
                            >
                              {role.status === 'ACTIVE' ? <Ban className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="xl"
        title={editing ? `Edit ${editing.roleName}` : 'Register Service / Guard Role'}
        subtitle="Only active roles appear in the proforma picker."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : 'Save Role'}
            </Button>
          </div>
        }
      >
        {formError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>
        )}

        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">1. Basic information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Role Code" required value={form.roleCode} onChange={(e) => set('roleCode', e.target.value)} hint="MG, FG, SL, SITE-L, K9, CCTV…" />
          <FormField label="Role Name" required value={form.roleName} onChange={(e) => set('roleName', e.target.value)} />
          <Select label="Gender" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
            {ROLE_GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </Select>
          <Select label="Category" value={form.category} onChange={(e) => set('category', e.target.value)}>
            {ROLE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
          <div className="md:col-span-2">
            <label className="v-label">Description</label>
            <textarea className="v-input h-20" value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
        </div>

        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mt-6 mb-3">2. Pricing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Default Monthly Rate (ETB)"
            type="number"
            min={0}
            step="0.01"
            required
            value={form.defaultMonthlyRate}
            onChange={(e) => set('defaultMonthlyRate', e.target.value)}
          />
          <Select label="Rate Type" value={form.rateType} onChange={(e) => set('rateType', e.target.value)}>
            {RATE_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
          <label className="inline-flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.vatApplicable} onChange={(e) => set('vatApplicable', e.target.checked)} />
            VAT applicable (15%)
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.allowRateOverride} onChange={(e) => set('allowRateOverride', e.target.checked)} />
            Allow rate override per proforma
          </label>
        </div>

        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mt-6 mb-3">3. Shift rules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label="Shift Pattern" value={form.shiftPattern} onChange={(e) => set('shiftPattern', e.target.value)}>
            {SHIFT_PATTERNS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
          <FormField
            label="Multiplier"
            type="number"
            min={0.1}
            step="0.1"
            required
            value={form.multiplier}
            onChange={(e) => set('multiplier', e.target.value)}
            hint="Total headcount = posts per day × multiplier"
          />
          <div className="md:col-span-2">
            <label className="v-label">Rest days rule</label>
            <input
              className="v-input"
              placeholder="e.g. 24 hrs work / 48 hrs rest, one relief guard inclusive"
              value={form.restDaysRule}
              onChange={(e) => set('restDaysRule', e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
