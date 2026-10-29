import { UserRole } from '../types';

/**
 * One bullet-style entry ("what to type / click").
 */
export interface HelpItem {
  text: string;
  /** Extra example or validation note rendered under the bullet. */
  example?: string;
}

export interface HelpSection {
  title: string;
  items: HelpItem[];
}

/** An important button explained in the panel's "Actions" section. */
export interface ActionDoc {
  label: string;
  /** What the button does when everything is in order. */
  does: string;
  /** Shown only to users holding any of these permission strings (matching backend PERMISSIONS). */
  requiresPermission?: string;
  /** "irreversible" | "locking" | "locked" — drives a warning color in the UI. */
  impact?: 'irreversible' | 'locking' | 'statutory';
  /** Why the button may be disabled. */
  disabledWhen?: string;
}

export interface NextStep {
  label: string;
  route: string;
  note?: string;
}

/**
 * A full page guide rendered in the side panel.
 * `roles` mirrors the route's ProtectedRoute list — the panel only shows
 * guides for pages the user's role can reach.
 */
export interface PageGuide {
  id: string;
  module: string;
  title: string;
  purpose: string;
  /** What you must have in place before the page is useful. */
  prerequisites: string[];
  steps: HelpSection[];
  problems: HelpSection | null;
  actions: ActionDoc[];
  next: NextStep[];
  roles: UserRole[];
}

export interface TourStep {
  /** Short headline for the step card. */
  title: string;
  body: string;
  /** data-tour attribute value of the element to spotlight; omit for a centered card. */
  target?: string;
  /** Step shown only to these roles (defaults to the tour's roles). */
  roles?: UserRole[];
}

export interface Tour {
  id: string;
  title: string;
  description: string;
  /** Route prefixes where this tour can run. */
  routePrefixes: string[];
  /** Role gate — mirrors the page's ProtectedRoute. Steps can narrow further. */
  roles: UserRole[];
  steps: TourStep[];
}

/** Standalone help-center article (concept pages with no single route). */
export interface HelpArticle {
  id: string;
  module: string;
  title: string;
  keywords: string[];
  body: string[];
  roles?: UserRole[];
}

/** Result of resolving a URL to a page guide. */
export interface RouteGuide {
  guide: PageGuide;
  tourIds: string[];
}
