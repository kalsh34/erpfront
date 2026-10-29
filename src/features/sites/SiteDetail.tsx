import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Modal } from '../../components/ui';
import api from '../../lib/api';

interface Site {
  _id: string;
  siteCode: string;
  siteName: string;
  client?: string;
  location: string;
  siteType: string;
  status: string;
  agreedManpower: number;
  actualManpower: number;
  maleCount?: number;
  femaleCount?: number;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  deactivatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ShiftAssignment {
  _id: string;
  guardId: { _id: string; firstName: string; lastName: string; employeeCode: string; status: string } | string;
  shiftTemplateId: { _id: string; name: string; startTime: string; endTime: string; color: string } | string;
  startDate: string;
  endDate?: string;
  status: string;
  source?: string;
}

interface PrimaryAssignment {
  _id: string;
  guardId: { _id: string; firstName: string; lastName: string; employeeCode: string; status: string } | string;
  role: string;
  standardMonthlyHours: number;
  hourlyRate: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isCurrent: boolean;
}

interface SiteNoteRec {
  _id: string;
  date: string;
  noteText: string;
  recordedById?: { firstName: string; lastName: string };
}

interface RotationAssignmentRec {
  _id: string;
  guardId: { firstName: string; lastName: string; employeeCode: string } | string;
  shiftTemplateId: { name: string; startTime: string; endTime: string } | string;
  date: string;
}

interface SiteDetailData {
  site: Site;
  activeAssignments: ShiftAssignment[];
  currentAssignments: PrimaryAssignment[];
  pastAssignments: PrimaryAssignment[];
  recentNotes: SiteNoteRec[];
  rotationAssignments: RotationAssignmentRec[];
  rotations?: { _id: string; name?: string; title?: string; status: string; startDate?: string; endDate?: string }[];
  /** Full billing-price timeline returned by /sites/:id/detail. */
  priceHistory?: PriceHistoryRow[];
}

interface PriceHistoryRow {
  _id: string;
  previous?: { paymentPrice?: number; numberOfEmployees?: number } | null;
  current?: { paymentPrice?: number; numberOfEmployees?: number } | null;
  reason?: string;
  changedBy?: { firstName?: string; lastName?: string } | null;
  createdAt: string;
}

const money = (n?: number) =>
  n == null ? '—' : `ETB ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-success-subtle text-success-text border-success-line',
  INACTIVE: 'bg-subtle text-muted border-line',
  SUSPENDED: 'bg-danger-subtle text-danger-text border-danger-line',
};

const SITE_TYPE_COLORS: Record<string, string> = {
  COMMERCIAL: 'bg-slate-100 text-slate-800 border border-slate-200 dark:bg-navy-800 dark:text-slate-200 dark:border-navy-700',
  RESIDENTIAL: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  INDUSTRIAL: 'bg-slate-900 text-white shadow-xs dark:bg-navy-700',
  GOVERNMENT: 'bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900',
};

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'shifts', label: 'Shifts' },
  { key: 'guards', label: 'Guards' },
  { key: 'notes', label: 'Notes' },
] as const;

function getGuardName(g: any): string {
  if (!g) return 'Unknown';
  if (typeof g === 'string') return g;
  return `${g.firstName || ''} ${g.lastName || ''}`.trim() || 'Unknown';
}

function getGuardCode(g: any): string {
  if (!g || typeof g === 'string') return '';
  return g.employeeCode || '';
}
function getTemplateName(t: any): string {
  if (!t) return 'Unknown';
  if (typeof t === 'string') return t;
  return t.name || 'Unknown';
}
function getTemplateTime(t: any): string {
  if (!t || typeof t === 'string') return '';
  return `${t.startTime || ''}–${t.endTime || ''}`;
}
/** Local calendar date from stored ISO/Date string (never toISOString on a Date). */
function localDate(iso?: string): string {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  if (m) return `${m[2]}/${m[3]}/${m[1]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function SiteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<SiteDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [error, setError] = useState('');
  const [noteText, setNoteText] = useState('');
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [addNoteOpen, setAddNoteOpen] = useState(false);

  const [form, setForm] = useState({
    siteCode: '', siteName: '', client: '', location: '', siteType: 'COMMERCIAL',
    agreedManpower: 0, actualManpower: 0, maleCount: 0, femaleCount: 0,
    contactPerson: '', contactPhone: '', address: '',
    status: 'ACTIVE',
  });

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.get(`/sites/${id}/detail`);
      const d = res.data.data;
      setData(d);
      const s = d.site;
      setForm({
        siteCode: s.siteCode, siteName: s.siteName, client: s.client || '',
        location: s.location, siteType: s.siteType, agreedManpower: s.agreedManpower,
        actualManpower: s.actualManpower, maleCount: s.maleCount ?? 0,
        femaleCount: s.femaleCount ?? 0, contactPerson: s.contactPerson || '',
        contactPhone: s.contactPhone || '', address: s.address || '', status: s.status,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    setError('');
    try {
      await api.put(`/sites/${id}`, form);
      setEditing(false);
      fetchDetail();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || deleteConfirm !== data?.site?.siteCode) return;
    try {
      await api.delete(`/sites/${id}`);
      navigate('/sites');
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to deactivate');
    }
  };

  const handleAddNote = async () => {
    if (!id || !noteText.trim()) return;
    try {
      await api.post('/site-notes', { siteId: id, date: noteDate, noteText: noteText.trim() });
      setAddNoteOpen(false);
      setNoteText('');
      fetchDetail();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to add note');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-32">
        <p className="text-muted">Site not found</p>
        <button onClick={() => navigate('/sites')} className="mt-4 text-primary-600 hover:underline text-sm">Back to Sites</button>
      </div>
    );
  }

  const { site, activeAssignments, currentAssignments, pastAssignments, recentNotes, rotationAssignments, priceHistory } = data;
  const isInactive = site.status === 'INACTIVE';
  const guardsList = isInactive ? pastAssignments : currentAssignments;
  const pct = site.agreedManpower > 0 ? Math.round((site.actualManpower / site.agreedManpower) * 100) : 0;

  return (
    <div className="min-h-screen bg-canvas ">
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        {/* Back button */}
        <button onClick={() => navigate('/sites')} className="flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Sites
        </button>

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 p-6 text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6TTMgNmgzNHYySDN6TTM2IDE4djJIM3YtMmgzMzoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40" />
          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold tracking-tight">{site.siteName}</h1>
                <span className="text-xs font-mono text-primary-200">{site.siteCode}</span>
                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${STATUS_COLORS[site.status]}`}>{site.status}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-primary-200">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {site.location}
                </span>
                {site.client && <span>{site.client}</span>}
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${SITE_TYPE_COLORS[site.siteType] || ''}`}>{site.siteType}</span>
                {site.deactivatedAt && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-100 border border-red-400/30">
                    Deactivated {localDate(site.deactivatedAt)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!editing ? (
                <button onClick={() => setEditing(true)} className="h-9 px-4 rounded-xl bg-white/15 backdrop-blur-sm text-white text-sm font-medium hover:bg-white/25 transition-all border border-white/20 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Edit
                </button>
              ) : (
                <>
                  <button onClick={handleSave} disabled={saving} className="h-9 px-4 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center gap-2">
                    {saving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                    Save
                  </button>
                  <button onClick={() => { setEditing(false); setForm({ siteCode: site.siteCode, siteName: site.siteName, client: site.client || '', location: site.location, siteType: site.siteType, agreedManpower: site.agreedManpower, actualManpower: site.actualManpower, maleCount: site.maleCount ?? 0, femaleCount: site.femaleCount ?? 0, contactPerson: site.contactPerson || '', contactPhone: site.contactPhone || '', address: site.address || '', status: site.status }); setError(''); }} className="h-9 px-4 rounded-xl bg-white/15 text-white text-sm font-medium hover:bg-white/25 transition-all border border-white/20">Cancel</button>
                </>
              )}
              <button onClick={() => setDeleteOpen(true)} className="h-9 px-4 rounded-xl bg-red-500/20 text-white text-sm font-medium hover:bg-red-500/30 transition-all border border-red-400/30 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Deactivate
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-danger-subtle border border-danger-line text-danger-text px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        {/* Today's Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-surface rounded-2xl p-5 shadow-sm border border-line">
            <div className="text-2xl font-bold text-primary-600">{site.agreedManpower}</div>
            <div className="text-[11px] text-muted font-medium uppercase tracking-wider mt-0.5">Required Guards</div>
          </div>
          <div className="bg-surface rounded-2xl p-5 shadow-sm border border-line">
            <div className="text-2xl font-bold text-ink">{guardsList.length}</div>
            <div className="text-[11px] text-muted font-medium uppercase tracking-wider mt-0.5">{isInactive ? 'Former Guards' : 'Assigned Guards'}</div>
          </div>
          <div className="bg-surface rounded-2xl p-5 shadow-sm border border-line">
            <div className={`text-2xl font-bold ${pct >= 90 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-danger-text'}`}>{pct}%</div>
            <div className="text-[11px] text-muted font-medium uppercase tracking-wider mt-0.5">Coverage</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-surface rounded-2xl p-1.5 shadow-sm border border-line w-fit">
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 text-sm font-medium rounded-xl transition-all ${activeTab === tab.key ? 'bg-primary-600 text-white shadow-lg' : 'text-muted hover:text-ink hover:bg-subtle'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ OVERVIEW TAB ═══ */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
            <div className="space-y-6">
              {/* Site Info */}
              <div className="bg-surface rounded-2xl p-6 shadow-sm border border-line">
                <h2 className="text-lg font-bold text-ink mb-5">Site Information</h2>
                {editing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Site Code</label>
                        <input value={form.siteCode} onChange={e => setForm({ ...form, siteCode: e.target.value.toUpperCase() })} className="v-input" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Site Name</label>
                        <input value={form.siteName} onChange={e => setForm({ ...form, siteName: e.target.value })} className="v-input" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Client</label>
                        <input value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} className="v-input" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Location</label>
                        <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="v-input" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Type</label>
                        <select value={form.siteType} onChange={e => setForm({ ...form, siteType: e.target.value })} className="v-input">
                          <option value="COMMERCIAL">Commercial</option>
                          <option value="RESIDENTIAL">Residential</option>
                          <option value="INDUSTRIAL">Industrial</option>
                          <option value="GOVERNMENT">Government</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Status</label>
                        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="v-input">
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                          <option value="SUSPENDED">Suspended</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Agreed Manpower</label>
                        <input type="number" value={form.agreedManpower} onChange={e => setForm({ ...form, agreedManpower: parseInt(e.target.value) || 0 })} className="v-input" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Actual Manpower</label>
                        <input type="number" value={form.actualManpower} onChange={e => setForm({ ...form, actualManpower: parseInt(e.target.value) || 0 })} className="v-input" />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 items-end">
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Male Guards</label>
                        <input type="number" min={0} value={form.maleCount} onChange={e => setForm({ ...form, maleCount: parseInt(e.target.value) || 0 })} className="v-input" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Female Guards</label>
                        <input type="number" min={0} value={form.femaleCount} onChange={e => setForm({ ...form, femaleCount: parseInt(e.target.value) || 0 })} className="v-input" />
                      </div>
                      <div className="col-span-2 text-[11px] text-muted">
                        Gender split of actual manpower: {(form.maleCount || 0) + (form.femaleCount || 0)} / {form.actualManpower} filled
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Contact Person</label>
                        <input value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} className="v-input" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Contact Phone</label>
                        <input value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} className="v-input" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Address</label>
                        <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="v-input" />
                      </div>
                    </div>
                  </div>
                ) : (
<div className="space-y-4">
                      <div className="grid grid-cols-2 gap-6">
                        <InfoField label="Site Code" value={site.siteCode} mono />
                        <InfoField label="Site Name" value={site.siteName} />
                        <InfoField label="Client" value={site.client} />
                        <InfoField label="Location" value={site.location} />
                        <InfoField label="Type" value={site.siteType} badge={SITE_TYPE_COLORS[site.siteType]} />
                        <InfoField label="Status" value={site.status} badge={STATUS_COLORS[site.status]} />
                        <InfoField label="Agreed Manpower" value={String(site.agreedManpower)} />
                        <InfoField label="Actual Manpower" value={String(site.actualManpower)} />
                        {(site.maleCount != null || site.femaleCount != null) && (
                          <>
                            <InfoField label="Male Guards" value={site.maleCount != null ? String(site.maleCount) : undefined} />
                            <InfoField label="Female Guards" value={site.femaleCount != null ? String(site.femaleCount) : undefined} />
                          </>
                        )}
                        <InfoField label="Contact Person" value={site.contactPerson} />
                        <InfoField label="Contact Phone" value={site.contactPhone} />
                        <InfoField label="Address" value={site.address} />
                        <InfoField label="Created" value={localDate(site.createdAt)} />
                        {site.deactivatedAt && (
                          <InfoField label="Deactivated" value={localDate(site.deactivatedAt)} />
                        )}
                      </div>
                    </div>
                )}
              </div>

              {/* Coverage Bar */}
              <div className="bg-surface rounded-2xl p-6 shadow-sm border border-line">
                <h2 className="text-lg font-bold text-ink mb-4">Guard Coverage</h2>
                <div className="flex items-center gap-6 mb-3">
                  <div className="flex-1">
                    <div className="h-4 bg-subtle rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl font-bold ${pct >= 90 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-danger-text'}`}>{site.actualManpower}/{site.agreedManpower}</span>
                    <span className="text-xs text-muted ml-2">({pct}%)</span>
                  </div>
                </div>
                <p className="text-xs text-muted">{pct >= 90 ? 'Fully covered' : pct >= 60 ? 'Partially covered — shortfall of ' + (site.agreedManpower - site.actualManpower) + ' guard(s)' : 'Understaffed — shortfall of ' + (site.agreedManpower - site.actualManpower) + ' guard(s)'}</p>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Recent Site Notes */}
              <div className="bg-surface rounded-2xl p-6 shadow-sm border border-line">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-ink">Recent Notes</h2>
                  <button onClick={() => setAddNoteOpen(true)} className="text-xs text-primary-600 hover:text-primary-800 font-medium">+ Add</button>
                </div>
                {recentNotes.length === 0 ? (
                  <p className="text-sm text-muted py-4 text-center">No notes yet</p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {recentNotes.slice(0, 5).map(n => (
                      <div key={n._id} className="p-3 rounded-xl bg-subtle border border-line">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono text-muted">{n.date}</span>
                          {n.recordedById && <span className="text-[10px] text-muted">by {n.recordedById.firstName}</span>}
                        </div>
                        <p className="text-xs text-ink">{n.noteText}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Site Stats */}
              <div className="bg-surface rounded-2xl p-6 shadow-sm border border-line">
                <h2 className="text-lg font-bold text-ink mb-4">Statistics</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted">Active Assignments</span><span className="font-medium">{activeAssignments.length}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Primary Assignments</span><span className="font-medium">{guardsList.length}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Rotation Entries</span><span className="font-medium">{rotationAssignments.length}</span></div>
                  {site.deactivatedAt && (
                    <div className="flex justify-between pt-2 border-t border-line"><span className="text-muted">Deactivated</span><span className="font-medium text-danger-text">{localDate(site.deactivatedAt)}</span></div>
                  )}
                </div>
              </div>

              {/* Price history — old prices are kept, never deleted */}
              <div className="bg-surface rounded-2xl p-6 shadow-sm border border-line">
                <h2 className="text-lg font-bold text-ink mb-1">Price History</h2>
                <p className="text-[11px] text-muted mb-4">Previous billing prices, kept for audits and reports</p>
                {!priceHistory || priceHistory.length === 0 ? (
                  <p className="text-sm text-muted py-2 text-center">No price changes recorded</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {priceHistory.map((row) => (
                      <div key={row._id} className="p-2.5 rounded-lg bg-subtle border border-line text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted line-through">{money(row.previous?.paymentPrice)}</span>
                          <span className="text-muted">→</span>
                          <span className="font-semibold text-ink">{money(row.current?.paymentPrice)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[10px] text-subtext">
                          <span>
                            {Number(row.previous?.numberOfEmployees ?? 0)} → {Number(row.current?.numberOfEmployees ?? 0)} employees
                            {row.changedBy?.firstName ? ` · by ${row.changedBy.firstName}${row.changedBy.lastName ? ' ' + row.changedBy.lastName : ''}` : ''}
                          </span>
                          <span>{localDate(row.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ SHIFTS TAB ═══ */}
        {activeTab === 'shifts' && (
          <div className="space-y-6">
            {/* Rotations for this site */}
            {(data.rotations?.length ?? 0) > 0 && (
              <div className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden">
                <div className="px-6 py-4 border-b border-line">
                  <h2 className="text-lg font-bold text-ink">Rotations for This Site ({data.rotations!.length})</h2>
                  <p className="text-xs text-muted mt-0.5">Shift patterns generated for this site</p>
                </div>
                <div className="divide-y divide-line">
                  {data.rotations!.map(r => (
                    <div key={r._id} className="px-6 py-3 flex items-center justify-between hover:bg-subtle/60">
                      <div>
                        <span className="font-medium text-sm text-ink">{r.name || r.title || 'Rotation'}</span>
                        <span className="text-[10px] text-muted ml-2">
                          {r.startDate ? localDate(r.startDate) : ''}{r.endDate ? ` → ${localDate(r.endDate)}` : ''}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                        r.status === 'PUBLISHED' || r.status === 'ACTIVE' ? 'bg-success-subtle text-success-text' :
                        r.status === 'ARCHIVED' ? 'bg-subtle text-muted' : 'bg-amber-100 text-amber-700'
                      }`}>{r.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rotation Schedule Grid */}
            {rotationAssignments.length > 0 && (() => {
              const groups: Record<string, any[]> = {};
              rotationAssignments.forEach((a: any) => {
                const key = new Date(a.date).toISOString().split('T')[0];
                if (!groups[key]) groups[key] = [];
                groups[key].push(a);
              });
              const dates = Object.keys(groups).sort();
              const guardList: { id: string; name: string }[] = [];
              const seen = new Set<string>();
              rotationAssignments.forEach((a: any) => {
                const gid = a.guardId?._id || a.guardId;
                if (gid && !seen.has(String(gid))) {
                  seen.add(String(gid));
                  const firstName = a.guardId?.firstName || '';
                  const lastName = a.guardId?.lastName || '';
                  guardList.push({ id: String(gid), name: `${firstName} ${lastName}`.trim() || 'Unknown' });
                }
              });

              return (
                <div className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden">
                  <div className="px-6 py-4 border-b border-line">
                    <h2 className="text-lg font-bold text-ink">Generated Shift Schedule</h2>
                    <p className="text-xs text-muted mt-0.5">{dates.length} days · {guardList.length} guards · From rotation scheduling</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-subtle border-b border-line">
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold text-muted uppercase w-12 border border-line">#</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold text-muted uppercase w-20 border border-line">Date</th>
                          {guardList.map((g) => (
                            <th key={g.id} className="px-2 py-2.5 text-center text-[10px] font-bold text-ink uppercase min-w-[80px] border border-line">
                              <div className="underline decoration-red-400 decoration-1 underline-offset-2">{g.name}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {dates.map((dateKey, di) => {
                          const dayAssigns = groups[dateKey] || [];
                          const dayDate = new Date(dateKey + 'T12:00:00');
                          const isToday = dateKey === new Date().toISOString().split('T')[0];
                          const byGuard: Record<string, any> = {};
                          dayAssigns.forEach((a: any) => {
                            const gid = a.guardId?._id || a.guardId;
                            if (gid) byGuard[String(gid)] = a;
                          });

                          return (
                            <tr key={dateKey} className={`hover:bg-subtle/60 ${isToday ? 'bg-primary-50/60 font-semibold' : ''}`}>
                              <td className="px-3 py-2 font-bold text-muted border border-line">{di + 1}.</td>
                              <td className={`px-3 py-2 font-medium border border-line ${isToday ? 'text-primary-700' : 'text-ink'}`}>
                                {dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </td>
                              {guardList.map((g) => {
                                const a = byGuard[g.id];
                                if (!a) return <td key={g.id} className="px-3 py-2 text-center border border-line"><span className="text-subtext">-</span></td>;
                                const isDay = a.shiftType === 'DAY';
                                const time = a.shiftTime || (isDay ? '06:00-18:00' : '18:00-06:00');
                                const startTime = time.split('-')[0] || (isDay ? '06:00' : '18:00');
                                return (
                                  <td key={g.id} className="px-3 py-2 text-center border border-line">
                                    <span className={`inline-block px-1.5 py-0.5 rounded font-bold text-[11px] ${isDay ? 'bg-yellow-100 text-yellow-800' : 'bg-indigo-100 text-primary-800'}`}>
                                      {startTime}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Active Shift Assignments */}
            <div className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden">
              <div className="px-6 py-4 border-b border-line">
                <h2 className="text-lg font-bold text-ink">Active Shift Assignments ({activeAssignments.length})</h2>
                <p className="text-xs text-muted mt-0.5">Shift assignments generated for this site</p>
              </div>
              {activeAssignments.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted">No active shift assignments</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-canvas border-b border-line">
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-muted uppercase tracking-wider">Guard</th>
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-muted uppercase tracking-wider">Shift</th>
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-muted uppercase tracking-wider">Time</th>
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-muted uppercase tracking-wider">Start Date</th>
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-muted uppercase tracking-wider">Source</th>
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-muted uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {activeAssignments.map(a => (
                        <tr key={a._id} className="hover:bg-subtle/60 transition-colors">
                          <td className="py-3 px-6">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center text-[10px] font-bold">{getGuardName(a.guardId).split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                              <div>
                                <span className="font-medium text-ink text-sm">{getGuardName(a.guardId)}</span>
                                <span className="text-[10px] text-muted ml-1.5">{getGuardCode(a.guardId)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-6">
                            <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-primary-50 text-primary-700">{getTemplateName(a.shiftTemplateId)}</span>
                          </td>
                          <td className="py-3 px-6 text-muted text-xs">{getTemplateTime(a.shiftTemplateId)}</td>
                          <td className="py-3 px-6 text-muted text-xs">{new Date(a.startDate).toLocaleDateString()}</td>
                          <td className="py-3 px-6">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${a.source === 'ROTATION' ? 'bg-violet-100 text-violet-700' : 'bg-subtle text-muted'}`}>{a.source || 'MANUAL'}</span>
                          </td>
                          <td className="py-3 px-6">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${a.status === 'ACTIVE' ? 'bg-success-subtle text-success-text' : 'bg-subtle text-muted'}`}>{a.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ GUARDS TAB ═══ */}
        {activeTab === 'guards' && (
          <div className="space-y-6">
            <div className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden">
              <div className="px-6 py-4 border-b border-line">
                <h2 className="text-lg font-bold text-ink">
                  {isInactive ? `Guards Who Worked Here (${guardsList.length})` : `Assigned Guards (${guardsList.length})`}
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  {isInactive
                    ? 'Site is inactive — showing guards who were assigned before deactivation (history)'
                    : 'Guards with primary site assignment at this location'}
                </p>
              </div>
              {guardsList.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted">
                  {isInactive ? 'No guard history for this site' : 'No guards currently assigned to this site'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-canvas border-b border-line">
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-muted uppercase tracking-wider">Guard</th>
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-muted uppercase tracking-wider">Role</th>
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-muted uppercase tracking-wider">Status</th>
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-muted uppercase tracking-wider">Monthly Hours</th>
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-muted uppercase tracking-wider">Hourly Rate</th>
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-muted uppercase tracking-wider">Effective From</th>
                        {isInactive && (
                          <th className="text-left py-3 px-6 text-[11px] font-semibold text-muted uppercase tracking-wider">Relieved</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {guardsList.map(a => (
                        <tr key={a._id} className="hover:bg-subtle/60 transition-colors">
                          <td className="py-3 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center text-xs font-bold">{getGuardName(a.guardId).split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                              <div>
                                <span className="font-medium text-ink">{getGuardName(a.guardId)}</span>
                                <div className="text-[10px] text-muted">{getGuardCode(a.guardId)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-6">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${a.role === 'SUPERVISOR' ? 'bg-amber-100 text-amber-700' : 'bg-subtle text-muted'}`}>{a.role}</span>
                          </td>
                          <td className="py-3 px-6">
                            <span className="text-xs text-muted">{(a.guardId as any)?.status || '—'}</span>
                          </td>
                          <td className="py-3 px-6 text-xs text-muted">{a.standardMonthlyHours}h</td>
                          <td className="py-3 px-6 text-xs text-muted">{a.hourlyRate > 0 ? `${a.hourlyRate.toFixed(2)}/hr` : '—'}</td>
                          <td className="py-3 px-6 text-xs text-muted">{localDate(a.effectiveFrom)}</td>
                          {isInactive && (
                            <td className="py-3 px-6 text-xs text-danger-text">{a.effectiveTo ? localDate(a.effectiveTo) : localDate(site.deactivatedAt)}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Rotation Assignments */}
            {rotationAssignments.length > 0 && (
              <div className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden">
                <div className="px-6 py-4 border-b border-line">
                  <h2 className="text-lg font-bold text-ink">Recent Rotation Assignments ({rotationAssignments.length})</h2>
                  <p className="text-xs text-muted mt-0.5">Auto-generated from rotation patterns</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-canvas border-b border-line">
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-muted uppercase tracking-wider">Guard</th>
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-muted uppercase tracking-wider">Shift</th>
                        <th className="text-left py-3 px-6 text-[11px] font-semibold text-muted uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {rotationAssignments.map(a => (
                        <tr key={a._id} className="hover:bg-subtle/60 transition-colors">
                          <td className="py-3 px-6">
                            <span className="font-medium text-ink">{getGuardName(a.guardId)}</span>
                            <span className="text-[10px] text-muted ml-1.5">{getGuardCode(a.guardId)}</span>
                          </td>
                          <td className="py-3 px-6 text-xs text-muted">{getTemplateName(a.shiftTemplateId)} ({getTemplateTime(a.shiftTemplateId)})</td>
                          <td className="py-3 px-6 text-xs text-muted">{new Date(a.date).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ NOTES TAB ═══ */}
        {activeTab === 'notes' && (
          <div className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden">
            <div className="px-6 py-4 border-b border-line flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Site Notes ({recentNotes.length})</h2>
              <button onClick={() => setAddNoteOpen(true)} className="h-9 px-4 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                Add Note
              </button>
            </div>
            {recentNotes.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted">No notes recorded for this site</div>
            ) : (
              <div className="divide-y divide-line">
                {recentNotes.map(n => (
                  <div key={n._id} className="px-6 py-4 hover:bg-subtle/60 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-mono text-muted">{n.date}</span>
                      {n.recordedById && <span className="text-xs text-muted">by {n.recordedById.firstName} {n.recordedById.lastName}</span>}
                    </div>
                    <p className="text-sm text-ink">{n.noteText}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Delete Modal */}
        <Modal open={deleteOpen} onClose={() => { setDeleteOpen(false); setDeleteConfirm(''); }} title="Deactivate Site">
          <div className="space-y-4">
            <div className="bg-warning-subtle border border-warning-line rounded-xl p-3 text-sm text-warning-text">
              This will deactivate <strong>{site.siteName}</strong> ({site.siteCode}). All guards assigned to this site will be <strong>relieved</strong> (their assignment history is kept). The deactivation date will be recorded. You can reactivate later by editing the status.
            </div>
            <p className="text-sm text-muted">Type <strong>{site.siteCode}</strong> to confirm:</p>
            <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder={site.siteCode}
              className="v-input" />
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => { setDeleteOpen(false); setDeleteConfirm(''); }} className="h-10 px-5 rounded-xl border border-line text-sm font-medium text-ink hover:bg-subtle transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={deleteConfirm !== site.siteCode} className="h-10 px-5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-all disabled:opacity-50 shadow-lg">Deactivate</button>
            </div>
          </div>
        </Modal>

        {/* Add Note Modal */}
        <Modal open={addNoteOpen} onClose={() => setAddNoteOpen(false)} title="Add Site Note">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Date</label>
              <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)}
                className="v-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Note</label>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={4} placeholder="Enter note..."
                className="v-input resize-none transition-all" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setAddNoteOpen(false)} className="h-10 px-5 rounded-xl border border-line text-sm font-medium text-ink hover:bg-subtle transition-colors">Cancel</button>
              <button onClick={handleAddNote} disabled={!noteText.trim()} className="h-10 px-5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-all disabled:opacity-50 shadow-lg">Save Note</button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

function InfoField({ label, value, mono, badge }: { label: string; value?: string; mono?: boolean; badge?: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted font-medium uppercase tracking-wider mb-1">{label}</p>
      {value ? (
        badge ? (
          <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-xs font-semibold ${badge}`}>{value}</span>
        ) : (
          <p className={`text-sm font-medium text-ink ${mono ? 'font-mono' : ''}`}>{value}</p>
        )
      ) : (
        <p className="text-sm text-muted italic">—</p>
      )}
    </div>
  );
}
