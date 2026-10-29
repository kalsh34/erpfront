export type RotationStatus =
  | 'DRAFT' | 'GENERATING' | 'GENERATED' | 'REVIEW' | 'APPROVED'
  | 'PUBLISHED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';

export interface SiteRef { _id: string; siteName: string; siteCode: string; }

export interface GuardPoolEntry {
  guardId: { _id: string; firstName: string; lastName: string; employeeCode: string; status: string } | string;
  status: string;
  order: number;
}

export interface ShiftDefinition {
  key: string;
  name: string;
  startTime: string;
  endTime: string;
  requiredCount: number;
}

export interface RestRule { maxShiftHours: number; minRestHours: number; }

export interface Rotation {
  _id: string;
  name: string;
  description?: string;
  siteId: SiteRef | string;
  guardPool: GuardPoolEntry[];
  floaterPool: any[];
  shiftMode: 'STANDARD_12H' | 'SINGLE_24H' | 'CUSTOM';
  shiftDefinitions: ShiftDefinition[];
  dayShiftCount: number;
  nightShiftCount: number;
  dayStartTime: string;
  dayEndTime?: string;
  nightStartTime?: string;
  nightEndTime: string;
  restRules: RestRule[];
  startDate: string;
  endDate?: string;
  status: RotationStatus;
  lastGeneratedDate?: string;
  generation?: {
    generatedAt?: string;
    days?: number;
    algorithmVersion?: string;
    rulesFingerprint?: string;
    conflictCount?: number;
    feasibility?: 'FULLY_COMPLIANT' | 'BEST_POSSIBLE';
    stale?: boolean;
    stats?: StatsReport;
    conflicts?: ConflictIssue[];
  };
  changeLog?: { at: string; action: string; details?: string }[];
  leaveCoverages: any[];
}

export interface Cell {
  guardId: string;
  dayIndex: number;
  date: string;
  shiftKey: string;
  shiftName: string;
  slotIndex: number;
  startAt: string;
  endAt: string;
}

export type Severity = 'CRITICAL' | 'REST' | 'STAFFING' | 'INFO';

export interface ConflictIssue {
  id: string;
  severity: Severity;
  code: string;
  title: string;
  message: string;
  guardId?: string;
  guardName?: string;
  dayIndex?: number;
  date?: string;
  shiftKey?: string;
  details?: Record<string, string | number | undefined>;
  suggestions?: string[];
}

export interface GuardWorkload {
  guardId: string;
  name: string;
  code: string;
  hours: number;
  shifts: number;
  restDays: number;
  byShift: Record<string, number>;
  dayShifts: number;
  nightShifts: number;
  longestRestHours: number | null;
  shortestRestHours: number | null;
  maxConsecutive: number;
}

export interface StatsReport {
  days: number;
  poolSize: number;
  totalSlotsPerDay: number;
  totalAssignments: number;
  totalHours: number;
  coverage: {
    overallPct: number;
    byShift: { key: string; name: string; requiredPerDay: number; assignedPerDayAvg: number; pct: number; shortageDays: number }[];
    shortageDayCount: number;
  };
  rest: {
    dutyIntervals: number;
    compliantIntervals: number;
    compliancePct: number;
    violations: any[];
  };
  fairness: { index: number; hourSpread: number; nightSpread: number; avgHours: number };
  staffing: { estimatedMinPool: number; currentPool: number; recommendedAdditional: number; sufficient: boolean };
  workloads: GuardWorkload[];
}

export interface PreviewResult {
  assignments: any[];
  shiftTimes: { day: string; night: string };
  siteName: string;
  poolSize: number;
  slotCountPerDay: number;
  cycleDays: number;
  guardStats: any[];
  days: number;
  startDate: string;
  cells: Cell[];
  conflicts: ConflictIssue[];
  stats: StatsReport;
  feasibility: 'FULLY_COMPLIANT' | 'BEST_POSSIBLE';
  warnings: string[];
  algorithmVersion: string;
  rulesFingerprint: string;
  restRules: RestRule[];
  shiftDefinitions: ShiftDefinition[];
}

export interface RotationAssignmentRec {
  _id: string;
  guardId: { _id: string; firstName: string; lastName: string; employeeCode: string } | string;
  date: string;
  shiftType: string;
  shiftName?: string;
  shiftTime: string;
  startAt?: string;
  endAt?: string;
}

export interface GuardOption {
  _id: string;
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    status: string;
    category?: string;
  };
}

/**
 * Shift palette — theme-token backed so the schedule grid reads in dark mode.
 * `rest` is the empty-cell treatment. `default` covers unrecognised shift keys.
 */
export const SHIFT_COLORS = {
  night: 'bg-primary-800 text-white dark:bg-primary-700',
  day: 'bg-warning-subtle text-warning-text border border-warning-line',
  evening: 'bg-primary-600 text-white',
  morning: 'bg-info-subtle text-info-text border border-info-line',
  rest: 'bg-subtle text-subtext border border-line hover:bg-subtle-hover',
  default: 'bg-primary-700 text-white dark:bg-primary-600',
} as const;

/** Lifecycle chips for a rotation — semantic theme tokens, no hard-coded palette. */
export const STATUS_STYLES: Record<RotationStatus, string> = {
  DRAFT: 'bg-subtle text-muted border border-line',
  GENERATING: 'bg-warning-subtle text-warning-text border border-warning-line',
  GENERATED: 'bg-warning-subtle text-warning-text border border-warning-line',
  REVIEW: 'bg-info-subtle text-info-text border border-info-line',
  APPROVED: 'bg-success-subtle text-success-text border border-success-line',
  PUBLISHED: 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300 border border-primary-200 dark:border-primary-500/30',
  ACTIVE: 'bg-success-subtle text-success-text border border-success-line',
  PAUSED: 'bg-warning-subtle text-warning-text border border-warning-line',
  COMPLETED: 'bg-subtle text-muted border border-line-strong',
  CANCELLED: 'bg-danger-subtle text-danger-text border border-danger-line',
  ARCHIVED: 'bg-subtle text-subtext border border-line',
};

export const SEVERITY_STYLES: Record<Severity, string> = {
  CRITICAL: 'bg-danger-subtle text-danger-text border border-danger-line',
  REST: 'bg-warning-subtle text-warning-text border border-warning-line',
  STAFFING: 'bg-info-subtle text-info-text border border-info-line',
  INFO: 'bg-subtle text-muted border border-line',
};
