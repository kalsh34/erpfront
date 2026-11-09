import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Send, Ban, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuthStore, can } from '../../stores/authStore';
import { marketing, apiError } from './api';
import { printProforma } from './proformaDocument';
import {
  GENDER_LABELS,
  SHIFT_LABELS,
  STATUS_CLASSES,
  STATUS_LABELS,
  asCompany,
  asSite,
  fmtDate,
  fmtMoney,
  type Proforma,
} from './types';

export default function ProformaDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canIssue = user ? can(user.permissions, 'proforma.issue') : false;
  const canManage = user ? can(user.permissions, 'service.manage', 'proforma.issue') : false;

  const [proforma, setProforma] = useState<Proforma | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setProforma(await marketing.proformas.get(id));
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const move = async (status: string, label: string) => {
    if (!proforma) return;
    if (!window.confirm(`${label} ${proforma.number}?`)) return;
    setBusy(status);
    setError('');
    try {
      if (status === 'ISSUED') await marketing.proformas.issue(proforma._id);
      else await marketing.proformas.setStatus(proforma._id, status);
      await load();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy('');
    }
  };

  if (loading) return <LoadingSpinner text="Loading proforma…" />;
  if (!proforma) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || 'Proforma not found.'}
        </div>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/marketing/proformas')}>
          <ArrowLeft className="w-4 h-4" /> Back to proformas
        </Button>
      </div>
    );
  }

  const company = asCompany(proforma.companyId);
  const site = asSite(proforma.siteId);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <PageHeader
        title={proforma.number}
        subtitle={`${company?.name ?? 'Client'}${site?.siteName ? ` — ${site.siteName}` : ''}`}
        breadcrumbs={[{ label: 'Proformas', path: '/marketing/proformas' }, { label: proforma.number }]}
        action={
          <div className="flex gap-2">
            <Link to="/marketing/proformas">
              <Button variant="outline"><ArrowLeft className="w-4 h-4" /> Back</Button>
            </Link>
            <Button variant="outline" onClick={() => printProforma(proforma)}>
              <Printer className="w-4 h-4" /> Print / Save PDF
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-surface border border-line rounded-2xl p-5 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[proforma.status] ?? ''}`}>
            {STATUS_LABELS[proforma.status] ?? proforma.status}
          </span>
          <div className="text-xs text-muted">
            Issued {fmtDate(proforma.issueDate)} · valid until {fmtDate(proforma.validityDate)} ({proforma.validityDays} days)
            {proforma.issuedAt ? ` · locked ${fmtDate(proforma.issuedAt)}` : ''}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h3 className="text-xs uppercase tracking-wide text-muted mb-2">Client</h3>
            <div className="font-medium text-ink">{company?.name}</div>
            {company?.nameAm && <div className="text-xs text-muted">{company.nameAm}</div>}
            <div className="text-muted mt-1">TIN: {company?.tin ?? '—'}</div>
            <div className="text-muted">{[company?.address, company?.city, company?.region, company?.country].filter(Boolean).join(', ')}</div>
            <div className="text-muted">{company?.primaryPhone} · {company?.primaryEmail}</div>
          </div>
          <div>
            <h3 className="text-xs uppercase tracking-wide text-muted mb-2">Site</h3>
            <div className="font-medium text-ink">{site?.siteName}</div>
            <div className="text-muted">{[site?.address, site?.city, site?.region].filter(Boolean).join(', ') || '—'}</div>
            {site?.specialRequirements && <div className="text-xs text-muted mt-1">{site.specialRequirements}</div>}
          </div>
        </div>
      </div>

      <div className="bg-surface border border-line rounded-2xl overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-canvas border-b border-line">
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Shift</th>
                <th className="px-4 py-3 font-semibold text-center">Posts/day</th>
                <th className="px-4 py-3 font-semibold text-center">Multiplier</th>
                <th className="px-4 py-3 font-semibold text-center">Headcount</th>
                <th className="px-4 py-3 font-semibold text-right">Rate</th>
                <th className="px-4 py-3 font-semibold text-right">Line total</th>
              </tr>
            </thead>
            <tbody>
              {proforma.items.map((item, index) => (
                <tr key={`${item.roleId}-${index}`} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{item.roleName}</div>
                    <div className="text-xs text-muted">
                      {item.roleCode} · {GENDER_LABELS[item.gender] ?? item.gender} · {item.vatApplicable ? 'VAT 15%' : 'VAT exempt'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{SHIFT_LABELS[item.shiftPattern] ?? item.shiftPattern}</td>
                  <td className="px-4 py-3 text-center">{item.postsPerDay}</td>
                  <td className="px-4 py-3 text-center text-muted">{item.multiplier}</td>
                  <td className="px-4 py-3 text-center font-medium">{item.totalHeadcount}</td>
                  <td className="px-4 py-3 text-right">{fmtMoney(item.unitRate)}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmtMoney(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-3 flex justify-end">
          <div className="w-full sm:w-72 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{fmtMoney(proforma.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted">VAT 15%</span><span>{fmtMoney(proforma.vatAmount)}</span></div>
            <div className="flex justify-between font-semibold text-base border-t border-line pt-2">
              <span>Grand total</span><span>{fmtMoney(proforma.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {(proforma.shiftNote || proforma.notes || proforma.internalNotes) && (
        <div className="bg-surface border border-line rounded-2xl p-5 mb-4 space-y-4">
          {proforma.shiftNote && (
            <div>
              <h3 className="text-xs uppercase tracking-wide text-muted mb-1">Shift notes</h3>
              <p className="text-sm text-ink whitespace-pre-line">{proforma.shiftNote}</p>
            </div>
          )}
          {proforma.notes && (
            <div>
              <h3 className="text-xs uppercase tracking-wide text-muted mb-1">Notes</h3>
              <p className="text-sm text-ink whitespace-pre-line">{proforma.notes}</p>
            </div>
          )}
          {proforma.internalNotes && (
            <div>
              <h3 className="text-xs uppercase tracking-wide text-muted mb-1">Internal notes</h3>
              <p className="text-sm text-muted whitespace-pre-line">{proforma.internalNotes}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {proforma.status === 'DRAFT' && canIssue && (
          <Button
            className="!bg-[#C9A227] hover:!bg-[#b08f1f] !text-[#0A2540]"
            disabled={!!busy}
            onClick={() => void move('ISSUED', 'Issue')}
          >
            <Send className="w-4 h-4" /> {busy === 'ISSUED' ? 'Issuing…' : 'Issue Proforma'}
          </Button>
        )}
        {proforma.status === 'ISSUED' && canManage && (
          <>
            <Button variant="outline" disabled={!!busy} onClick={() => void move('ACCEPTED', 'Mark as accepted')}>
              <CheckCircle2 className="w-4 h-4" /> Mark Accepted
            </Button>
            <Button variant="outline" disabled={!!busy} onClick={() => void move('CONVERTED', 'Mark as converted')}>
              Converted to contract
            </Button>
          </>
        )}
        {['DRAFT', 'ISSUED', 'ACCEPTED', 'EXPIRED'].includes(proforma.status) && canManage && (
          <Button variant="danger" disabled={!!busy} onClick={() => void move('CANCELLED', 'Cancel')}>
            <Ban className="w-4 h-4" /> Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
