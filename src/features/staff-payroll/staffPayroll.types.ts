/** Shared types + helpers for the Staff Payroll v2 UI (mirrors backend snapshots). */

export interface StaffRunTotals {
  employees: number;
  grossEarnings: number;
  employeePension: number;
  employerPension: number;
  incomeTax: number;
  totalDeductions: number;
  netPay: number;
  bonus: number;
  finalAmountPaid: number;
}

export interface StaffProblem {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  code: 'NO_ACTIVE_CONTRACT' | 'MULTIPLE_ACTIVE_CONTRACTS';
  message: string;
}

export interface StaffRun {
  _id: string;
  periodKey: string;
  status: string;
  calculatedAt?: string;
  submittedAt?: string;
  checkedAt?: string;
  approvedAt?: string;
  paidAt?: string;
  paymentRef?: string;
  problems: StaffProblem[];
  returnHistory: { reason: string; at: string; fromStatus?: string }[];
  totals: StaffRunTotals;
}

export interface StaffRecord {
  _id: string;
  periodKey: string;
  employeeId: string | { _id: string };
  snapshot: {
    employeeCode: string;
    fullName: string;
    department?: string;
    jobPosition?: string;
    contractId: string;
    contractType?: string;
    basic: number;
    responsibilityAllowance: number;
    teleAllowance: number;
    taxableTransport: number;
    nonTaxableTransport: number;
    pensionEnrolled: boolean;
  };
  overtimeAmount: number;
  bonusAmount: number;
  grossEarnings: number;
  taxableEarnings: number;
  employeePension: number;
  employerPension: number;
  incomeTax: number;
  deductions: { deductionId: string; type: string; label: string; amount: number }[];
  totalDeductions: number;
  netPay: number;
  bonus: number;
  finalAmountPaid: number;
  warnings: string[];
}

export interface StaffOvertimeEntry {
  _id: string;
  employeeId: { _id: string; employeeCode: string; firstName: string; lastName: string } | string;
  periodKey: string;
  amount: number;
  hours?: number | null;
  notes?: string;
  status: string;
}

export interface StaffBonusEntry {
  _id: string;
  employeeId: { _id: string; employeeCode: string; firstName: string; lastName: string } | string;
  periodKey: string;
  amount: number;
  label: string;
  status: string;
}

export const fmtMoney = (n: number | undefined | null) =>
  (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Status → Badge variant for the payroll lifecycle (same as guard payroll). */
export const statusVariant = (status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
  switch (status) {
    case 'APPROVED':
    case 'PAID':
      return 'success';
    case 'SUBMITTED':
      return 'warning';
    case 'CHECKED':
      return 'info';
    case 'RETURNED':
      return 'danger';
    default:
      return 'default';
  }
};

export const staffName = (e: StaffOvertimeEntry['employeeId'] | StaffBonusEntry['employeeId']) =>
  typeof e === 'object' ? `${e.firstName} ${e.lastName} (${e.employeeCode})` : '—';

export const monthNameOf = (m: number) =>
  ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1];
