import React from 'react';
import {
  Megaphone,
  Building2,
  UserPlus,
  Users,
  Building,
  Radio,
  MapPin,
  CalendarCheck,
  Scale,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  CalendarDays,
  FolderGit2,
  Truck,
  ShoppingCart,
  Factory,
  Contact2,
  BarChart3,
  Radar,
  FileCheck2,
  ShieldAlert,
  FileSignature,
  Settings,
  Sliders,
  LucideIcon,
} from 'lucide-react';

export interface IconProps {
  size?: number;
  className?: string;
}

const renderUniformIcon = (IconComponent: LucideIcon, size = 56, className = '') => {
  // If small size (e.g. in navigation bar tabs), render clean unboxed icon
  if (size <= 24) {
    return <IconComponent size={size} className={className} />;
  }

  // Large size for module launchers: sleek executive badge container
  return (
    <div
      className={`w-12 h-12 rounded-xl flex items-center justify-center bg-slate-900 dark:bg-navy-800 text-white shadow-sm ring-1 ring-slate-900/10 dark:ring-navy-700 group-hover:bg-blue-600 dark:group-hover:bg-blue-600 group-hover:ring-blue-600 group-hover:shadow-md group-hover:shadow-blue-500/20 transition-all duration-200 ${className}`}
    >
      <IconComponent size={22} className="stroke-[1.9]" />
    </div>
  );
};

export const OrganizationIcon: React.FC<IconProps> = ({ size = 56, className }) =>
  renderUniformIcon(Building2, size, className);

export const RecruitmentIcon: React.FC<IconProps> = ({ size = 56, className }) =>
  renderUniformIcon(UserPlus, size, className);

export const EmployeeIcon: React.FC<IconProps> = ({ size = 56, className }) =>
  renderUniformIcon(Users, size, className);

export const CompanyIcon: React.FC<IconProps> = ({ size = 56, className }) =>
  renderUniformIcon(Building, size, className);

export const OperationsIcon: React.FC<IconProps> = ({ size = 56, className }) =>
  renderUniformIcon(Radio, size, className);

export const SitesIcon: React.FC<IconProps> = ({ size = 56, className }) =>
  renderUniformIcon(MapPin, size, className);

export const AttendanceIcon: React.FC<IconProps> = ({ size = 56, className }) =>
  renderUniformIcon(CalendarCheck, size, className);

export const SalaryStructureIcon: React.FC<IconProps> = ({ size = 56, className }) =>
  renderUniformIcon(Scale, size, className);

export const SalaryAdjustmentIcon: React.FC<IconProps> = ({ size = 56, className }) =>
  renderUniformIcon(TrendingUp, size, className);

export const PayrollIcon: React.FC<IconProps> = ({ size = 56, className }) =>
  renderUniformIcon(Receipt, size, className);

export const StaffPayrollIcon: React.FC<IconProps> = ({ size = 56, className }) =>
  renderUniformIcon(FileSpreadsheet, size, className);

export const LeaveIcon: React.FC<IconProps> = ({ size = 56, className }) =>
  renderUniformIcon(CalendarDays, size, className);

export const ProjectIcon: React.FC<IconProps> = ({ size = 56, className }) =>
  renderUniformIcon(FolderGit2, size, className);

export const FleetIcon: React.FC<IconProps> = ({ size = 56, className }) =>
  renderUniformIcon(Truck, size, className);

export const MarketingIcon: React.FC<IconProps> = ({ size = 56, className }) =>
  renderUniformIcon(Megaphone, size, className);

export const ProcurementIcon: React.FC<IconProps> = ({ size = 56, className }) =>
  renderUniformIcon(ShoppingCart, size, className);

export const ManufacturingIcon: React.FC<IconProps> = ({ size = 56, className }) =>
  renderUniformIcon(Factory, size, className);

export const CRMIcon: React.FC<IconProps> = ({ size = 56, className }) =>
  renderUniformIcon(Contact2, size, className);

export const ReportsIcon: React.FC<IconProps> = ({ size = 56, className }) =>
  renderUniformIcon(BarChart3, size, className);

export const ControlTowerIcon: React.FC<IconProps> = ({ size = 56, className }) =>
  renderUniformIcon(Radar, size, className);

export const GuardFilingIcon: React.FC<IconProps> = ({ size = 56, className }) =>
  renderUniformIcon(FileCheck2, size, className);

export const SiteCoverageIcon: React.FC<IconProps> = ({ size = 56, className }) =>
  renderUniformIcon(ShieldAlert, size, className);

export const SignNoteIcon: React.FC<IconProps> = ({ size = 56, className }) =>
  renderUniformIcon(FileSignature, size, className);

export const SettingsIcon: React.FC<IconProps> = ({ size = 56, className }) =>
  renderUniformIcon(Settings, size, className);

export const PayrollConfigIcon: React.FC<IconProps> = ({ size = 56, className }) =>
  renderUniformIcon(Sliders, size, className);
