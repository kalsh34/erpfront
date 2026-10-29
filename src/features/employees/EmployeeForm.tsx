import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';
import { ETHIOPIAN_BANKS } from '../../lib/ethiopianBanks';
import { useT } from '../../i18n';
import { ageFromDate, dobFromAge } from './age';

type TabKey = 'personal' | 'employment' | 'documents';

interface DocEntry {
  title: string;
  file: File | null;
  existingUrl?: string;
  existingFileName?: string;
}

export default function EmployeeForm() {
  const navigate = useNavigate();
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('personal');
  const [error, setError] = useState('');

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'personal', label: t('personalInfo') },
    { key: 'employment', label: t('employmentDetails') },
    { key: 'documents', label: t('documents') },
  ];

  const [form, setForm] = useState<{
    employeeCode: string;
    firstName: string;
    middleName: string;
    lastName: string;
    phone: string;
    email: string;
    address: string;
    category: string;
    gender: string;
    dateOfBirth: string;
    education: string;
    /** undefined = the user has not answered the fingerprint question yet. */
    fingerprint: boolean | undefined;
    department: string;
    position: string;
    bankName: string;
    accountNumber: string;
    salary: number;
  }>({
    employeeCode: '',
    firstName: '',
    middleName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    category: 'GUARD',
    gender: '',
    dateOfBirth: '',
    education: '',
    fingerprint: undefined,
    department: '',
    position: '',
    bankName: '',
    accountNumber: '',
    salary: 0,
  });

  const [departments, setDepartments] = useState<{ _id: string; name: string }[]>([]);
  const [positions, setPositions] = useState<{ _id: string; name: string }[]>([]);
  const [documents, setDocuments] = useState<DocEntry[]>([{ title: '', file: null }]);

  useEffect(() => {
    api.get('/departments').then((r) => setDepartments(r.data.data || [])).catch(() => {});
    api.get('/positions').then((r) => setPositions(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      api.get(`/employees/${id}`)
        .then((res) => {
          const e = res.data.data;
          setForm({
            employeeCode: e.employeeCode || '',
            firstName: e.firstName || '',
            middleName: e.middleName || '',
            lastName: e.lastName || '',
            phone: e.phone || '',
            email: e.email || '',
            address: e.address || '',
            category: e.category || 'GUARD',
            gender: e.gender || '',
            dateOfBirth: e.dateOfBirth ? e.dateOfBirth.split('T')[0] : '',
            education: e.education || '',
            fingerprint: e.fingerprint === true ? true : e.fingerprint === false ? false : undefined,
            department: e.department || '',
            position: e.position || '',
            bankName: e.bankName || '',
            accountNumber: e.accountNumber || '',
            salary: e.salary || 0,
          });
          if (e.documents && e.documents.length > 0) {
            setDocuments(e.documents.map((d: any) => ({
              title: d.title || '',
              file: null,
              existingUrl: d.url,
              existingFileName: d.fileName,
            })));
          }
        })
        .catch(() => setError(t('failedLoadEmployee')))
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

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

  const handleSubmit = async () => {
    setError('');
    setSaving(true);
    try {
      const payload = { ...form, salary: Number(form.salary) };
      let employeeId = id;
      if (isEdit) {
        await api.put(`/employees/${id}`, payload);
      } else {
        const res = await api.post('/employees', payload);
        employeeId = res.data.data._id;
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
      navigate('/employees');
    } catch (err: any) {
      setError(err.response?.data?.message || t('failedSaveEmployee'));
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    return `${form.firstName?.[0] || ''}${form.lastName?.[0] || ''}`.toUpperCase() || '??';
  };

  const inputCls =
    'w-full h-10 px-3 rounded-lg border border-line bg-surface text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400';
  const labelCls = 'block text-sm font-medium text-ink mb-1.5';
  const secondaryBtn =
    'px-5 py-2.5 text-sm font-medium text-muted border border-line rounded-lg hover:bg-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors';
  const primaryBtn =
    'px-6 py-2.5 flex items-center gap-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-xs text-subtext">
          <button
            onClick={() => navigate('/employees')}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-line text-muted hover:bg-subtle hover:text-ink transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            {t('backToEmployees')}
          </button>
          <span>/</span>
          <span>Vital Security PLC</span>
          <span>/</span>
          <span>{t('hrPeople')}</span>
          <span>/</span>
          <span>{isEdit ? t('editEmployee') : t('newEmployee')}</span>
        </div>
      </div>

      {error && (
        <div className="bg-danger-subtle text-danger-text p-3 rounded-lg text-sm border border-danger-line">{error}</div>
      )}

      <div className="flex gap-6">
        <div className="w-64 flex-shrink-0 space-y-4 hidden lg:block">
          <div className="bg-surface rounded-xl border border-line p-6 text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg">
              {getInitials()}
            </div>
            <h3 className="text-base font-semibold text-ink">
              {[form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ') || t('newEmployee')}
            </h3>
            <p className="text-xs text-subtext font-mono mt-1">{form.employeeCode || 'VS-0000'}</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                form.category === 'GUARD'
                  ? 'bg-primary-100 text-primary-700 border-primary-200 dark:bg-primary-500/20 dark:text-primary-300 dark:border-primary-500/40'
                  : 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-500/10 dark:text-primary-300 dark:border-primary-500/30'
              }`}>
                {form.category === 'GUARD' ? t('guard') : t('officeStaff')}
              </span>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-line p-5 space-y-4">
            <div>
              <p className="text-[10px] font-semibold text-subtext uppercase tracking-wider mb-1">{t('phone')}</p>
              <p className="text-sm text-ink">{form.phone || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-subtext uppercase tracking-wider mb-1">{t('email')}</p>
              <p className="text-sm text-ink">{form.email || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-subtext uppercase tracking-wider mb-1">{t('department')}</p>
              <p className="text-sm text-ink">{form.department || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-subtext uppercase tracking-wider mb-1">{t('position')}</p>
              <p className="text-sm text-ink">{form.position || '—'}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex gap-1 border-b border-line bg-surface rounded-t-xl px-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === tab.key
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-surface rounded-xl border border-line p-6">
            {activeTab === 'personal' && (
              <div className="space-y-6">
                <h3 className="text-base font-semibold text-ink">{t('personalInfo')}</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>{t('employeeId')} *</label>
                    <input type="text" name="employeeCode" value={form.employeeCode} onChange={handleChange}
                      placeholder="VS-0000" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t('category')} *</label>
                    <select name="category" value={form.category} onChange={handleChange} className={inputCls}>
                      <option value="GUARD">{t('guard')}</option>
                      <option value="OFFICE_STAFF">{t('officeStaff')}</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{t('firstName')} *</label>
                    <input type="text" name="firstName" value={form.firstName} onChange={handleChange} required className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t('middleName')}</label>
                    <input type="text" name="middleName" value={form.middleName} onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t('lastName')} *</label>
                    <input type="text" name="lastName" value={form.lastName} onChange={handleChange} required className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t('gender')}</label>
                    <select name="gender" value={form.gender} onChange={handleChange} className={inputCls}>
                      <option value="">{t('selectGender')}</option>
                      <option value="MALE">{t('male')}</option>
                      <option value="FEMALE">{t('female')}</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{t('age')}</label>
                    <input
                      type="number"
                      name="age"
                      min={16}
                      max={100}
                      value={ageFromDate(form.dateOfBirth)}
                      onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: dobFromAge(e.target.value) }))}
                      placeholder="e.g. 30"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t('phone')} *</label>
                    <input type="text" name="phone" value={form.phone} onChange={handleChange} required className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t('email')}</label>
                    <input type="email" name="email" value={form.email} onChange={handleChange} className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>{t('educationalLevel')}</label>
                    <input type="text" name="education" value={form.education} onChange={handleChange}
                      placeholder="Grade 8 / Grade 10 / Grade 12 / Diploma / Degree" className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>{t('fingerprintQuestion')}</label>
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
                    <label className={labelCls}>{t('address')}</label>
                    <textarea name="address" value={form.address} onChange={handleChange} rows={2}
                      className="w-full px-3 py-2.5 rounded-lg border border-line bg-surface text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 resize-none" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'employment' && (
              <div className="space-y-6">
                <h3 className="text-base font-semibold text-ink">{t('employmentParameters')}</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>{t('department')}</label>
                    <select name="department" value={form.department} onChange={handleChange} className={inputCls}>
                      <option value="">{t('selectDepartment')}</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{t('position')}</label>
                    <select name="position" value={form.position} onChange={handleChange} className={inputCls}>
                      <option value="">{t('selectPosition')}</option>
                      {positions.map((p) => (
                        <option key={p._id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{t('bankName')}</label>
                    <select name="bankName" value={form.bankName} onChange={handleChange} className={inputCls}>
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
                    <label className={labelCls}>{t('accountNumber')}</label>
                    <input type="text" name="accountNumber" value={form.accountNumber} onChange={handleChange} className={inputCls} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-6">
                <h3 className="text-base font-semibold text-ink">{t('documents')}</h3>
                <p className="text-sm text-muted">{t('uploadDocsHint')}</p>
                <div className="space-y-4">
                  {documents.map((doc, idx) => (
                    <div key={idx} className="p-4 rounded-lg border border-line bg-canvas /60">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-muted mb-1">{t('documentTitle')}</label>
                            <input
                              type="text"
                              value={doc.title}
                              onChange={(e) => updateDocument(idx, 'title', e.target.value)}
                              placeholder={t('docTitlePlaceholder')}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted mb-1">{t('file')}</label>
                            {doc.existingUrl ? (
                              <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-success-line bg-success-subtle text-sm text-success-text">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="truncate">{doc.existingFileName}</span>
                                <span className="text-xs text-success-text ml-auto opacity-80">{t('uploaded')}</span>
                              </div>
                            ) : (
                              <label className="flex items-center gap-2 h-10 px-3 rounded-lg border border-dashed border-line-strong bg-surface text-sm text-muted cursor-pointer hover:bg-subtle transition-colors">
                                <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                <span className="truncate">{doc.file ? doc.file.name : t('chooseFile')}</span>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                  onChange={(e) => updateDocument(idx, 'file', e.target.files?.[0] || null)}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                        {documents.length > 1 && (
                          <button
                            onClick={() => removeDocument(idx)}
                            className="mt-5 p-2 text-danger-text hover:bg-danger-subtle rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addDocument}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-600 dark:text-primary-400 border border-dashed border-primary-300 dark:border-primary-500/50 rounded-lg hover:bg-primary-500/10 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t('addAnotherFile')}
                </button>
              </div>
            )}

            <div className="flex justify-between items-center mt-8 pt-6 border-t border-line">
              <button
                onClick={() => setActiveTab(tabs[Math.max(0, tabs.findIndex(t => t.key === activeTab) - 1)].key)}
                disabled={activeTab === 'personal'}
                className={secondaryBtn}
              >
                {t('previous')}
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/employees')}
                  className={secondaryBtn}
                >
                  {t('cancel')}
                </button>
                {activeTab === 'documents' ? (
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className={primaryBtn}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {saving ? t('saving') : isEdit ? t('updateEmployee') : t('createEmployee')}
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveTab(tabs[tabs.findIndex(t => t.key === activeTab) + 1].key)}
                    className={primaryBtn}
                  >
                    {t('next')}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
