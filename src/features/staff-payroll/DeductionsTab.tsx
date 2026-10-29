import { useCallback, useEffect, useState } from 'react';
import { Plus, XCircle } from 'lucide-react';
import api from '../../lib/api';
import { Badge, Button, Card, FormField, LoadingSpinner, Select } from '../../components/ui';
import { useT } from '../../i18n';

interface EmployeeOption { _id: string; employeeCode: string; firstName: string; lastName: string }

interface DeductionRow {
  _id: string;
  employeeId: EmployeeOption | string;
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

/** Shared loan/advance/penalty deduction infrastructure (staff view, all employees). */
export function DeductionsTab() {
  const t = useT();
  const [rows, setRows] = useState<DeductionRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');

  const [employeeId, setEmployeeId] = useState('');
  const [type, setType] = useState('LOAN');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [installment, setInstallment] = useState('');
  const [startDate, setStartDate] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
  const [periodKey, setPeriodKey] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [saving, setSaving] = useState(false);

  const isInstallment = type === 'LOAN' || type === 'ADVANCE';
  const errMsg = (e: any, fallback: string) => e?.response?.data?.message || e?.message || fallback;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dedRes, empRes] = await Promise.all([
        api.get('/payroll-common/deductions', { params: typeFilter ? { status: 'ACTIVE' } : {} }).catch(() => ({ data: { data: [] } })),
        api.get('/employees', { params: { limit: 500 } }).catch(() => ({ data: { data: [] } })),
      ]);
      setRows(dedRes.data.data || []);
      const empData = empRes.data?.data;
      setEmployees(Array.isArray(empData) ? empData : empData?.items || []);
      setError(null);
    } catch {
      setError(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.post('/payroll-common/deductions', {
        employeeId,
        type,
        label,
        totalAmount: Number(amount),
        ...(isInstallment
          ? { monthlyInstallment: installment ? Number(installment) : undefined, startDate }
          : { periodKey }),
      });
      setEmployeeId(''); setLabel(''); setAmount(''); setInstallment('');
      await load();
    } catch (e) {
      setError(errMsg(e, 'Failed to create deduction'));
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (id: string) => {
    if (!confirm(t('cancelDeductionConfirm'))) return;
    try {
      await api.post(`/payroll-common/deductions/${id}/cancel`);
      await load();
    } catch (e) { setError(errMsg(e, 'Failed to cancel')); }
  };

  const visible = typeFilter ? rows.filter((r) => r.type === typeFilter) : rows;

  return (
    <div className="space-y-5">
      {error && <div className="p-3 rounded-lg bg-danger-subtle border border-danger-line text-danger-text text-sm">{error}</div>}

      <Card>
        <div className="px-5 py-4 border-b border-line">
          <h3 className="text-base font-semibold text-ink">{t('spAddDeduction')}</h3>
          <p className="text-xs text-muted mt-0.5">{t('spDeductionHint')}</p>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <FormField label={t('spEmployee')}>
            <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder={t('spSelectEmployee')}>
              {employees.map((e) => <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>)}
            </Select>
          </FormField>
          <FormField label={t('spType')}>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((x) => <option key={x} value={x}>{x}</option>)}
            </Select>
          </FormField>
          <FormField label={t('spLabel')}>
            <input className="v-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('spLabelPlaceholder')} />
          </FormField>
          <FormField label={`${t('spAmount')} (ETB) *`}>
            <input className="v-input" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </FormField>
          {isInstallment ? (
            <>
              <FormField label={t('spMonthlyInstallment')}>
                <input className="v-input" type="number" min="0" step="0.01" value={installment} onChange={(e) => setInstallment(e.target.value)} placeholder={t('spFullAmount')} />
              </FormField>
              <FormField label={t('spStartDate')}>
                <input className="v-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </FormField>
            </>
          ) : (
            <FormField label={t('spApplyMonth')}>
              <input className="v-input" type="month" value={periodKey} onChange={(e) => setPeriodKey(e.target.value)} />
            </FormField>
          )}
          <div className="flex items-end justify-end">
            <Button size="sm" onClick={create} disabled={!employeeId || !label || !amount || saving}>
              <Plus size={14} className="mr-1" />{t('save')}
            </Button>
          </div>
        </div>
      </Card>

      <Card padding={false}>
        <div className="px-5 py-3 border-b border-line flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">{t('spDeductionsList')}</h3>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">{t('spAllTypes')}</option>
            {TYPES.map((x) => <option key={x} value={x}>{x}</option>)}
          </Select>
        </div>
        {loading ? <div className="p-6"><LoadingSpinner /></div> : visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">{t('noData')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-subtle">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-subtext uppercase">{t('spEmployee')}</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-subtext uppercase">{t('spType')}</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-subtext uppercase">{t('spLabel')}</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-subtext uppercase">{t('spTotal')}</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-subtext uppercase">{t('spRemaining')}</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-subtext uppercase">{t('status')}</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((d) => (
                <tr key={d._id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-2.5 text-ink">{empName(d)}</td>
                  <td className="px-3 py-2.5"><Badge variant={d.type === 'PENALTY' ? 'danger' : 'info'}>{d.type}</Badge></td>
                  <td className="px-3 py-2.5 text-muted">{d.label}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{d.totalAmount.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{d.remainingBalance.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-center">
                    <Badge variant={d.status === 'ACTIVE' ? 'success' : 'default'}>{d.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {d.status === 'ACTIVE' && (
                      <button onClick={() => cancel(d._id)} className="text-danger-text hover:underline inline-flex items-center gap-1 text-xs">
                        <XCircle size={12} />{t('cancel')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
