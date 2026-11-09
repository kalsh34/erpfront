import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { downloadCsv } from '../payroll-shared/export';
import { Modal } from '../../components/ui';
import { useT, useLang, formatDate } from '../../i18n';
import type { DictKey } from '../../i18n';
import { useAuthStore } from '../../stores/authStore';
import { fullName } from '../../lib/personName';
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
  const canAssign = can(user?.role, PERMISSIONS.GUARD_ASSIGN_SITE);

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
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  // Opening the menu can itself scroll the table (revealing a partially
  // visible row); ignore scroll events for a moment so the menu is not closed
  // by the scroll that its own click caused.
  const menuOpenedAt = useRef(0);
  const [confirmTarget, setConfirmTarget] = useState<Site | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [notice, setNotice] = useState('');

  // Assign-guard action (per site row): pick an active guard and post to
  // /guards/assign-site with this site as the target.
  const [assignTarget, setAssignTarget] = useState<Site | null>(null);
  const [assignGuards, setAssignGuards] = useState<any[]>([]);
  const [assignGuardId, setAssignGuardId] = useState('');
  const [assignRole, setAssignRole] = useState<'GUARD' | 'SUPERVISOR'>('GUARD');
  const [assignFrom, setAssignFrom] = useState(new Date().toLocaleDateString('en-CA'));
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState('');

  // Permanent delete — force delete: the site and everything recorded against
  // it (assignments, shifts, attendance, hours, rates, rotations, notes, price
  // history) go at once, so it works even when guards were assigned.
  const [deleteTarget, setDeleteTarget] = useState<Site | null>(null);
  const [deleteError, setDeleteError] = useState('');

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

  const openAssign = async (s: Site) => {
    setMenuFor(null);
    setAssignTarget(s);
    setAssignGuardId('');
    setAssignRole('GUARD');
    setAssignFrom(new Date().toLocaleDateString('en-CA'));
    setAssignError('');
    setAssignLoading(true);
    try {
      const res = await api.get('/guards');
      // /guards returns { employee, profile, currentAssignments } rows — flatten
      // the employee so the picker has _id, names and the current assignments.
      const rows = (res.data.data || []).map((r: any) => (r && r.employee
        ? { ...r.employee, currentAssignments: r.currentAssignments || [] }
        : r));
      setAssignGuards(rows);
    } catch (err: any) {
      setAssignError(err.response?.data?.message || 'Unable to load guards.');
      setAssignGuards([]);
    } finally {
      setAssignLoading(false);
    }
  };

  const submitAssign = async () => {
    if (!assignTarget || !assignGuardId) return;
    setAssignSaving(true);
    setAssignError('');
    const guard = assignGuards.find((g) => g._id === assignGuardId);
    try {
      await api.post('/guards/assign-site', {
        guardId: assignGuardId,
        siteId: assignTarget._id,
        effectiveFrom: assignFrom,
        role: assignRole,
      });
      setNotice(`${guard ? fullName(guard) : 'Guard'} assigned to ${assignTarget.siteName}.`);
      setAssignTarget(null);
      fetchSites();
    } catch (err: any) {
      setAssignError(err.response?.data?.message || 'Unable to assign the guard to this site.');
    } finally {
      setAssignSaving(false);
    }
  };

  const handleDeletePermanent = async () => {
    if (!deleteTarget) return;
    setActionBusy(true);
    setDeleteError('');
    try {
      const res = await api.delete(`/sites/${deleteTarget._id}/permanent`);
      const removed = (res.data?.data?.removed || []) as { label: string; count: number }[];
      const detail = removed.length
        ? ` Removed ${removed.map((r) => `${r.count} ${r.label}`).join(', ')}.`
        : '';
      setNotice(`Site "${deleteTarget.siteName}" permanently deleted.${detail}`);
      setDeleteTarget(null);
      setPage(1);
      fetchSites();
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Unable to delete the site.');
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

  const closeMenu = () => { setMenuFor(null); setMenuPos(null); };

  /**
   * Row action menu. It used to be absolutely positioned inside the table's
   * `overflow-x-auto` wrapper, so for the last rows it was clipped by that
   * scroll container (and pushed off-screen on short viewports) and the action
   * buttons never appeared. Position it against the viewport instead, in a
   * portal, flipping it upwards when there is not enough room below.
   */
  const openRowMenu = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    if (menuFor === id) { closeMenu(); return; }
    const r = e.currentTarget.getBoundingClientRect();
    const MENU_W = 200;
    const MENU_H = 220;
    const openUp = r.bottom + MENU_H > window.innerHeight - 8;
    const left = Math.min(Math.max(8, r.right - MENU_W), window.innerWidth - MENU_W - 8);
    menuOpenedAt.current = Date.now();
    setMenuFor(id);
    setMenuPos({ top: openUp ? Math.max(8, r.top - 6) : r.bottom + 6, left, openUp });
  };

  // A menu pinned to viewport coordinates must not survive scrolling/resizing.
  useEffect(() => {
    if (!menuFor) return;
    const onViewportChange = () => {
      if (Date.now() - menuOpenedAt.current < 300) return;
      setMenuFor(null);
      setMenuPos(null);
    };
    window.addEventListener('scroll', onViewportChange, true);
    window.addEventListener('resize', onViewportChange);
    return () => {
      window.removeEventListener('scroll', onViewportChange, true);
      window.removeEventListener('resize', onViewportChange);
    };
  }, [menuFor]);

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
      {notice && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-success-line bg-success-subtle px-4 py-3 text-sm text-success-text">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Dismiss message" className="text-lg leading-none">×</button>
        </div>
      )}
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
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => openRowMenu(e, s._id)}
                        aria-label={t('actions')}
                        aria-haspopup="menu"
                        aria-expanded={menuFor === s._id}
                        className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-subtle transition-colors"
                        title={t('actions')}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {menuFor === s._id && menuPos && createPortal(
                        <>
                          <div className="fixed inset-0 z-40" onClick={closeMenu} />
                          <div
                            role="menu"
                            className="fixed z-50 w-50 min-w-[12rem] bg-surface border border-line rounded-xl shadow-overlay py-1 text-left"
                            style={{
                              top: menuPos.top,
                              left: menuPos.left,
                              transform: menuPos.openUp ? 'translateY(-100%)' : undefined,
                            }}
                          >
                            <button
                              role="menuitem"
                              onClick={() => { closeMenu(); navigate(`/sites/${s._id}`); }}
                              className="w-full px-3 py-2 text-sm text-ink hover:bg-subtle transition-colors text-left"
                            >
                              {t('view')}
                            </button>
                            {canAssign && (
                              <button
                                role="menuitem"
                                onClick={() => openAssign(s)}
                                className="w-full px-3 py-2 text-sm text-ink hover:bg-subtle transition-colors text-left"
                              >
                                Assign guard
                              </button>
                            )}
                            {canUpdate && (
                              <button
                                role="menuitem"
                                onClick={() => { closeMenu(); openEdit(s); }}
                                className="w-full px-3 py-2 text-sm text-ink hover:bg-subtle transition-colors text-left"
                              >
                                {t('edit')}
                              </button>
                            )}
                            {canUpdate && s.status === 'ACTIVE' && (
                              <button
                                role="menuitem"
                                onClick={() => { closeMenu(); setConfirmTarget(s); }}
                                className="w-full px-3 py-2 text-sm text-danger-text hover:bg-danger-subtle transition-colors text-left"
                              >
                                {t('deactivate')}
                              </button>
                            )}
                            {canUpdate && (
                              <button
                                role="menuitem"
                                onClick={() => { closeMenu(); setDeleteError(''); setDeleteTarget(s); }}
                                className="w-full px-3 py-2 text-sm text-danger-text hover:bg-danger-subtle transition-colors text-left"
                              >
                                Delete permanently
                              </button>
                            )}
                            {canUpdate && s.status !== 'ACTIVE' && (
                              <button
                                role="menuitem"
                                onClick={() => { closeMenu(); handleReactivate(s); }}
                                disabled={actionBusy}
                                className="w-full px-3 py-2 text-sm text-success-text hover:bg-success-subtle transition-colors disabled:opacity-50 text-left"
                              >
                                {t('reactivate')}
                              </button>
                            )}
                          </div>
                        </>,
                        document.body,
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

      {/* Assign a guard to this specific site (per-row operation). */}
      <Modal
        open={!!assignTarget}
        onClose={() => { if (!assignSaving) setAssignTarget(null); }}
        title={`Assign guard${assignTarget ? ` — ${assignTarget.siteName}` : ''}`}
        subtitle={assignTarget ? `${assignTarget.siteCode} · ${assignTarget.location}` : ''}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => setAssignTarget(null)}
              disabled={assignSaving}
              className="px-5 py-2.5 rounded-xl border border-line bg-surface text-sm font-medium text-ink hover:bg-canvas transition-colors disabled:opacity-50"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={submitAssign}
              disabled={assignSaving || !assignGuardId}
              className="px-6 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
            >
              {assignSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {assignSaving ? 'Assigning…' : 'Assign guard'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {assignError && (
            <div className="bg-danger-subtle border border-danger-line text-danger-text px-4 py-3 rounded-xl text-sm">{assignError}</div>
          )}
          <div>
            <label className="v-label v-label--required">Guard</label>
            <select
              value={assignGuardId}
              onChange={(e) => setAssignGuardId(e.target.value)}
              disabled={assignLoading}
              className="v-input cursor-pointer"
            >
              <option value="">{assignLoading ? 'Loading guards…' : 'Select a guard'}</option>
              {assignGuards
                .filter((g) => !(g.currentAssignments || []).some(
                  (a: any) => (typeof a.siteId === 'object' && a.siteId ? a.siteId._id : a.siteId) === assignTarget?._id,
                ))
                .map((g) => (
                  <option key={g._id} value={g._id}>{fullName(g)} ({g.employeeCode})</option>
                ))}
            </select>
            <p className="text-[11px] text-muted mt-1">Guards already assigned to this site are hidden.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="v-label v-label--required">Start date</label>
              <input type="date" value={assignFrom} onChange={(e) => setAssignFrom(e.target.value)} className="v-input" />
            </div>
            <div>
              <label className="v-label">Role at site</label>
              <select
                value={assignRole}
                onChange={(e) => setAssignRole(e.target.value as 'GUARD' | 'SUPERVISOR')}
                className="v-input cursor-pointer"
              >
                <option value="GUARD">Guard</option>
                <option value="SUPERVISOR">Supervisor</option>
              </select>
            </div>
          </div>
          <p className="text-[11px] text-muted">Payroll prices this deployment from the site's effective compensation rate, not the guard's legacy profile rate.</p>
        </div>
      </Modal>

      {/* Permanent delete — for a site created by mistake. */}
      <Modal
        open={!!deleteTarget}
        onClose={() => { if (!actionBusy) { setDeleteTarget(null); setDeleteError(''); } }}
        title="Delete site permanently"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={actionBusy}
              className="px-5 py-2.5 rounded-xl border border-line bg-surface text-sm font-medium text-ink hover:bg-canvas transition-colors disabled:opacity-50"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleDeletePermanent}
              disabled={actionBusy}
              className="px-6 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {actionBusy && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Delete permanently
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted">
            This removes <b>{deleteTarget?.siteName}</b> ({deleteTarget?.siteCode}) from the system. Use it only for a site that was created by mistake.
          </p>
          <p className="text-sm text-danger-text">
            This is a force delete and cannot be undone.
          </p>
          <p className="text-xs text-muted">
            Guard assignments, shifts, attendance, monthly hours, compensation rates, rotations, notes and price history recorded against this site are deleted with it, and any guard assigned here is relieved. Payroll records are kept — they store their own site name, so guard pay history stays intact.
          </p>
          {deleteError && (
            <div className="bg-danger-subtle border border-danger-line text-danger-text px-3 py-2 rounded-lg text-sm">{deleteError}</div>
          )}
        </div>
      </Modal>
    </div>
  );
}
