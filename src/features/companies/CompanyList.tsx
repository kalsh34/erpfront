import { useState, useEffect, useCallback } from 'react';
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
  ArrowUp, ArrowDown, ArrowUpDown, Building2,
} from 'lucide-react';

interface Company {
  _id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  tin?: string;
  paymentPrice: number;
  defaultOtPrice: number;
  agreementStartDate?: string | null;
  agreementEndDate?: string | null;
  status: string;
  address?: string;
  contactPerson?: string;
  siteCount?: number;
  employeeCount?: number;
}

interface SiteRow {
  _id: string;
  siteCode: string;
  siteName: string;
  location: string;
  status: string;
  agreedManpower: number;
  actualManpower: number;
  client?: string;
}

interface ColumnDef {
  key: string;
  label: DictKey;
  /** Server-side sort field; undefined = not sortable. */
  sortField?: string;
  optional: boolean;
  align?: 'right';
}

/** Columns from the Company table spec — name + actions are always visible. */
const COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'companyName', sortField: 'name', optional: false },
  { key: 'email', label: 'email', sortField: 'email', optional: true },
  { key: 'phone', label: 'phone', sortField: 'phone', optional: true },
  { key: 'tin', label: 'tin', sortField: 'tin', optional: true },
  { key: 'sites', label: 'sites', optional: true, align: 'right' },
  { key: 'employees', label: 'employees', optional: true, align: 'right' },
  { key: 'paymentPrice', label: 'paymentPrice', sortField: 'paymentPrice', optional: true, align: 'right' },
  { key: 'defaultOtPrice', label: 'defaultOtPrice', sortField: 'defaultOtPrice', optional: true, align: 'right' },
  { key: 'agreementStart', label: 'agreementStart', sortField: 'agreementStartDate', optional: true },
  { key: 'agreementEnd', label: 'agreementEnd', sortField: 'agreementEndDate', optional: true },
];

const OPTIONAL_COLUMNS = COLUMNS.filter((c) => c.optional);

const emptyForm = {
  name: '', email: '', phone: '', tin: '',
  paymentPrice: 0, defaultOtPrice: 0,
  agreementStartDate: '', agreementEndDate: '',
  address: '', contactPerson: '', status: 'ACTIVE',
};

const statusChip: Record<string, string> = {
  ACTIVE: 'bg-success-subtle text-success-text border-success-line',
  INACTIVE: 'bg-subtle text-muted border-line',
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

export default function CompanyList() {
  const t = useT();
  const lang = useLang();
  const { user } = useAuthStore();
  const canCreate = can(user?.role, PERMISSIONS.COMPANY_CREATE);
  const canUpdate = can(user?.role, PERMISSIONS.COMPANY_UPDATE);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [hiddenCols, setHiddenCols] = useState<string[]>([]);
  const [colsOpen, setColsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [detail, setDetail] = useState<{ company: Company; sites: SiteRow[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Company | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit, sort: sortField, dir: sortDir };
      if (search) params.search = search;
      const res = await api.get('/companies', { params });
      setCompanies(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, sortField, sortDir]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

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

  const openEdit = (c: Company) => {
    setEditing(c);
    setForm({
      name: c.name,
      email: c.email || '',
      phone: c.phone || '',
      tin: c.tin || '',
      paymentPrice: c.paymentPrice ?? 0,
      defaultOtPrice: c.defaultOtPrice ?? 0,
      agreementStartDate: c.agreementStartDate ? String(c.agreementStartDate).slice(0, 10) : '',
      agreementEndDate: c.agreementEndDate ? String(c.agreementEndDate).slice(0, 10) : '',
      address: c.address || '',
      contactPerson: c.contactPerson || '',
      status: c.status,
    });
    setFormError('');
    setShowForm(true);
  };
  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const name = form.name.trim();
    if (!name) { setFormError(t('companyNameRequired')); return; }
    if (form.agreementStartDate && form.agreementEndDate && form.agreementEndDate < form.agreementStartDate) {
      setFormError(t('agreementOrderError'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        tin: form.tin.trim() || undefined,
        paymentPrice: Number(form.paymentPrice) || 0,
        defaultOtPrice: Number(form.defaultOtPrice) || 0,
        agreementStartDate: form.agreementStartDate || null,
        agreementEndDate: form.agreementEndDate || null,
        address: form.address.trim() || undefined,
        contactPerson: form.contactPerson.trim() || undefined,
        status: form.status,
      };
      if (editing) {
        await api.put(`/companies/${editing._id}`, payload);
      } else {
        await api.post('/companies', payload);
      }
      setShowForm(false);
      setForm(emptyForm);
      setPage(1);
      fetchCompanies();
    } catch (err: any) {
      setFormError(err.response?.data?.message || t('failedSaveCompany'));
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (c: Company) => {
    setDetail({ company: c, sites: [] });
    setDetailLoading(true);
    try {
      const res = await api.get(`/companies/${c._id}/detail`);
      setDetail(res.data.data);
    } catch (error) {
      console.error('Error fetching company detail:', error);
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirmTarget) return;
    setActionBusy(true);
    try {
      await api.delete(`/companies/${confirmTarget._id}`);
      setConfirmTarget(null);
      fetchCompanies();
    } catch (err: any) {
      alert(err.response?.data?.message || t('failedSaveCompany'));
    } finally {
      setActionBusy(false);
    }
  };

  const handleReactivate = async (c: Company) => {
    setActionBusy(true);
    try {
      await api.put(`/companies/${c._id}`, { status: 'ACTIVE' });
      fetchCompanies();
    } catch (err: any) {
      alert(err.response?.data?.message || t('failedSaveCompany'));
    } finally {
      setActionBusy(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: any = { page: 1, limit: 1000, sort: sortField, dir: sortDir };
      if (search) params.search = search;
      const res = await api.get('/companies', { params });
      const rows: Company[] = res.data.data || [];
      const headers = [
        '#', 'Name', 'Code', 'Email', 'Phone', 'TIN', 'Sites', 'Employees',
        'Payment Price', 'Default OT Price', 'Agreement Start', 'Agreement End', 'Status',
      ];
      const csvRows = rows.map((c, i) => [
        i + 1, c.name, c.code, c.email || '', c.phone || '', c.tin || '',
        c.siteCount ?? 0, c.employeeCount ?? 0, c.paymentPrice ?? 0, c.defaultOtPrice ?? 0,
        c.agreementStartDate ? String(c.agreementStartDate).slice(0, 10) : '',
        c.agreementEndDate ? String(c.agreementEndDate).slice(0, 10) : '',
        c.status,
      ]);
      // Shared helper: UTF-8 BOM + detached <a download> so the browser
      // actually writes the file (a bare data: link is silently blocked).
      downloadCsv(`companies-${new Date().toISOString().split('T')[0]}.csv`, [headers, ...csvRows]);
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

  const renderCell = (c: Company, key: string) => {
    switch (key) {
      case 'name':
        return (
          <div>
            <button
              onClick={() => openDetail(c)}
              className="font-semibold text-primary-600 hover:text-primary-800 hover:underline"
            >
              {c.name}
            </button>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-mono text-muted">{c.code}</span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium ${statusChip[c.status] || 'bg-subtle text-muted border-line'}`}>
                {c.status === 'ACTIVE' ? t('active') : t('inactive')}
              </span>
            </div>
          </div>
        );
      case 'sites':
        return <span className="text-ink font-medium">{c.siteCount ?? 0}</span>;
      case 'employees':
        return <span className="text-ink font-medium">{c.employeeCount ?? 0}</span>;
      case 'paymentPrice':
        return <span className="text-ink">{Number(c.paymentPrice ?? 0).toLocaleString()}</span>;
      case 'defaultOtPrice':
        return <span className="text-ink">{Number(c.defaultOtPrice ?? 0).toLocaleString()}</span>;
      case 'agreementStart':
        return <span className="text-muted">{formatDate(lang, c.agreementStartDate || undefined)}</span>;
      case 'agreementEnd':
        return <span className="text-muted">{formatDate(lang, c.agreementEndDate || undefined)}</span>;
      default: {
        const v = (c as any)[key];
        return v
          ? <span className="text-ink">{v}</span>
          : <span className="text-subtext">—</span>;
      }
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* Toolbar: search + refresh | Export, Add Company, column visibility */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder={t('searchCompany')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="v-input !pl-10"
          />
        </div>
        <button
          onClick={fetchCompanies}
          className="h-10 w-10 flex items-center justify-center rounded-lg border border-line bg-surface text-muted hover:text-ink hover:bg-subtle transition-colors"
          title={t('refresh')}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>

        <div className="flex-1" />

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
            {t('addCompany')}
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
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 2} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted">
                      <Building2 className="w-10 h-10 text-subtext" />
                      <p className="text-sm font-medium">{t('noCompanies')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                companies.map((c, idx) => (
                  <tr key={c._id} className="hover:bg-subtle/60 transition-colors">
                    <td className="px-4 py-3 text-muted">{(page - 1) * limit + idx + 1}</td>
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                      >
                        {renderCell(c, col.key)}
                      </td>
                    ))}
                    <td className="px-4 py-3 relative text-right">
                      <button
                        onClick={() => setMenuFor(menuFor === c._id ? null : c._id)}
                        className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-subtle transition-colors"
                        title={t('actions')}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {menuFor === c._id && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setMenuFor(null)} />
                          <div className="absolute right-0 top-full mt-1 w-40 bg-surface border border-line rounded-xl shadow-overlay z-40 py-1 text-left">
                            <button
                              onClick={() => { setMenuFor(null); openDetail(c); }}
                              className="w-full px-3 py-2 text-sm text-ink hover:bg-subtle transition-colors"
                            >
                              {t('view')}
                            </button>
                            {canUpdate && (
                              <button
                                onClick={() => { setMenuFor(null); openEdit(c); }}
                                className="w-full px-3 py-2 text-sm text-ink hover:bg-subtle transition-colors"
                              >
                                {t('edit')}
                              </button>
                            )}
                            {canUpdate && c.status === 'ACTIVE' && (
                              <button
                                onClick={() => { setMenuFor(null); setConfirmTarget(c); }}
                                className="w-full px-3 py-2 text-sm text-danger-text hover:bg-danger-subtle transition-colors"
                              >
                                {t('deactivate')}
                              </button>
                            )}
                            {canUpdate && c.status !== 'ACTIVE' && (
                              <button
                                onClick={() => { setMenuFor(null); handleReactivate(c); }}
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
        title={editing ? t('editCompany') : t('addCompany')}
        subtitle={editing ? editing.code : t('companyDetails')}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl border border-line bg-surface text-sm font-medium text-ink hover:bg-canvas  transition-colors disabled:opacity-50"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              form="company-form"
              disabled={saving || !form.name.trim()}
              className="px-6 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
            >
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? t('saving') : editing ? t('save') : t('create')}
            </button>
          </div>
        }
      >
        <form id="company-form" onSubmit={submitForm} className="space-y-5">
          {formError && (
            <div className="bg-danger-subtle border border-danger-line text-danger-text px-4 py-3 rounded-xl text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="v-label v-label--required">{t('companyName')}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
              placeholder="e.g. Ayat"
              className="v-input"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="v-label">{t('email')}</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="e.g. info@company.et"
                className="v-input"
              />
            </div>
            <div>
              <label className="v-label">{t('phone')}</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="e.g. +251 911 234 567"
                className="v-input"
              />
            </div>
            <div>
              <label className="v-label">{t('tin')}</label>
              <input
                type="text"
                value={form.tin}
                onChange={(e) => update('tin', e.target.value)}
                placeholder="e.g. 0012345678"
                className="v-input font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="v-label">{t('defaultOtPrice')}</label>
              <input
                type="number"
                min={0}
                value={form.defaultOtPrice}
                onChange={(e) => update('defaultOtPrice', e.target.value)}
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
              <label className="v-label">{t('address')}</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                placeholder="e.g. Bole Road, Addis Ababa"
                className="v-input"
              />
            </div>
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
              </select>
            </div>
          )}
        </form>
      </Modal>
      {/* Company detail modal (Name link / View) */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.company.name || ''}
        subtitle={detail ? `${detail.company.code} · ${detail.company.status === 'ACTIVE' ? t('active') : t('inactive')}` : undefined}
        size="lg"
      >
        {detailLoading ? (
          <div className="flex justify-center py-12">{spinner}</div>
        ) : detail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <p className="v-label mb-1">{t('email')}</p>
                <p className="text-ink">{detail.company.email || '—'}</p>
              </div>
              <div>
                <p className="v-label mb-1">{t('phone')}</p>
                <p className="text-ink">{detail.company.phone || '—'}</p>
              </div>
              <div>
                <p className="v-label mb-1">{t('tin')}</p>
                <p className="text-ink font-mono">{detail.company.tin || '—'}</p>
              </div>
              <div>
                <p className="v-label mb-1">{t('contactPersonLabel')}</p>
                <p className="text-ink">{detail.company.contactPerson || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="v-label mb-1">{t('address')}</p>
                <p className="text-ink">{detail.company.address || '—'}</p>
              </div>
              <div>
                <p className="v-label mb-1">{t('paymentPrice')}</p>
                <p className="text-ink font-semibold">{Number(detail.company.paymentPrice ?? 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="v-label mb-1">{t('defaultOtPrice')}</p>
                <p className="text-ink font-semibold">{Number(detail.company.defaultOtPrice ?? 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="v-label mb-1">{t('agreementStart')}</p>
                <p className="text-ink">{formatDate(lang, detail.company.agreementStartDate || undefined)}</p>
              </div>
              <div>
                <p className="v-label mb-1">{t('agreementEnd')}</p>
                <p className="text-ink">{formatDate(lang, detail.company.agreementEndDate || undefined)}</p>
              </div>
            </div>

            <div className="border-t border-line pt-4">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                {t('sites')} ({detail.sites.length})
              </p>
              {detail.sites.length === 0 ? (
                <p className="text-sm text-muted py-2">—</p>
              ) : (
                <div className="space-y-2">
                  {detail.sites.map((s) => (
                    <div
                      key={s._id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-canvas  border border-line text-sm"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-ink">{s.siteName}</span>
                        <span className="text-muted font-mono text-xs ml-2">{s.siteCode}</span>
                      </div>
                      <span className="text-xs text-muted truncate">{s.location}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
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
              className="px-5 py-2.5 rounded-xl border border-line bg-surface text-sm font-medium text-ink hover:bg-canvas  transition-colors disabled:opacity-50"
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
          {t('deactivateCompany', { name: confirmTarget?.name || '' })}
        </p>
      </Modal>
    </div>
  );
}






