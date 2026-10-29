import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';
import { InfoTooltip } from '../../components/ui';
import { FieldHint } from '../../help';
import { EmployeeCategory } from '../../types';
import { useT, useLang, formatDate } from '../../i18n';

interface Employee {
  _id: string;
  employeeCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  department?: string;
  position?: string;
  category?: string;
}

interface Contract {
  _id: string;
  employeeId: string | { _id: string; firstName: string; middleName?: string; lastName: string; employeeCode: string };
  salaryStructureId?: string | { _id: string; name: string };
  contractStartDate: string;
  contractEndDate?: string;
  department?: string;
  grade?: string;
  jobPosition?: string;
  contractType: string;
  wage: number;
  responsibilityAllowance: number;
  teleAllowance: number;
  taxableTransport: number;
  nonTaxableAllowance: number;
  transportAllowance: number;
  pensionEnrolled: boolean;
  notes?: string;
  status: string;
}

/** One salary-change row: the previous package → the new one. */
interface SalaryHistoryEntry {
  _id: string;
  effectiveFrom?: string;
  reason?: string;
  previous?: Record<string, number>;
  current?: Record<string, number>;
  changedBy?: { firstName?: string; lastName?: string } | string | null;
}

interface PayGrade {
  _id: string;
  name: string;
  description?: string;
  /** Range lower bound. */
  basicSalary: number;
  /** Range upper bound (optional). */
  salaryMax?: number;
  active: boolean;
}

const formatGradeRange = (grade: { basicSalary: number; salaryMax?: number }) => {
  if (grade.salaryMax && grade.salaryMax > (grade.basicSalary || 0)) {
    return `${formatETB(grade.basicSalary)} – ${formatETB(grade.salaryMax)}`;
  }
  return formatETB(grade.basicSalary);
};

interface DepartmentOption {
  _id: string;
  name: string;
}

interface PositionOption {
  _id: string;
  name: string;
  departmentId?: { _id: string; name: string } | string | null;
}

const formatETB = (amount: number) =>
  `ETB ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount || 0)}`;

const inputCls =
  'w-full h-10 px-3 rounded-lg border border-line bg-surface text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400';
const labelCls = 'block text-sm font-medium text-ink mb-1.5';

export default function ContractForm() {
  const navigate = useNavigate();
  const t = useT();
  const lang = useLang();
  const { employeeId } = useParams<{ employeeId: string }>();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistoryEntry[]>([]);

  const [payGrades, setPayGrades] = useState<PayGrade[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [positions, setPositions] = useState<PositionOption[]>([]);
  const [existingContract, setExistingContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    employeeId: employeeId || '',
    salaryStructureId: '',
    contractStartDate: '',
    contractEndDate: '',
    department: '',
    grade: '',
    jobPosition: '',
    contractType: 'Full-Time',
    wage: 0,
    responsibilityAllowance: 0,
    teleAllowance: 0,
    taxableTransport: 0,
    nonTaxableAllowance: 0,
    transportAllowance: 0,
    pensionEnrolled: true,
    notes: '',
  });

  const selectedEmployee = employees.find(e => e._id === form.employeeId);
  const isGuard = selectedEmployee?.category === EmployeeCategory.GUARD;

  const contractTypeOptions = [
    { value: 'Full-Time', label: t('fullTime') },
    { value: 'Part-Time', label: t('partTime') },
    { value: 'Contract', label: t('contractOption') },
    { value: 'Temporary', label: t('temporary') },
    { value: 'Internship', label: t('internship') },
  ];

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const empRes = await api.get('/employees', { params: { limit: 200 } });
        setEmployees(empRes.data.data || []);

        // HR-owned lookups: departments, positions and pay grades are managed on
        // the Departments & Positions page and only fetched here.
        try {
          const deptRes = await api.get('/departments');
          setDepartments(deptRes.data.data || []);
        } catch { /* ignore */ }
        try {
          const posRes = await api.get('/positions');
          setPositions(posRes.data.data || []);
        } catch { /* ignore */ }
        try {
          const gradeRes = await api.get('/pay-grades');
          setPayGrades((gradeRes.data.data || []).filter((g: PayGrade) => g.active !== false));
        } catch { /* ignore */ }

        if (employeeId) {
          setForm((prev) => ({ ...prev, employeeId }));
          try {
            const contractRes = await api.get(`/contracts/employee/${employeeId}`);
            if (contractRes.data.data) {
              const c = contractRes.data.data;
              setExistingContract(c);
              setForm({
                employeeId: employeeId,
                salaryStructureId: typeof c.salaryStructureId === 'string' ? c.salaryStructureId : c.salaryStructureId?._id || '',
                contractStartDate: c.contractStartDate ? c.contractStartDate.split('T')[0] : '',
                contractEndDate: c.contractEndDate ? c.contractEndDate.split('T')[0] : '',
                department: c.department || '',
                grade: c.grade || '',
                jobPosition: c.jobPosition || '',
                contractType: c.contractType || 'Full-Time',
                wage: c.wage || 0,
                responsibilityAllowance: c.responsibilityAllowance || 0,
                teleAllowance: c.teleAllowance || 0,
                taxableTransport: c.taxableTransport || 0,
                nonTaxableAllowance: c.nonTaxableAllowance || 0,
                transportAllowance: c.transportAllowance || 0,
                pensionEnrolled: c.pensionEnrolled !== false,
                notes: c.notes || '',
              });
            }
          } catch {
            // No existing contract — this is create mode
          }
          // Old salaries are kept on every pay change — surface them here so the
          // user can see (and account for) the previous packages.
          try {
            const histRes = await api.get(`/contracts/employee/${employeeId}/salary-history`);
            setSalaryHistory(histRes.data.data || []);
          } catch { /* history is optional */ }
        }
      } catch (err: any) {
        setError(err.response?.data?.message || t('failedLoadData'));
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const isUpdate = !!existingContract;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        salaryStructureId: form.salaryStructureId || undefined,
        wage: Number(form.wage),
        responsibilityAllowance: Number(form.responsibilityAllowance),
        teleAllowance: Number(form.teleAllowance),
        taxableTransport: Number(form.taxableTransport),
        nonTaxableAllowance: Number(form.nonTaxableAllowance),
        // transportAllowance is a guard-only field: sending it on a staff
        // contract is rejected by the API (it never affects staff pay).
        ...(isGuard ? { transportAllowance: Number(form.transportAllowance) } : {}),
        pensionEnrolled: form.pensionEnrolled,
      };

      if (isUpdate && existingContract) {
        await api.put(`/contracts/${existingContract._id}`, payload);
      } else {
        await api.post('/contracts', payload);
      }
      navigate('/employees');
    } catch (err: any) {
      setError(err.response?.data?.message || t('failedSaveContract'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-subtext mb-2">
            <span>Vital Security PLC</span>
            <span>/</span>
            <span>{t('hrPeople')}</span>
            <span>/</span>
            <span>{t('contracts')}</span>
          </div>
          <h1 className="text-2xl font-bold text-ink">{isUpdate ? t('updateContract') : t('newContract')}</h1>
          <p className="text-sm text-muted mt-1">
            {isUpdate ? t('updateExistingContract') : t('createNewContract')}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/employees')}
            className="h-10 px-5 flex items-center gap-2 rounded-lg border border-line text-sm font-medium text-muted hover:bg-subtle transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            {t('backToEmployees')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="h-10 px-5 flex items-center gap-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {saving ? t('saving') : t('saveContract')}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-danger-subtle text-danger-text p-3 rounded-lg text-sm border border-danger-line">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contract Information */}
        <div className="bg-surface rounded-xl border border-line p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-5 bg-primary-600 rounded-full" />
            <h2 className="text-base font-semibold text-ink">{t('contractInformation')}</h2>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* Employee */}
            <div>
              <label className={labelCls}>{t('employee')} *</label>
              <select
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                required
                disabled={isUpdate}
                className={`${inputCls} disabled:opacity-50 disabled:bg-subtle`}
              >
                <option value="">{t('searchEmployeePlaceholder')}</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {[emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(' ')} ({emp.employeeCode}) — {emp.category === EmployeeCategory.GUARD ? t('guard') : t('officeStaff')}
                  </option>
                ))}
              </select>
            </div>

            {/* Contract Type */}
            <div>
              <label className={labelCls}>{t('contractType')} *</label>
              <select
                value={form.contractType}
                onChange={(e) => setForm({ ...form, contractType: e.target.value })}
                className={inputCls}
              >
                {contractTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Contract Start Date */}
            <div>
              <label className={labelCls}>{t('contractStartDate')} *</label>
              <input
                type="date"
                value={form.contractStartDate}
                onChange={(e) => setForm({ ...form, contractStartDate: e.target.value })}
                required
                className={inputCls}
              />
            </div>

            {/* Contract End Date — hidden for Full-Time */}
            {form.contractType !== 'Full-Time' && (
              <div>
                <label className={labelCls}>{t('contractEndDate')}</label>
                <input
                  type="date"
                  value={form.contractEndDate}
                  onChange={(e) => setForm({ ...form, contractEndDate: e.target.value })}
                  className={inputCls}
                />
              </div>
            )}

            {/* Department */}
            <div>
              <label className={labelCls}>{t('department')}</label>
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className={inputCls}
              >
                <option value="">{t('selectDepartment')}</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
              {departments.length === 0 && (
                <p className="text-xs text-warning-text mt-1">{t('noDepartmentsHint')}</p>
              )}
            </div>

            {/* Job Position */}
            <div>
              <label className={labelCls}>{t('jobPosition')}</label>
              <select
                value={form.jobPosition}
                onChange={(e) => setForm({ ...form, jobPosition: e.target.value })}
                className={inputCls}
              >
                <option value="">{t('selectPosition')}</option>
                {(form.department
                  ? positions.filter((p) => {
                      const dept = p.departmentId;
                      const deptName = typeof dept === 'string' ? departments.find((d) => d._id === dept)?.name : dept?.name;
                      return deptName === form.department;
                    })
                  : positions
                ).map((pos) => (
                  <option key={pos._id} value={pos.name}>{pos.name}</option>
                ))}
              </select>
              {positions.length === 0 && (
                <p className="text-xs text-warning-text mt-1">{t('noPositionsHint')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Salary Grade — fetched from the backend (managed by HR on the Departments & Positions page) */}
        <div className="bg-surface rounded-xl border border-line p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-primary-600 rounded-full" />
            <h2 className="text-base font-semibold text-ink">{t('salaryGrade')}</h2>
            <InfoTooltip content={t('gradesHint')} />
          </div>

          {payGrades.length === 0 ? (
            <div className="border-2 border-dashed border-line rounded-lg p-6 text-center">
              <p className="text-sm text-muted">{t('noPayGrades')}</p>
              <p className="text-xs text-subtext mt-1">
                {t('noPayGradesHint')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {payGrades.map((grade) => (
                <label
                  key={grade._id}
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    form.grade === grade.name
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-line hover:border-line-strong hover:bg-subtle'
                  }`}
                >
                  <input
                    type="radio"
                    name="grade"
                    value={grade.name}
                    checked={form.grade === grade.name}
                    onChange={(e) => setForm({ ...form, grade: e.target.value })}
                    className="w-4 h-4 accent-primary-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-ink">{grade.name}</span>
                      {grade.basicSalary > 0 && (
                        <span className="text-xs font-medium text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-500/20 px-2 py-0.5 rounded-full">
                          {t('fromSalary', { amount: formatGradeRange(grade) })}
                        </span>
                      )}
                    </div>
                    {grade.description && (
                      <p className="text-xs text-muted mt-0.5">{grade.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Salary Information */}
        <div className="bg-surface rounded-xl border border-line p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-5 bg-primary-600 rounded-full" />
            <h2 className="text-base font-semibold text-ink">{t('salaryInformation')}</h2>
          </div>


          <div className="mb-6">
            <label className={labelCls}>
              {t('basicSalaryEtb')} *
              <FieldHint
                title="Basic Salary (ETB)"
                what="The monthly gross contract wage. Staff Payroll snapshots this value at every calculation, so later edits never change past payslips."
                example="e.g. 8500"
                validation="Required — a positive number. Pension (7% employee / 11% employer) is computed on this amount."
              />
            </label>
            <input
              type="number"
              value={form.wage || ''}
              onChange={(e) => setForm({ ...form, wage: parseFloat(e.target.value) || 0 })}
              required
              placeholder="0.00"
              className={inputCls}
            />
          </div>

          {/* Old salaries are recorded on every pay change — show them here. */}
          {salaryHistory.length > 0 && (
            <div className="mb-6 p-4 rounded-xl bg-canvas border border-line">
              <h3 className="text-sm font-medium text-ink mb-3">{t('salaryHistoryTitle')}</h3>
              <div className="space-y-2">
                {salaryHistory.map((h) => (
                  <div key={h._id} className="flex items-center justify-between text-xs">
                    <span className="text-muted">
                      {h.previous
                        ? `ETB ${Number(h.previous.wage || 0).toLocaleString()} → ETB ${Number(h.current?.wage ?? 0).toLocaleString()}`
                        : t('salaryHistoryInitial')}
                    </span>
                    <span className="font-medium text-ink whitespace-nowrap ml-3">
                      {h.effectiveFrom ? formatDate(lang, h.effectiveFrom) : ''}
                      {h.reason ? ` · ${h.reason}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Allowances */}
          <div>
            <h3 className="text-sm font-medium text-ink mb-4">{t('allowances')}</h3>

            {isGuard ? (
              /* Guard: only Transport Allowance */
            <div className="max-w-sm" data-help="transport-guard">
              <div className="flex items-center gap-1.5 mb-1.5">
                <label className="text-sm font-medium text-ink">{t('transportAllowanceEtb')}
                  <FieldHint
                    title="Transport Allowance (ETB) — guards"
                    what="Operational allowance for guard contracts. In Guard Payroll the site compensation—not this field—drives the calculation; this allowance is used for the guard's profile rate summary."
                    example="e.g. 600"
                    validation="Optional number. Leave 0 when the guard is paid purely from site compensation."
                  />
                </label>
                <InfoTooltip content={t('guardAllowanceNote')} />
              </div>
              <input
                  type="number"
                  value={form.transportAllowance || ''}
                  onChange={(e) => setForm({ ...form, transportAllowance: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>
            ) : (
              /* Office Staff: all four allowances */
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>{t('responsibilityAllowanceEtb')}</label>
                  <input
                    type="number"
                    value={form.responsibilityAllowance || ''}
                    onChange={(e) => setForm({ ...form, responsibilityAllowance: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t('teleAllowanceEtb')}</label>
                  <input
                    type="number"
                    value={form.teleAllowance || ''}
                    onChange={(e) => setForm({ ...form, teleAllowance: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t('taxableTransportEtb')}</label>
                  <input
                    type="number"
                    value={form.taxableTransport || ''}
                    onChange={(e) => setForm({ ...form, taxableTransport: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t('nonTaxableAllowanceEtb')}</label>
                  <input
                    type="number"
                    value={form.nonTaxableAllowance || ''}
                    onChange={(e) => setForm({ ...form, nonTaxableAllowance: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className={inputCls}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Details */}
        <div className="bg-surface rounded-xl border border-line p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-5 bg-primary-600 rounded-full" />
            <h2 className="text-base font-semibold text-ink">{t('pensionDetails')}</h2>
          </div>

          {/* Pension Enrollment Toggle */}
          <div className="mb-6 p-4 bg-canvas  rounded-xl">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-ink">{t('pensionLabel')}</p>
                <p className="text-xs text-muted mt-0.5">{t('pensionHint')}</p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={form.pensionEnrolled}
                  onChange={(e) => setForm({ ...form, pensionEnrolled: e.target.checked })}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${form.pensionEnrolled ? 'bg-primary-600' : 'bg-line-strong'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${form.pensionEnrolled ? 'translate-x-5.5 ml-0.5' : 'translate-x-0.5'}`} />
                </div>
              </div>
            </label>
            {!form.pensionEnrolled && (
              <p className="text-xs text-warning-text mt-2 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                {t('pensionOptOut')}
              </p>
            )}
          </div>

          <div>
            <label className={labelCls}>{t('notes')}</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={4}
              placeholder={t('notesPlaceholder')}
              className="w-full px-3 py-2.5 rounded-lg border border-line bg-surface text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 resize-none"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
