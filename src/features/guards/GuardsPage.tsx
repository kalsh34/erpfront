import { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import { Button, LoadingSpinner, Modal, InfoTooltip } from '../../components/ui';
import { formatDate, useLang, useT, type DictKey, type TParams } from '../../i18n';
import GuardImportModal from './GuardImportModal';
import { FileSpreadsheet } from 'lucide-react';

type T = (key: DictKey, params?: TParams) => string;

type AssignmentFilter = 'all' | 'assigned' | 'unassigned';
type StatusFilter = 'all' | 'active' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';

interface GuardEmployee {
  _id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  status: string;
}

interface GuardProfile {
  position: string;
  employmentType: string;
  rate?: number;
  transportAllowance?: number;
}

interface GuardAssignment {
  _id: string;
  siteId: { siteName: string; siteCode: string; _id: string } | string | null;
  role: string;
  hourlyRate: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isCurrent: boolean;
  isPrimary?: boolean;
  standardMonthlyHours?: number;
}

interface GuardData {
  employee: GuardEmployee;
  profile: GuardProfile | null;
  currentAssignments: GuardAssignment[];
}

/** Semantic status palette — theme tokens so chips read correctly in both themes. */
const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-success-subtle text-success-text border border-success-line',
  CONTRACTED: 'bg-info-subtle text-info-text border border-info-line',
  INACTIVE: 'bg-subtle text-muted border border-line',
  ON_LEAVE: 'bg-warning-subtle text-warning-text border border-warning-line',
  TERMINATED: 'bg-danger-subtle text-danger-text border border-danger-line',
};
const STATUS_STYLE_FALLBACK = 'bg-subtle text-muted border border-line';

const STATUS_LABEL_KEYS: Record<string, DictKey> = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  CONTRACTED: 'guardStatusContracted',
  ON_LEAVE: 'guardStatusOnLeave',
  TERMINATED: 'guardStatusTerminated',
};

const POSITION_LABEL_KEYS: Record<string, DictKey> = {
  GUARD: 'guard',
  SITE_LEADER: 'roleLabelSupervisor',
};

const EMPLOYMENT_LABEL_KEYS: Record<string, DictKey> = {
  PERMANENT: 'employmentPermanent',
  CONTRACT: 'employmentContract',
  TEMPORARY: 'employmentTemporary',
};

function statusLabel(status: string, t: T): string {
  const key = STATUS_LABEL_KEYS[status];
  return key ? t(key) : status;
}

export default function GuardsPage() {
  const t = useT();
  const lang = useLang();
  const [guards, setGuards] = useState<GuardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('all');
  const [siteFilter, setSiteFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedGuard, setSelectedGuard] = useState<string | null>(null);
  const [sites, setSites] = useState<any[]>([]);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignSiteId, setAssignSiteId] = useState('');
  const [assignFrom, setAssignFrom] = useState(new Date().toLocaleDateString('en-CA'));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>({});
  const [history, setHistory] = useState<GuardAssignment[]>([]);
  const [correction, setCorrection] = useState<GuardAssignment | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [primaryTarget, setPrimaryTarget] = useState<string | null>(null);

  const [relieveTarget, setRelieveTarget] = useState<{ assignmentId: string; siteName: string } | null>(null);

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    setHistory([]);
    if (selectedGuard) api.get(`/guards/${selectedGuard}/sites`).then((r) => setHistory(r.data.data || []))
      .catch((e) => setFeedback({ error: e.response?.data?.message || 'Unable to load assignment history.' }));
  }, [selectedGuard, guards]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [gRes, sRes] = await Promise.all([api.get('/guards'), api.get('/sites')]);
      setGuards(gRes.data.data || []);
      setSites(sRes.data.data || []);
    } catch (e: any) { setFeedback({ error: e.response?.data?.message || 'Unable to load guards. Please retry.' }); }
    finally { setLoading(false); }
  };

  const selectedGuardData = useMemo(() => {
    if (!selectedGuard) return null;
    return guards.find((g) => g.employee._id === selectedGuard) || null;
  }, [guards, selectedGuard]);

  const filteredGuards = useMemo(() => {
    let list = guards;
    if (assignmentFilter === 'assigned') list = list.filter((g) => g.currentAssignments.length > 0);
    if (assignmentFilter === 'unassigned') list = list.filter((g) => g.currentAssignments.length === 0);
    if (siteFilter) {
      list = list.filter((g) => g.currentAssignments.some(
        (a) => (typeof a.siteId === 'object' && a.siteId ? a.siteId._id : a.siteId) === siteFilter
      ));
    }
    if (statusFilter !== 'all') {
      list = list.filter((g) => (statusFilter === 'active'
        ? g.employee.status === 'ACTIVE' || g.employee.status === 'CONTRACTED'
        : g.employee.status === statusFilter));
    }
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((g) =>
      g.employee.firstName.toLowerCase().includes(q) ||
      g.employee.lastName.toLowerCase().includes(q) ||
      g.employee.employeeCode.toLowerCase().includes(q)
    );
  }, [guards, search, assignmentFilter, siteFilter, statusFilter]);

  const assignedCount = useMemo(() => guards.filter((g) => g.currentAssignments.length > 0).length, [guards]);
  const unassignedCount = guards.length - assignedCount;

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setAssignSiteId('');
  };

  const handleAssign = async () => {
    if (!selectedGuard || !assignSiteId) return;
    setSaving(true);
    try {
      await api.post('/guards/assign-site', { guardId: selectedGuard, siteId: assignSiteId, effectiveFrom: assignFrom, role: 'GUARD' });
      closeAssignModal();
      await loadData();
      setFeedback({ success: 'Site assigned. Payroll uses effective site compensation, not the legacy profile rate.' });
    } catch (e: any) { setFeedback({ error: e.response?.data?.message || t('guardsFailedAssign') }); }
    finally { setSaving(false); }
  };

  const handleRelieve = async (assignmentId: string) => {
    setSaving(true);
    try {
      await api.delete(`/guards/site-assignment/${assignmentId}`);
      setRelieveTarget(null);
      await loadData();
      setFeedback({ success: 'Assignment closed with history retained. If this was primary, explicitly select the next primary site.' });
    } catch (e: any) { setFeedback({ error: e.response?.data?.message || t('guardsFailedRelieve') }); }
    finally { setSaving(false); }
  };

  const handleMakePrimary = async (siteId: string) => {
    setSaving(true);
    try {
      await api.put(`/guards/${selectedGuard}/primary-site`, { siteId });
      await loadData();
      setPrimaryTarget(null);
      setFeedback({ success: 'Primary role change scheduled for tomorrow. Prior roles and dates are retained; a mid-month change will require segmented payroll.' });
    } catch (e: any) { setFeedback({ error: e.response?.data?.message || t('guardsFailedSetPrimary') }); }
    finally { setSaving(false); }
  };

  const getInitials = (f: string, l: string) => `${f?.[0] || ''}${l?.[0] || ''}`.toUpperCase();

  // populate('siteId') returns null when the site document no longer exists —
  // guard against it (typeof null === 'object' would otherwise crash the page).
  const siteExists = (sid: GuardAssignment['siteId']) => typeof sid === 'object' && sid !== null;
  const getSiteName = (sid: GuardAssignment['siteId']) => (siteExists(sid) ? (sid as { siteName: string }).siteName : null);
  const getSiteCode = (sid: GuardAssignment['siteId']) => (siteExists(sid) ? (sid as { siteCode: string }).siteCode : '');
  const getSiteId = (sid: GuardAssignment['siteId']) => (siteExists(sid) ? (sid as { _id: string })._id : sid) || null;

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] relative">
      {(feedback.error || feedback.success) && <div role="status" className={`absolute top-2 right-4 z-40 max-w-xl p-3 rounded-xl border text-sm ${feedback.error ? 'bg-danger-subtle text-danger-text border-danger-line' : 'bg-success-subtle text-success-text border-success-line'}`}>
        {feedback.error || feedback.success}<button aria-label="Dismiss message" className="ml-3" onClick={() => setFeedback({})}>×</button>
      </div>}
      {/* Left Sidebar — Guard List */}
      <div className="w-80 flex-shrink-0 bg-surface border-r border-line flex flex-col" data-tour="guards-roster">
        <div className="p-5 border-b border-line">
          <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">{t('guardsRosterTitle')}</h2>
                <p className="text-xs text-primary-100 mt-1">{t('guardsTotalPersonnel', { count: guards.length })}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-sm transition-colors flex items-center gap-1.5 shadow-sm"
                title="Import Guard Roster from Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import</span>
              </button>
            </div>
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-subtext" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={t('guardsSearchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-10 pr-4 rounded-xl border border-line bg-surface text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
            />
          </div>

          {/* Filters: assignment state, site, status */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <select
              value={assignmentFilter}
              onChange={(e) => setAssignmentFilter(e.target.value as AssignmentFilter)}
              className="h-9 rounded-xl border border-line bg-surface text-xs text-ink px-2 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="all">{t('guardsFilterAllAssignment', { assigned: assignedCount, unassigned: unassignedCount })}</option>
              <option value="assigned">{t('guardsFilterAssigned')}</option>
              <option value="unassigned">{t('guardsFilterUnassigned')}</option>
            </select>
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="h-9 rounded-xl border border-line bg-surface text-xs text-ink px-2 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">{t('guardsFilterAllSites')}</option>
              {sites.map((s: any) => (
                <option key={s._id} value={s._id}>{s.siteName}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="h-9 rounded-xl border border-line bg-surface text-xs text-ink px-2 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="all">{t('guardsFilterAllStatus')}</option>
              <option value="active">{t('guardsFilterStatusActive')}</option>
              <option value="INACTIVE">{t('inactive')}</option>
              <option value="ON_LEAVE">{t('guardStatusOnLeave')}</option>
              <option value="TERMINATED">{t('guardStatusTerminated')}</option>
            </select>
            {(assignmentFilter !== 'all' || siteFilter || statusFilter !== 'all' || search) && (
              <button
                type="button"
                onClick={() => {
                  setAssignmentFilter('all');
                  setSiteFilter('');
                  setStatusFilter('all');
                  setSearch('');
                }}
                className="h-9 rounded-xl border border-line text-xs text-muted hover:bg-subtle transition-colors"
              >
                {t('guardsFilterClear')} ({filteredGuards.length})
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredGuards.length === 0 ? (
            <div className="py-12 text-center text-sm text-subtext">{t('guardsNoGuardsFound')}</div>
          ) : (
            <div className="divide-y divide-line">
              {filteredGuards.map((guard) => {
                const isSelected = selectedGuard === guard.employee._id;
                const siteCount = guard.currentAssignments.length;
                return (
                  <button
                    key={guard.employee._id}
                    onClick={() => setSelectedGuard(guard.employee._id)}
                    className={`w-full text-left px-5 py-3.5 hover:bg-surface-hover transition-colors ${
                      isSelected
                        ? 'bg-primary-500/10 border-l-[3px] border-l-primary-600 dark:border-l-primary-400'
                        : 'border-l-[3px] border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {getInitials(guard.employee.firstName, guard.employee.lastName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{guard.employee.firstName} {guard.employee.lastName}</p>
                        <p className="text-[11px] text-subtext truncate">
                          {siteCount > 0 ? t('guardsSitesCount', { count: siteCount }) : t('guardsUnassigned')}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-medium border ${STATUS_STYLES[guard.employee.status] || STATUS_STYLE_FALLBACK}`}>
                            {statusLabel(guard.employee.status, t)}
                          </span>
                          <span className="text-[10px] text-subtext">{guard.employee.employeeCode}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Content — Selected Guard Detail */}
      <div className="flex-1 overflow-y-auto bg-canvas p-6">
        {selectedGuardData ? (
          <div className="max-w-3xl mx-auto space-y-6" data-tour="guards-detail">
            {/* Guard Profile Header */}
            <div className="bg-surface rounded-2xl border border-line shadow-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                    {getInitials(selectedGuardData.employee.firstName, selectedGuardData.employee.lastName)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-ink">
                      {selectedGuardData.employee.firstName} {selectedGuardData.employee.lastName}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-xs text-subtext font-mono">{selectedGuardData.employee.employeeCode}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${STATUS_STYLES[selectedGuardData.employee.status] || STATUS_STYLE_FALLBACK}`}>
                        {statusLabel(selectedGuardData.employee.status, t)}
                      </span>
                      {selectedGuardData.profile?.position && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300 border border-primary-200 dark:border-primary-500/30">
                          {POSITION_LABEL_KEYS[selectedGuardData.profile.position]
                            ? t(POSITION_LABEL_KEYS[selectedGuardData.profile.position])
                            : selectedGuardData.profile.position}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted">
                      {selectedGuardData.employee.phone && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {selectedGuardData.employee.phone}
                        </span>
                      )}
                      {selectedGuardData.employee.email && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {selectedGuardData.employee.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button onClick={() => setShowAssignModal(true)}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t('guardsAssignGuard')}
                </Button>
              </div>
            </div>

            {/* Site Assignments */}
            <div className="bg-surface rounded-2xl border border-line shadow-card overflow-hidden">
              <div className="px-6 py-4 border-b border-line">
                <h3 className="text-sm font-bold text-ink">{t('guardsSiteAssignments', { count: selectedGuardData.currentAssignments.length })}</h3>
              </div>
              {selectedGuardData.currentAssignments.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="w-12 h-12 rounded-xl bg-subtle flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-subtext" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted font-medium">{t('guardsNoSiteAssignments')}</p>
                  <p className="text-xs text-subtext mt-1">{t('guardsAssignToSiteHint')}</p>
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="mt-3 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
                  >
                    {t('guardsAssignToSite')}
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {selectedGuardData.currentAssignments.map((a) => {
                    const siteNameLabel = getSiteName(a.siteId);
                    const siteCodeLabel = getSiteCode(a.siteId);
                    const siteGone = siteNameLabel === null;
                    return (
                      <div key={a._id} className="px-6 py-4 hover:bg-surface-hover transition-colors">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${siteGone ? 'bg-danger-subtle' : 'bg-info-subtle'}`}>
                              <svg className={`w-5 h-5 ${siteGone ? 'text-danger-text' : 'text-info-text'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                {siteGone ? (
                                  <>
                                    <p className="text-sm font-semibold text-danger-text">{t('guardsSiteDeleted')}</p>
                                    <span
                                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-danger-subtle text-danger-text border border-danger-line"
                                      title={t('guardsBrokenLinkTitle')}
                                    >
                                      {t('guardsBrokenLink')}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-sm font-semibold text-ink">{siteNameLabel}</p>
                                    {siteCodeLabel && <span className="text-[10px] text-subtext font-mono">{siteCodeLabel}</span>}
                                    {a.isPrimary && (
                                      <span
                                        className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-info-subtle text-info-text border border-info-line"
                                        title={t('guardsPrimaryTitle')}
                                      >
                                        {t('guardsPrimary')}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    a.role === 'SUPERVISOR'
                                      ? 'bg-warning-subtle text-warning-text border border-warning-line'
                                      : 'bg-subtle text-muted border border-line'
                                  }`}
                                >
                                  {a.role === 'SUPERVISOR' ? t('roleLabelSupervisor') : t('guard')}
                                </span>
                                <span>Legacy rate (not payroll): {a.hourlyRate > 0 ? `ETB ${a.hourlyRate.toFixed(2)}/h` : 'Not set'}</span>
                                <span>{t('guardsSince', { date: formatDate(lang, a.effectiveFrom) })}</span>
                                {a.standardMonthlyHours && <span>{t('guardsHoursPerMonth', { hours: a.standardMonthlyHours })}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!siteGone && !a.isPrimary && (
                              <button
                                onClick={() => setPrimaryTarget(typeof a.siteId === 'object' && a.siteId ? a.siteId._id : (a.siteId || ''))}
                                disabled={saving}
                                className="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-info-line bg-surface text-info-text text-xs font-medium hover:bg-info-subtle transition-colors disabled:opacity-50"
                                title={t('guardsMakePrimaryTitle')}
                              >
                                {t('guardsMakePrimary')}
                              </button>
                            )}
                            <button
                              onClick={() => setRelieveTarget({ assignmentId: a._id, siteName: siteNameLabel || t('guardsDeletedSite') })}
                              className="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-danger-line bg-surface text-danger-text text-xs font-medium hover:bg-danger-subtle transition-colors"
                              title={t('guardsRelieveTitle')}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                              </svg>
                              {t('guardsRelieve')}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-surface rounded-2xl border border-line p-5 space-y-3">
              <h3 className="text-sm font-bold text-ink">Effective assignment history</h3>
              <p className="text-xs text-muted">Dates are inclusive. Primary flags describe historical roles, not just today. Corrections retain records and require a reason; finalized periods are protected.</p>
              {history.map((a) => <div key={a._id} className="flex flex-wrap justify-between gap-2 border-t border-line pt-2 text-xs text-ink">
                <div><b>{getSiteName(a.siteId) || 'Unavailable site'}</b> · {a.isPrimary ? 'Primary' : 'Additional'}<br />{a.effectiveFrom.slice(0, 10)} → {a.effectiveTo?.slice(0, 10) || 'Open-ended'}<small className="block text-muted">{a._id}</small></div>
                <Button size="sm" variant="secondary" onClick={() => { setCorrection(a); setCorrectionReason(''); }}>Correct history</Button>
              </div>)}
            </div>
            {/* Rate Summary */}
            {selectedGuardData.currentAssignments.length > 0 && (
              <div className="bg-surface rounded-2xl border border-line shadow-card p-6">
                <h3 className="text-sm font-bold text-ink mb-3">{t('guardsRateSummary')}</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 rounded-xl bg-subtle">
                    <p className="text-[10px] text-subtext uppercase tracking-wider font-semibold">{t('guardsProfileRate')}</p>
                    <p className="text-lg font-bold text-ink mt-0.5">{selectedGuardData.profile?.rate ? `$${selectedGuardData.profile.rate.toFixed(2)}` : '—'}</p>
                    <p className="text-[10px] text-subtext">{t('guardsPerHour')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-subtle">
                    <p className="text-[10px] text-subtext uppercase tracking-wider font-semibold">{t('guardsTransportAllowance')}</p>
                    <p className="text-lg font-bold text-ink mt-0.5">{selectedGuardData.profile?.transportAllowance ? `$${selectedGuardData.profile.transportAllowance.toFixed(2)}` : '—'}</p>
                    <p className="text-[10px] text-subtext">{t('guardsPerMonth')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-subtle">
                    <p className="text-[10px] text-subtext uppercase tracking-wider font-semibold">{t('guardsEmployment')}</p>
                    <p className="text-lg font-bold text-ink mt-0.5">
                      {selectedGuardData.profile?.employmentType
                        ? EMPLOYMENT_LABEL_KEYS[selectedGuardData.profile.employmentType]
                          ? t(EMPLOYMENT_LABEL_KEYS[selectedGuardData.profile.employmentType])
                          : selectedGuardData.profile.employmentType
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 rounded-2xl bg-subtle flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-subtext" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm text-subtext">{t('guardsSelectPrompt')}</p>
          </div>
        )}
      </div>

      {primaryTarget && <Modal open onClose={() => setPrimaryTarget(null)} title="Schedule primary-site change" size="md">
        <p className="text-sm text-muted mb-4">The old role ends today and the new primary role starts tomorrow. Attendance stays at its recorded site. Monthly totals spanning the change cannot be priced without segmented payroll.</p>
        <Button onClick={() => handleMakePrimary(primaryTarget)} disabled={saving}>Confirm effective role change</Button>
      </Modal>}
      {correction && <Modal open onClose={() => setCorrection(null)} title="Audited assignment correction" size="md">
        <div className="space-y-3">
          <label className="v-label">Effective from (inclusive)<input aria-label="Correction start date" type="date" className="v-input" value={correction.effectiveFrom.slice(0, 10)} onChange={(e) => setCorrection({ ...correction, effectiveFrom: e.target.value })} /></label>
          <label className="v-label">Effective to (inclusive, blank = open)<input aria-label="Correction end date" type="date" className="v-input" value={correction.effectiveTo?.slice(0, 10) || ''} onChange={(e) => setCorrection({ ...correction, effectiveTo: e.target.value })} /></label>
          <label className="flex gap-2 text-sm text-ink"><input type="checkbox" checked={!!correction.isPrimary} onChange={(e) => setCorrection({ ...correction, isPrimary: e.target.checked })} />Primary during this interval</label>
          <label className="v-label">Reason<textarea aria-label="Assignment correction reason" className="v-input" value={correctionReason} onChange={(e) => setCorrectionReason(e.target.value)} /></label>
          <Button disabled={saving || !correctionReason.trim()} onClick={async () => {
            setSaving(true);
            try { await api.put(`/guards/site-assignment/${correction._id}/history`, { effectiveFrom: correction.effectiveFrom.slice(0, 10), effectiveTo: correction.effectiveTo?.slice(0, 10) || null, isPrimary: !!correction.isPrimary, reason: correctionReason }); setCorrection(null); await loadData(); setFeedback({ success: 'Assignment history corrected and audited; recalculate affected editable payroll.' }); }
            catch (e: any) { setFeedback({ error: e.response?.data?.message || 'Correction failed. Check overlapping dates and payroll locks.' }); }
            finally { setSaving(false); }
          }}>Save audited correction</Button>
        </div>
      </Modal>}
      {/* Assign Modal */}
      {showAssignModal && selectedGuardData && (
        <Modal open onClose={closeAssignModal} title={t('guardsAssignSiteTitle')} size="md">
          <p className="text-sm text-muted mb-4">
            {selectedGuardData.employee.firstName} {selectedGuardData.employee.lastName}
          </p>

          <label className="v-label mb-4">Assignment start date<input aria-label="Assignment start date" type="date" className="v-input" value={assignFrom} onChange={e => setAssignFrom(e.target.value)} /></label>
          {selectedGuardData.currentAssignments.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">{t('guardsCurrentlyAssigned')}</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedGuardData.currentAssignments.map((a) => (
                  <span key={a._id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-info-subtle text-info-text text-[11px] font-medium border border-info-line">
                    {getSiteName(a.siteId) || t('guardsDeletedSite')}
                    <span className="opacity-70">
                      ({a.role === 'SUPERVISOR' ? t('roleLabelGuardShort') : t('guard')})
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <label className="v-label v-label--required !mb-0">{t('guardsNewSite')}</label>
              <InfoTooltip content={t('guardsAlwaysAssignedAsGuard')} />
            </div>
            <select
              value={assignSiteId}
              onChange={(e) => setAssignSiteId(e.target.value)}
              className="v-input"
            >
              <option value="">{t('guardsSelectSite')}</option>
              {sites
                .filter((s: any) => {
                  const assigned = new Set(selectedGuardData.currentAssignments.map((a) => getSiteId(a.siteId)));
                  return !assigned.has(s._id);
                })
                .map((s: any) => (
                  <option key={s._id} value={s._id}>
                    {s.siteName} ({s.siteCode})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={closeAssignModal} className="flex-1">
              {t('cancel')}
            </Button>
            <Button onClick={handleAssign} disabled={saving || !assignSiteId} className="flex-1">
              {saving ? t('guardsAssigning') : t('guardsAssign')}
            </Button>
          </div>
        </Modal>
      )}

      {/* Relieve Confirmation Modal */}
      {relieveTarget && (
        <Modal open onClose={() => setRelieveTarget(null)} title={t('guardsRelieveTitleFor', { site: relieveTarget.siteName })} size="md">
          <p className="text-sm text-muted mb-4">
            {t('guardsRelieveBody', {
              guard: `${selectedGuardData?.employee.firstName || ''} ${selectedGuardData?.employee.lastName || ''}`.trim(),
              site: relieveTarget.siteName,
            })}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setRelieveTarget(null)} className="flex-1">
              {t('cancel')}
            </Button>
            <Button variant="danger" onClick={() => handleRelieve(relieveTarget.assignmentId)} disabled={saving} className="flex-1">
              {saving ? t('guardsRelieving') : t('guardsConfirmRelieve')}
            </Button>
          </div>
        </Modal>
      )}
      <GuardImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
