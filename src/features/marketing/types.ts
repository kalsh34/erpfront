/** Proforma module UI types — mirror erpback/src/models/{ProformaCompany,ProformaSite,ServiceRole,Proforma}.ts */

export type RecordStatus = 'ACTIVE' | 'INACTIVE';

export interface CompanyContact {
  fullName: string;
  position: string;
  phone: string;
  email: string;
  isPrimary: boolean;
}

export interface ProformaCompany {
  _id: string;
  name: string;
  nameAm: string;
  tin: string;
  registrationNumber: string;
  companyType: string;
  industry: string;
  address: string;
  city: string;
  region: string;
  country: string;
  primaryPhone: string;
  secondaryPhone: string;
  primaryEmail: string;
  website: string;
  status: RecordStatus;
  contacts: CompanyContact[];
  siteCount?: number;
  createdAt?: string;
}

export interface ProformaSite {
  _id: string;
  companyId: string;
  siteName: string;
  address: string;
  city: string;
  region: string;
  specialRequirements: string;
  status: RecordStatus;
}

export interface ServiceRole {
  _id: string;
  roleCode: string;
  roleName: string;
  gender: string;
  category: string;
  description: string;
  defaultMonthlyRate: number;
  rateType: string;
  vatApplicable: boolean;
  allowRateOverride: boolean;
  shiftPattern: string;
  multiplier: number;
  restDaysRule: string;
  status: RecordStatus;
}

export interface ProformaItem {
  roleId: string;
  roleCode: string;
  roleName: string;
  gender: string;
  category?: string;
  postsPerDay: number;
  multiplier: number;
  totalHeadcount: number;
  unitRate: number;
  lineTotal: number;
  vatApplicable: boolean;
  shiftPattern: string;
  restDaysRule: string;
}

export type ProformaStatusValue =
  | 'DRAFT'
  | 'ISSUED'
  | 'ACCEPTED'
  | 'EXPIRED'
  | 'CONVERTED'
  | 'CANCELLED';

export interface Proforma {
  _id: string;
  number: string;
  companyId: ProformaCompany | string;
  siteId: ProformaSite | string;
  issueDate: string;
  validityDays: number;
  validityDate: string;
  status: ProformaStatusValue;
  items: ProformaItem[];
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
  shiftNote: string;
  notes: string;
  internalNotes: string;
  deliveryEmailPdf: boolean;
  deliveryHardCopy: boolean;
  issuedAt?: string | null;
  createdAt?: string;
}

export const COMPANY_TYPES = [
  { value: 'PRIVATE_LIMITED', label: 'Private Limited Company' },
  { value: 'SHARE_COMPANY', label: 'Share Company' },
  { value: 'SOLE_PROPRIETORSHIP', label: 'Sole Proprietorship' },
  { value: 'PARTNERSHIP', label: 'Partnership' },
  { value: 'PUBLIC_ENTERPRISE', label: 'Public Enterprise' },
  { value: 'NGO', label: 'NGO / Non-profit' },
  { value: 'OTHER', label: 'Other' },
];

export const ROLE_GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'UNISEX', label: 'Unisex' },
  { value: 'NA', label: 'Not applicable' },
];

export const ROLE_CATEGORIES = [
  { value: 'MANPOWER', label: 'Manpower' },
  { value: 'K9', label: 'K9' },
  { value: 'ELECTRONIC', label: 'Electronic' },
  { value: 'OTHER', label: 'Other' },
];

export const RATE_TYPES = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'DAILY', label: 'Daily' },
];

export const SHIFT_PATTERNS = [
  { value: 'CONTINUOUS_24_48', label: '24/48 continuous (3 shifts × 1 post)' },
  { value: 'DAY_SHIFT', label: 'Day shift (12 hrs)' },
  { value: 'CUSTOM', label: 'Custom' },
];

export const PROFORMA_STATUSES: ProformaStatusValue[] = [
  'DRAFT',
  'ISSUED',
  'ACCEPTED',
  'EXPIRED',
  'CONVERTED',
  'CANCELLED',
];

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  ISSUED: 'Issued',
  ACCEPTED: 'Accepted',
  EXPIRED: 'Expired',
  CONVERTED: 'Converted',
  CANCELLED: 'Cancelled',
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

export const STATUS_CLASSES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-navy-800 dark:text-slate-300 dark:border-navy-700',
  ISSUED: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30',
  ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
  CONVERTED: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30',
  EXPIRED: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
  INACTIVE: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-navy-800 dark:text-slate-400 dark:border-navy-700',
};

export const GENDER_LABELS: Record<string, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
  UNISEX: 'Unisex',
  NA: '—',
};

export const SHIFT_LABELS: Record<string, string> = {
  CONTINUOUS_24_48: '24/48 continuous',
  DAY_SHIFT: 'Day shift',
  CUSTOM: 'Custom',
};

export const CATEGORY_LABELS: Record<string, string> = {
  MANPOWER: 'Manpower',
  K9: 'K9',
  ELECTRONIC: 'Electronic',
  OTHER: 'Other',
};

export const fmtMoney = (n: number | null | undefined): string =>
  n == null || Number.isNaN(Number(n))
    ? '—'
    : `ETB ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtDate = (value: string | undefined | null): string => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** Resolve the populated-or-id company/site reference on a proforma. */
export const asCompany = (value: Proforma['companyId']): ProformaCompany | null =>
  typeof value === 'string' ? null : value;
export const asSite = (value: Proforma['siteId']): ProformaSite | null =>
  typeof value === 'string' ? null : value;
