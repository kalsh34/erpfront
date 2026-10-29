import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

const SITE_TYPES = [
  { value: 'COMMERCIAL', label: 'Commercial', desc: 'Offices, malls, retail' },
  { value: 'RESIDENTIAL', label: 'Residential', desc: 'Estates, apartments' },
  { value: 'INDUSTRIAL', label: 'Industrial', desc: 'Factories, warehouses' },
  { value: 'GOVERNMENT', label: 'Government', desc: 'Public institutions' },
];

export function SiteForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    siteCode: '', siteName: '', location: '',
    siteType: 'COMMERCIAL', agreedManpower: 0, actualManpower: 0,
    maleCount: 0, femaleCount: 0,
    contactPerson: '', contactPhone: '',
    companyId: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<{ _id: string; name: string }[]>([]);

  useEffect(() => {
    api.get('/companies', { params: { page: 1, limit: 200, sort: 'name', dir: 'asc' } })
      .then((r) => setCompanies(r.data.data || []))
      .catch(() => setCompanies([]));
  }, []);

  const update = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/sites', {
              ...form,
              companyId: form.companyId || null,
              // only send gender counts when provided (optional fields)
              maleCount: form.maleCount || undefined,
              femaleCount: form.femaleCount || undefined,
            });
      navigate('/sites');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create site');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="hover:text-gray-700 cursor-pointer" onClick={() => navigate('/sites')}>Sites</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        <span className="text-gray-900 font-medium">New Site</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create New Site</h1>
        <p className="text-sm text-gray-500 mt-1">Add a security post to the system. Fill in the details below.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Site Identity */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Site Identity</h2>
              <p className="text-xs text-gray-400">Basic identification and classification</p>
            </div>
          </div>
          <div className="p-6 grid grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Site Code *</label>
              <input type="text" value={form.siteCode} onChange={(e) => update('siteCode', e.target.value.toUpperCase())}
                required placeholder="e.g. VSP-001"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-mono" />
              <p className="text-[10px] text-gray-400 mt-1">Unique identifier for this site</p>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Site Name *</label>
              <input type="text" value={form.siteName} onChange={(e) => update('siteName', e.target.value)}
                required placeholder="e.g. Vital Security HQ"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" />
            </div>
          </div>
        </div>

        {/* Section 2: Type & Classification */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Type & Classification</h2>
              <p className="text-xs text-gray-400">What kind of site is this?</p>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-4 gap-3">
              {SITE_TYPES.map((t) => (
                <button key={t.value} type="button" onClick={() => update('siteType', t.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${form.siteType === t.value ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                  <p className={`text-sm font-semibold ${form.siteType === t.value ? 'text-indigo-700' : 'text-gray-700'}`}>{t.label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: Location */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Location</h2>
              <p className="text-xs text-gray-400">Where is this site located?</p>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Location *</label>
              <input type="text" value={form.location} onChange={(e) => update('location', e.target.value)}
                required placeholder="e.g. Bole, Addis Ababa"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Company</label>
              <select
                value={form.companyId}
                onChange={(e) => update('companyId', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all bg-white"
              >
                <option value="">— No company —</option>
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Manpower */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Manpower</h2>
              <p className="text-xs text-gray-400">Required vs. actual guard deployment</p>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Agreed Manpower *</label>
                <input type="number" min={0} value={form.agreedManpower} onChange={(e) => update('agreedManpower', parseInt(e.target.value) || 0)}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" />
                <p className="text-[10px] text-gray-400 mt-1">Contracted number of guards</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Actual Manpower *</label>
                <input type="number" min={0} value={form.actualManpower} onChange={(e) => update('actualManpower', parseInt(e.target.value) || 0)}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" />
                <p className="text-[10px] text-gray-400 mt-1">Currently deployed guards</p>
              </div>
            </div>

            {/* Optional gender split of actual manpower */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-medium text-gray-500">Gender Split of Actual Manpower <span className="text-gray-400 font-normal">(optional)</span></label>
                <span className="text-[10px] text-gray-400">
                  {(form.maleCount || 0) + (form.femaleCount || 0)} / {form.actualManpower} filled
                </span>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Male Guards</label>
                  <input type="number" min={0} value={form.maleCount} onChange={(e) => update('maleCount', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Female Guards</label>
                  <input type="number" min={0} value={form.femaleCount} onChange={(e) => update('femaleCount', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" />
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">Leave blank if gender breakdown is unknown. Not required for site creation.</p>
            </div>
            {form.agreedManpower > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-gray-500">Coverage</span>
                  <span className={`font-semibold ${form.actualManpower >= form.agreedManpower ? 'text-emerald-600' : form.actualManpower >= form.agreedManpower * 0.6 ? 'text-amber-600' : 'text-red-600'}`}>
                    {Math.round((form.actualManpower / form.agreedManpower) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${form.actualManpower >= form.agreedManpower ? 'bg-emerald-500' : form.actualManpower >= form.agreedManpower * 0.6 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(Math.round((form.actualManpower / form.agreedManpower) * 100), 100)}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 5: Contact */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Contact Person</h2>
              <p className="text-xs text-gray-400">On-site contact for coordination</p>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Name</label>
                <input type="text" value={form.contactPerson} onChange={(e) => update('contactPerson', e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Phone</label>
                <input type="text" value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)}
                  placeholder="e.g. +251 911 234 567"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button type="button" onClick={() => navigate('/sites')}
            className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading || !form.siteCode || !form.siteName || !form.location}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 flex items-center gap-2">
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {loading ? 'Creating...' : 'Create Site'}
          </button>
        </div>
      </form>
    </div>
  );
}
