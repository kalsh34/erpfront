import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, PlayCircle, CheckCircle2, MousePointerClick } from 'lucide-react';
import { useHelp } from './HelpContext';
import { getTourById } from './registry';
import { UserRole } from '../types';

interface RectBox { top: number; left: number; width: number; height: number; }

const PAD = 8;
const CARD_W = 340;

/**
 * Guided tour overlay. Each step points at an element found by
 * [data-tour="<target>"]; missing anchors degrade to a centered card.
 * The tour never activates business controls — it only highlights, scrolls
 * and explains. Keyboard: ← → Enter, Esc exits.
 */
export function TourOverlay() {
  const { activeTour, nextStep, prevStep, finishTour, userRole } = useHelp();
  const tour = activeTour ? getTourById(activeTour.tourId) : null;
  const step = tour && activeTour ? tour.steps[activeTour.stepIndex] : null;

  const [targetRect, setTargetRect] = useState<RectBox | null>(null);
  const [spotlightOk, setSpotlightOk] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const visibleSteps = tour
    ? tour.steps.filter((s) => !s.roles || (userRole && (s.roles.includes(userRole) || userRole === UserRole.SUPER_ADMIN)))
    : [];
  // Map from full step list index → filtered index for counter display
  const filteredIndex = step ? visibleSteps.indexOf(step) : -1;

  const measure = useCallback(() => {
    if (!step || !step.target) { setTargetRect(null); setSpotlightOk(false); return; }
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) { setTargetRect(null); setSpotlightOk(false); return; }
    const r = el.getBoundingClientRect();
    const box: RectBox = { top: r.top, left: r.left, width: r.width, height: r.height };
    setTargetRect(box);
    setSpotlightOk(true);
    // Bring the element into view (center) without clicking it.
    (el as HTMLElement).scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [step]);

  // Re-measure when step changes, after layout, and on resize/scroll.
  useLayoutEffect(() => { measure(); }, [measure, activeTour?.stepIndex]);
  useEffect(() => {
    if (!activeTour) return;
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('scroll', onResize, true); };
  }, [activeTour, measure]);

  // Keyboard navigation
  useEffect(() => {
    if (!activeTour || !tour) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') nextStep();
      if (e.key === 'ArrowLeft') prevStep();
      if (filteredIndex >= visibleSteps.length - 1 && (e.key === 'ArrowRight' || e.key === 'Enter')) finishTour(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeTour, tour, nextStep, prevStep, finishTour, filteredIndex, visibleSteps.length]);

  if (!activeTour || !tour || !step) return null;

  const isFirst = filteredIndex <= 0;
  const isLast = filteredIndex >= visibleSteps.length - 1;

  // Card placement near the target (clamped to viewport), else centered.
  let cardStyle: React.CSSProperties | undefined;
  let placementClass = '';
  if (targetRect && spotlightOk) {
    const below = targetRect.top + 8;
    const cardH = 220; // estimate for clamping
    const spaceBelow = window.innerHeight - below;
    const underTarget = spaceBelow > cardH;
    const top = underTarget
      ? Math.min(below, window.innerHeight - cardH - 16)
      : Math.max(16, Math.min(targetRect.top - 8 - cardH, window.innerHeight - cardH - 16));
    const left = Math.max(16, Math.min(targetRect.left, window.innerWidth - CARD_W - 16));
    cardStyle = { top, left, width: CARD_W };
    placementClass = underTarget ? '' : '';
  } else {
    placementClass = 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2';
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={`Guided tour: ${tour.title}`}>
      {/* Spotlight: translucent dark cover with a cutout hole over the target */}
      {targetRect && spotlightOk ? (
        <div className="absolute inset-0 bg-ink/50 transition-all duration-300" style={{ pointerEvents: 'none' }} />
      ) : (
        <div className="absolute inset-0 bg-ink/50" style={{ pointerEvents: 'auto' }} onClick={() => {}} />
      )}

      {targetRect && spotlightOk && (
        <div
          className="absolute rounded-xl ring-4 ring-primary-500/70 shadow-[0_0_0_9999px_rgba(15,23,42,0.55)] transition-all duration-300 pointer-events-none"
          style={{
            top: targetRect.top - PAD,
            left: targetRect.left - PAD,
            width: targetRect.width + PAD * 2,
            height: targetRect.height + PAD * 2,
          }}
        />
      )}

      {/* Step card */}
      <div
        ref={cardRef}
        className={`absolute v-card shadow-overlay p-4 ${placementClass}`}
        style={cardStyle ?? { width: CARD_W }}
        role="status"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <PlayCircle className="w-4 h-4 mt-0.5 text-primary-600 dark:text-primary-400 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-ink leading-snug">{step.title}</h3>
              <p className="text-[10px] uppercase tracking-wider text-subtext font-semibold mt-0.5">
                {tour.title} · Step {filteredIndex + 1} of {visibleSteps.length}
              </p>
            </div>
          </div>
          <button
            onClick={() => finishTour(true)}
            className="p-1 rounded-lg text-muted hover:text-ink hover:bg-canvas transition-colors shrink-0"
            aria-label="Exit tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <p className="text-sm text-ink leading-relaxed mt-3">{step.body}</p>

        {targetRect && spotlightOk && (
          <p className="text-[11px] text-muted mt-2 flex items-center gap-1.5">
            <MousePointerClick className="w-3 h-3" /> The highlighted element is yours to use — the tour never clicks for you.
          </p>
        )}
        {!spotlightOk && step.target && (
          <p className="text-[11px] text-subtext mt-2">
            This element is not visible on the screen right now — continue and it may appear.
          </p>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-line">
          <button
            onClick={() => finishTour(true)}
            className="text-xs text-muted hover:text-ink transition-colors"
          >
            {isLast ? 'Finish' : 'Skip tour'}
          </button>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 mr-1">
              {visibleSteps.map((_, i) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === filteredIndex ? 'bg-primary-600' : 'bg-line-strong'}`} />
              ))}
            </div>
            <button
              onClick={prevStep}
              disabled={isFirst}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-line text-ink hover:bg-canvas transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button
              onClick={() => (isLast ? finishTour(true) : nextStep())}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
            >
              {isLast ? (<><CheckCircle2 className="w-3.5 h-3.5" /> Done</>) : (<>Next <ChevronRight className="w-3.5 h-3.5" /></>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TourOverlay;
