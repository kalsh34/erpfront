import { AlertTriangle, Plus, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import api from '../../lib/api';
import { Badge, Button, Card, FormField, LoadingSpinner, Select } from '../../components/ui';
import { useT } from '../../i18n';
import { fmtMoney, StaffBonusEntry, StaffOvertimeEntry, staffName } from './staffPayroll.types';

interface EmployeeOption { _id: string; employeeCode: string; firstName: string; lastName: string }

const now = new Date();

/**
 * Overtime & Bonus tab.
 *  • Overtime amount enters Gross AND Taxable earnings.
 *  • Bonus is completely OUTSIDE the formula — added after Net Pay.
 */
export function EntriesTab() {
  const t = useT();
  const [periodKey, setPeriodKey] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [overtime, setOvertime] = useState<StaffOvertimeEntry[]>([]);
  const [bonuses, setBonuses] = useState<StaffBonusEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Overtime form
  const [otEmployee, setOtEmployee] = useState('');
  const [otAmount, setOtAmount] = useState('');
  const [otHours, setOtHours] = useState('');
  // Bonus form
  const [boEmployee, setBoEmployee] = useState('');
  const [boAmount, setBoAmount] = useState('');
  const [boLabel, setBoLabel] = useState('');

  const errMsg = (e: any, fallback: string) => e?.response?.data?.message || e?.message || fallback;

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, otRes, boRes] = await Promise.all([
        api.get('/employees', { params: { category: 'OFFICE_STAFF', limit: 500 } }).catch(() => ({ data: { data: [] } })),
        api.get('/staff-payroll/overtime', { params: { periodKey } }).catch(() => ({ data: { data: [] } })),
        api.get('/staff-payroll/bonuses', { params: { periodKey } }).catch(() => ({ data: { data: [] } })),
      ]);
      const empData = empRes.data?.data;
      setEmployees(Array.isArray(empData) ? empData : empData?.items || []);
      setOvertime(otRes.data.data || []);
      setBonuses(boRes.data.data || []);
      setError(null);
    } catch {
      setError(null);
      setOvertime([]);
      setBonuses([]);
    } finally {
      setLoading(false);
    }
  }, [periodKey]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const saveOvertime = async () => {
    setError(null);
    setNotice(null);
    try {
      await api.post('/staff-payroll/overtime', {
        employeeId: otEmployee,
        periodKey,
        amount: Number(otAmount),
        hours: otHours ? Number(otHours) : null,
      });
      setOtEmployee(''); setOtAmount(''); setOtHours('');
      setNotice('Overtime saved.');
      await loadAll();
    } catch (e) { setError(errMsg(e, 'Failed to save overtime')); }
  };

  const saveBonus = async () => {
    setError(null);
    setNotice(null);
    try {
      await api.post('/staff-payroll/bonuses', {
        employeeId: boEmployee,
        periodKey,
        amount: Number(boAmount),
        label: boLabel,
      });
      setBoEmployee(''); setBoAmount(''); setBoLabel('');
      setNotice('Bonus saved.');
      await loadAll();
    } catch (e) { setError(errMsg(e, 'Failed to save bonus')); }
  };

  const cancel = async (kind: 'overtime' | 'bonuses', id: string) => {
    if (!confirm('Cancel this entry?')) return;
    try {
      await api.post(`/staff-payroll/${kind}/${id}/cancel`);
      await loadAll();
    } catch (e) { setError(errMsg(e, 'Failed to cancel')); }
  };

  const employeeSelect = (value: string, onChange: (v: string) => void, label: string) => (
    <FormField label={label}>
      <Select value={value} onChange={(e) => onChange(e.target.value)} placeholder="Select employee">
        {employees.map((e) => (
          <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>
        ))}
      </Select>
    </FormField>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-subtext">Period</label>
        <input
          type="month"
          value={periodKey}
          onChange={(e) => setPeriodKey(e.target.value)}
          className="v-input w-44"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-danger-subtle border border-danger-line text-danger-text text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}
      {notice && (
        <div className="p-3 rounded-lg bg-success-subtle border border-success-line text-success-text text-sm">{notice}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Overtime */}
        <Card>
          <div className="px-5 py-4 border-b border-line">
            <h3 className="text-base font-semibold text-ink">{t('spOvertimeTitle')}</h3>
            <p className="text-xs text-muted mt-0.5">{t('spOvertimeHint')}</p>
          </div>
          <div className="p-5 space-y-3">
            {employeeSelect(otEmployee, setOtEmployee, t('spEmployee'))}
            <div className="grid grid-cols-2 gap-3">
              <FormField label={`${t('spAmount')} (ETB) *`}>
                <input type="number" min="0" step="0.01" value={otAmount} onChange={(e) => setOtAmount(e.target.value)} className="v-input" placeholder="0.00" />
              </FormField>
              <FormField label={t('spHoursOptional')}>
                <input type="number" min="0" step="0.5" value={otHours} onChange={(e) => setOtHours(e.target.value)} className="v-input" placeholder="—" />
              </FormField>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={saveOvertime} disabled={!otEmployee || !otAmount}><Plus size={14} className="mr-1" />{t('save')}</Button>
            </div>

            {loading ? <LoadingSpinner /> : overtime.length === 0 ? (
              <p className="text-xs text-muted py-4 text-center">{t('noData')}</p>
            ) : (
              <table className="w-full text-xs">
                <thead><tr className="text-subtext border-b border-line">
                  <th className="text-left py-2">{t('spEmployee')}</th><th className="text-right py-2">{t('spAmount')}</th><th className="text-right py-2">{t('spHours')}</th><th />
                </tr></thead>
                <tbody>
                  {overtime.map((o) => (
                    <tr key={o._id} className="border-b border-line last:border-0">
                      <td className="py-2 text-ink">{staffName(o.employeeId)}</td>
                      <td className="py-2 text-right text-ink">{o.status === 'ACTIVE' ? fmtMoney(o.amount) : <s className="text-muted">{fmtMoney(o.amount)}</s>}</td>
                      <td className="py-2 text-right text-muted">{o.hours ?? '—'}</td>
                      <td className="py-2 text-right">
                        {o.status === 'ACTIVE' && (
                          <button onClick={() => cancel('overtime', o._id)} className="text-danger-text hover:underline inline-flex items-center gap-1">
                            <XCircle size={12} />{t('cancel')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Bonus */}
        <Card>
          <div className="px-5 py-4 border-b border-line">
            <h3 className="text-base font-semibold text-ink">{t('spBonusTitle')}</h3>
            <p className="text-xs text-muted mt-0.5">{t('spBonusHint')}</p>
          </div>
          <div className="p-5 space-y-3">
            {employeeSelect(boEmployee, setBoEmployee, t('spEmployee'))}
            <FormField label={`${t('spAmount')} (ETB) *`}>
              <input type="number" min="0" step="0.01" value={boAmount} onChange={(e) => setBoAmount(e.target.value)} className="v-input" placeholder="0.00" />
            </FormField>
            <FormField label={`${t('spLabel')} *`}>
              <input type="text" value={boLabel} onChange={(e) => setBoLabel(e.target.value)} className="v-input" placeholder={t('spLabelPlaceholder')} />
            </FormField>
            <div className="flex justify-end">
              <Button size="sm" onClick={saveBonus} disabled={!boEmployee || !boAmount || !boLabel}><Plus size={14} className="mr-1" />{t('save')}</Button>
            </div>

            {loading ? <LoadingSpinner /> : bonuses.length === 0 ? (
              <p className="text-xs text-muted py-4 text-center">{t('noData')}</p>
            ) : (
              <table className="w-full text-xs">
                <thead><tr className="text-subtext border-b border-line">
                  <th className="text-left py-2">{t('spEmployee')}</th><th className="text-left py-2">{t('spLabel')}</th><th className="text-right py-2">{t('spAmount')}</th><th />
                </tr></thead>
                <tbody>
                  {bonuses.map((b) => (
                    <tr key={b._id} className="border-b border-line last:border-0">
                      <td className="py-2 text-ink">{staffName(b.employeeId)}</td>
                      <td className="py-2 text-muted">{b.label}</td>
                      <td className="py-2 text-right text-ink">
                        {b.status === 'ACTIVE' ? <Badge variant="success">{fmtMoney(b.amount)}</Badge> : <s className="text-muted">{fmtMoney(b.amount)}</s>}
                      </td>
                      <td className="py-2 text-right">
                        {b.status === 'ACTIVE' && (
                          <button onClick={() => cancel('bonuses', b._id)} className="text-danger-text hover:underline inline-flex items-center gap-1">
                            <XCircle size={12} />{t('cancel')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
