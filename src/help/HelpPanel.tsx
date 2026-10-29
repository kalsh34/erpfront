import React, { useEffect, useMemo } from 'react';
import { X, Lightbulb, ListChecks, AlertTriangle, KeyRound, ArrowRight, PlayCircle, RotateCcw, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useHelp, PanelTab } from './HelpContext';
import { UserRole } from '../types';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  SYSTEM_ADMIN: 'System Admin',
  HR_ADMIN: 'HR Admin',
  FINANCE_OFFICER: 'Finance Officer',
  OPERATIONS: 'Operations',
  HEAD: 'Head',
  CEO: 'CEO',
  GUARD: 'Guard',
};

/** Humanizes a permission string: `guard-payroll.calculate` → "Guard payroll · Calculate". */
function permLabel(p: string): string {
  const [group, action] = p.split('.');
  return `${group.startsWith('office') ? 'staff payroll' : group.replace(/-/g, ' ')}${action ? ` · ${action}` : ''}`;
}

const IMPACT_STYLES: Record<string, string> = {
  irreversible: 'text-danger-text border-danger-line bg-danger-subtle',
  locking: 'text-warning-text border-warning-border bg-warning-subtle',
  statutory: 'text-info-text border-info-border bg-info-subtle',
};
const IMPACT_LABEL: Record<string, string> = {
  irreversible: 'Cannot be undone',
  locking: 'Locks data',
  statutory: 'Official step',
};

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted mb-2">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

export function HelpPanel() {
  const {
    routeGuide, panelOpen, closePanel, panelTab, setPanelTab,
    toursOnPage, startTour, restartTour, isTourCompleted, userRole,
  } = useHelp();

  // Esc handled globally; block page scroll while open like Modal does.
  useEffect(() => {
    if (!panelOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [panelOpen]);

  const guide = routeGuide?.guide;
  const myRoleLabel = userRole ? ROLE_LABELS[userRole] || userRole : '';

  const stepsText = useMemo(() => guide?.steps.map((s) => s.items).flat() ?? [], [guide]);

  if (!panelOpen) return null;

  return (
    <div className="fixed inset-0 z-50 animate-overlayIn" aria-modal="true" role="dialog" aria-label="Page guide">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={closePanel} />

      {/* Slide-over */}
      <aside
        className="absolute right-0 top-0 h-full w-full max-w-md bg-surface border-l border-line shadow-overlay flex flex-col animate-helpIn"
        data-tour-panel=""
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-line">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              Page guide{guide ? ` · ${guide.module}` : ''}
            </p>
            <h2 className="text-lg font-semibold text-ink leading-snug">
              {guide ? guide.title : 'This page'}
            </h2>
          </div>
          <button
            onClick={closePanel}
            className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-canvas transition-colors"
            aria-label="Close guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs: Guide | Tours on this page */}
        {toursOnPage.length > 0 && (
          <div className="flex gap-1 px-5 pt-3">
            {(['guide', 'tours'] as PanelTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setPanelTab(t)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  panelTab === t ? 'bg-primary-600 text-white' : 'text-muted hover:text-ink hover:bg-subtle'
                }`}
              >
                {t === 'guide' ? 'Guide' : `Tours (${toursOnPage.length})`}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!guide ? (
            <div className="text-sm text-muted mt-10 text-center">
              No specific guide for this page yet — try the Help Center for concepts and tours.
            </div>
          ) : panelTab === 'tours' ? (
            /* Tours tab */
            <div className="space-y-3">
              {toursOnPage.map((tour) => {
                const completed = isTourCompleted(tour.id);
                return (
                  <div key={tour.id} className="v-card p-4">
                    <div className="flex items-center gap-2">
                      <PlayCircle className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" />
                      <h4 className="text-sm font-semibold text-ink">{tour.title}</h4>
                      {completed && <CheckCircle2 className="w-4 h-4 text-success-text shrink-0" aria-label="Completed before" />}
                    </div>
                    <p className="text-xs text-muted mt-1 mb-3">{tour.description}</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => (completed ? restartTour(tour.id) : startTour(tour.id))}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                      >
                        {completed ? (<><RotateCcw className="w-3.5 h-3.5" /> Restart</>) : (<>Start tour · {tour.steps.length} steps</>)}
                      </button>
                      <span className="text-[11px] text-subtext">Nothing is clicked for you</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Guide tab */
            <>
              {/* Purpose */}
              <Section icon={<Lightbulb className="w-3.5 h-3.5" />} title="What this page is for">
                <p className="text-sm text-ink leading-relaxed">{guide.purpose}</p>
              </Section>

              {/* Prerequisites */}
              {guide.prerequisites.length > 0 && (
                <Section icon={<ListChecks className="w-3.5 h-3.5" />} title="Before you start">
                  <ul className="space-y-1.5">
                    {guide.prerequisites.map((p, i) => (
                      <li key={i} className="text-sm text-ink flex gap-2 leading-relaxed">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Steps */}
              {guide.steps.map((s, si) => (
                <Section key={si} icon={<span className="w-4 h-4 inline-flex items-center justify-center rounded-full bg-primary-600 text-white text-[9px] font-bold">{si + 1}</span>} title={s.title}>
                  <ol className="space-y-2.5">
                    {s.items.map((item, i) => (
                      <li key={i} className="text-sm text-ink leading-relaxed flex gap-2">
                        <span className="text-[10px] font-bold text-subtext mt-1 shrink-0">{si + 1}.{i + 1}</span>
                        <span>
                          {item.text}
                          {item.example && <span className="block mt-1 text-xs text-muted italic">{item.example}</span>}
                        </span>
                      </li>
                    ))}
                  </ol>
                </Section>
              ))}

              {/* Actions */}
              {guide.actions.length > 0 && (
                <Section icon={<KeyRound className="w-3.5 h-3.5" />} title="Actions & consequences">
                  <div className="space-y-2">
                    {guide.actions.map((a, i) => (
                      <div key={i} className="rounded-xl border border-line bg-canvas/60 p-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-ink">{a.label}</span>
                          {a.impact && (
                            <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md border ${IMPACT_STYLES[a.impact]}`}>
                              {IMPACT_LABEL[a.impact]}
                            </span>
                          )}
                          {a.requiresPermission && (
                            <span className="text-[10px] text-subtext" title={`Requires permission: ${a.requiresPermission}`}>
                              {permLabel(a.requiresPermission)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted mt-1 leading-relaxed">{a.does}</p>
                        {a.disabledWhen && <p className="text-[11px] text-subtext mt-1">{a.disabledWhen}</p>}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Common mistakes */}
              {guide.problems && guide.problems.items.length > 0 && (
                <Section icon={<AlertTriangle className="w-3.5 h-3.5" />} title={guide.problems.title}>
                  <ul className="space-y-2">
                    {guide.problems.items.map((m, i) => (
                      <li key={i} className="text-sm text-ink leading-relaxed flex gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                        {m.text}
                        {m.example && <span className="block text-xs text-muted italic">{m.example}</span>}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Who can use */}
              <Section icon={<ShieldCheck className="w-3.5 h-3.5" />} title="Who can use this page">
                <div className="flex flex-wrap gap-1.5">
                  {guide.roles.length === 0
                    ? <span className="text-xs text-muted">Every signed-in user</span>
                    : guide.roles.map((r: UserRole) => (
                      <span
                        key={r}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                          r === userRole
                            ? 'bg-primary-600/10 border-primary-500/40 text-primary-700 dark:text-primary-300'
                            : 'border-line text-muted'
                        }`}
                      >
                        {ROLE_LABELS[r] || r}{r === userRole ? ' (you)' : ''}
                      </span>
                    ))}
                </div>
                <p className="text-[11px] text-subtext mt-1.5">
                  {myRoleLabel ? 'Showing what your role can see and do. Guides never suggest actions outside your permissions.' : ''}
                </p>
              </Section>

              {/* Next steps */}
              {guide.next.length > 0 && (
                <Section icon={<ArrowRight className="w-3.5 h-3.5" />} title="Where to go next">
                  <div className="space-y-1.5">
                    {guide.next.map((n, i) => (
                      <NextStepLink key={i} label={n.label} route={n.route} note={n.note} />
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}
        </div>

        {/* Footer: restart tour */}
        {guide && toursOnPage.length > 0 && panelTab === 'guide' && (
          <div className="px-5 py-3 border-t border-line bg-canvas/60">
            <button
              onClick={() => setPanelTab('tours')}
              className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
            >
              Guided tours for this page ({toursOnPage.length}) →
            </button>
            <span className="text-[11px] text-subtext ml-2">{stepsText.length} steps documented</span>
          </div>
        )}
      </aside>
    </div>
  );
}

function NextStepLink({ label, route, note }: { label: string; route: string; note?: string }) {
  const { navigateWithGuide } = useHelp();
  return (
    <button
      onClick={() => navigateWithGuide(route)}
      className="w-full text-left flex items-start gap-2 group rounded-lg px-2 py-1.5 hover:bg-canvas transition-colors"
    >
      <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-primary-600 dark:text-primary-400 shrink-0" />
      <span>
        <span className="text-sm font-medium text-ink group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{label}</span>
        {note && <span className="block text-[11px] text-muted">{note}</span>}
      </span>
    </button>
  );
}

export default HelpPanel;
