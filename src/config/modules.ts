import {
  OrganizationIcon,
  RecruitmentIcon,
  EmployeeIcon,
  CompanyIcon,
  OperationsIcon,
  SitesIcon,
  AttendanceIcon,
  PayrollIcon,
  StaffPayrollIcon,
  ReportsIcon,
  ProjectIcon,
  FleetIcon,
  CRMIcon,
  SettingsIcon,
  ProcurementIcon,
  MarketingIcon,
} from '../components/ModuleIcons';
import { UserRole } from '../types';
import type React from 'react';

export interface SubFeature {
  label: string;
  route: string;
  icon?: React.FC<{ size?: number; className?: string }>;
  /** i18n dictionary key for the nav tab (fallback: label). */
  labelKey?: string;
  /** Optional per-feature role scope. When set, the nav tab renders only for
   *  these roles even if the parent module group grants them access.
   *  Omit to inherit the module group's role list. */
  roles?: UserRole[];
}

export interface ModuleDef {
  id: string;
  label: string;
  subtitle: string;
  /** i18n dictionary keys for the dashboard cards (fallback: label/subtitle). */
  labelKey?: string;
  subtitleKey?: string;
  route: string | null;
  icon: React.FC<{ size?: number; className?: string }>;
  color: string;
  bg: string;
  text: string;
  border: string;
  hoverBorder: string;
  arrowBg: string;
  arrowText: string;
  roles: UserRole[];
  active: boolean;
  groupId?: string;
  /**
   * Hidden dashboard cards. The tile is not rendered on the dashboard, but the
   * route keeps working because the feature stays reachable from its parent
   * module (e.g. HR & People > Staff Attendance).
   */
  hidden?: boolean;
  /** Coming-soon card: shows a placeholder note instead of a live module. */
  comingSoon?: boolean;
  /** i18n key for the coming-soon note shown on the card. */
  soonKey?: string;
}

export interface ModuleGroup {
  id: string;
  label: string;
  /** i18n dictionary key for the nav group label (fallback: label). */
  labelKey?: string;
  color: string;
  bg: string;
  text: string;
  borderColor: string;
  navBg: string;
  subFeatures: SubFeature[];
  roles: UserRole[];
}

export const MODULE_GROUPS: ModuleGroup[] = [
  {
    id: 'hr',
    label: 'HR and People',
    labelKey: 'groupHr',
    color: '#0F172A',
    bg: 'bg-slate-50 dark:bg-navy-900',
    text: 'text-slate-900 dark:text-slate-100',
    borderColor: 'border-slate-200 dark:border-navy-700',
    navBg: 'bg-surface border-b border-line',
    subFeatures: [
      { label: 'Employees', route: '/employees', icon: EmployeeIcon, labelKey: 'navEmployees' },
      { label: 'Staff Attendance', route: '/staff-attendance', icon: AttendanceIcon, labelKey: 'navStaffAttendance' },
      { label: 'Departments & Positions', route: '/departments', icon: OrganizationIcon, labelKey: 'navDepartments' },
    ],
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.CEO],
  },
  {
    id: 'company',
    label: 'Company',
    labelKey: 'groupCompany',
    color: '#0F172A',
    bg: 'bg-slate-50 dark:bg-navy-900',
    text: 'text-slate-900 dark:text-slate-100',
    borderColor: 'border-slate-200 dark:border-navy-700',
    navBg: 'bg-surface border-b border-line',
    subFeatures: [
      { label: 'Company', route: '/companies', icon: CompanyIcon, labelKey: 'navCompany' },
      { label: 'Site', route: '/sites', icon: SitesIcon, labelKey: 'navSite' },
    ],
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.CEO],
  },
  {
    id: 'ops',
    label: 'Operations',
    labelKey: 'groupOps',
    color: '#0F172A',
    bg: 'bg-slate-50 dark:bg-navy-900',
    text: 'text-slate-900 dark:text-slate-100',
    borderColor: 'border-slate-200 dark:border-navy-700',
    navBg: 'bg-surface border-b border-line',
    subFeatures: [
      { label: 'Guards', route: '/guards', icon: OperationsIcon, labelKey: 'navGuards' },
      // Guard Patrols hidden from OPERATIONS this cycle (nav + route); the page and
      // its API remain intact for admins/CEO.
      { label: 'Guard Patrols', route: '/guard-patrols', icon: AttendanceIcon, labelKey: 'navGuardPatrols', roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.CEO] },
      { label: 'Attendance', route: '/attendance', icon: AttendanceIcon, labelKey: 'navAttendance' },
      { label: 'Rotations', route: '/rotations', icon: OperationsIcon, labelKey: 'navRotations' },
      { label: 'Fleet', route: '/fleet', icon: FleetIcon, labelKey: 'navFleet' },
    ],
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.OPERATIONS, UserRole.CEO],
  },
  {
    id: 'payroll',
    label: 'Payroll',
    labelKey: 'groupPayroll',
    color: '#2563EB',
    bg: 'bg-blue-50/50 dark:bg-navy-900',
    text: 'text-blue-900 dark:text-blue-200',
    borderColor: 'border-blue-200 dark:border-navy-700',
    navBg: 'bg-surface border-b border-line',
    subFeatures: [
      { label: 'Staff Payroll', route: '/staff-payroll', icon: StaffPayrollIcon, labelKey: 'navStaffPayroll' },
      { label: 'Guard Payroll', route: '/guard-payroll', icon: PayrollIcon, labelKey: 'navGuardPayroll' },
    ],
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO],
  },
  {
    id: 'reports',
    label: 'Reports',
    labelKey: 'groupReports',
    color: '#0F172A',
    bg: 'bg-slate-50 dark:bg-navy-900',
    text: 'text-slate-900 dark:text-slate-100',
    borderColor: 'border-slate-200 dark:border-navy-700',
    navBg: 'bg-surface border-b border-line',
    subFeatures: [
      { label: 'Reports', route: '/reports', icon: ReportsIcon, labelKey: 'navReports' },
    ],
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.HEAD, UserRole.CEO],
  },
  {
    id: 'admin',
    label: 'Administration',
    labelKey: 'groupAdmin',
    color: '#0F172A',
    bg: 'bg-slate-50 dark:bg-navy-900',
    text: 'text-slate-900 dark:text-slate-100',
    borderColor: 'border-slate-200 dark:border-navy-700',
    navBg: 'bg-surface border-b border-line',
    subFeatures: [
      { label: 'Settings', route: '/settings', icon: SettingsIcon, labelKey: 'navSettings' },
    ],
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.FINANCE_OFFICER, UserRole.CEO],
  },
  {
    id: 'marketing',
    label: 'Marketing & Proposals',
    labelKey: 'groupMarketing',
    color: '#D97706',
    bg: 'bg-amber-50/50 dark:bg-navy-900',
    text: 'text-amber-900 dark:text-amber-200',
    borderColor: 'border-amber-200 dark:border-navy-700',
    navBg: 'bg-surface border-b border-line',
    subFeatures: [
      { label: 'Service Library', route: '/service-library', icon: MarketingIcon, labelKey: 'navServiceLibrary' },
    ],
    // Nav follows role defaults for SERVICE_READ (SUPER_ADMIN). Other roles see
    // the tab only after an explicit 'marketing' module grant is reflected via
    // their role membership below; the page itself gates on effective perms.
    roles: [UserRole.SUPER_ADMIN, UserRole.CEO],
  },
  {
    id: 'procurement',
    label: 'Purchasing',
    labelKey: 'groupProcurement',
    color: '#4F46E5',
    bg: 'bg-indigo-50/50 dark:bg-navy-900',
    text: 'text-indigo-900 dark:text-indigo-200',
    borderColor: 'border-indigo-200 dark:border-navy-700',
    navBg: 'bg-surface border-b border-line',
    subFeatures: [
      { label: 'Dashboard', route: '/purchase', icon: ProcurementIcon },
      { label: 'Orders (PO)', route: '/purchase/orders' },
      { label: 'RFQs', route: '/purchase/rfqs' },
      { label: 'Compare Quotes', route: '/purchase/compare' },
      { label: 'Receipts (GRN)', route: '/purchase/receipts' },
      { label: 'Vendor Bills', route: '/purchase/bills' },
      { label: 'Suppliers', route: '/purchase/suppliers' },
      { label: 'Products', route: '/purchase/products' },
      { label: 'Reports', route: '/purchase/reports' },
      { label: 'Settings', route: '/purchase/settings' },
    ],
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO],
  },
];

const ALL_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN,
  UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.HEAD, UserRole.GUARD, UserRole.CEO,
];

export const MODULES: ModuleDef[] = [
  {
    id: 'organization',
    label: 'Organization',
    subtitle: 'Manage your company structure and settings.',
    labelKey: 'moduleOrganization',
    subtitleKey: 'moduleOrganizationSub',
    route: '/settings',
    icon: OrganizationIcon,
    color: '#0F172A',
    bg: 'bg-surface',
    text: 'text-ink',
    border: 'border-line',
    hoverBorder: 'hover:border-primary-400',
    arrowBg: 'bg-subtle group-hover:bg-primary-600',
    arrowText: 'text-muted group-hover:text-white',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.CEO],
    active: true,
    groupId: 'admin',
  },
  {
    id: 'recruitment',
    label: 'Recruitment',
    subtitle: 'Handle job postings, applications and hiring.',
    labelKey: 'moduleRecruitment',
    subtitleKey: 'moduleRecruitmentSub',
    route: null,
    icon: RecruitmentIcon,
    color: '#64748B',
    bg: 'bg-surface',
    text: 'text-muted',
    border: 'border-line',
    hoverBorder: 'hover:border-line',
    arrowBg: 'bg-subtle',
    arrowText: 'text-muted',
    roles: ALL_ROLES,
    active: false,
  },
  {
    id: 'employee',
    label: 'HR and People',
    subtitle: 'Manage employees, departments, attendance and contracts.',
    labelKey: 'moduleEmployee',
    subtitleKey: 'moduleEmployeeSub',
    route: '/employees',
    icon: EmployeeIcon,
    color: '#0F172A',
    bg: 'bg-surface',
    text: 'text-ink',
    border: 'border-line',
    hoverBorder: 'hover:border-primary-400',
    arrowBg: 'bg-subtle group-hover:bg-primary-600',
    arrowText: 'text-muted group-hover:text-white',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.CEO],
    active: true,
    groupId: 'hr',
  },
  {
    id: 'company',
    label: 'Company',
    subtitle: 'Company details and basic settings.',
    labelKey: 'moduleCompany',
    subtitleKey: 'moduleCompanySub',
    route: '/companies',
    icon: CompanyIcon,
    color: '#0F172A',
    bg: 'bg-surface',
    text: 'text-ink',
    border: 'border-line',
    hoverBorder: 'hover:border-primary-400',
    arrowBg: 'bg-subtle group-hover:bg-primary-600',
    arrowText: 'text-muted group-hover:text-white',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.CEO],
    active: true,
    groupId: 'company',
  },
  {
    id: 'ops',
    label: 'Operations',
    subtitle: 'Manage daily operations and workflows.',
    labelKey: 'moduleOperations',
    subtitleKey: 'moduleOperationsSub',
    route: '/guards',
    icon: OperationsIcon,
    color: '#0F172A',
    bg: 'bg-surface',
    text: 'text-ink',
    border: 'border-line',
    hoverBorder: 'hover:border-primary-400',
    arrowBg: 'bg-subtle group-hover:bg-primary-600',
    arrowText: 'text-muted group-hover:text-white',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.OPERATIONS, UserRole.CEO],
    active: true,
    groupId: 'ops',
  },
  {
    id: 'attendance',
    label: 'Attendance',
    subtitle: 'Track attendance for staff and guards.',
    labelKey: 'moduleAttendance',
    subtitleKey: 'moduleAttendanceSub',
    route: '/staff-attendance',
    icon: AttendanceIcon,
    color: '#0F172A',
    bg: 'bg-surface',
    text: 'text-ink',
    border: 'border-line',
    hoverBorder: 'hover:border-primary-400',
    arrowBg: 'bg-subtle group-hover:bg-primary-600',
    arrowText: 'text-muted group-hover:text-white',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.CEO],
    active: true,
    hidden: true,
    groupId: 'hr',
  },
  {
    id: 'staff-payroll',
    label: 'Staff Payroll',
    subtitle: 'Contract-driven office payroll — frozen company formula.',
    labelKey: 'moduleStaffPayroll',
    subtitleKey: 'moduleStaffPayrollSub',
    route: '/staff-payroll',
    icon: StaffPayrollIcon,
    color: '#2563EB',
    bg: 'bg-surface',
    text: 'text-ink',
    border: 'border-line',
    hoverBorder: 'hover:border-primary-400',
    arrowBg: 'bg-subtle group-hover:bg-primary-600',
    arrowText: 'text-muted group-hover:text-white',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO],
    active: true,
    comingSoon: false,
    groupId: 'payroll',
  },
  {
    id: 'guard-payroll',
    label: 'Guard Payroll',
    subtitle: 'Attendance-driven, site-by-site guard payroll with approval and history.',
    labelKey: 'moduleGuardPayroll',
    subtitleKey: 'moduleGuardPayrollSub',
    route: '/guard-payroll',
    icon: PayrollIcon,
    color: '#2563EB',
    bg: 'bg-surface',
    text: 'text-ink',
    border: 'border-line',
    hoverBorder: 'hover:border-primary-400',
    arrowBg: 'bg-subtle group-hover:bg-primary-600',
    arrowText: 'text-muted group-hover:text-white',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO],
    active: true,
    groupId: 'payroll',
  },
  {
    id: 'project',
    label: 'Project Management',
    subtitle: 'Tasks, milestones, time tracking, resource allocation.',
    labelKey: 'moduleProject',
    subtitleKey: 'moduleProjectSub',
    route: null,
    icon: ProjectIcon,
    color: '#64748B',
    bg: 'bg-surface',
    text: 'text-muted',
    border: 'border-line',
    hoverBorder: 'hover:border-line',
    arrowBg: 'bg-subtle',
    arrowText: 'text-muted',
    roles: ALL_ROLES,
    active: false,
  },
  {
    id: 'fleet',
    label: 'Fleet Management',
    subtitle: 'Vehicles, assignments, maintenance and documents.',
    labelKey: 'moduleFleet',
    subtitleKey: 'moduleFleetSub',
    route: '/fleet',
    icon: FleetIcon,
    color: '#0F172A',
    bg: 'bg-surface',
    text: 'text-ink',
    border: 'border-line',
    hoverBorder: 'hover:border-primary-400',
    arrowBg: 'bg-subtle group-hover:bg-primary-600',
    arrowText: 'text-muted group-hover:text-white',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.HEAD, UserRole.CEO],
    active: true,
    groupId: 'ops',
  },
  {
    id: 'crm',
    label: 'Sales & CRM',
    subtitle: 'Leads, opportunities, customer relationships.',
    labelKey: 'moduleCrm',
    subtitleKey: 'moduleCrmSub',
    route: null,
    icon: CRMIcon,
    color: '#64748B',
    bg: 'bg-surface',
    text: 'text-muted',
    border: 'border-line',
    hoverBorder: 'hover:border-line',
    arrowBg: 'bg-subtle',
    arrowText: 'text-muted',
    roles: ALL_ROLES,
    active: false,
  },
  {
    id: 'procurement',
    label: 'Purchasing',
    subtitle: 'End-to-end procurement, RFQs, vendor quotations, POs, GRN and supplier bills.',
    labelKey: 'Procurement',
    subtitleKey: 'ProcurementSub',
    route: '/purchase',
    icon: ProcurementIcon,
    color: '#4F46E5',
    bg: 'bg-surface',
    text: 'text-ink',
    border: 'border-line',
    hoverBorder: 'hover:border-primary-400',
    arrowBg: 'bg-subtle group-hover:bg-primary-600',
    arrowText: 'text-muted group-hover:text-white',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO],
    active: true,
    groupId: 'procurement',
  },
  {
    id: 'marketing',
    label: 'Marketing & Proposals',
    subtitle: 'Reusable service library for guard, CCTV, alarm, QR patrol and custom services.',
    labelKey: 'moduleMarketing',
    subtitleKey: 'moduleMarketingSub',
    route: '/service-library',
    icon: MarketingIcon,
    color: '#D97706',
    bg: 'bg-surface',
    text: 'text-ink',
    border: 'border-line',
    hoverBorder: 'hover:border-primary-400',
    arrowBg: 'bg-subtle group-hover:bg-primary-600',
    arrowText: 'text-muted group-hover:text-white',
    roles: [UserRole.SUPER_ADMIN, UserRole.CEO],
    active: true,
    groupId: 'marketing',
  },
  {
    id: 'reports',
    label: 'Reports',
    subtitle: 'Filterable report for every module — filter, export to CSV, or print.',
    labelKey: 'moduleReports',
    subtitleKey: 'moduleReportsSub',
    route: '/reports',
    icon: ReportsIcon,
    color: '#0F172A',
    bg: 'bg-surface',
    text: 'text-ink',
    border: 'border-line',
    hoverBorder: 'hover:border-primary-400',
    arrowBg: 'bg-subtle group-hover:bg-primary-600',
    arrowText: 'text-muted group-hover:text-white',
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.HEAD, UserRole.CEO],
    active: true,
    groupId: 'reports',
  },
];

const ROUTE_OVERRIDES: { pattern: RegExp; groupId: string }[] = [
  { pattern: /^\/employees(\/.*)?$/, groupId: 'hr' },
  { pattern: /^\/departments(\/.*)?$/, groupId: 'hr' },
  { pattern: /^\/staff-attendance(\/.*)?$/, groupId: 'hr' },
  { pattern: /^\/companies(\/.*)?$/, groupId: 'company' },
  { pattern: /^\/sites(\/.*)?$/, groupId: 'company' },
  { pattern: /^\/guards(\/.*)?$/, groupId: 'ops' },
  { pattern: /^\/attendance(\/.*)?$/, groupId: 'ops' },
  { pattern: /^\/rotations(\/.*)?$/, groupId: 'ops' },
  { pattern: /^\/fleet(\/.*)?$/, groupId: 'ops' },
  { pattern: /^\/staff-payroll(\/.*)?$/, groupId: 'payroll' },
  { pattern: /^\/guard-payroll(\/.*)?$/, groupId: 'payroll' },
  { pattern: /^\/settings(\/.*)?$/, groupId: 'admin' },
  { pattern: /^\/contracts(\/.*)?$/, groupId: 'hr' },
  { pattern: /^\/reports(\/.*)?$/, groupId: 'reports' },
  { pattern: /^\/purchase(\/.*)?$/, groupId: 'procurement' },
  { pattern: /^\/service-library(\/.*)?$/, groupId: 'marketing' },
];
 
export function getModuleGroupForRoute(pathname: string): ModuleGroup | null {
  for (const override of ROUTE_OVERRIDES) {
    if (override.pattern.test(pathname)) {
      return MODULE_GROUPS.find((g) => g.id === override.groupId) || null;
    }
  }
  for (const group of MODULE_GROUPS) {
    for (const sf of group.subFeatures) {
      const sfPath = sf.route.split('?')[0];
      if (pathname === sfPath) {
        return group;
      }
    }
  }
  return null;
}

export function getModuleGroupById(groupId: string): ModuleGroup | undefined {
  return MODULE_GROUPS.find((g) => g.id === groupId);
}
