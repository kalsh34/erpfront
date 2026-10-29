import React, { useEffect, useState } from 'react';
import { HelpCircle, BookOpen, Compass, X } from 'lucide-react';
import { useHelp } from './HelpContext';

/**
 * The floating ? control present on every implemented page. Opens:
 *  - the page guide for the current route (primary action),
 *  - guided tours available on this page,
 *  - the global Help Center.
 * Deliberately unobtrusive: 40px circle, bottom-right, themed, keyboard
 * accessible, with a tooltip on hover.
 */
export function HelpWidget() {
  const { routeGuide, toursOnPage, openPanel, openCenter, startTour } = useHelp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pulse, setPulse] = useState(false);

  // A gentle one-time invitation on the very first visit (per browser).
  useEffect(() => {
    try {
      if (!localStorage.getItem('vital-help-widget-seen')) {
        setPulse(true);
        localStorage.setItem('vital-help-widget-seen', '1');
        const timer = setTimeout(() => setPulse(false), 6000);
        return () => clearTimeout(timer);
      }
    } catch {
      /* private mode */
    }
  }, []);

  const hasTours = toursOnPage.length > 0;
  if (!routeGuide && !hasTours) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2 print:hidden">
      {menuOpen && (
        <div className="v-card p-1.5 w-60 animate-modalIn origin-bottom-right" role="menu" aria-label="Help options">
          <MenuItem
            icon={<HelpCircle className="w-4 h-4" />}
            label="Learn this page"
            sub={routeGuide?.guide.title}
            onClick={() => { setMenuOpen(false); openPanel('guide'); }}
          />
          {hasTours && (
            <MenuItem
              icon={<Compass className="w-4 h-4" />}
              label={`Guided tour${toursOnPage.length > 1 ? 's' : ''} (${toursOnPage.length})`}
              sub={toursOnPage[0].title}
              onClick={() => { setMenuOpen(false); startTour(toursOnPage[0].id); }}
            />
          )}
          <MenuItem
            icon={<BookOpen className="w-4 h-4" />}
            label="Help Center"
            sub="Search all guides & tours"
            onClick={() => { setMenuOpen(false); openCenter(); }}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        {pulse && (
          <span className="hidden sm:block text-xs font-medium text-ink bg-surface border border-line rounded-lg px-2.5 py-1.5 shadow-card animate-modalIn">
            New here? Learn any page in one click
            <button className="ml-1.5 text-subtext hover:text-ink" onClick={() => setPulse(false)} aria-label="Dismiss tip"><X className="w-3 h-3 inline" /></button>
          </span>
        )}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className={`w-10 h-10 rounded-full bg-primary-600 text-white shadow-overlay hover:bg-primary-700 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 dark:focus:ring-offset-surface ${pulse ? 'animate-bounce' : ''}`}
          aria-label="Help for this page"
          aria-expanded={menuOpen}
          title="Help for this page (?)"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}

function MenuItem({ icon, label, sub, onClick }: { icon: React.ReactNode; label: string; sub?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="menuitem"
      className="w-full flex items-start gap-2.5 px-3 py-2 rounded-xl hover:bg-canvas transition-colors text-left"
    >
      <span className="mt-0.5 text-primary-600 dark:text-primary-400 shrink-0">{icon}</span>
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {sub && <span className="block text-[11px] text-muted truncate max-w-[13rem]">{sub}</span>}
      </span>
    </button>
  );
}

export default HelpWidget;
