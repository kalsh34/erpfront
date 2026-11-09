import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Plus, Trash2, Printer, Save, Send, Check } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { marketing, apiError } from './api';
import { printProforma } from './proformaDocument';
import {
  GENDER_LABELS,
  SHIFT_LABELS,
  STATUS_CLASSES,
  fmtMoney,
  type Proforma,
  type ProformaCompany,
  type ProformaItem,
  type ProformaSite,
  type ServiceRole,
} from './types';

interface LineRow {
  roleId: string;
  postsPerDay: string;
  unitRate: string;
}

const STEPS = ['Client & Site', 'Services', 'Review & Issue'];
const VAT_RATE = 0.15;

const describe = (pattern: string) =>
  pattern === 'CONTINUOUS_24_48'
    ? '24 hours on duty / 48 hours rest (continuous 24/48 shift)'
    : pattern === 'DAY_SHIFT'
      ? 'day shift (12 hours per day)'
      : 'custom shift pattern';

export default function ProformaWizardPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [companies, setCompanies] = useState<ProformaCompany[]>([]);
  const [roles, setRoles] = useState<ServiceRole[]>([]);
  const [sites, setSites] = useState<ProformaSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [companyId, setCompanyId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [lines, setLines] = useState<LineRow[]>([{ roleId: '', postsPerDay: '1', unitRate: '' }]);
  const [validityDays, setValidityDays] = useState('15');
  const [shiftNote, setShiftNote] = useState('');
  const [noteEdited, setNoteEdited] = useState(false);
  const [notes, setNotes] = useState('');
  const [deliveryEmailPdf, setDeliveryEmailPdf] = useState(false);
  const [deliveryHardCopy, setDeliveryHardCopy] = useState(false);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [companyResult, roleResult] = await Promise.all([
          marketing.companies.list({ status: 'ACTIVE', limit: 100 }),
          marketing.roles.list({ activeOnly: 'true' }),
        ]);
        setCompanies(companyResult.data);
        setRoles(roleResult.data);
      } catch (e) {
        setError(apiError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!companyId) {
      setSites([]);
      return;
    }
    (async () => {
      try {
        const result = await marketing.sites.list({ companyId, activeOnly: 'true' });
        setSites(result.data);
        setSiteId((current) => (result.data.some((s) => s._id === current) ? current : ''));
      } catch (e) {
        setError(apiError(e));
      }
    })();
  }, [companyId]);

  const company = useMemo(() => companies.find((c) => c._id === companyId) ?? null, [companies, companyId]);
  const site = useMemo(() => sites.find((s) => s._id === siteId) ?? null, [sites, siteId]);

  /** Priced lines: headcount = posts/day × role multiplier (never typed by the user). */
  const priced = useMemo(() => {
    return lines
      .map((line) => {
        const role = roles.find((r) => r._id === line.roleId);
        if (!role) return null;
        const posts = Number(line.postsPerDay) || 0;
        const rate = line.unitRate === '' ? role.defaultMonthlyRate : Number(line.unitRate) || 0;
        const headcount = posts * (role.multiplier || 0);
        return {
          role,
          postsPerDay: posts,
          unitRate: rate,
          totalHeadcount: Number(headcount.toFixed(2)),
          lineTotal: Number((headcount * rate).toFixed(2)),
          vatApplicable: role.vatApplicable,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }, [lines, roles]);

  const totals = useMemo(() => {
    const subtotal = Number(priced.reduce((s, p) => s + p.lineTotal, 0).toFixed(2));
    const vatBase = priced.reduce((s, p) => s + (p.vatApplicable ? p.lineTotal : 0), 0);
    const vatAmount = Number((vatBase * VAT_RATE).toFixed(2));
    return { subtotal, vatAmount, grandTotal: Number((subtotal + vatAmount).toFixed(2)) };
  }, [priced]);

  const generatedNote = useMemo(() => {
    if (!priced.length) return '';
    const rows = priced.map(
      (p) =>
        `${p.role.roleName} — ${p.postsPerDay} post${p.postsPerDay === 1 ? '' : 's'} per day; ${describe(p.role.shiftPattern)}.${
          p.role.restDaysRule ? ` ${p.role.restDaysRule}` : ''
        }`
    );
    const headcount = priced.reduce((s, p) => s + p.totalHeadcount, 0);
    return [
      ...rows,
      `Total headcount: ${Number(headcount.toFixed(2))} guard(s)/staff per month (posts per day × role multiplier).`,
      'Rates quoted are monthly and exclusive of VAT where VAT applies.',
    ].join('\n');
  }, [priced]);

  useEffect(() => {
    if (!noteEdited) setShiftNote(generatedNote);
  }, [generatedNote, noteEdited]);

  const setLine = (index: number, patch: Partial<LineRow>) =>
    setLines((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const chooseRole = (index: number, roleId: string) => {
    const role = roles.find((r) => r._id === roleId);
    setLine(index, { roleId, unitRate: role ? String(role.defaultMonthlyRate) : '' });
  };

  const addLine = () => setLines((rows) => [...rows, { roleId: '', postsPerDay: '1', unitRate: '' }]);
  const removeLine = (index: number) => setLines((rows) => rows.filter((_, i) => i !== index));

  const canProceed = useCallback(() => {
    if (step === 1) return !!(companyId && siteId);
    if (step === 2) return priced.length > 0 && priced.every((p) => p.postsPerDay > 0);
    return true;
  }, [step, companyId, siteId, priced]);

  const buildItems = (): ProformaItem[] =>
    priced.map((p) => ({
      roleId: p.role._id,
      roleCode: p.role.roleCode,
      roleName: p.role.roleName,
      gender: p.role.gender,
      postsPerDay: p.postsPerDay,
      multiplier: p.role.multiplier,
      totalHeadcount: p.totalHeadcount,
      unitRate: p.unitRate,
      lineTotal: p.lineTotal,
      vatApplicable: p.vatApplicable,
      shiftPattern: p.role.shiftPattern,
      restDaysRule: p.role.restDaysRule,
    }));

  const save = async (issueNow: boolean) => {
    setBusy(issueNow ? 'issue' : 'draft');
    setError('');
    try {
      const created = await marketing.proformas.create({
        companyId,
        siteId,
        items: priced.map((p) => ({
          roleId: p.role._id,
          postsPerDay: p.postsPerDay,
          unitRate: p.unitRate,
        })),
        validityDays: Number(validityDays) || 15,
        shiftNote,
        notes,
        deliveryEmailPdf,
        deliveryHardCopy,
      });
      if (issueNow) await marketing.proformas.issue(created._id);
      navigate(`/marketing/proformas/${created._id}`);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy('');
    }
  };

  const preview = () => {
    if (!company || !site) return;
    const validityDate = new Date(Date.now() + (Number(validityDays) || 15) * 86400000).toISOString();
    const draft: Proforma = {
      _id: 'preview',
      number: 'PREVIEW',
      companyId: company,
      siteId: site,
      issueDate: new Date().toISOString(),
      validityDays: Number(validityDays) || 15,
      validityDate,
      status: 'DRAFT',
      items: buildItems(),
      subtotal: totals.subtotal,
      vatAmount: totals.vatAmount,
      grandTotal: totals.grandTotal,
      shiftNote,
      notes,
      internalNotes: '',
      deliveryEmailPdf,
      deliveryHardCopy,
    };
    printProforma(draft);
  };

  if (loading) return <LoadingSpinner text="Preparing proforma…" />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <PageHeader
        title="Issue New Proforma"
        subtitle="Price guard services from the role catalog and send a numbered quotation."
        breadcrumbs={[{ label: 'Proformas', path: '/marketing/proformas' }, { label: 'New' }]}
        action={
          <Link to="/marketing/proformas">
            <Button variant="outline"><ArrowLeft className="w-4 h-4" /> Back</Button>
          </Link>
        }
      />

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((label, index) => {
          const number = index + 1;
          const active = step === number;
          const done = step > number;
          return (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold border ${
                  active
                    ? 'bg-[#0A2540] text-white border-[#0A2540]'
                    : done
                      ? 'bg-[#C9A227] text-white border-[#C9A227]'
                      : 'bg-surface text-muted border-line'
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : number}
              </div>
              <span className={`text-sm ${active ? 'text-ink font-medium' : 'text-muted'}`}>{label}</span>
              {number < STEPS.length && <span className="w-8 h-px bg-line mx-1" />}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-surface border border-line rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-ink mb-4">Client & site</h2>
            {companies.length === 0 ? (
              <p className="text-sm text-muted">
                No active companies yet. <Link className="text-primary-600 hover:underline" to="/marketing/companies">Register a company</Link> first.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Company"
                  required
                  placeholder="Select an active company"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                >
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </Select>
                <Select
                  label="Site"
                  required
                  placeholder={companyId ? 'Select a site' : 'Select a company first'}
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  disabled={!companyId}
                >
                  {sites.map((s) => (
                    <option key={s._id} value={s._id}>{s.siteName}</option>
                  ))}
                </Select>
              </div>
            )}
            {companyId && sites.length === 0 && (
              <p className="mt-3 text-xs text-amber-700">
                This company has no active site. Add one from the companies page to continue.
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-surface border border-line rounded-2xl p-5">
              <h3 className="text-xs uppercase tracking-wide text-muted mb-3">Company</h3>
              {company ? (
                <div className="space-y-1 text-sm">
                  <div className="font-medium text-ink">{company.name}</div>
                  {company.nameAm && <div className="text-xs text-muted">{company.nameAm}</div>}
                  <div className="text-muted">TIN: {company.tin}</div>
                  <div className="text-muted">{company.primaryPhone}</div>
                  <div className="text-muted">{company.primaryEmail}</div>
                  {company.contacts?.length > 0 && (
                    <div className="pt-2 text-xs text-muted">
                      Contact: {company.contacts.find((c) => c.isPrimary)?.fullName ?? company.contacts[0].fullName}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted">Select a company to see its details.</p>
              )}
            </div>
            <div className="bg-surface border border-line rounded-2xl p-5">
              <h3 className="text-xs uppercase tracking-wide text-muted mb-3">Site</h3>
              {site ? (
                <div className="space-y-1 text-sm">
                  <div className="font-medium text-ink">{site.siteName}</div>
                  <div className="text-muted">{[site.address, site.city, site.region].filter(Boolean).join(', ') || '—'}</div>
                  {site.specialRequirements && <div className="text-xs text-muted">{site.specialRequirements}</div>}
                </div>
              ) : (
                <p className="text-sm text-muted">Select a site.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 bg-surface border border-line rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h2 className="text-sm font-semibold text-ink">Guard / service lines</h2>
              <Button size="sm" variant="outline" onClick={addLine}>
                <Plus className="w-3.5 h-3.5" /> Add Guard / Service
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-canvas border-b border-line">
                  <tr className="text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-3 py-2 font-semibold">Role</th>
                    <th className="px-3 py-2 font-semibold text-center">Posts/day</th>
                    <th className="px-3 py-2 font-semibold text-center">Multiplier</th>
                    <th className="px-3 py-2 font-semibold text-center">Headcount</th>
                    <th className="px-3 py-2 font-semibold text-right">Rate (ETB)</th>
                    <th className="px-3 py-2 font-semibold text-right">Line total</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => {
                    const role = roles.find((r) => r._id === line.roleId);
                    const pricedRow = priced.find((p) => p.role._id === line.roleId);
                    return (
                      <tr key={index} className="border-b border-line last:border-0">
                        <td className="px-3 py-2 min-w-[210px]">
                          <select
                            className="v-input"
                            value={line.roleId}
                            onChange={(e) => chooseRole(index, e.target.value)}
                          >
                            <option value="">Select role…</option>
                            {roles.map((r) => (
                              <option key={r._id} value={r._id}>
                                {r.roleCode} — {r.roleName}
                              </option>
                            ))}
                          </select>
                          {role && (
                            <div className="mt-1 text-xs text-muted">
                              {GENDER_LABELS[role.gender] ?? role.gender} · {SHIFT_LABELS[role.shiftPattern] ?? role.shiftPattern}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 w-24">
                          <input
                            type="number"
                            min={1}
                            className="v-input text-center"
                            value={line.postsPerDay}
                            onChange={(e) => setLine(index, { postsPerDay: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2 text-center text-muted">{role ? role.multiplier : '—'}</td>
                        <td className="px-3 py-2 text-center font-medium text-ink">
                          {pricedRow ? pricedRow.totalHeadcount : '—'}
                        </td>
                        <td className="px-3 py-2 w-32">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className="v-input text-right"
                            value={line.unitRate}
                            disabled={!!role && !role.allowRateOverride}
                            title={role && !role.allowRateOverride ? 'This role has a fixed rate' : undefined}
                            onChange={(e) => setLine(index, { unitRate: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-ink">
                          {pricedRow ? fmtMoney(pricedRow.lineTotal) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            className="p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-red-50"
                            title="Remove line"
                            onClick={() => removeLine(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-surface border border-line rounded-2xl p-5 h-fit lg:sticky lg:top-4">
            <h3 className="text-xs uppercase tracking-wide text-muted mb-3">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted">Subtotal</span><span className="text-ink">{fmtMoney(totals.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted">VAT 15%</span><span className="text-ink">{fmtMoney(totals.vatAmount)}</span></div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
                <span className="text-ink">Grand total</span>
                <span className="text-[#0A2540] dark:text-white">{fmtMoney(totals.grandTotal)}</span>
              </div>
            </div>
            <div className="mt-4">
              <FormField
                label="Validity (days)"
                type="number"
                min={1}
                max={365}
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-surface border border-line rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-ink mb-2">Review</h2>
              <div className="text-sm text-muted">
                <div className="text-ink font-medium">{company?.name}</div>
                <div>{site?.siteName}{site?.city ? ` — ${site.city}` : ''}</div>
                <div className="mt-1">Validity: {validityDays} days · VAT 15% on applicable roles</div>
              </div>
              <div className="mt-4 divide-y divide-line">
                {priced.map((p) => (
                  <div key={p.role._id} className="flex justify-between py-2 text-sm">
                    <span className="text-ink">
                      {p.role.roleName}
                      <span className="text-muted"> · {p.postsPerDay}/day × {p.role.multiplier}</span>
                    </span>
                    <span className="text-muted">{p.totalHeadcount} staff · <span className="text-ink">{fmtMoney(p.lineTotal)}</span></span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between text-sm font-semibold border-t border-line pt-3">
                <span>Grand total</span>
                <span>{fmtMoney(totals.grandTotal)}</span>
              </div>
            </div>

            <div className="bg-surface border border-line rounded-2xl p-5">
              <label className="v-label">Shift notes (auto-generated, editable)</label>
              <textarea
                className="v-input h-28 font-mono text-xs"
                value={shiftNote}
                onChange={(e) => {
                  setNoteEdited(true);
                  setShiftNote(e.target.value);
                }}
              />
              <div className="mt-3">
                <label className="v-label">Additional notes (visible to the client)</label>
                <textarea className="v-input h-20" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-surface border border-line rounded-2xl p-5">
              <h3 className="text-xs uppercase tracking-wide text-muted mb-3">Delivery</h3>
              <label className="flex items-center gap-2 text-sm text-ink mb-2">
                <input type="checkbox" checked={deliveryEmailPdf} onChange={(e) => setDeliveryEmailPdf(e.target.checked)} />
                Email PDF to selected contacts
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={deliveryHardCopy} onChange={(e) => setDeliveryHardCopy(e.target.checked)} />
                Mark for hard copy
              </label>
              <Button variant="outline" className="w-full mt-4" onClick={preview}>
                <Printer className="w-4 h-4" /> Preview / Print
              </Button>
            </div>
            <div className="bg-surface border border-line rounded-2xl p-5">
              <h3 className="text-xs uppercase tracking-wide text-muted mb-2">Totals</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{fmtMoney(totals.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted">VAT 15%</span><span>{fmtMoney(totals.vatAmount)}</span></div>
                <div className="flex justify-between font-semibold border-t border-line pt-2"><span>Grand total</span><span>{fmtMoney(totals.grandTotal)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1 || !!busy}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        {step < 3 ? (
          <Button onClick={() => setStep((s) => Math.min(3, s + 1))} disabled={!canProceed()}>
            Next <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void save(false)} disabled={!!busy}>
              <Save className="w-4 h-4" /> {busy === 'draft' ? 'Saving…' : 'Save as Draft'}
            </Button>
            <Button
              className="!bg-[#C9A227] hover:!bg-[#b08f1f] !text-[#0A2540]"
              onClick={() => void save(true)}
              disabled={!!busy}
            >
              <Send className="w-4 h-4" /> {busy === 'issue' ? 'Issuing…' : 'Issue Proforma'}
            </Button>
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-muted">
        Status preview: <span className={`inline-flex items-center rounded-full border px-2 py-0.5 ${STATUS_CLASSES.DRAFT}`}>Draft</span>{' '}
        — issuing locks the document and assigns a PF/VGT number.
      </div>
    </div>
  );
}
