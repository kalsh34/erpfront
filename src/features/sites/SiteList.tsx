import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { downloadCsv } from '../payroll-shared/export';
import { Modal } from '../../components/ui';
import { useT, useLang, formatDate } from '../../i18n';
import type { DictKey } from '../../i18n';
import { useAuthStore } from '../../stores/authStore';
import { UserRole, PERMISSIONS, ROLE_PERMISSIONS } from '../../types';
import type { Permission } from '../../types';
import {
  Search, RefreshCw, Download, Plus, SlidersHorizontal, MoreHorizontal,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ArrowUp, ArrowDown, ArrowUpDown, MapPin, QrCode,
} from 'lucide-react';

interface CompanyRef {
  _id: string;
  name: string;
  code?: string;
}

interface Site {
  _id: string;
  siteCode: string;
  siteName: string;
  branch?: string;
  companyId?: CompanyRef | string | null;
  city?: string;
  subCity?: string;
  wereda?: string;
  taxCenter?: string;
  pensionSite?: string;
  agreementStartDate?: string | null;
  agreementEndDate?: string | null;
  numberOfEmployees?: number;
  paymentPrice?: number;
  client?: string;
  location: string;
  siteType: string;
  status: string;
  agreedManpower: number;
  actualManpower: number;
  maleCount?: number;
  femaleCount?: number;
  contactPerson?: string;
  contactPhone?: string;
}

interface ColumnDef {
  key: string;
  label: DictKey;
  /** Server-side sort field; undefined = not sortable. */
  sortField?: string;
  optional: boolean;
  align?: 'right';
}

/** Columns from the Site table spec — name + actions are always visible. */
const COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'siteName', sortField: 'siteName', optional: false },
  { key: 'branch', label: 'branch', sortField: 'branch', optional: true },
  { key: 'company', label: 'company', optional: true },
  { key: 'city', label: 'city', sortField: 'city', optional: true },
  { key: 'subCity', label: 'subCity', sortField: 'subCity', optional: true },
  { key: 'wereda', label: 'wereda', sortField: 'wereda', optional: true },
  { key: 'taxCenter', label: 'taxCenter', optional: true },
  { key: 'pensionSite', label: 'pensionSite', optional: true },
  { key: 'employees', label: 'employees', sortField: 'numberOfEmployees', optional: true, align: 'right' },
  { key: 'paymentPrice', label: 'paymentPrice', sortField: 'paymentPrice', optional: true, align: 'right' },
  { key: 'agreementStart', label: 'agreementStart', sortField: 'agreementStartDate', optional: true },
  { key: 'agreementEnd', label: 'agreementEnd', sortField: 'agreementEndDate', optional: true },
];

const OPTIONAL_COLUMNS = COLUMNS.filter((c) => c.optional);

/** Secondary columns start hidden — toggle them from the Columns menu. */
const DEFAULT_HIDDEN = ['branch', 'wereda', 'taxCenter', 'pensionSite', 'agreementStart', 'agreementEnd'];

const emptyForm = {
  siteName: '', branch: '', companyId: '', city: '', subCity: '', wereda: '',
  taxCenter: '', pensionSite: '', agreementStartDate: '', agreementEndDate: '',
  numberOfEmployees: 0, paymentPrice: 0,
  // Operational details (legacy required fields)
  siteCode: '', siteType: 'COMMERCIAL', location: '',
  agreedManpower: 0, actualManpower: 0, maleCount: 0, femaleCount: 0,
  contactPerson: '', contactPhone: '',
  status: 'ACTIVE',
};

const SITE_TYPES: { value: string; labelKey: DictKey }[] = [
  { value: 'COMMERCIAL', labelKey: 'siteTypeCommercial' },
  { value: 'RESIDENTIAL', labelKey: 'siteTypeResidential' },
  { value: 'INDUSTRIAL', labelKey: 'siteTypeIndustrial' },
  { value: 'GOVERNMENT', labelKey: 'siteTypeGovernment' },
];

const statusChip: Record<string, string> = {
  ACTIVE: 'bg-success-subtle text-success-text border-success-line',
  INACTIVE: 'bg-subtle text-muted border-line',
  SUSPENDED: 'bg-danger-subtle text-danger-text border-danger-line',
};

const spinner = (
  <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
);

function can(role: UserRole | undefined, perm: Permission): boolean {
  if (!role) return false;
  return (ROLE_PERMISSIONS[role] || []).includes(perm);
}

const toolbarBtn =
  'h-10 px-4 flex items-center gap-2 rounded-lg border border-line bg-surface text-sm font-medium text-ink hover:bg-subtle transition-colors';

function companyNameOf(site: Site): string | null {
  const c = site.companyId;
  if (!c) return null;
  if (typeof c === 'string') return null;
  return c.name || null;
}

export function SiteList() {
  const t = useT();
  const lang = useLang();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canCreate = can(user?.role, PERMISSIONS.SITE_CREATE);
  const canUpdate = can(user?.role, PERMISSIONS.SITE_UPDATE);

  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('siteName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [hiddenCols, setHiddenCols] = useState<string[]>(DEFAULT_HIDDEN);
  const [colsOpen, setColsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [companies, setCompanies] = useState<CompanyRef[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Site | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Site | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const fetchSites = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit, sort: sortField, dir: sortDir };
      if (search) params.search = search;
      const res = await api.get('/sites', { params });
      setSites(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching sites:', error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, sortField, sortDir]);

  useEffect(() => { fetchSites(); }, [fetchSites]);

  useEffect(() => {
    api.get('/companies', { params: { page: 1, limit: 200, sort: 'name', dir: 'asc' } })
      .then((r) => setCompanies(r.data.data || []))
      .catch(() => setCompanies([]));
  }, []);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const update = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (s: Site) => {
    setEditing(s);
    setForm({
      siteName: s.siteName,
      branch: s.branch || '',
      companyId: typeof s.companyId === 'object' && s.companyId ? s.companyId._id : (s.companyId as string) || '',
      city: s.city || '',
      subCity: s.subCity || '',
      wereda: s.wereda || '',
      taxCenter: s.taxCenter || '',
      pensionSite: s.pensionSite || '',
      agreementStartDate: s.agreementStartDate ? String(s.agreementStartDate).slice(0, 10) : '',
      agreementEndDate: s.agreementEndDate ? String(s.agreementEndDate).slice(0, 10) : '',
      numberOfEmployees: s.numberOfEmployees ?? 0,
      paymentPrice: s.paymentPrice ?? 0,
      siteCode: s.siteCode,
      siteType: s.siteType || 'COMMERCIAL',
      location: s.location || '',
      agreedManpower: s.agreedManpower ?? 0,
      actualManpower: s.actualManpower ?? 0,
      maleCount: s.maleCount ?? 0,
      femaleCount: s.femaleCount ?? 0,
      contactPerson: s.contactPerson || '',
      contactPhone: s.contactPhone || '',
      status: s.status || 'ACTIVE',
    });
    setFormError('');
    setShowForm(true);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.siteName.trim()) { setFormError(t('siteNameRequired')); return; }
    if (!form.siteCode.trim()) { setFormError(t('siteCodeRequired')); return; }
    if (!form.location.trim()) { setFormError(t('locationRequired')); return; }
    if (form.agreementStartDate && form.agreementEndDate && form.agreementEndDate < form.agreementStartDate) {
      setFormError(t('agreementOrderError'));
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        siteName: form.siteName.trim(),
        siteCode: form.siteCode.trim().toUpperCase(),
        branch: form.branch.trim() || undefined,
        companyId: form.companyId || null,
        city: form.city.trim() || undefined,
        subCity: form.subCity.trim() || undefined,
        wereda: form.wereda.trim() || undefined,
        taxCenter: form.taxCenter.trim() || undefined,
        pensionSite: form.pensionSite.trim() || undefined,
        agreementStartDate: form.agreementStartDate || null,
        agreementEndDate: form.agreementEndDate || null,
        numberOfEmployees: Number(form.numberOfEmployees) || 0,
        paymentPrice: Number(form.paymentPrice) || 0,
        siteType: form.siteType,
        location: form.location.trim(),
        agreedManpower: Number(form.agreedManpower) || 0,
        actualManpower: Number(form.actualManpower) || 0,
        // Optional gender split of the actual manpower
        maleCount: form.maleCount ? Number(form.maleCount) : undefined,
        femaleCount: form.femaleCount ? Number(form.femaleCount) : undefined,
        contactPerson: form.contactPerson.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
      };
      if (editing) {
        payload.status = form.status;
        await api.put(`/sites/${editing._id}`, payload);
      } else {
        await api.post('/sites', payload);
      }
      setShowForm(false);
      setForm(emptyForm);
      setPage(1);
      fetchSites();
    } catch (err: any) {
      setFormError(err.response?.data?.message || t('failedSaveSite'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirmTarget) return;
    setActionBusy(true);
    try {
      await api.delete(`/sites/${confirmTarget._id}`);
      setConfirmTarget(null);
      fetchSites();
    } catch (err: any) {
      alert(err.response?.data?.message || t('failedSaveSite'));
    } finally {
      setActionBusy(false);
    }
  };

  const handleReactivate = async (s: Site) => {
    setActionBusy(true);
    try {
      await api.put(`/sites/${s._id}`, { status: 'ACTIVE' });
      fetchSites();
    } catch (err: any) {
      alert(err.response?.data?.message || t('failedSaveSite'));
    } finally {
      setActionBusy(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: any = { page: 1, limit: 1000, sort: sortField, dir: sortDir };
      if (search) params.search = search;
      const res = await api.get('/sites', { params });
      const rows: Site[] = res.data.data || [];
      const headers = [
        '#', 'Site Code', 'Site Name', 'Branch', 'Company', 'City', 'Sub City', 'Wereda',
        'Tax Center', 'Pension Site', 'Employees', 'Payment Price',
        'Agreement Start', 'Agreement End', 'Status',
      ];
      const csvRows = rows.map((s, i) => [
        i + 1, s.siteCode, s.siteName, s.branch || '', companyNameOf(s) || '',
        s.city || '', s.subCity || '', s.wereda || '', s.taxCenter || '', s.pensionSite || '',
        s.numberOfEmployees ?? 0, s.paymentPrice ?? 0,
        s.agreementStartDate ? String(s.agreementStartDate).slice(0, 10) : '',
        s.agreementEndDate ? String(s.agreementEndDate).slice(0, 10) : '',
        s.status,
      ]);
      // Shared helper: UTF-8 BOM + detached <a download> so the browser
      // actually writes the file (a bare data: link is silently blocked).
      downloadCsv(`sites-${new Date().toISOString().split('T')[0]}.csv`, [headers, ...csvRows]);
    } finally {
      setExporting(false);
    }
  };

  const toggleColumn = (key: string) => {
    setHiddenCols((cols) => (cols.includes(key) ? cols.filter((k) => k !== key) : [...cols, key]));
  };

  const visibleColumns = COLUMNS.filter((c) => !hiddenCols.includes(c.key));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const renderCell = (s: Site, key: string) => {
    switch (key) {
      case 'name':
        return (
          <div>
            <button
              onClick={() => navigate(`/sites/${s._id}`)}
              className="font-semibold text-primary-600 hover:text-primary-800 hover:underline"
            >
              {s.siteName}
            </button>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-mono text-muted">{s.siteCode}</span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium ${statusChip[s.status] || 'bg-subtle text-muted border-line'}`}>
                {s.status === 'ACTIVE' ? t('active') : s.status === 'SUSPENDED' ? t('suspended') : t('inactive')}
              </span>
            </div>
          </div>
        );
      case 'company': {
        const name = companyNameOf(s);
        return name ? <span className="text-ink">{name}</span> : <span className="text-subtext">—</span>;
      }
      case 'employees':
        return <span className="text-ink font-medium">{s.numberOfEmployees ?? 0}</span>;
      case 'paymentPrice':
        return <span className="text-ink">{Number(s.paymentPrice ?? 0).toLocaleString()}</span>;
      case 'agreementStart':
        return <span className="text-muted">{formatDate(lang, s.agreementStartDate || undefined)}</span>;
      case 'agreementEnd':
        return <span className="text-muted">{formatDate(lang, s.agreementEndDate || undefined)}</span>;
      default: {
        const v = (s as any)[key];
        return v
          ? <span className="text-ink">{v}</span>
          : <span className="text-subtext">—</span>;
      }
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* Toolbar: search + refresh | Export, Add Site, column visibility */}
      <div className="flex flex-wrap items-center gap-3" data-tour="sites-toolbar">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder={t('searchSite')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="v-input !pl-10"
          />
        </div>
        <button
          onClick={fetchSites}
          className="h-10 w-10 flex items-center justify-center rounded-lg border border-line bg-surface text-muted hover:text-ink hover:bg-subtle transition-colors"
          title={t('refresh')}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>

        <div className="flex-1" />

        <Link to="/sites/qr-codes" className={toolbarBtn}>
          <QrCode className="w-4 h-4" />
          {t('siteQrCodes')}
        </Link>
        <button onClick={handleExport} disabled={exporting} className={toolbarBtn}>
          <Download className="w-4 h-4" />
          {exporting ? t('loading') : t('exportCsv')}
        </button>
        {canCreate && (
          <button
            onClick={openAdd}
            className="h-10 px-5 flex items-center gap-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('addSite')}
          </button>
        )}
        <div className="relative">
          <button
            onClick={() => setColsOpen((o) => !o)}
            className="h-10 w-10 flex items-center justify-center rounded-lg border border-line bg-surface text-muted hover:text-ink hover:bg-subtle transition-colors"
            title={t('columns')}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          {colsOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setColsOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-line rounded-xl shadow-overlay z-40 p-3">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  {t('columns')}
                </p>
                <div className="space-y-1.5">
                  {OPTIONAL_COLUMNS.map((col) => (
                    <label key={col.key} className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!hiddenCols.includes(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        className="rounded border-line text-primary-600 focus:ring-primary-500/20"
                      />
                      {t(col.label)}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Entry info + pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>{t('showingEntries', { from, to, total })}</span>
          <span className="ml-2">{t('showPerPage')}</span>
          <select
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            className="h-8 px-2 pr-6 rounded-lg border border-line bg-surface text-sm text-ink appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <span>{t('perPage')}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(1)}
            disabled={page <= 1}
            title={t('firstPage')}
            className="p-2 rounded-lg border border-line bg-surface text-muted hover:text-ink hover:bg-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            title={t('previous')}
            className="p-2 rounded-lg border border-line bg-surface text-muted hover:text-ink hover:bg-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 text-sm text-muted">
            {t('page')} {page} {t('of')} {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            title={t('next')}
            className="p-2 rounded-lg border border-line bg-surface text-muted hover:text-ink hover:bg-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages}
            title={t('lastPage')}
            className="p-2 rounded-lg border border-line bg-surface text-muted hover:text-ink hover:bg-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-line overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-canvas /60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider w-10">#</th>
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortField && toggleSort(col.sortField)}
                    className={`px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider whitespace-nowrap ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    } ${col.sortField ? 'cursor-pointer hover:text-ink select-none' : ''}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {t(col.label)}
                      {col.sortField &&
                        (sortField === col.sortField ? (
                          sortDir === 'asc'
                            ? <ArrowUp className="w-3.5 h-3.5 text-primary-600" />
                            : <ArrowDown className="w-3.5 h-3.5 text-primary-600" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-subtext" />
                        ))}
                    </span>
                  </th>
                ))}
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={visibleColumns.length + 2} className="py-16 text-center">
                    <div className="flex justify-center">{spinner}</div>
                  </td>
                </tr>
              ) : sites.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 2} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted">
                      <MapPin className="w-10 h-10 text-subtext" />
                      <p className="text-sm font-medium">{t('noSites')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sites.map((s, idx) => (
                  <tr key={s._id} className="hover:bg-subtle/60 transition-colors">
                    <td className="px-4 py-3 text-muted">{(page - 1) * limit + idx + 1}</td>
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                      >
                        {renderCell(s, col.key)}
                      </td>
                    ))}
                    <td className="px-4 py-3 relative text-right">
                      <button
                        onClick={() => setMenuFor(menuFor === s._id ? null : s._id)}
                        className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-subtle transition-colors"
                        title={t('actions')}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {menuFor === s._id && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setMenuFor(null)} />
                          <div className="absolute right-0 top-full mt-1 w-40 bg-surface border border-line rounded-xl shadow-overlay z-40 py-1 text-left">
                            <button
                              onClick={() => { setMenuFor(null); navigate(`/sites/${s._id}`); }}
                              className="w-full px-3 py-2 text-sm text-ink hover:bg-subtle transition-colors"
                            >
                              {t('view')}
                            </button>
                            {canUpdate && (
                              <button
                                onClick={() => { setMenuFor(null); openEdit(s); }}
                                className="w-full px-3 py-2 text-sm text-ink hover:bg-subtle transition-colors"
                              >
                                {t('edit')}
                              </button>
                            )}
                            {canUpdate && s.status === 'ACTIVE' && (
                              <button
                                onClick={() => { setMenuFor(null); setConfirmTarget(s); }}
                                className="w-full px-3 py-2 text-sm text-danger-text hover:bg-danger-subtle transition-colors"
                              >
                                {t('deactivate')}
                              </button>
                            )}
                            {canUpdate && s.status !== 'ACTIVE' && (
                              <button
                                onClick={() => { setMenuFor(null); handleReactivate(s); }}
                                disabled={actionBusy}
                                className="w-full px-3 py-2 text-sm text-success-text hover:bg-success-subtle transition-colors disabled:opacity-50"
                              >
                                {t('reactivate')}
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit modal */}
      <Modal
        open={showForm}
        onClose={() => { if (!saving) setShowForm(false); }}
        title={editing ? t('editSite') : t('addSite')}
        subtitle={editing ? editing.siteCode : t('siteInfo')}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl border border-line bg-surface text-sm font-medium text-ink hover:bg-canvas transition-colors disabled:opacity-50"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              form="site-form"
              disabled={saving || !form.siteName.trim()}
              className="px-6 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
            >
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? t('saving') : editing ? t('update') : t('create')}
            </button>
          </div>
        }
      >
        <form id="site-form" onSubmit={submitForm} className="space-y-5">
          {formError && (
            <div className="bg-danger-subtle border border-danger-line text-danger-text px-4 py-3 rounded-xl text-sm">
              {formError}
            </div>
          )}

          <p className="text-xs font-semibold text-muted uppercase tracking-wider border-b border-line pb-2">
            {t('siteInfo')}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="v-label v-label--required">{t('siteName')}</label>
              <input
                type="text"
                value={form.siteName}
                onChange={(e) => update('siteName', e.target.value)}
                required
                placeholder="e.g. 4kilo branch"
                className="v-input"
              />
            </div>
            <div>
              <label className="v-label">{t('branch')}</label>
              <input
                type="text"
                value={form.branch}
                onChange={(e) => update('branch', e.target.value)}
                placeholder="e.g. Main"
                className="v-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="v-label">{t('company')}</label>
              <select
                value={form.companyId}
                onChange={(e) => update('companyId', e.target.value)}
                className="v-input cursor-pointer"
              >
                <option value="">{t('noCompanyOption')}</option>
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="v-label">{t('city')}</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                placeholder="e.g. Addis Ababa"
                className="v-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="v-label">{t('subCity')}</label>
              <input
                type="text"
                value={form.subCity}
                onChange={(e) => update('subCity', e.target.value)}
                className="v-input"
              />
            </div>
            <div>
              <label className="v-label">{t('wereda')}</label>
              <input
                type="text"
                value={form.wereda}
                onChange={(e) => update('wereda', e.target.value)}
                className="v-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="v-label">{t('taxCenter')}</label>
              <input
                type="text"
                value={form.taxCenter}
                onChange={(e) => update('taxCenter', e.target.value)}
                placeholder="e.g. Lideta Addis Ababa Revenue"
                className="v-input"
              />
            </div>
            <div>
              <label className="v-label">{t('pensionSite')}</label>
              <input
                type="text"
                value={form.pensionSite}
                onChange={(e) => update('pensionSite', e.target.value)}
                placeholder="e.g. Lideta Addis Ababa Revenue"
                className="v-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="v-label">{t('agreementStart')}</label>
              <input
                type="date"
                value={form.agreementStartDate}
                onChange={(e) => update('agreementStartDate', e.target.value)}
                className="v-input"
              />
            </div>
            <div>
              <label className="v-label">{t('agreementEnd')}</label>
              <input
                type="date"
                value={form.agreementEndDate}
                onChange={(e) => update('agreementEndDate', e.target.value)}
                className="v-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="v-label">{t('numberOfEmployees')}</label>
              <input
                type="number"
                min={0}
                value={form.numberOfEmployees}
                onChange={(e) => update('numberOfEmployees', e.target.value)}
                className="v-input"
              />
            </div>
            <div>
              <label className="v-label">{t('paymentPrice')}</label>
              <input
                type="number"
                min={0}
                value={form.paymentPrice}
                onChange={(e) => update('paymentPrice', e.target.value)}
                className="v-input"
              />
            </div>
          </div>

          <p className="text-xs font-semibold text-muted uppercase tracking-wider border-b border-line pb-2 pt-1">
            {t('operationalDetails')}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="v-label v-label--required">{t('siteCode')}</label>
              <input
                type="text"
                value={form.siteCode}
                onChange={(e) => update('siteCode', e.target.value.toUpperCase())}
                required
                placeholder="e.g. VSP-001"
                className="v-input font-mono"
              />
            </div>
            <div>
              <label className="v-label">{t('siteTypeLabel')}</label>
              <select
                value={form.siteType}
                onChange={(e) => update('siteType', e.target.value)}
                className="v-input cursor-pointer"
              >
                {SITE_TYPES.map((st) => (
                  <option key={st.value} value={st.value}>{t(st.labelKey)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Client info is managed on the company/agreement level — not asked here. */}
          <div>
            <label className="v-label v-label--required">{t('locationLabel')}</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              required
              placeholder="e.g. Bole, Addis Ababa"
              className="v-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="v-label">{t('agreedManpower')}</label>
              <input
                type="number"
                min={0}
                value={form.agreedManpower}
                onChange={(e) => update('agreedManpower', e.target.value)}
                className="v-input"
              />
            </div>
            <div>
              <label className="v-label">{t('actualManpower')}</label>
              <input
                type="number"
                min={0}
                value={form.actualManpower}
                onChange={(e) => update('actualManpower', e.target.value)}
                className="v-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="v-label">{t('maleGuards')}</label>
              <input
                type="number"
                min={0}
                value={form.maleCount}
                onChange={(e) => update('maleCount', e.target.value)}
                className="v-input"
              />
            </div>
            <div>
              <label className="v-label">{t('femaleGuards')}</label>
              <input
                type="number"
                min={0}
                value={form.femaleCount}
                onChange={(e) => update('femaleCount', e.target.value)}
                className="v-input"
              />
            </div>
          </div>
          <p className="text-[11px] text-muted -mt-3">
            {t('genderSplitHint', { filled: (Number(form.maleCount) || 0) + (Number(form.femaleCount) || 0), total: Number(form.actualManpower) || 0 })}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="v-label">{t('contactPersonLabel')}</label>
              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => update('contactPerson', e.target.value)}
                placeholder="e.g. John Doe"
                className="v-input"
              />
            </div>
            <div>
              <label className="v-label">{t('contactPhone')}</label>
              <input
                type="text"
                value={form.contactPhone}
                onChange={(e) => update('contactPhone', e.target.value)}
                placeholder="e.g. +251 911 234 567"
                className="v-input"
              />
            </div>
          </div>

          {editing && (
            <div>
              <label className="v-label">{t('status')}</label>
              <select
                value={form.status}
                onChange={(e) => update('status', e.target.value)}
                className="v-input cursor-pointer"
              >
                <option value="ACTIVE">{t('active')}</option>
                <option value="INACTIVE">{t('inactive')}</option>
                <option value="SUSPENDED">{t('suspended')}</option>
              </select>
            </div>
          )}
        </form>
      </Modal>

      {/* Deactivate confirm modal */}
      <Modal
        open={!!confirmTarget}
        onClose={() => { if (!actionBusy) setConfirmTarget(null); }}
        title={t('deactivate')}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => setConfirmTarget(null)}
              disabled={actionBusy}
              className="px-5 py-2.5 rounded-xl border border-line bg-surface text-sm font-medium text-ink hover:bg-canvas transition-colors disabled:opacity-50"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={actionBusy}
              className="px-6 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {actionBusy && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {t('deactivate')}
            </button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          {t('deactivateSiteConfirm', { name: confirmTarget?.siteName || '' })}
        </p>
      </Modal>
    </div>
  );
}
