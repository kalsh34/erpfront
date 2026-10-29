/** Shared types + helpers for the Guard Payroll v2 UI (mirrors backend snapshots). */

export interface PayrollRunTotals {
  guards: number;
  grossEarnings: number;
  employeePension: number;
  employerPension: number;
  incomeTax: number;
  totalDeductions: number;
  netPay: number;
}

export interface PayrollProblem {
  employeeId: string;
  employeeCode?: string;
  guardName?: string;
  code: string;
  message: string;
}

export interface PayrollRun {
  _id: string;
  periodKey: string;
  status: string;
  calculatedBy?: { _id: string } | string | null;
  calculatedAt?: string;
  submittedAt?: string;
  checkedAt?: string;
  approvedAt?: string;
  paidAt?: string;
  paymentRef?: string;
  problems: PayrollProblem[];
  returnHistory: { reason: string; returnedAt: string }[];
  totals: PayrollRunTotals;
  /** Primary-site scope of the last calculation (null = all sites). */
  scopeSiteId?: string | null;
  scopeSiteName?: string;
  lastCalcMode?: 'full' | 'remaining';
}

/** Partial-run census returned with each run detail. */
export interface PayrollPartialInfo {
  scopeSiteId: string | null;
  scopeSiteName: string;
  guardsInScope: number;
  calculated: number;
  skipped: number;
  missing: number;
  partial: boolean;
}

export interface PrimarySiteSnapshot {
  siteId: string | { _id: string; siteName?: string };
  siteName: string;
  siteCode?: string;
  compensationAmount: number;
  transportPercent: number;
  standardMonthlyHours: number;
  sundayStructuralHours: number;
  basicHourlyDivisor: number;
  otRate: number;
  sundayStructuralAllocation: number;
  remaining: number;
  transportFull: number;
  basicSalary: number;
  basicHourlyRate: number;
  normalHours: number;
  holidayHours: number;
  sundayHours: number;
  normalPay: number;
  holidayPay: number;
  sundayPay: number;
  transportPaid: number;
  siteEarnings: number;
}

export interface AdditionalSiteSnapshot {
  siteId: string | { _id: string; siteName?: string };
  siteName: string;
  siteCode?: string;
  compensationAmount: number;
  otRate: number;
  normalHours: number;
  holidayHours: number;
  sundayHours: number;
  totalHours: number;
  siteEarnings: number;
}

export interface PayrollRecord {
  _id: string;
  periodKey: string;
  employeeId: string | { _id: string };
  snapshot: {
    employeeCode: string;
    fullName: string;
    bankName?: string;
    accountNumber?: string;
    pensionEnrolled: boolean;
    contractType?: string;
    contractWage?: number;
  };
  primarySite: PrimarySiteSnapshot;
  additionalSites: AdditionalSiteSnapshot[];
  grossEarnings: number;
  pensionBase: number;
  taxableEarnings: number;
  employeePension: number;
  employerPension: number;
  incomeTax: number;
  deductions: { deductionId: string; type: string; label: string; amount: number }[];
  totalDeductions: number;
  netPay: number;
  warnings: string[];
}

export const fmtMoney = (n: number | undefined | null) =>
  (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtHours = (n: number | undefined | null) => `${(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}h`;

/** Status → Badge variant for the payroll lifecycle. */
export const statusVariant = (status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
  switch (status) {
    case 'APPROVED':
    case 'PAID':
      return 'success';
    case 'SUBMITTED':
      return 'warning';
    case 'CHECKED':
    case 'PAYMENT_PROCESSING':
      return 'info';
    case 'RETURNED':
      return 'danger';
    default:
      return 'default';
  }
};

export const monthNameOf = (m: number) =>
  ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1];
