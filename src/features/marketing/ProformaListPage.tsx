import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Search, RefreshCw, Printer, Send, Eye } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuthStore, can } from '../../stores/authStore';
import { marketing, apiError } from './api';
import { printProforma } from './proformaDocument';
import {
  PROFORMA_STATUSES,
  STATUS_CLASSES,
  STATUS_LABELS,
  asCompany,
  asSite,
  fmtDate,
  fmtMoney,
  type Proforma,
} from './types';

export default function ProformaListPage() {
  const user = useAuthStore((s) => s.user);
  const canDraft = user ? can(user.permissions, 'service.manage', 'proforma.issue') : false;
  const canIssue = user ? can(user.permissions, 'proforma.issue') : false;

  const [rows, setRows] = useState<Proforma[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await marketing.proformas.list({ search: search || undefined, status, limit: 100 });
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

  const issue = async (proforma: Proforma) => {
    if (!window.confirm(`Issue ${proforma.number}? The document becomes read-only once issued.`)) return;
    setBusyId(proforma._id);
    setError('');
    try {
      await marketing.proformas.issue(proforma._id);
      await load();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <PageHeader
        title="Proformas"
        subtitle="Quotations issued to registered companies, priced from the service role catalog."
        action={
          canDraft ? (
            <Link to="/marketing/proformas/new">
              <Button>
                <Plus className="w-4 h-4" /> Issue New Proforma
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="v-input !pl-9"
            placeholder="Search proforma number, role or notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="v-input sm:w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">All statuses</option>
          {PROFORMA_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
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
          <LoadingSpinner text="Loading proformas…" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-7 h-7" />}
            title="No proformas yet"
            description="Register a company and its sites, then issue your first proforma."
            action={
              canDraft ? (
                <Link to="/marketing/proformas/new">
                  <Button><Plus className="w-4 h-4" /> Issue New Proforma</Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-canvas border-b border-line">
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Number</th>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Issued</th>
                  <th className="px-4 py-3 font-semibold">Valid until</th>
                  <th className="px-4 py-3 font-semibold text-right">Grand total</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const company = asCompany(row.companyId);
                  const site = asSite(row.siteId);
                  return (
                    <tr key={row._id} className="border-b border-line last:border-0 hover:bg-canvas/60">
                      <td className="px-4 py-3 font-mono text-xs text-ink">{row.number}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">{company?.name ?? '—'}</div>
                        <div className="text-xs text-muted">{site?.siteName ?? ''}</div>
                      </td>
                      <td className="px-4 py-3 text-muted">{fmtDate(row.issueDate)}</td>
                      <td className="px-4 py-3 text-muted">{fmtDate(row.validityDate)}</td>
                      <td className="px-4 py-3 text-right font-medium text-ink">{fmtMoney(row.grandTotal)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[row.status] ?? ''}`}>
                          {STATUS_LABELS[row.status] ?? row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/marketing/proformas/${row._id}`}
                            className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-canvas"
                            title="Open proforma"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-canvas"
                            title="Print / save as PDF"
                            onClick={() => printProforma(row)}
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {row.status === 'DRAFT' && canIssue && (
                            <button
                              className="p-1.5 rounded-lg text-muted hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                              title="Issue proforma"
                              disabled={busyId === row._id}
                              onClick={() => void issue(row)}
                            >
                              <Send className="w-4 h-4" />
                            </button>
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
    </div>
  );
}
