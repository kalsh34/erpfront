import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { UserRole } from '../types';
import { getRouteGuide, getTourById, getToursForPath } from './registry';
import type { PageGuide, RouteGuide, Tour } from './types';

/**
 * Per-user help progress, persisted in localStorage on this browser only.
 * Shape: { toursCompleted: string[], toursDismissed: string[] }.
 */
interface HelpProgress {
  toursCompleted: string[];
  toursDismissed: string[];
}

const STORAGE_KEY = 'vital-help-progress-v1';

function loadProgress(userId: string): HelpProgress {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const p = (raw && raw[userId]) as HelpProgress | undefined;
    return { toursCompleted: p?.toursCompleted || [], toursDismissed: p?.toursDismissed || [] };
  } catch {
    return { toursCompleted: [], toursDismissed: [] };
  }
}

function saveProgress(userId: string, p: HelpProgress) {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    raw[userId] = p;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
  } catch {
    // Storage unavailable (private mode) — progress just won't persist.
  }
}

export type PanelTab = 'guide' | 'tours';

interface TourRun {
  tourId: string;
  stepIndex: number;
}

interface HelpContextValue {
  userRole?: UserRole;
  /** Guide for the current route (null on routes without a guide). */
  routeGuide: RouteGuide | null;
  toursOnPage: Tour[];
  /** Side panel state */
  panelOpen: boolean;
  panelTab: PanelTab;
  openPanel: (tab?: PanelTab) => void;
  closePanel: () => void;
  setPanelTab: (t: PanelTab) => void;
  /** Help center modal */
  centerOpen: boolean;
  openCenter: () => void;
  closeCenter: () => void;
  /** Tour engine */
  activeTour: TourRun | null;
  startTour: (tourId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  /** Mark tour complete + finished flag */
  finishTour: (completed: boolean) => void;
  restartTour: (tourId: string) => void;
  /** Progress helpers */
  isTourCompleted: (tourId: string) => boolean;
  isTourDismissed: (tourId: string) => boolean;
  markTourCompleted: (tourId: string) => void;
  resetProgress: () => void;
  /** Exposed for widgets */
  navigateWithGuide: (route: string) => void;
  activeGuideForRoute: (route: string) => PageGuide | null;
}

const HelpContext = createContext<HelpContextValue | null>(null);

export function useHelp(): HelpContextValue {
  const ctx = useContext(HelpContext);
  if (!ctx) throw new Error('useHelp must be used inside <HelpProvider>');
  return ctx;
}

export function HelpProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const userRole = user?.role as UserRole | undefined;
  const location = useLocation();
  const navigate = useNavigate();

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>('guide');
  const [centerOpen, setCenterOpen] = useState(false);
  const [tourRun, setTourRun] = useState<TourRun | null>(null);
  const [progress, setProgress] = useState<HelpProgress>(() => ({ toursCompleted: [], toursDismissed: [] }));

  const userId = user?._id || 'anonymous';
  useEffect(() => {
    setProgress(loadProgress(userId));
  }, [userId]);

  const routeGuide = useMemo(
    () => getRouteGuide(location.pathname, userRole),
    [location.pathname, userRole]
  );
  const toursOnPage = useMemo(
    () => getToursForPath(location.pathname, userRole),
    [location.pathname, userRole]
  );

  const persist = useCallback(
    (next: HelpProgress) => {
      setProgress(next);
      saveProgress(userId, next);
    },
    [userId]
  );

  const openPanel = useCallback((tab: PanelTab = 'guide') => {
    setPanelTab(tab);
    setPanelOpen(true);
    setCenterOpen(false);
  }, []);
  const closePanel = useCallback(() => setPanelOpen(false), []);
  const openCenter = useCallback(() => {
    setCenterOpen(true);
    setPanelOpen(false);
    setTourRun(null);
  }, []);
  const closeCenter = useCallback(() => setCenterOpen(false), []);

  const startTour = useCallback((tourId: string) => {
    const tour = getTourById(tourId);
    if (!tour) return;
    setPanelOpen(false);
    setCenterOpen(false);
    setTourRun({ tourId, stepIndex: 0 });
  }, []);

  const nextStep = useCallback(() => {
    setTourRun((r) => {
      if (!r) return r;
      const tour = getTourById(r.tourId);
      if (!tour || r.stepIndex >= tour.steps.length - 1) return r;
      return { ...r, stepIndex: r.stepIndex + 1 };
    });
  }, []);

  const prevStep = useCallback(() => {
    setTourRun((r) => (r && r.stepIndex > 0 ? { ...r, stepIndex: r.stepIndex - 1 } : r));
  }, []);

  const finishTour = useCallback(
    (completed: boolean) => {
      setTourRun((r) => {
        if (r) {
          const base = completed ? progress.toursCompleted : progress.toursDismissed;
          const key = completed ? 'toursCompleted' : 'toursDismissed';
          if (!base.includes(r.tourId)) persist({ ...progress, [key]: [...base, r.tourId] });
        }
        return null;
      });
    },
    [progress, persist]
  );

  const skipTour = useCallback(() => finishTour(true), [finishTour]);
  const restartTour = useCallback(
    (tourId: string) => {
      // Drop from completed so widgets can offer it fresh.
      persist({ ...progress, toursCompleted: progress.toursCompleted.filter((t) => !t.startsWith(tourId)) });
      startTour(tourId);
    },
    [progress, persist, startTour]
  );

  const markTourCompleted = useCallback(
    (tourId: string) => {
      if (!progress.toursCompleted.includes(tourId)) {
        persist({ ...progress, toursCompleted: [...progress.toursCompleted, tourId] });
      }
    },
    [progress, persist]
  );

  const isTourCompleted = useCallback(
    (tourId: string) => progress.toursCompleted.some((t) => t === tourId),
    [progress]
  );
  const isTourDismissed = useCallback(
    (tourId: string) => progress.toursDismissed.some((t) => t === tourId),
    [progress]
  );

  const resetProgress = useCallback(() => {
    persist({ toursCompleted: [], toursDismissed: [] });
  }, [persist]);

  const navigateWithGuide = useCallback(
    (route: string) => {
      setPanelOpen(true);
      setCenterOpen(false);
      navigate(route);
    },
    [navigate]
  );

  const activeGuideForRoute = useCallback(
    (route: string) => getRouteGuide(route, userRole)?.guide ?? null,
    [userRole]
  );

  // Escape closes panel/center/tour (question mark shortcut is handled by the widget).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPanelOpen(false);
        setCenterOpen(false);
        if (tourRun) setTourRun(null);
      }
      const target = e.target as HTMLElement;
      const typing = /INPUT|TEXTAREA|SELECT/.test(target?.tagName || '') || target?.isContentEditable;
      if (!typing && e.key === '?' && !tourRun) {
        e.preventDefault();
        setPanelOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tourRun]);

  // Leaving the page ends any running tour (progress kept if it was mid-run).
  useEffect(() => {
    if (tourRun) setTourRun(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const value: HelpContextValue = {
    userRole,
    routeGuide,
    toursOnPage,
    panelOpen,
    panelTab,
    openPanel,
    closePanel,
    setPanelTab,
    centerOpen,
    openCenter,
    closeCenter,
    activeTour: tourRun,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    finishTour,
    restartTour,
    isTourCompleted,
    isTourDismissed,
    markTourCompleted,
    resetProgress,
    navigateWithGuide,
    activeGuideForRoute,
  };

  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
}
