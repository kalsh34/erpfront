import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { getApiBaseUrl } from '../../lib/api';
import { useT } from '../../i18n';
import type { DictKey } from '../../i18n';

interface Employee {
  _id: string;
  employeeCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  category: string;
  status: string;
}

interface GuarantorDoc {
  url: string;
  fileName: string;
  description?: string;
}

interface GuarantorRecord {
  _id: string;
  guarantorType: string;
  fullName: string;
  phone: string;
  address?: string;
  relationship?: string;
  occupation?: string;
  idNumber?: string;
  vehicleType?: string;
  vehiclePlateNumber?: string;
  vehicleMake?: string;
  vehicleYear?: number;
  propertyType?: string;
  propertyLocation?: string;
  propertyTitleNumber?: string;
  estimatedValue?: number;
  documents: GuarantorDoc[];
  verificationStatus: string;
  verifiedAt?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
}

const TYPE_OPTIONS: { value: string; icon: string; labelKey: DictKey; descKey: DictKey }[] = [
  { value: 'PERSON', icon: '👤', labelKey: 'typePerson', descKey: 'typePersonDesc' },
  { value: 'VEHICLE_COLLATERAL', icon: '🚗', labelKey: 'typeVehicle', descKey: 'typeVehicleDesc' },
  { value: 'PROPERTY_COLLATERAL', icon: '🏠', labelKey: 'typeProperty', descKey: 'typePropertyDesc' },
];

const VEHICLE_TYPES: { value: string; labelKey: DictKey }[] = [
  { value: 'Sedan', labelKey: 'sedan' },
  { value: 'SUV', labelKey: 'suv' },
  { value: 'Truck', labelKey: 'truck' },
  { value: 'Van', labelKey: 'van' },
  { value: 'Motorcycle', labelKey: 'motorcycle' },
];

const PROPERTY_TYPES: { value: string; labelKey: DictKey }[] = [
  { value: 'House', labelKey: 'house' },
  { value: 'Apartment', labelKey: 'apartment' },
  { value: 'Land', labelKey: 'land' },
  { value: 'Commercial', labelKey: 'commercialBuilding' },
];

const VERIFY_STATUS_KEYS: Record<string, DictKey> = {
  PENDING: 'verifyPending',
  VERIFIED: 'verifyVerified',
  REJECTED: 'verifyRejected',
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-warning-subtle text-warning-text border border-warning-line',
  VERIFIED: 'bg-success-subtle text-success-text border border-success-line',
  REJECTED: 'bg-danger-subtle text-danger-text border border-danger-line',
};

export default function GuarantorPage() {
  const { id: employeeId } = useParams<{ id: string }>();
  const t = useT();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [guarantors, setGuarantors] = useState<GuarantorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState('PERSON');
  const [form, setForm] = useState({
    fullName: '', phone: '', address: '', relationship: '', occupation: '', idNumber: '',
    vehicleType: '', vehiclePlateNumber: '', vehicleMake: '', vehicleYear: '',
    propertyType: '', propertyLocation: '', propertyTitleNumber: '', estimatedValue: '',
    notes: '',
  });
  const [documents, setDocuments] = useState<{ file: File | null; description: string; uploadedUrl?: string; uploadedFileName?: string }[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  /** Guarantor currently being edited (reuse the same form). */
  const [editingGuarantor, setEditingGuarantor] = useState<GuarantorRecord | null>(null);

  /** Uploaded docs are stored as relative /uploads/... paths — they are only
   * reachable through the API origin, never the Vite dev server. */
  const fileUrl = (path: string) => `${getApiBaseUrl()}${path.startsWith('/') ? '' : '/'}${path}`;

  const fetchData = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const [empRes, guarRes] = await Promise.all([
        api.get(`/employees/${employeeId}`),
        api.get(`/guarantors/employee/${employeeId}`),
      ]);
      setEmployee(empRes.data.data);
      setGuarantors(guarRes.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [employeeId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setForm({ fullName: '', phone: '', address: '', relationship: '', occupation: '', idNumber: '',
      vehicleType: '', vehiclePlateNumber: '', vehicleMake: '', vehicleYear: '',
      propertyType: '', propertyLocation: '', propertyTitleNumber: '', estimatedValue: '', notes: '' });
    setDocuments([]);
    setType('PERSON');
    setEditingGuarantor(null);
  };

  const openEdit = (g: GuarantorRecord) => {
    setEditingGuarantor(g);
    setType(g.guarantorType);
    setForm({
      fullName: g.fullName || '',
      phone: g.phone || '',
      address: g.address || '',
      relationship: g.relationship || '',
      occupation: g.occupation || '',
      idNumber: g.idNumber || '',
      vehicleType: g.vehicleType || '',
      vehiclePlateNumber: g.vehiclePlateNumber || '',
      vehicleMake: g.vehicleMake || '',
      vehicleYear: g.vehicleYear ? String(g.vehicleYear) : '',
      propertyType: g.propertyType || '',
      propertyLocation: g.propertyLocation || '',
      propertyTitleNumber: g.propertyTitleNumber || '',
      estimatedValue: g.estimatedValue ? String(g.estimatedValue) : '',
      notes: g.notes || '',
    });
    setDocuments(
      (g.documents || []).map((d) => ({
        file: null,
        description: d.description || '',
        uploadedUrl: d.url,
        uploadedFileName: d.fileName,
      }))
    );
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingGuarantor) { await submitEdit(); return; }
      const uploadedDocs: { url: string; fileName: string; description: string }[] = [];
      for (const doc of documents) {
        if (doc.uploadedUrl) {
          uploadedDocs.push({ url: doc.uploadedUrl, fileName: doc.uploadedFileName || '', description: doc.description });
        } else if (doc.file) {
          const fd = new FormData();
          fd.append('file', doc.file);
          fd.append('entityType', 'guarantor');
          fd.append('title', doc.description || doc.file.name);
          const uploadRes = await api.post('/files', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          uploadedDocs.push({ url: uploadRes.data.data.path, fileName: uploadRes.data.data.filename, description: doc.description });
        }
      }

      const payload: any = {
        employeeId,
        guarantorType: type,
        fullName: form.fullName,
        phone: form.phone,
        address: form.address,
        relationship: form.relationship,
        occupation: form.occupation,
        idNumber: form.idNumber,
        notes: form.notes,
        documents: uploadedDocs,
      };

      if (type === 'VEHICLE_COLLATERAL') {
        payload.vehicleType = form.vehicleType;
        payload.vehiclePlateNumber = form.vehiclePlateNumber;
        payload.vehicleMake = form.vehicleMake;
        payload.vehicleYear = form.vehicleYear ? Number(form.vehicleYear) : undefined;
      } else if (type === 'PROPERTY_COLLATERAL') {
        payload.propertyType = form.propertyType;
        payload.propertyLocation = form.propertyLocation;
        payload.propertyTitleNumber = form.propertyTitleNumber;
        payload.estimatedValue = form.estimatedValue ? Number(form.estimatedValue) : undefined;
      }

      await api.post('/guarantors', payload);
      resetForm();
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || t('failedSaveGuarantor'));
    } finally { setSaving(false); }
  };

  /** Update an existing guarantor: PUT the editable fields, keep existing docs
   * and replace the documents array with whatever the form now holds. */
  const submitEdit = async () => {
    try {
      if (!editingGuarantor) return;
      const uploadedDocs: { url: string; fileName: string; description: string }[] = [];
      for (const doc of documents) {
        if (doc.uploadedUrl) {
          uploadedDocs.push({ url: doc.uploadedUrl, fileName: doc.uploadedFileName || '', description: doc.description });
        } else if (doc.file) {
          const fd = new FormData();
          fd.append('file', doc.file);
          fd.append('entityType', 'guarantor');
          fd.append('title', doc.description || doc.file.name);
          const uploadRes = await api.post('/files', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          uploadedDocs.push({ url: uploadRes.data.data.path, fileName: uploadRes.data.data.filename, description: doc.description });
        }
      }

      const payload: any = {
        guarantorType: type,
        fullName: form.fullName,
        phone: form.phone,
        address: form.address,
        relationship: form.relationship,
        occupation: form.occupation,
        idNumber: form.idNumber,
        notes: form.notes,
        documents: uploadedDocs,
      };
      if (type === 'VEHICLE_COLLATERAL') {
        payload.vehicleType = form.vehicleType;
        payload.vehiclePlateNumber = form.vehiclePlateNumber;
        payload.vehicleMake = form.vehicleMake;
        payload.vehicleYear = form.vehicleYear ? Number(form.vehicleYear) : undefined;
        payload.propertyType = undefined;
        payload.propertyLocation = undefined;
        payload.propertyTitleNumber = undefined;
        payload.estimatedValue = undefined;
      } else if (type === 'PROPERTY_COLLATERAL') {
        payload.propertyType = form.propertyType;
        payload.propertyLocation = form.propertyLocation;
        payload.propertyTitleNumber = form.propertyTitleNumber;
        payload.estimatedValue = form.estimatedValue ? Number(form.estimatedValue) : undefined;
        payload.vehicleType = undefined;
        payload.vehiclePlateNumber = undefined;
        payload.vehicleMake = undefined;
        payload.vehicleYear = undefined;
      } else {
        payload.vehicleType = undefined;
        payload.vehiclePlateNumber = undefined;
        payload.vehicleMake = undefined;
        payload.vehicleYear = undefined;
        payload.propertyType = undefined;
        payload.propertyLocation = undefined;
        payload.propertyTitleNumber = undefined;
        payload.estimatedValue = undefined;
      }

      await api.put(`/guarantors/${editingGuarantor._id}`, payload);
      resetForm();
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || t('failedSaveGuarantor'));
    } finally { setSaving(false); }
  };

  const handleVerify = async (id: string) => {
    try {
      await api.put(`/guarantors/${id}/verify`);
      fetchData();
    } catch (err: any) { alert(err.response?.data?.message || t('genericFailed')); }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return;
    try {
      await api.put(`/guarantors/${id}/reject`, { reason: rejectReason });
      setRejectingId(null);
      setRejectReason('');
      fetchData();
    } catch (err: any) { alert(err.response?.data?.message || t('genericFailed')); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteGuarantorConfirm'))) return;
    try {
      await api.delete(`/guarantors/${id}`);
      fetchData();
    } catch (err: any) { alert(err.response?.data?.message || t('genericFailed')); }
  };

  const addDocument = () => {
    setDocuments([...documents, { file: null, description: '' }]);
  };

  const updateDoc = (idx: number, field: string, value: string) => {
    const updated = [...documents];
    (updated[idx] as any)[field] = value;
    setDocuments(updated);
  };

  const removeDoc = (idx: number) => {
    setDocuments(documents.filter((_, i) => i !== idx));
  };

  const typeLabel = (guarantorType: string) => {
    const opt = TYPE_OPTIONS.find(tp => tp.value === guarantorType);
    return opt ? t(opt.labelKey) : guarantorType;
  };

  const verifyStatusLabel = (status: string) => {
    const key = VERIFY_STATUS_KEYS[status];
    return key ? t(key) : status;
  };

  const inputCls =
    'w-full h-10 px-3 rounded-lg border border-line bg-surface text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400';
  const labelCls = 'block text-sm font-medium text-ink mb-1.5';
  const selectCls =
    'w-full h-10 px-3 rounded-lg border border-line bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400';
  const secondaryBtn =
    'h-10 px-5 flex items-center rounded-lg border border-line text-sm font-medium text-muted hover:bg-subtle transition-colors';
  const spinner = (
    <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">{spinner}</div>
    );
  }

  if (!employee) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Link to="/employees" className={secondaryBtn + ' mb-6'}>{t('backToEmployees')}</Link>
        <div className="text-center py-20 text-muted">{t('employeeNotFound')}</div>
      </div>
    );
  }

  const hasVerified = guarantors.some(g => g.verificationStatus === 'VERIFIED');

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink">{t('guarantorManagement')}</h1>
          <p className="text-xs text-muted mt-1">
            {[employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(' ')} ({employee.employeeCode})
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/employees"
            className="h-10 px-5 flex items-center gap-2 rounded-lg border border-line text-sm font-medium text-muted hover:bg-subtle transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            {t('backToEmployees')}
          </Link>
          <Link to={`/contracts/${employeeId}`}
            className="h-10 px-5 flex items-center gap-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm">
            {t('nextCreateContract')}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </div>

      {/* Status Banner */}
      {hasVerified && (
        <div className="bg-success-subtle border border-success-line rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-success-subtle flex items-center justify-center">
            <svg className="w-5 h-5 text-success-text" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-success-text">{t('guarantorVerified')}</p>
            <p className="text-xs text-success-text opacity-80">{t('guarantorVerifiedHint')}</p>
          </div>
        </div>
      )}

      {/* Add Guarantor Button */}
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="w-full h-12 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong text-sm font-medium text-muted hover:border-primary-400 hover:text-primary-600 hover:bg-primary-500/5 transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          {t('addGuarantor')}
        </button>
      )}

      {/* Add Guarantor Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-line p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">{editingGuarantor ? t('editGuarantor') : t('newGuarantor')}</h2>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
              className="text-sm text-muted hover:text-ink">{t('cancel')}</button>
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-sm font-medium text-ink mb-3">{t('guarantorType')} *</label>
            <div className="grid grid-cols-3 gap-3">
              {TYPE_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setType(opt.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    type === opt.value
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-line hover:border-line-strong hover:bg-subtle'
                  }`}>
                  <span className="text-2xl">{opt.icon}</span>
                  <p className="text-sm font-semibold text-ink mt-2">{t(opt.labelKey)}</p>
                  <p className="text-xs text-muted mt-0.5">{t(opt.descKey)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Common Fields */}
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>{t('fullName')} *</label>
              <input type="text" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })}
                required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t('phone')} *</label>
              <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t('address')}</label>
              <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t('relationship')}</label>
              <input type="text" value={form.relationship} onChange={e => setForm({ ...form, relationship: e.target.value })}
                placeholder={t('relationshipPlaceholder')} className={inputCls} />
            </div>
          </div>

          {/* Person-specific */}
          {type === 'PERSON' && (
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className={labelCls}>{t('occupation')}</label>
                <input type="text" value={form.occupation} onChange={e => setForm({ ...form, occupation: e.target.value })}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t('idNumber')}</label>
                <input type="text" value={form.idNumber} onChange={e => setForm({ ...form, idNumber: e.target.value })}
                  className={inputCls} />
              </div>
            </div>
          )}

          {/* Vehicle-specific */}
          {type === 'VEHICLE_COLLATERAL' && (
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className={labelCls}>{t('vehicleType')}</label>
                <select value={form.vehicleType} onChange={e => setForm({ ...form, vehicleType: e.target.value })}
                  className={selectCls}>
                  <option value="">{t('selectType')}</option>
                  {VEHICLE_TYPES.map(v => (
                    <option key={v.value} value={v.value}>{t(v.labelKey)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t('plateNumber')}</label>
                <input type="text" value={form.vehiclePlateNumber} onChange={e => setForm({ ...form, vehiclePlateNumber: e.target.value })}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t('makeBrand')}</label>
                <input type="text" value={form.vehicleMake} onChange={e => setForm({ ...form, vehicleMake: e.target.value })}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t('yearLabel')}</label>
                <input type="number" value={form.vehicleYear} onChange={e => setForm({ ...form, vehicleYear: e.target.value })}
                  className={inputCls} />
              </div>
            </div>
          )}

          {/* Property-specific */}
          {type === 'PROPERTY_COLLATERAL' && (
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className={labelCls}>{t('propertyType')}</label>
                <select value={form.propertyType} onChange={e => setForm({ ...form, propertyType: e.target.value })}
                  className={selectCls}>
                  <option value="">{t('selectType')}</option>
                  {PROPERTY_TYPES.map(p => (
                    <option key={p.value} value={p.value}>{t(p.labelKey)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t('location')}</label>
                <input type="text" value={form.propertyLocation} onChange={e => setForm({ ...form, propertyLocation: e.target.value })}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t('titleNumber')}</label>
                <input type="text" value={form.propertyTitleNumber} onChange={e => setForm({ ...form, propertyTitleNumber: e.target.value })}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t('estimatedValueEtb')}</label>
                <input type="number" value={form.estimatedValue} onChange={e => setForm({ ...form, estimatedValue: e.target.value })}
                  className={inputCls} />
              </div>
            </div>
          )}

          {/* Documents */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-ink">{t('documents')}</label>
              <button type="button" onClick={addDocument}
                className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                {t('addDocument')}
              </button>
            </div>
            {documents.length === 0 && (
              <p className="text-xs text-subtext">{t('noDocumentsYet')}</p>
            )}
            <div className="space-y-3">
              {documents.map((doc, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-subtle rounded-lg">
                  {doc.uploadedUrl ? (
                    <svg className="w-5 h-5 text-success-text flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  ) : (
                    <svg className="w-5 h-5 text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  )}
                  <input type="text" value={doc.description} onChange={e => updateDoc(idx, 'description', e.target.value)}
                    placeholder={t('documentDescription')} className="flex-1 h-8 px-2 rounded border border-line bg-surface text-xs text-ink placeholder-muted focus:outline-none focus:ring-1 focus:ring-primary-500/20" />
                  {doc.uploadedUrl ? (
                    <span className="text-xs text-success-text font-medium">{t('uploaded')}</span>
                  ) : (
                    <label className="h-8 px-3 flex items-center gap-1 rounded border border-dashed border-line-strong text-xs text-muted cursor-pointer hover:bg-surface-hover">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      {doc.file ? doc.file.name : t('chooseFileShort')}
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={e => {
                          const file = e.target.files?.[0] || null;
                          const updated = [...documents];
                          updated[idx] = { ...updated[idx], file, uploadedUrl: undefined, uploadedFileName: undefined };
                          setDocuments(updated);
                        }} />
                    </label>
                  )}
                  <button type="button" onClick={() => removeDoc(idx)} className="text-muted hover:text-danger-text">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>{t('notes')}</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={3} className="w-full px-3 py-2.5 rounded-lg border border-line bg-surface text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 resize-none" />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
              className={secondaryBtn}>
              {t('cancel')}
            </button>
            <button type="submit" disabled={saving}
              className="h-10 px-5 flex items-center gap-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50">
              {saving ? t('saving') : editingGuarantor ? t('update') : t('save')}
            </button>
          </div>
        </form>
      )}

      {/* Existing Guarantors */}
      {guarantors.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-ink">{t('submittedGuarantors', { count: guarantors.length })}</h2>
          {guarantors.map(g => (
            <div key={g._id} className="bg-surface rounded-xl border border-line p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold">
                    {g.fullName?.[0]}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-ink">{g.fullName}</h3>
                    <p className="text-sm text-muted">{g.phone} {g.relationship ? `• ${g.relationship}` : ''}</p>
                    <p className="text-xs text-subtext mt-0.5">
                      {typeLabel(g.guarantorType)}
                      {g.occupation ? ` • ${g.occupation}` : ''}
                      {g.idNumber ? ` • ${t('detailId')} ${g.idNumber}` : ''}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[g.verificationStatus] || ''}`}>
                  {verifyStatusLabel(g.verificationStatus)}
                </span>
              </div>

              {/* Vehicle / Property details */}
              {g.guarantorType === 'VEHICLE_COLLATERAL' && (
                <div className="grid grid-cols-4 gap-3 text-xs">
                  {g.vehicleType && <div><span className="text-subtext">{t('detailType')}</span> <span className="font-medium text-ink">{g.vehicleType}</span></div>}
                  {g.vehiclePlateNumber && <div><span className="text-subtext">{t('detailPlate')}</span> <span className="font-medium text-ink">{g.vehiclePlateNumber}</span></div>}
                  {g.vehicleMake && <div><span className="text-subtext">{t('detailMake')}</span> <span className="font-medium text-ink">{g.vehicleMake}</span></div>}
                  {g.vehicleYear && <div><span className="text-subtext">{t('detailYear')}</span> <span className="font-medium text-ink">{g.vehicleYear}</span></div>}
                </div>
              )}
              {g.guarantorType === 'PROPERTY_COLLATERAL' && (
                <div className="grid grid-cols-4 gap-3 text-xs">
                  {g.propertyType && <div><span className="text-subtext">{t('detailType')}</span> <span className="font-medium text-ink">{g.propertyType}</span></div>}
                  {g.propertyLocation && <div><span className="text-subtext">{t('detailLocation')}</span> <span className="font-medium text-ink">{g.propertyLocation}</span></div>}
                  {g.propertyTitleNumber && <div><span className="text-subtext">{t('detailTitle')}</span> <span className="font-medium text-ink">{g.propertyTitleNumber}</span></div>}
                  {g.estimatedValue && <div><span className="text-subtext">{t('detailValue')}</span> <span className="font-medium text-ink">ETB {g.estimatedValue.toLocaleString()}</span></div>}
                </div>
              )}

              {/* Documents */}
              {g.documents.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {g.documents.map((d, i) => (
                    <a key={i} href={fileUrl(d.url)} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-subtle rounded-lg text-xs text-muted hover:bg-surface-hover transition-colors">
                      <svg className="w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      {d.description || d.fileName}
                    </a>
                  ))}
                </div>
              )}

              {/* Rejection reason */}
              {g.verificationStatus === 'REJECTED' && g.rejectionReason && (
                <div className="bg-danger-subtle rounded-lg p-3">
                  <p className="text-xs font-medium text-danger-text">{t('rejectionReason')}:</p>
                  <p className="text-sm text-danger-text opacity-90 mt-0.5">{g.rejectionReason}</p>
                </div>
              )}

              {/* Notes */}
              {g.notes && (
                <p className="text-xs text-muted italic">{g.notes}</p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2 border-t border-line">
                {g.verificationStatus === 'PENDING' && (
                  <button onClick={() => handleVerify(g._id)}
                    className="h-8 px-4 flex items-center gap-1.5 rounded-lg bg-success-text text-white text-xs font-medium hover:opacity-90 transition-opacity">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    {t('verify')}
                  </button>
                )}
                {g.verificationStatus === 'PENDING' && (rejectingId === g._id ? (
                    <div className="flex items-center gap-2">
                      <input type="text" value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                        placeholder={t('rejectionReason')} className="h-8 px-3 rounded-lg border border-danger-line bg-surface text-xs text-ink placeholder-muted focus:outline-none focus:ring-1 focus:ring-danger-text/20 w-48" />
                      <button onClick={() => handleReject(g._id)} className="h-8 px-3 rounded-lg bg-danger-text text-white text-xs font-medium hover:opacity-90">{t('confirmAction')}</button>
                      <button onClick={() => { setRejectingId(null); setRejectReason(''); }} className="h-8 px-3 rounded-lg border border-line text-xs text-muted hover:bg-subtle">{t('cancel')}</button>
                    </div>
                  ) : (
                    <button onClick={() => setRejectingId(g._id)}
                      className="h-8 px-4 flex items-center gap-1.5 rounded-lg border border-danger-line text-danger-text text-xs font-medium hover:bg-danger-subtle transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      {t('reject')}
                    </button>
                  ))}
                <button onClick={() => openEdit(g)}
                  className="h-8 px-4 flex items-center gap-1.5 rounded-lg border border-line text-ink text-xs font-medium hover:bg-subtle transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H4a2 2 0 00-2 2v9a2 2 0 002 2h9m7-11l-4 4m0 0l4 4m-4-4H7" /></svg>
                  {t('edit')}
                </button>
                <button onClick={() => handleDelete(g._id)}
                  className="h-8 px-3 rounded-lg text-muted hover:text-danger-text text-xs ml-auto">
                  {t('delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {guarantors.length === 0 && !showForm && (
        <div className="text-center py-12 bg-surface rounded-xl border border-line">
          <svg className="w-12 h-12 text-subtext mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <p className="text-sm text-muted">{t('noGuarantorsOnFile')}</p>
          <p className="text-xs text-subtext mt-1">{t('noGuarantorsHint')}</p>
        </div>
      )}
    </div>
  );
}
