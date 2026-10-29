import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../../lib/api';
import { Badge, Button, Card, FormField, LoadingSpinner } from '../../components/ui';
import { useT } from '../../i18n';
import { fmtMoney } from './staffPayroll.types';

interface TaxTable {
  _id: string;
  name: string;
  kind?: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  brackets: { min: number; max: number | null; rate: number }[];
}

interface PensionRule {
  _id: string;
  name: string;
  kind?: string;
  employeePercent: number;
  employerPercent: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

/**
 * Staff statutory configuration: the staff income-tax schedule and staff
 * pension percentages, both date-effective and scoped with kind: 'STAFF' so
 * they never mix with the guard payroll tables.
 */
export function StaffConfigTab() {
  const t = useT();
  const [tables, setTables] = useState<TaxTable[]>([]);
  const [rules, setRules] = useState<PensionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tableName, setTableName] = useState('Staff Income Tax Schedule');
  const [bracketsText, setBracketsText] = useState('0,2000,0\n2000,4000,15\n4000,7000,20\n7000,10000,25\n10000,14000,30\n14000,,35');
  const [effectiveFrom, setEffectiveFrom] = useState(`${new Date().getFullYear()}-01-01`);

  const [ruleName, setRuleName] = useState('Staff Pension (7% / 11%)');
  const [employeePercent, setEmployeePercent] = useState('7');
  const [employerPercent, setEmployerPercent] = useState('11');

  const errMsg = (e: any, fallback: string) => e?.response?.data?.message || e?.message || fallback;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [taxRes, penRes] = await Promise.all([
        api.get('/payroll-common/tax-brackets', { params: { kind: 'STAFF' } }).catch(() => ({ data: { data: [] } })),
        api.get('/payroll-common/pension-rules', { params: { kind: 'STAFF' } }).catch(() => ({ data: { data: [] } })),
      ]);
      setTables(taxRes.data.data || []);
      setRules(penRes.data.data || []);
      setError(null);
    } catch {
      setError(null);
      setTables([]);
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const parseBrackets = () =>
    bracketsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [min, max, rate] = line.split(',').map((p) => p.trim());
        return { min: Number(min), max: max ? Number(max) : null, rate: Number(rate) };
      })
      .filter((b) => Number.isFinite(b.min) && Number.isFinite(b.rate));

  const createTable = async () => {
    setError(null);
    try {
      await api.post('/payroll-common/tax-brackets', {
        name: tableName,
        kind: 'STAFF',
        effectiveFrom,
        brackets: parseBrackets(),
      });
      await load();
    } catch (e) { setError(errMsg(e, 'Failed to create tax table')); }
  };

  const createRule = async () => {
    setError(null);
    try {
      await api.post('/payroll-common/pension-rules', {
        name: ruleName,
        kind: 'STAFF',
        employeePercent: Number(employeePercent),
        employerPercent: Number(employerPercent),
        effectiveFrom,
      });
      await load();
    } catch (e) { setError(errMsg(e, 'Failed to create pension rule')); }
  };

  if (loading) return <LoadingSpinner text={t('loading')} />;

  return (
    <div className="space-y-5">
      {error && <div className="p-3 rounded-lg bg-danger-subtle border border-danger-line text-danger-text text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Tax tables */}
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-line">
            <h3 className="text-base font-semibold text-ink">{t('spTaxTables')}</h3>
            <p className="text-xs text-muted mt-0.5">{t('spTaxTablesHint')}</p>
          </div>
          <div className="p-5 space-y-3">
            {tables.map((tb) => (
              <div key={tb._id} className="p-3 rounded-lg border border-line">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-ink">{tb.name}</p>
                  <Badge variant="info">{tb.effectiveFrom.slice(0, 10)}</Badge>
                </div>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1">
                  {tb.brackets.map((b, i) => (
                    <span key={i} className="text-[11px] text-muted tabular-nums">
                      {fmtMoney(b.min)}–{b.max === null ? '∞' : fmtMoney(b.max)}: {b.rate}%
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-line space-y-2">
              <FormField label={t('spTableName')}>
                <input className="v-input" value={tableName} onChange={(e) => setTableName(e.target.value)} />
              </FormField>
              <FormField label={t('spBracketsFormat')}>
                <textarea className="v-input font-mono text-xs" rows={6} value={bracketsText} onChange={(e) => setBracketsText(e.target.value)} />
              </FormField>
              <FormField label={t('spEffectiveFrom')}>
                <input className="v-input" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
              </FormField>
              <div className="flex justify-end">
                <Button size="sm" onClick={createTable} disabled={!tableName || parseBrackets().length === 0}>
                  <Plus size={14} className="mr-1" />{t('spAddTable')}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Pension rules */}
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-line">
            <h3 className="text-base font-semibold text-ink">{t('spPensionRules')}</h3>
            <p className="text-xs text-muted mt-0.5">{t('spPensionRulesHint')}</p>
          </div>
          <div className="p-5 space-y-3">
            {rules.map((r) => (
              <div key={r._id} className="p-3 rounded-lg border border-line flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">{r.name}</p>
                  <p className="text-[11px] text-muted mt-0.5">{r.effectiveFrom.slice(0, 10)}</p>
                </div>
                <div className="text-sm tabular-nums">
                  <Badge variant="success">{r.employeePercent}% / {r.employerPercent}%</Badge>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-line space-y-2">
              <FormField label={t('spRuleName')}>
                <input className="v-input" value={ruleName} onChange={(e) => setRuleName(e.target.value)} />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label={t('spEmployeePercent')}>
                  <input className="v-input" type="number" min="0" max="100" step="0.5" value={employeePercent} onChange={(e) => setEmployeePercent(e.target.value)} />
                </FormField>
                <FormField label={t('spEmployerPercent')}>
                  <input className="v-input" type="number" min="0" max="100" step="0.5" value={employerPercent} onChange={(e) => setEmployerPercent(e.target.value)} />
                </FormField>
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={createRule} disabled={!ruleName}>
                  <Plus size={14} className="mr-1" />{t('spAddRule')}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
