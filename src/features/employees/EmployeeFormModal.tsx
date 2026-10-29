import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { ETHIOPIAN_BANKS } from '../../lib/ethiopianBanks';
import { Modal } from '../../components/ui';
import { useT } from '../../i18n';
import { ageFromDate, dobFromAge } from './age';

type StepKey = 'personal' | 'employment' | 'documents';

interface DocEntry {
  title: string;
  file: File | null;
  existingUrl?: string;
  existingFileName?: string;
}

interface EmployeeLike {
  _id?: string;
  employeeCode?: string;
  firstName?: string;
  middleName?: string;
  education?: string;
  fingerprint?: boolean;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  category?: string;
  gender?: string;
  dateOfBirth?: string;
  department?: string;
  position?: string;
  bankName?: string;
  accountNumber?: string;
  salary?: number;
  documents?: { title?: string; url?: string; fileName?: string }[];
}

interface EmployeeFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Pass an employee to edit; omit/undefined to create. */
  employee?: EmployeeLike | null;
  /** Called after a successful save with the saved employee data. */
  onSaved?: (employee: any) => void;
}

const emptyForm = {
  employeeCode: '',
  firstName: '',
  middleName: '',
  education: '',
  /** undefined = the user has not answered the fingerprint question yet. */
  fingerprint: undefined as boolean | undefined,
  lastName: '',
  phone: '',
  email: '',
  address: '',
  category: 'GUARD',
  gender: '',
  dateOfBirth: '',
  department: '',
  position: '',
  bankName: '',
  accountNumber: '',
  salary: 0,
};

/**
 * Create / edit an employee in-place as a guided 3-step wizard inside one
 * modal: Personal Info → Employment Details → Documents. Steps slide
 * horizontally, completed steps get a checkmark, and Next/Back buttons guide
 * the user through. The list page opens this modal instead of navigating to a
 * separate page, so the user never loses their context.
 */
export default function EmployeeFormModal({ open, onClose, employee, onSaved }: EmployeeFormModalProps) {
  const t = useT();
  const isEdit = !!employee?._id;
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState<StepKey>('personal');
  const [error, setError] = useState('');
  /** Steps the user has moved past, so the header can show a checkmark. */
  const [completed, setCompleted] = useState<Record<StepKey, boolean>>({
    personal: false,
    employment: false,
    documents: false,
  });

  const [form, setForm] = useState({ ...emptyForm });
  const [departments, setDepartments] = useState<{ _id: string; name: string }[]>([]);
  const [positions, setPositions] = useState<{ _id: string; name: string }[]>([]);
  const [documents, setDocuments] = useState<DocEntry[]>([{ title: '', file: null }]);

  const stepOrder: StepKey[] = ['personal', 'employment', 'documents'];
  const STEPS: { key: StepKey; label: string; hint: string }[] = [
    { key: 'personal', label: t('personalInfo'), hint: t('stepPersonalHint') },
    { key: 'employment', label: t('employmentDetails'), hint: t('stepEmploymentHint') },
    { key: 'documents', label: t('documents'), hint: t('stepDocumentsHint') },
  ];
  const activeIdx = stepOrder.indexOf(activeStep);

  // Fresh state each time the modal opens.
  useEffect(() => {
    if (!open) return;
    setError('');
    setActiveStep('personal');
    setCompleted({ personal: false, employment: false, documents: false });
    if (employee) {
      setForm({
        employeeCode: employee.employeeCode || '',
        firstName: employee.firstName || '',
        middleName: employee.middleName || '',
        education: employee.education || '',
        fingerprint: employee.fingerprint === true ? true : employee.fingerprint === false ? false : undefined,
        lastName: employee.lastName || '',
        phone: employee.phone || '',
        email: employee.email || '',
        address: employee.address || '',
        category: employee.category || 'GUARD',
        gender: employee.gender || '',
        dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.split('T')[0] : '',
        department: employee.department || '',
        position: employee.position || '',
        bankName: employee.bankName || '',
        accountNumber: employee.accountNumber || '',
        salary: employee.salary || 0,
      });
      setDocuments(
        employee.documents && employee.documents.length > 0
          ? employee.documents.map((d) => ({
              title: d.title || '',
              file: null,
              existingUrl: d.url,
              existingFileName: d.fileName,
            }))
          : [{ title: '', file: null }]
      );
    } else {
      setForm({ ...emptyForm });
      setDocuments([{ title: '', file: null }]);
    }
  }, [open, employee]);

  useEffect(() => {
    if (!open) return;
    api.get('/departments').then((r) => setDepartments(r.data.data || [])).catch(() => {});
    api.get('/positions').then((r) => setPositions(r.data.data || [])).catch(() => {});
  }, [open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const setFingerprint = (brought: boolean) => setForm({ ...form, fingerprint: brought });

  const addDocument = () => setDocuments([...documents, { title: '', file: null }]);
  const removeDocument = (idx: number) => setDocuments(documents.filter((_, i) => i !== idx));
  const updateDocument = (idx: number, field: string, value: any) => {
    const updated = [...documents];
    (updated[idx] as any)[field] = value;
    setDocuments(updated);
  };

  /** Personal Info must be complete before the wizard can move on. */
  const personalIncomplete = !form.employeeCode.trim() || !form.firstName.trim() || !form.lastName.trim() || !form.phone.trim();

  const goTo = (step: StepKey) => {
    if (step === activeStep) return;
    setCompleted((c) => ({
      ...c,
      // Everything before the destination counts as reviewed.
      ...Object.fromEntries(
        stepOrder.slice(0, stepOrder.indexOf(step)).map((k) => [k, true])
      ),
    }));
    setActiveStep(step);
    setError('');
  };

  const goNext = () => {
    if (activeStep === 'personal' && personalIncomplete) {
      setError(t('requiredFieldsError'));
      return;
    }
    if (activeIdx < stepOrder.length - 1) {
      setCompleted((c) => ({ ...c, [activeStep]: true }));
      setActiveStep(stepOrder[activeIdx + 1]);
      setError('');
    }
  };

  const goBack = () => {
    if (activeIdx > 0) {
      setActiveStep(stepOrder[activeIdx - 1]);
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (personalIncomplete) {
      setError(t('requiredFieldsSubmitError'));
      goTo('personal');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const payload = { ...form, gender: form.gender || undefined, dateOfBirth: form.dateOfBirth || undefined, salary: Number(form.salary) };
      let employeeId = employee?._id;
      if (isEdit && employeeId) {
        const res = await api.put(`/employees/${employeeId}`, payload);
        onSaved?.(res.data.data);
      } else {
        const res = await api.post('/employees', payload);
        employeeId = res.data.data._id;
        onSaved?.(res.data.data);
      }

      for (const doc of documents) {
        if (doc.file && employeeId) {
          const fd = new FormData();
          fd.append('file', doc.file);
          fd.append('entityType', 'employee');
          fd.append('entityId', employeeId);
          fd.append('title', doc.title || doc.file.name);
          await api.post('/files', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        }
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || t('failedSaveEmployee'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => { if (!saving) onClose(); }}
      title={isEdit ? t('editEmployee') : t('createEmployee')}
      subtitle={isEdit ? t('updatingEmployee', { name: `${form.firstName} ${form.middleName} ${form.lastName}`, code: form.employeeCode || '—' }) : t('registerNewMember')}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full gap-3">
          {/* Step label of where you are — doubles as a progress caption */}
          <p className="text-xs text-muted hidden md:block">
            {t('stepOf', { current: activeIdx + 1, total: stepOrder.length })} · <span className="font-medium text-ink">{STEPS[activeIdx].label}</span>
          </p>
          <div className="flex items-center gap-3 ml-auto">
            {activeIdx > 0 && (
              <button
                type="button"
                onClick={goBack}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl border border-line bg-surface text-sm font-medium text-ink hover:bg-canvas  transition-colors disabled:opacity-50"
              >
                {t('back')}
              </button>
            )}
            {activeIdx < stepOrder.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="group px-6 py-2.5 flex items-center gap-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-all shadow-sm hover:shadow-md"
              >
                {t('next')}
                <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-2.5 flex items-center gap-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {saving ? t('saving') : isEdit ? t('updateEmployee') : t('createEmployee')}
              </button>
            )}
          </div>
        </div>
      }
    >
      {/* ── Stepper header ───────────────────────────────────────── */}
      <div className="flex items-start mb-6">
        {STEPS.map((step, i) => {
          const isActive = activeStep === step.key;
          const isDone = completed[step.key] && !isActive;
          const passed = stepOrder.indexOf(step.key) < activeIdx;
          return (
            <div key={step.key} className={`flex items-start ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
              <button
                type="button"
                onClick={() => goTo(step.key)}
                className="flex items-center gap-2.5 group focus:outline-none"
                aria-current={isActive ? 'step' : undefined}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-all duration-300 ${
                    isDone
                      ? 'bg-primary-600 text-white'
                      : isActive
                        ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-500/40 scale-110'
                        : 'bg-subtle text-muted group-hover:bg-primary-50 group-hover:text-primary-600'
                  }`}
                >
                  {isDone ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="text-left hidden sm:block">
                  <span className={`block text-xs font-semibold leading-tight transition-colors duration-200 ${isActive ? 'text-ink' : 'text-muted group-hover:text-ink'}`}>
                    {step.label}
                  </span>
                  <span className="block text-[10px] text-subtext leading-tight">{step.hint}</span>
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="flex-1 mx-3 mt-3.5 h-0.5 bg-line rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-primary-500 rounded-full transition-all duration-500 ease-out ${passed || completed[step.key] ? 'w-full' : 'w-0'}`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-5 bg-danger-subtle border border-danger-line text-danger-text px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {/* ── Sliding step panels ────────────────────────────────────── */}
      <div className="overflow-hidden">
        <div
          className="flex w-[300%] transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${activeIdx * (100 / 3)}%)` }}
        >
          {/* Step 1 — Personal Info */}
          <div className="w-1/3 flex-none pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="v-label v-label--required">{t('employeeId')}</label>
                <input type="text" name="employeeCode" value={form.employeeCode} onChange={handleChange}
                  placeholder="VS-0000" className="v-input font-mono" />
              </div>
              <div>
                <label className="v-label v-label--required">{t('category')}</label>
                <select name="category" value={form.category} onChange={handleChange} className="v-input">
                  <option value="GUARD">{t('guard')}</option>
                  <option value="OFFICE_STAFF">{t('officeStaff')}</option>
                </select>
              </div>
              <div>
                <label className="v-label v-label--required">{t('firstName')}</label>
                <input type="text" name="firstName" value={form.firstName} onChange={handleChange} className="v-input" />
              </div>
              <div>
                <label className="v-label">{t('middleName')}</label>
                <input type="text" name="middleName" value={form.middleName} onChange={handleChange} className="v-input" />
              </div>
              <div>
                <label className="v-label v-label--required">{t('lastName')}</label>
                <input type="text" name="lastName" value={form.lastName} onChange={handleChange} className="v-input" />
              </div>
              <div>
                <label className="v-label">{t('gender')}</label>
                <select name="gender" value={form.gender} onChange={handleChange} className="v-input">
                  <option value="">{t('selectGender')}</option>
                  <option value="MALE">{t('male')}</option>
                  <option value="FEMALE">{t('female')}</option>
                </select>
              </div>
              <div>
                <label className="v-label" htmlFor="employee-age">{t('age')}</label>
                <input
                  id="employee-age"
                  type="number"
                  min={16}
                  max={100}
                  value={ageFromDate(form.dateOfBirth)}
                  onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: dobFromAge(e.target.value) }))}
                  placeholder="e.g. 30"
                  className="v-input"
                />
              </div>
              <div>
                <label className="v-label v-label--required">{t('phone')}</label>
                <input type="text" name="phone" value={form.phone} onChange={handleChange} className="v-input" />
              </div>
              <div>
                <label className="v-label">{t('email')}</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} className="v-input" />
              </div>
              <div className="col-span-2">
                <label className="v-label">{t('educationalLevel')}</label>
                <input type="text" name="education" value={form.education} onChange={handleChange}
                  placeholder="Grade 8 / Grade 10 / Grade 12 / Diploma / Degree" className="v-input" />
              </div>
              <div className="col-span-2">
                <label className="v-label">{t('fingerprintQuestion')}</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFingerprint(true)}
                    aria-pressed={form.fingerprint === true}
                    className={`flex-1 h-10 rounded-lg border text-sm font-semibold transition-colors ${
                      form.fingerprint === true
                        ? 'bg-success-subtle text-success-text border-success-line'
                        : 'border-line bg-surface text-muted hover:bg-subtle'
                    }`}
                  >
                    ✓ {t('fingerprintYes')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFingerprint(false)}
                    aria-pressed={form.fingerprint === false}
                    className={`flex-1 h-10 rounded-lg border text-sm font-semibold transition-colors ${
                      form.fingerprint === false
                        ? 'bg-danger-subtle text-danger-text border-danger-line'
                        : 'border-line bg-surface text-muted hover:bg-subtle'
                    }`}
                  >
                    ✗ {t('fingerprintNo')}
                  </button>
                </div>
              </div>
              <div className="col-span-2">
                <label className="v-label">{t('address')}</label>
                <textarea name="address" value={form.address} onChange={handleChange} rows={2}
                  className="v-input resize-none" />
              </div>
            </div>
          </div>

          {/* Step 2 — Employment Details */}
          <div className="w-1/3 flex-none px-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="v-label">{t('department')}</label>
                <select name="department" value={form.department} onChange={handleChange} className="v-input">
                  <option value="">{t('selectDepartment')}</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="v-label">{t('position')}</label>
                <select name="position" value={form.position} onChange={handleChange} className="v-input">
                  <option value="">{t('selectPosition')}</option>
                  {positions.map((p) => (
                    <option key={p._id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="v-label">{t('bankName')}</label>
                <select name="bankName" value={form.bankName} onChange={handleChange} className="v-input">
                  <option value="">Select bank</option>
                  {ETHIOPIAN_BANKS.map((b) => (
                    <option key={b.value} value={b.value}>{b.fullName}</option>
                  ))}
                  {form.bankName && !ETHIOPIAN_BANKS.some((b) => b.value === form.bankName) && (
                    <option value={form.bankName}>{form.bankName} (existing)</option>
                  )}
                </select>
              </div>
              <div>
                <label className="v-label">{t('accountNumber')}</label>
                <input type="text" name="accountNumber" value={form.accountNumber} onChange={handleChange} className="v-input" />
              </div>
            </div>
            <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-primary-50/70 border border-primary-100">
              <svg className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-primary-700 dark:text-primary-300 leading-relaxed">
                {t('salaryNote')}
              </p>
            </div>
          </div>

          {/* Step 3 — Documents */}
          <div className="w-1/3 flex-none pl-1">
            <div className="space-y-4">
              <p className="text-sm text-muted">{t('uploadDocsHint')}</p>
              {documents.map((doc, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-line bg-canvas /60">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="v-label">{t('documentTitle')}</label>
                        <input type="text" value={doc.title} onChange={(e) => updateDocument(idx, 'title', e.target.value)}
                          placeholder={t('docTitlePlaceholder')} className="v-input" />
                      </div>
                      <div>
                        <label className="v-label">{t('file')}</label>
                        {doc.existingUrl ? (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-success-line bg-success-subtle text-sm text-success-text">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="truncate">{doc.existingFileName}</span>
                            <span className="text-xs text-success-text ml-auto opacity-80">{t('uploaded')}</span>
                          </div>
                        ) : (
                          <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-line-strong bg-surface text-sm text-muted cursor-pointer hover:bg-canvas  transition-colors">
                            <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span className="truncate">{doc.file ? doc.file.name : 'Choose file...'}</span>
                            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={(e) => updateDocument(idx, 'file', e.target.files?.[0] || null)} />
                          </label>
                        )}
                      </div>
                    </div>
                    {documents.length > 1 && (
                      <button type="button" onClick={() => removeDocument(idx)}
                        className="mt-6 p-2 text-danger-text hover:bg-danger-subtle rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" onClick={addDocument}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-600 dark:text-primary-400 border border-dashed border-primary-300 dark:border-primary-500/50 rounded-xl hover:bg-primary-500/10 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('addAnotherFile')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
