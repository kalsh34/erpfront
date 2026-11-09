import { useCallback, useEffect, useState } from 'react';
import { Building2, Plus, Search, RefreshCw, Pencil, Ban, CheckCircle2, MapPin, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { FormField } from '../../components/ui/FormField';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuthStore, can } from '../../stores/authStore';
import { marketing, apiError } from './api';
import {
  COMPANY_TYPES,
  STATUS_CLASSES,
  STATUS_LABELS,
  fmtDate,
  type CompanyContact,
  type ProformaCompany,
  type ProformaSite,
  type RecordStatus,
} from './types';

interface CompanyForm {
  name: string;
  nameAm: string;
  tin: string;
  registrationNumber: string;
  companyType: string;
  industry: string;
  address: string;
  city: string;
  region: string;
  country: string;
  primaryPhone: string;
  secondaryPhone: string;
  primaryEmail: string;
  website: string;
  contacts: CompanyContact[];
}

const blankContact = (isPrimary = false): CompanyContact => ({
  fullName: '',
  position: '',
  phone: '',
  email: '',
  isPrimary,
});

const emptyForm = (): CompanyForm => ({
  name: '',
  nameAm: '',
  tin: '',
  registrationNumber: '',
  companyType: 'PRIVATE_LIMITED',
  industry: '',
  address: '',
  city: '',
  region: '',
  country: 'Ethiopia',
  primaryPhone: '',
  secondaryPhone: '',
  primaryEmail: '',
  website: '',
  contacts: [blankContact(true)],
});

const toForm = (company: ProformaCompany): CompanyForm => ({
  name: company.name,
  nameAm: company.nameAm ?? '',
  tin: company.tin,
  registrationNumber: company.registrationNumber ?? '',
  companyType: company.companyType ?? 'PRIVATE_LIMITED',
  industry: company.industry ?? '',
  address: company.address ?? '',
  city: company.city ?? '',
  region: company.region ?? '',
  country: company.country ?? 'Ethiopia',
  primaryPhone: company.primaryPhone ?? '',
  secondaryPhone: company.secondaryPhone ?? '',
  primaryEmail: company.primaryEmail ?? '',
  website: company.website ?? '',
  contacts: company.contacts?.length ? company.contacts : [blankContact(true)],
});

const blankSite = () => ({ siteName: '', address: '', city: '', region: '', specialRequirements: '' });

export default function CompaniesPage() {
  const user = useAuthStore((s) => s.user);
  const canWrite = user ? can(user.permissions, 'service.manage', 'proforma.issue') : false;

  const [rows, setRows] = useState<ProformaCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProformaCompany | null>(null);
  const [form, setForm] = useState<CompanyForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [sitesFor, setSitesFor] = useState<ProformaCompany | null>(null);
  const [sites, setSites] = useState<ProformaSite[]>([]);
  const [siteForm, setSiteForm] = useState(blankSite());
  const [siteError, setSiteError] = useState('');
  const [siteSaving, setSiteSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await marketing.companies.list({ search: search || undefined, status, limit: 100 });
      setRows(result.data);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError('');
    setOpen(true);
  };

  const openEdit = (company: ProformaCompany) => {
    setEditing(company);
    setForm(toForm(company));
    setFormError('');
    setOpen(true);
  };

  const set = <K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setContact = (index: number, patch: Partial<CompanyContact>) =>
    setForm((f) => ({
      ...f,
      contacts: f.contacts.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));

  const addContact = () => setForm((f) => ({ ...f, contacts: [...f.contacts, blankContact()] }));

  const removeContact = (index: number) =>
    setForm((f) => {
      const next = f.contacts.filter((_, i) => i !== index);
      if (!next.some((c) => c.isPrimary) && next.length) next[0].isPrimary = true;
      return { ...f, contacts: next.length ? next : [blankContact(true)] };
    });

  const markPrimary = (index: number) =>
    setForm((f) => ({
      ...f,
      contacts: f.contacts.map((c, i) => ({ ...c, isPrimary: i === index })),
    }));

  const save = async (nextStatus: RecordStatus) => {
    setSaving(true);
    setFormError('');
    try {
      const body = { ...form, status: nextStatus };
      if (editing) await marketing.companies.update(editing._id, body);
      else await marketing.companies.create(body);
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (company: ProformaCompany) => {
    if (!window.confirm(`Deactivate ${company.name}? Existing proformas stay attached, but no new ones can be issued.`)) return;
    try {
      await marketing.companies.deactivate(company._id);
      await load();
    } catch (e) {
      setError(apiError(e));
    }
  };

  const openSites = async (company: ProformaCompany) => {
    setSitesFor(company);
    setSiteForm(blankSite());
    setSiteError('');
    try {
      const result = await marketing.sites.list({ companyId: company._id });
      setSites(result.data ?? []);
    } catch (e) {
      setSiteError(apiError(e));
    }
  };

  const addSite = async () => {
    if (!sitesFor) return;
    setSiteSaving(true);
    setSiteError('');
    try {
      await marketing.sites.create({ companyId: sitesFor._id, ...siteForm });
      setSiteForm(blankSite());
      const result = await marketing.sites.list({ companyId: sitesFor._id });
      setSites(result.data ?? []);
    } catch (e) {
      setSiteError(apiError(e));
    } finally {
      setSiteSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <PageHeader
        title="Companies"
        subtitle="Every company must be registered, with a contact person and at least one site, before a proforma can be issued."
        action={
          canWrite ? (
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4" /> Register Company
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="v-input !pl-9"
            placeholder="Search name, TIN, city, phone or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="v-input sm:w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Draft / inactive</option>
        </select>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-surface border border-line rounded-2xl overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Loading companies…" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Building2 className="w-7 h-7" />}
            title="No companies registered yet"
            description="Register the first client company (name, TIN, address, contact person) to start issuing proformas."
            action={canWrite ? <Button onClick={openCreate}><Plus className="w-4 h-4" /> Register Company</Button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-canvas border-b border-line">
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Company</th>
                  <th className="px-4 py-3 font-semibold">TIN</th>
                  <th className="px-4 py-3 font-semibold">City</th>
                  <th className="px-4 py-3 font-semibold">Primary contact</th>
                  <th className="px-4 py-3 font-semibold text-center">Sites</th>
                  <th className="px-4 py-3 font-semibold">Registered</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((company) => {
                  const primary = company.contacts?.find((c) => c.isPrimary) ?? company.contacts?.[0];
                  return (
                    <tr key={company._id} className="border-b border-line last:border-0 hover:bg-canvas/60">
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">{company.name}</div>
                        {company.nameAm && <div className="text-xs text-muted">{company.nameAm}</div>}
                      </td>
                      <td className="px-4 py-3 text-muted">{company.tin}</td>
                      <td className="px-4 py-3 text-muted">{company.city}</td>
                      <td className="px-4 py-3">
                        {primary ? (
                          <>
                            <div className="text-ink">{primary.fullName}</div>
                            <div className="text-xs text-muted">{primary.phone || primary.email || primary.position}</div>
                          </>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">{company.siteCount ?? 0}</td>
                      <td className="px-4 py-3 text-muted">{fmtDate(company.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[company.status] ?? ''}`}>
                          {company.status === 'ACTIVE' ? 'Active' : 'Draft / inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-canvas"
                            title="Manage sites"
                            onClick={() => void openSites(company)}
                          >
                            <MapPin className="w-4 h-4" />
                          </button>
                          {canWrite && (
                            <>
                              <button
                                className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-canvas"
                                title="Edit company"
                                onClick={() => openEdit(company)}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              {company.status === 'ACTIVE' ? (
                                <button
                                  className="p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-red-50"
                                  title="Deactivate"
                                  onClick={() => void deactivate(company)}
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  className="p-1.5 rounded-lg text-muted hover:text-emerald-600 hover:bg-emerald-50"
                                  title="Activate (register) this company"
                                  onClick={() => void marketing.companies
                                    .update(company._id, { status: 'ACTIVE' })
                                    .then(load)
                                    .catch((e) => setError(apiError(e)))}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Register / edit company ─────────────────────────────────────── */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="xl"
        title={editing ? `Edit ${editing.name}` : 'Register New Company'}
        subtitle="All companies must be registered before issuing any proforma."
        footer={
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-muted">
              Drafts stay inactive: they cannot be quoted until you register them.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
              <Button variant="ghost" onClick={() => void save('INACTIVE')} disabled={saving}>
                {saving ? 'Saving…' : 'Save as Draft'}
              </Button>
              <Button onClick={() => void save('ACTIVE')} disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Register Company'}
              </Button>
            </div>
          </div>
        }
      >
        {formError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Company Name (English)" required value={form.name} onChange={(e) => set('name', e.target.value)} />
          <FormField label="Company Name (Amharic)" value={form.nameAm} onChange={(e) => set('nameAm', e.target.value)} />
          <FormField label="TIN" required value={form.tin} onChange={(e) => set('tin', e.target.value)} hint="Must be unique" />
          <FormField label="Business Registration No." value={form.registrationNumber} onChange={(e) => set('registrationNumber', e.target.value)} />
          <Select label="Company Type" value={form.companyType} onChange={(e) => set('companyType', e.target.value)}>
            {COMPANY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
          <FormField label="Industry" value={form.industry} onChange={(e) => set('industry', e.target.value)} />
          <FormField label="Head Office Address" required value={form.address} onChange={(e) => set('address', e.target.value)} />
          <FormField label="City" required value={form.city} onChange={(e) => set('city', e.target.value)} />
          <FormField label="Region" value={form.region} onChange={(e) => set('region', e.target.value)} />
          <FormField label="Country" value={form.country} onChange={(e) => set('country', e.target.value)} />
          <FormField label="Primary Phone" required value={form.primaryPhone} onChange={(e) => set('primaryPhone', e.target.value)} />
          <FormField label="Secondary Phone" value={form.secondaryPhone} onChange={(e) => set('secondaryPhone', e.target.value)} />
          <FormField label="Primary Email" type="email" required value={form.primaryEmail} onChange={(e) => set('primaryEmail', e.target.value)} />
          <FormField label="Website" value={form.website} onChange={(e) => set('website', e.target.value)} />
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-ink">Contact persons</h3>
            <Button size="sm" variant="outline" onClick={addContact}>
              <Plus className="w-3.5 h-3.5" /> Add contact
            </Button>
          </div>
          <div className="space-y-3">
            {form.contacts.map((contact, index) => (
              <div key={index} className="rounded-xl border border-line p-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <FormField label="Full name" required value={contact.fullName} onChange={(e) => setContact(index, { fullName: e.target.value })} />
                  <FormField label="Position" value={contact.position} onChange={(e) => setContact(index, { position: e.target.value })} />
                  <FormField label="Phone" value={contact.phone} onChange={(e) => setContact(index, { phone: e.target.value })} />
                  <FormField label="Email" type="email" value={contact.email} onChange={(e) => setContact(index, { email: e.target.value })} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-xs text-muted">
                    <input type="checkbox" checked={contact.isPrimary} onChange={() => markPrimary(index)} />
                    Primary contact
                  </label>
                  {form.contacts.length > 1 && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                      onClick={() => removeContact(index)}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* ── Sites for a company ─────────────────────────────────────────── */}
      <Modal
        open={!!sitesFor}
        onClose={() => setSitesFor(null)}
        size="lg"
        title={sitesFor ? `Sites — ${sitesFor.name}` : 'Sites'}
        subtitle="A proforma is addressed to one site; add the guarded locations here."
      >
        {siteError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{siteError}</div>
        )}
        <div className="space-y-2 mb-5">
          {sites.length === 0 ? (
            <p className="text-sm text-muted">No sites yet for this company.</p>
          ) : (
            sites.map((site) => (
              <div key={site._id} className="rounded-xl border border-line px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">{site.siteName}</span>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${STATUS_CLASSES[site.status] ?? ''}`}>
                    {STATUS_LABELS[site.status] ?? site.status}
                  </span>
                </div>
                <div className="text-xs text-muted">
                  {[site.address, site.city, site.region].filter(Boolean).join(', ') || 'No address recorded'}
                </div>
              </div>
            ))
          )}
        </div>

        {canWrite && (
          <div className="border-t border-line pt-4">
            <h3 className="text-sm font-semibold text-ink mb-3">Add site</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField label="Site name" required value={siteForm.siteName} onChange={(e) => setSiteForm((s) => ({ ...s, siteName: e.target.value }))} />
              <FormField label="City" value={siteForm.city} onChange={(e) => setSiteForm((s) => ({ ...s, city: e.target.value }))} />
              <FormField label="Address" value={siteForm.address} onChange={(e) => setSiteForm((s) => ({ ...s, address: e.target.value }))} />
              <FormField label="Region" value={siteForm.region} onChange={(e) => setSiteForm((s) => ({ ...s, region: e.target.value }))} />
            </div>
            <div className="mt-3">
              <label className="v-label">Special requirements</label>
              <textarea
                className="v-input h-20"
                value={siteForm.specialRequirements}
                onChange={(e) => setSiteForm((s) => ({ ...s, specialRequirements: e.target.value }))}
              />
            </div>
            <div className="mt-3 flex justify-end">
              <Button onClick={() => void addSite()} disabled={siteSaving || !siteForm.siteName.trim()}>
                {siteSaving ? 'Saving…' : 'Add Site'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
