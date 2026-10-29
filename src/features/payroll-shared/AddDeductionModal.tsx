import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import api from '../../lib/api';
import { Button, FormField, Modal, Select } from '../../components/ui';
import { useT } from '../../i18n';

const errMsg = (e: any) => e?.response?.data?.message || e?.message || 'Request failed';

const ONE_OFF_TYPES = ['PENALTY', 'OTHER'] as const;

interface AddDeductionModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after a successful save so the parent can refresh the run. */
  onSaved: () => void;
  employeeId: string;
  employeeName: string;
  periodKey: string;
  /** Pre-fill from the attendance suggestion (hint only — Finance can change it). */
  defaultAmount?: number | null;
  defaultLabel?: string;
  /** When set, also offer installment types (loan/advance). */
  allowInstallments?: boolean;
}

/**
 * Per-employee deduction input shared by guard + staff payroll run details.
 * One-off types (PENALTY/OTHER) apply only to the run's month; installment
 * types apply monthly until the balance is settled at approval.
 */
export function AddDeductionModal({
  open,
  onClose,
  onSaved,
  employeeId,
  employeeName,
  periodKey,
  defaultAmount,
  defaultLabel,
  allowInstallments = false,
}: AddDeductionModalProps) {
  const t = useT();
  const types = allowInstallments ? ['LOAN', 'ADVANCE', ...ONE_OFF_TYPES] : [...ONE_OFF_TYPES];
  const [type, setType] = useState<string>(ONE_OFF_TYPES[0]);
  const [label, setLabel] = useState(defaultLabel || '');
  const [amount, setAmount] = useState(defaultAmount != null ? String(defaultAmount) : '');
  const [installment, setInstallment] = useState('');
  const [startDate, setStartDate] = useState(`${periodKey}-01`);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isInstallment = type === 'LOAN' || type === 'ADVANCE';

  const reset = () => {
    setType(ONE_OFF_TYPES[0]);
    setLabel(defaultLabel || '');
    setAmount(defaultAmount != null ? String(defaultAmount) : '');
    setInstallment('');
    setNotes('');
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.post('/payroll-common/deductions', {
        employeeId,
        type,
        label: label.trim(),
        totalAmount: Number(amount),
        ...(isInstallment
          ? { monthlyInstallment: installment ? Number(installment) : undefined, startDate }
          : { periodKey }),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      reset();
      onSaved();
      onClose();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const valid = employeeId && label.trim() && Number(amount) > 0 && (!isInstallment || !!startDate);

  return (
    <Modal open={open} onClose={onClose} title={`${t('addDeduction')} — ${employeeName}`} size="sm">
      <div className="space-y-4">
        <p className="text-xs text-muted">
          {isInstallment
            ? t('dedInstallmentHint')
            : `${t('dedOneOffHint')} · ${t('periodApplies')}: ${periodKey}`}
        </p>

        <FormField label={t('gpType')}>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {types.map((ty) => (
              <option key={ty} value={ty}>{ty}</option>
            ))}
          </Select>
        </FormField>

        <FormField label={t('gpLabel')}>
          <input className="v-input w-full" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('attBasedDeduction')} />
        </FormField>

        <FormField label={`${t('spAmount')} (ETB)`}>
          <input className="v-input w-full" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </FormField>

        {isInstallment && (
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('gpInstallment')}>
              <input className="v-input w-full" type="number" min="0" step="0.01" value={installment} onChange={(e) => setInstallment(e.target.value)} placeholder="0 = full" />
            </FormField>
            <FormField label={t('gpStartDate')}>
              <input className="v-input w-full" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </FormField>
          </div>
        )}

        <FormField label={t('dedNotes')}>
          <input className="v-input w-full" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>

        {defaultAmount != null && defaultAmount > 0 && (
          <p className="text-xs text-warning-text flex items-center gap-1.5">
            <AlertTriangle size={13} />
            {t('suggestedDeduction')}: {defaultAmount.toLocaleString()} ETB
          </p>
        )}

        {error && (
          <div className="p-2.5 rounded-lg bg-danger-subtle border border-danger-line text-danger-text text-xs">{error}</div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={save} disabled={!valid || saving}>{t('save')}</Button>
        </div>
      </div>
    </Modal>
  );
}
