import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import { InfoTooltip } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';
import { useT } from '../../i18n';

interface Department {
  _id: string;
  name: string;
  active?: boolean;
}

interface Position {
  _id: string;
  name: string;
  departmentId?: { _id: string; name: string } | string | null;
  active?: boolean;
}

/** HR-owned lookup used by the contract page's "Salary Grade" picker. */
interface PayGrade {
  _id: string;
  name: string;
  description?: string;
  basicSalary: number;
  salaryMax?: number;
  active: boolean;
}

const formatETB = (amount: number) =>
  `ETB ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount || 0)}`;

/**
 * Organization structure: a DEPARTMENT is the parent and POSITIONS are its
 * children - one department can hold many positions (Finance -> CFO, Finance
 * Officer, Payroll Analyst, Cost Analyst, ...). Selecting a department shows
 * only that department's positions, and a new position is always created
 * inside the department it belongs to.
 *
 * Creation lives with HR (it used to sit under Administration > Settings >
 * Organization), so this page is reachable from the HR and People module.
 */
const CAN_MANAGE_ORGANIZATION: UserRole[] = [
  UserRole.HR_ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.SYSTEM_ADMIN,
];

const UNASSIGNED_KEY = '__unassigned__';

function positionDepartmentId(position: Position): string {
  const department = position.departmentId;
  if (!department) return UNASSIGNED_KEY;
  return typeof department === 'string' ? department : department._id;
}

export default function OrganizationStructurePage() {
  const { user } = useAuthStore();
  const t = useT();
  const canManage = !!user && CAN_MANAGE_ORGANIZATION.includes(user.role as UserRole);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [payGrades, setPayGrades] = useState<PayGrade[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [newDepartment, setNewDepartment] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newGrade, setNewGrade] = useState({ name: '', salaryMin: '', salaryMax: '', description: '' });
  const [gradeError, setGradeError] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [deptRes, posRes, gradeRes] = await Promise.all([
        api.get('/departments'),
        api.get('/positions'),
        api.get('/pay-grades').catch(() => null),
      ]);
      const nextDepartments: Department[] = deptRes.data.data || [];
      setDepartments(nextDepartments);
      setPositions(posRes.data.data || []);
      setPayGrades(gradeRes?.data?.data || []);
      setSelectedDeptId((current) => current ?? nextDepartments[0]?._id ?? UNASSIGNED_KEY);
    } catch (err: any) {
      alert(err.response?.data?.message || t('failedLoadDepts'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Positions grouped by their parent department, so each department only ever
  // displays the positions that belong to it.
  const positionsByDepartment = useMemo(() => {
    const grouped = new Map<string, Position[]>();
    for (const position of positions) {
      const key = positionDepartmentId(position);
      grouped.set(key, [...(grouped.get(key) || []), position]);
    }
    return grouped;
  }, [positions]);

  const unassignedPositions = positionsByDepartment.get(UNASSIGNED_KEY) || [];
  const isUnassignedSelected = selectedDeptId === UNASSIGNED_KEY;
  const selectedDepartment = departments.find((d) => d._id === selectedDeptId) || null;
  const selectedPositions = selectedDeptId ? positionsByDepartment.get(selectedDeptId) || [] : [];

  const addDepartment = async () => {
    const name = newDepartment.trim();
    if (!name) return;
    try {
      await api.post('/departments', { name });
      setNewDepartment('');
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || t('failedAddDepartment'));
    }
  };

  const deleteDepartment = async (department: Department) => {
    const childCount = positionsByDepartment.get(department._id)?.length || 0;
    const question = childCount > 0
      ? t('deleteDepartmentWithPositions', { name: department.name, count: childCount })
      : t('deleteDepartmentConfirm', { name: department.name });
    if (!confirm(question)) return;
    try {
      await api.delete(`/departments/${department._id}`);
      setSelectedDeptId(null);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || t('failedDeleteDepartment'));
    }
  };

  // A position is always created as a child of the department it belongs to.
  const addPosition = async (departmentId: string) => {
    const name = newPosition.trim();
    if (!name) return;
    try {
      await api.post('/positions', { name, departmentId });
      setNewPosition('');
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || t('failedAddPosition'));
    }
  };

  const deletePosition = async (position: Position) => {
    if (!confirm(t('deletePositionConfirm', { name: position.name }))) return;
    try {
      await api.delete(`/positions/${position._id}`);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || t('failedDeletePosition'));
    }
  };

  // Pay grades feed the "Salary Grade" picker on the contract page.
  // A grade carries a salary RANGE (min → max) instead of a single salary.
  const addPayGrade = async () => {
    const name = newGrade.name.trim();
    if (!name) return;
    const min = newGrade.salaryMin ? Number(newGrade.salaryMin) : 0;
    const max = newGrade.salaryMax ? Number(newGrade.salaryMax) : 0;
    if (max > 0 && max < min) {
      setGradeError(t('salaryMaxMinError'));
      return;
    }
    setGradeError('');
    setSavingGrade(true);
    try {
      await api.post('/pay-grades', {
        name,
        basicSalary: min,
        salaryMax: max,
        description: newGrade.description.trim() || undefined,
      });
      setNewGrade({ name: '', salaryMin: '', salaryMax: '', description: '' });
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || t('failedAddPayGrade'));
    } finally {
      setSavingGrade(false);
    }
  };

  const deletePayGrade = async (grade: PayGrade) => {
    if (!confirm(t('deletePayGradeConfirm', { name: grade.name }))) return;
    try {
      await api.delete(`/pay-grades/${grade._id}`);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || t('failedAddPayGrade'));
    }
  };

  /** "ETB 4,000 – 9,000" when a range exists, plain amount otherwise. */
  const gradeSalaryLabel = (grade: PayGrade) => {
    if (grade.salaryMax && grade.salaryMax > (grade.basicSalary || 0)) {
      return `${formatETB(grade.basicSalary)} – ${formatETB(grade.salaryMax)}`;
    }
    return formatETB(grade.basicSalary);
  };

  const inputCls =
    'h-9 px-3 rounded-lg border border-line bg-surface text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Module Summary Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">{t('navDepartments')}</span>
          <InfoTooltip content={t('departmentsPageHint')} />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-lg bg-surface border border-line text-ink font-medium">{t('departmentsCount', { count: departments.length })}</span>
          <span className="px-3 py-1.5 rounded-lg bg-surface border border-line text-ink font-medium">{t('positionsCount', { count: positions.length })}</span>
          <span className="px-3 py-1.5 rounded-lg bg-surface border border-line text-ink font-medium">{t('payGradesCount', { count: payGrades.length })}</span>
        </div>
      </div>

      {!canManage && (
        <div className="bg-warning-subtle border border-warning-line text-warning-text text-sm rounded-xl px-4 py-3">
          {t('readOnlyNotice')}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Departments (parents) */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-line p-5">
          <div className="flex items-center gap-1.5 mb-4">
            <h2 className="text-base font-semibold text-ink">{t('departmentsCol')}</h2>
            <InfoTooltip content={t('parentOfPositions')} />
          </div>

          {canManage && (
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addDepartment()}
                placeholder={t('newDepartmentPlaceholder')}
                className={`flex-1 ${inputCls}`}
              />
              <button
                onClick={addDepartment}
                className="h-9 px-4 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                {t('add')}
              </button>
            </div>
          )}

          <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
            {departments.length === 0 && unassignedPositions.length === 0 ? (
              <p className="text-sm text-subtext text-center py-6">{t('noDepartmentsYet')}</p>
            ) : departments.map((department) => {
              const childCount = positionsByDepartment.get(department._id)?.length || 0;
              const isSelected = department._id === selectedDeptId;
              return (
                <div
                  key={department._id}
                  className={`flex items-center gap-1 px-2 rounded-lg border transition-colors ${
                    isSelected ? 'border-primary-300 dark:border-primary-500/50 bg-primary-500/10' : 'border-transparent hover:bg-subtle'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedDeptId(department._id)}
                    className="flex-1 flex items-center justify-between gap-2 px-1.5 py-2 text-left"
                  >
                    <span className={`text-sm truncate ${isSelected ? 'font-semibold text-primary-700 dark:text-primary-300' : 'text-ink'}`}>
                      {department.name}
                    </span>
                    <span
                      className={`flex-shrink-0 text-[11px] px-2 py-0.5 rounded-full ${
                        childCount > 0 ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300' : 'bg-subtle text-subtext'
                      }`}
                    >
                      {childCount}
                    </span>
                  </button>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => deleteDepartment(department)}
                      title={t('deleteDepartmentTitle')}
                      className="p-1.5 rounded-lg text-subtext hover:text-danger-text transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}

            {unassignedPositions.length > 0 && (
              <div
                className={`flex items-center gap-1 px-2 rounded-lg border ${
                  isUnassignedSelected ? 'border-warning-line bg-warning-subtle' : 'border-transparent hover:bg-subtle'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedDeptId(UNASSIGNED_KEY)}
                  className="flex-1 flex items-center justify-between gap-2 px-1.5 py-2 text-left"
                >
                  <span className="text-sm text-warning-text truncate">{t('unassignedPositions')}</span>
                  <span className="flex-shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-warning-subtle text-warning-text">
                    {unassignedPositions.length}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
        {/* Positions (children of the selected department) */}
        <div className="lg:col-span-3 bg-surface rounded-xl border border-line p-5">
          {selectedDepartment || isUnassignedSelected ? (
            <div>
              <h2 className="text-base font-semibold text-ink">
                {selectedDepartment ? selectedDepartment.name : t('unassignedPositions')}
              </h2>
              <p className="text-xs text-subtext mt-1 mb-4">
                {selectedDepartment
                  ? t('positionsOf', { name: selectedDepartment.name })
                  : t('noUnassignedPositions')}
              </p>

              {canManage && selectedDepartment && (
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addPosition(selectedDepartment._id)}
                    placeholder={t('newPositionPlaceholder', { name: selectedDepartment.name })}
                    className={`flex-1 ${inputCls}`}
                  />
                  <button
                    onClick={() => addPosition(selectedDepartment._id)}
                    className="h-9 px-4 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
                  >
                    {t('add')}
                  </button>
                </div>
              )}

              <div className="space-y-1.5">
                {selectedPositions.length === 0 ? (
                  <p className="text-sm text-subtext text-center py-8">
                    {selectedDepartment
                      ? t('noPositionsIn', { name: selectedDepartment.name })
                      : t('noUnassignedPositions')}
                  </p>
                ) : selectedPositions.map((position) => (
                  <div
                    key={position._id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-subtle group"
                  >
                    <span className="text-sm text-ink">{position.name}</span>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => deletePosition(position)}
                        title={t('deletePositionTitle')}
                        className="p-1 rounded-lg text-subtext hover:text-danger-text transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-subtext text-center py-12">
              {t('createDepartmentFirst')}
            </p>
          )}
        </div>
      </div>

      {/* Pay Grades — HR-owned lookup consumed by the contract page */}
      <div className="bg-surface rounded-xl border border-line p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-semibold text-ink">{t('payGrades')}</h2>
              <InfoTooltip content={t('payGradesHint')} />
            </div>
          </div>
          <span className="flex-shrink-0 text-[11px] px-2 py-1 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300">
            {t('usedInContracts')}
          </span>
        </div>

        {canManage && (
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_140px_1fr_auto] gap-2 mt-4">
            <input
              type="text"
              value={newGrade.name}
              onChange={(e) => setNewGrade({ ...newGrade, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && addPayGrade()}
              placeholder={t('gradeNamePlaceholder')}
              className={inputCls}
            />
            <input
              type="number"
              min={0}
              value={newGrade.salaryMin}
              onChange={(e) => setNewGrade({ ...newGrade, salaryMin: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && addPayGrade()}
              placeholder={t('salaryMinEtb')}
              className={inputCls}
            />
            <input
              type="number"
              min={0}
              value={newGrade.salaryMax}
              onChange={(e) => setNewGrade({ ...newGrade, salaryMax: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && addPayGrade()}
              placeholder={t('salaryMaxEtb')}
              className={inputCls}
            />
            <input
              type="text"
              value={newGrade.description}
              onChange={(e) => setNewGrade({ ...newGrade, description: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && addPayGrade()}
              placeholder={t('descriptionOptional')}
              className={inputCls}
            />
            <button
              onClick={addPayGrade}
              disabled={savingGrade}
              className="h-9 px-5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {savingGrade ? t('adding') : t('addGrade')}
            </button>
          </div>
        )}
        {gradeError && (
          <p className="text-xs text-danger-text mt-2">{gradeError}</p>
        )}

        <div className="mt-4 space-y-1.5">
          {payGrades.length === 0 ? (
            <p className="text-sm text-subtext text-center py-6">
              {t('noPayGradesYet')}
            </p>
          ) : (
            payGrades.map((grade) => (
              <div key={grade._id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-subtle group">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-ink">{grade.name}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300">
                      {gradeSalaryLabel(grade)}
                    </span>
                    {grade.active === false && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-subtle text-subtext">{t('inactive')}</span>
                    )}
                  </div>
                  {grade.description && (
                    <p className="text-xs text-subtext truncate">{grade.description}</p>
                  )}
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => deletePayGrade(grade)}
                    title={t('deletePayGradeTitle')}
                    className="p-1.5 rounded-lg text-subtext hover:text-danger-text transition-colors flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
