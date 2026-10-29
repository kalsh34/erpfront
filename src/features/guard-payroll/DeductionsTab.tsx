import { useCallback, useEffect, useState } from 'react';
import { Plus, XCircle } from 'lucide-react';
import api from '../../lib/api';
import { Badge, Button, Card, FormField, LoadingSpinner, Select } from '../../components/ui';
import { useT } from '../../i18n';

interface GuardOption { _id: string; employeeCode: string; firstName: string; lastName: string }

interface DeductionRow {
  _id: string;
  employeeId: GuardOption | string;
  type: string;
  label: string;
  totalAmount: number;
  monthlyInstallment?: number | null;
  remainingBalance: number;
  startDate?: string | null;
  periodKey?: string | null;
  status: string;
}

const TYPES = ['LOAN', 'ADVANCE', 'PENALTY', 'OTHER'];
const now = new Date();

const empName = (d: DeductionRow) => {
  const e = typeof d.employeeId === 'object' ? d.employeeId : null;
  return e ? `${e.firstName} ${e.lastName} (${e.employeeCode})` : '—';
};

/** Loans, advances, penalties and other deductions (shared payroll infrastructure). */
export function DeductionsTab({ onError }: { onError: (msg: string | null) => void }) {
  const t = useT();
  const [guards, setGuards] = useState<GuardOption[]>([]);
  const [rows, setRows] = useState<DeductionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');

  const [form, setForm] = useState({
    employeeId: '',
    type: 'LOAN',
    label: '',
    totalAmount: '',
    monthlyInstallment: '',
    startDate: '',
    periodKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    notes: '',
  });

  const errMsg = (e: any) => e?.response?.data?.message || e?.message || 'Request failed';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, dedRes] = await Promise.all([
        api.get('/employees', { params: { category: 'GUARD', limit: 500 } }),
        api.get('/payroll-common/deductions'),
      ]);
      setGuards(empRes.data.data?.items || empRes.data.data || []);
      setRows(dedRes.data.data || []);
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

  const save = async () => {
    const isInstallment = form.type === 'LOAN' || form.type === 'ADVANCE';
    setSaving(true);
    try {
      await api.post('/payroll-common/deductions', {
        employeeId: form.employeeId,
        type: form.type,
        label: form.label,
        totalAmount: Number(form.totalAmount),
        monthlyInstallment: isInstallment && form.monthlyInstallment ? Number(form.monthlyInstallment) : undefined,
        startDate: isInstallment ? form.startDate : undefined,
        periodKey: isInstallment ? undefined : form.periodKey,
        notes: form.notes || undefined,
      });
      setForm({ ...form, label: '', totalAmount: '', monthlyInstallment: '', notes: '' });
      onError(null);
      await load();
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (id: string) => {
    try {
      await api.post(`/payroll-common/deductions/${id}/cancel`);
      await load();
    } catch (e) {
      onError(errMsg(e));
    }
  };

  const visible = typeFilter ? rows.filter((r) => r.type === typeFilter) : rows;
  const isInstallment = form.type === 'LOAN' || form.type === 'ADVANCE';

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-ink mb-3">
          <Plus size={15} />
          {t('gpDeductions')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <FormField label={t('gpGuards')}>
            <Select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
              <option value="">—</option>
              {guards.map((g) => (
                <option key={g._id} value={g._id}>{g.firstName} {g.lastName} ({g.employeeCode})</option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('gpType')}>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((ty) => (
                <option key={ty} value={ty}>{ty}</option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('gpLabel')}>
            <input className="v-input w-full" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </FormField>
          <FormField label={t('gpAmount')}>
            <input className="v-input w-full" type="number" min="0" step="0.01" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} />
          </FormField>
          {isInstallment ? (
            <>
              <FormField label={`${t('gpInstallment')} (0 = full)`}>
                <input className="v-input w-full" type="number" min="0" step="0.01" value={form.monthlyInstallment} onChange={(e) => setForm({ ...form, monthlyInstallment: e.target.value })} />
              </FormField>
              <FormField label={t('gpStartDate')}>
                <input className="v-input w-full" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </FormField>
            </>
          ) : (
            <FormField label={t('gpAppliesMonth')}>
              <input className="v-input w-full" type="month" value={form.periodKey} onChange={(e) => setForm({ ...form, periodKey: e.target.value })} />
            </FormField>
          )}
          <FormField label={t('dedNotes')}>
            <div className="flex gap-2">
              <input className="v-input w-full" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <Button onClick={save} disabled={saving || !form.employeeId || !form.label || !form.totalAmount}>{t('save')}</Button>
            </div>
          </FormField>
        </div>
      </Card>

      <div className="max-w-xs">
        <Select label={t('gpType')} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          {TYPES.map((ty) => (
            <option key={ty} value={ty}>{ty}</option>
          ))}
        </Select>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-subtext">
              <th className="px-4 py-3">{t('gpGuards')}</th>
              <th className="px-4 py-3">{t('gpType')}</th>
              <th className="px-4 py-3">{t('gpLabel')}</th>
              <th className="px-4 py-3 text-right">{t('gpAmount')}</th>
              <th className="px-4 py-3 text-right">{t('gpInstallment')}</th>
              <th className="px-4 py-3 text-right">{t('gpRemaining')}</th>
              <th className="px-4 py-3">{t('gpStartDate')} / {t('gpAppliesMonth')}</th>
              <th className="px-4 py-3">{t('status')}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {visible.map((d) => (
              <tr key={d._id} className="border-b border-line last:border-0 hover:bg-subtle/50">
                <td className="px-4 py-3 font-medium text-ink">{empName(d)}</td>
                <td className="px-4 py-3"><Badge variant={d.type === 'PENALTY' ? 'danger' : 'info'}>{d.type}</Badge></td>
                <td className="px-4 py-3 text-muted">{d.label}</td>
                <td className="px-4 py-3 text-right">{d.totalAmount.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-muted">{d.monthlyInstallment ? d.monthlyInstallment.toLocaleString() : '—'}</td>
                <td className="px-4 py-3 text-right">{d.type === 'LOAN' || d.type === 'ADVANCE' ? d.remainingBalance.toLocaleString() : '—'}</td>
                <td className="px-4 py-3 text-muted">
                  {d.startDate ? new Date(d.startDate).toLocaleDateString() : d.periodKey || '—'}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={d.status === 'ACTIVE' ? 'success' : d.status === 'COMPLETED' ? 'info' : 'default'}>{d.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  {d.status === 'ACTIVE' && (
                    <Button variant="secondary" onClick={() => cancel(d._id)} className="flex items-center gap-1">
                      <XCircle size={13} />
                      {t('cancel')}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted">—</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
