/**
 * Vital-ERP Interactive User Guide system.
 *
 * - <HelpProvider>       mount once inside the router (see App.tsx)
 * - <HelpWidget />       floating ? button on every page
 * - <HelpPanel />        role-aware "Learn this page" side panel
 * - <TourOverlay />      guided tour spotlight engine
 * - <HelpCenter />       searchable help modal
 * - FieldHint/ActionHint contextual tooltips for forms & buttons
 *
 * Help content lives entirely in ./registry.ts — business logic-free and
 * safe to extend: add a PageGuide entry + a ROUTE_PATTERNS mapping for any
 * new page. Tours spotlight elements via data-tour="…" attributes and
 * degrade to centered cards when an anchor is absent.
 */
export { HelpProvider, useHelp } from './HelpContext';
export type { PanelTab } from './HelpContext';
export { HelpWidget } from './HelpWidget';
export { HelpPanel } from './HelpPanel';
export { TourOverlay } from './TourOverlay';
export { HelpCenter } from './HelpCenter';
export { FieldHint, ActionHint } from './FieldHelp';
export type { FieldHintProps, ActionHintProps } from './FieldHelp';
export {
  getRouteGuide,
  getGuideById,
  getToursForPath,
  getTourById,
  allGuidesForRole,
  allToursForRole,
  allArticlesForRole,
  isAdminRole,
} from './registry';
export type {
  PageGuide,
  Tour,
  TourStep,
  HelpArticle,
  HelpSection,
  HelpItem,
  ActionDoc,
  NextStep,
  RouteGuide,
} from './types';
