import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { UserRole } from './types';
import ProtectedRoute from './components/ProtectedRoute';
import ModuleNavbar from './components/ModuleNavbar';
import { getModuleGroupForRoute } from './config/modules';
import LoginPage from './features/auth/LoginPage';
import DashboardPage from './features/dashboard/DashboardPage';
import EmployeeList from './features/employees/EmployeeList';
import EmployeeForm from './features/employees/EmployeeForm';
import { SiteList } from './features/sites/SiteList';
import SiteDetail from './features/sites/SiteDetail';
import CompanyList from './features/companies/CompanyList';
import RotationListPage from './features/rotations/RotationListPage';
import RotationWizardPage from './features/rotations/RotationWizardPage';
import RotationDetailPage from './features/rotations/RotationDetailPage';
import StaffAttendancePage from './features/staff-attendance/StaffAttendancePage';
import GuardAttendancePage from './features/attendance/GuardAttendancePage';
import { SettingsPage } from './features/settings/SettingsPage';
import OrganizationStructurePage from './features/organization/OrganizationStructurePage';
import GuardsPage from './features/guards/GuardsPage';
import GuardPatrolsPage from './features/guards/GuardPatrolsPage';
import MySitesPage from './features/guard/MySitesPage';import MyProfilePage from './features/guard/MyProfilePage';
import GuardDashboardPage from './features/guard/GuardDashboardPage';
import GuardScanPage from './features/guard/GuardScanPage';
import GuardShiftsPage from './features/guard/GuardShiftsPage';
import ProfilePage from './features/profile/ProfilePage';
import SiteQRCodesPage from './features/organization/SiteQRCodesPage';
import ContractForm from './features/contracts/ContractForm';
import GuarantorPage from './features/guarantor/GuarantorPage';
import StaffPayrollPage from './features/staff-payroll/StaffPayrollPage';
import GuardPayrollPage from './features/guard-payroll/GuardPayrollPage';
import ModuleReportsPage from './features/reports/ModuleReportsPage';
import { HelpProvider, HelpWidget, HelpPanel, TourOverlay, HelpCenter } from './help';
import FleetPage from './features/fleet/FleetPage';
import { ServiceLibraryPage } from './features/marketing/ServiceLibraryPage';

// Procurement / Purchase Module Pages
import { PurchaseDashboardPage } from './features/procurement/pages/PurchaseDashboardPage';
import { SupplierListPage } from './features/procurement/pages/SupplierListPage';
import { ProductCatalogPage } from './features/procurement/pages/ProductCatalogPage';
import { RFQListPage } from './features/procurement/pages/RFQListPage';
import { RFQDetailPage } from './features/procurement/pages/RFQDetailPage';
import { QuotationComparePage } from './features/procurement/pages/QuotationComparePage';
import { POListPage } from './features/procurement/pages/POListPage';
import { PODetailPage } from './features/procurement/pages/PODetailPage';
import { GoodsReceiptListPage } from './features/procurement/pages/GoodsReceiptListPage';
import { SupplierBillListPage } from './features/procurement/pages/SupplierBillListPage';
import { PurchaseReportsPage } from './features/procurement/pages/PurchaseReportsPage';
import { PurchaseSettingsPage } from './features/procurement/pages/PurchaseSettingsPage';

function AppLayout() {
  const { user } = useAuthStore();
  const location = useLocation();
  const isGuard = user?.role === UserRole.GUARD;

  if (isGuard) {
    return (
      <Routes>
        <Route path="/guard" element={<GuardDashboardPage />} />
        <Route path="/guard/scan" element={<GuardScanPage />} />
        <Route path="/guard/shifts" element={<GuardShiftsPage />} />
        <Route path="/my-sites" element={<MySitesPage />} />
        <Route path="/my-profile" element={<MyProfilePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/guard" />} />
      </Routes>
    );
  }

  const moduleGroup = getModuleGroupForRoute(location.pathname);

  return (
    <HelpProvider>
      <div className="min-h-screen bg-canvas overflow-x-hidden">
        {moduleGroup && <ModuleNavbar moduleGroup={moduleGroup} />}
        <main className={moduleGroup ? 'overflow-x-hidden' : 'min-h-screen overflow-x-hidden'}>
          <Routes>
          <Route path="/" element={<DashboardPage />} />

          <Route path="/employees" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.CEO]}><EmployeeList /></ProtectedRoute>} />
          <Route path="/employees/new" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN]}><EmployeeForm /></ProtectedRoute>} />
          <Route path="/employees/:id/edit" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN]}><EmployeeForm /></ProtectedRoute>} />
          <Route path="/employees/:id/guarantor" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.CEO]}><GuarantorPage /></ProtectedRoute>} />

          <Route path="/companies" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.CEO]}><CompanyList /></ProtectedRoute>} />
          <Route path="/sites" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.CEO]}><SiteList /></ProtectedRoute>} />
          <Route path="/sites/qr-codes" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.OPERATIONS, UserRole.CEO]}><SiteQRCodesPage /></ProtectedRoute>} />
          <Route path="/sites/new" element={<Navigate to="/sites" replace />} />
          <Route path="/sites/:id" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.CEO]}><SiteDetail /></ProtectedRoute>} />

          <Route path="/guards" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.OPERATIONS, UserRole.CEO]}><GuardsPage /></ProtectedRoute>} />
          {/* Guard Patrols: hidden from OPERATIONS this cycle — page/API untouched for admins/CEO */}
          <Route path="/guard-patrols" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.CEO]}><GuardPatrolsPage /></ProtectedRoute>} />
          <Route path="/rotations" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.HR_ADMIN, UserRole.OPERATIONS, UserRole.HEAD, UserRole.CEO]}><RotationListPage /></ProtectedRoute>} />
          <Route path="/rotations/new" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.HR_ADMIN, UserRole.OPERATIONS]}><RotationWizardPage /></ProtectedRoute>} />
          <Route path="/rotations/:id" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.HR_ADMIN, UserRole.OPERATIONS, UserRole.HEAD, UserRole.CEO]}><RotationDetailPage /></ProtectedRoute>} />

          <Route path="/staff-attendance" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.CEO]}><StaffAttendancePage /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.OPERATIONS, UserRole.FINANCE_OFFICER, UserRole.CEO]}><GuardAttendancePage /></ProtectedRoute>} />

          <Route path="/departments" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.CEO]}><OrganizationStructurePage /></ProtectedRoute>} />

          {/* Fleet Management Phase 1 — vehicles, drivers, assignments, maintenance */}
          <Route path="/fleet" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.HEAD, UserRole.CEO]}><FleetPage /></ProtectedRoute>} />

          {/* Payroll v2 — staff (contract-driven) and guard (attendance-driven), separate systems */}
          <Route path="/staff-payroll" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO]}><StaffPayrollPage /></ProtectedRoute>} />
          <Route path="/guard-payroll" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO]}><GuardPayrollPage /></ProtectedRoute>} />

          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.FINANCE_OFFICER, UserRole.CEO]}><SettingsPage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.HEAD, UserRole.CEO]}><ModuleReportsPage /></ProtectedRoute>} />
          <Route path="/contracts/:employeeId" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.CEO]}><ContractForm /></ProtectedRoute>} />

          {/* Purchasing & Procurement Module Routes */}
          <Route path="/purchase" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO]}><PurchaseDashboardPage /></ProtectedRoute>} />
          <Route path="/purchase/suppliers" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO]}><SupplierListPage /></ProtectedRoute>} />
          <Route path="/purchase/products" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO]}><ProductCatalogPage /></ProtectedRoute>} />
          <Route path="/purchase/rfqs" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO]}><RFQListPage /></ProtectedRoute>} />
          <Route path="/purchase/rfqs/:id" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO]}><RFQDetailPage /></ProtectedRoute>} />
          <Route path="/purchase/compare" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO]}><QuotationComparePage /></ProtectedRoute>} />
          <Route path="/purchase/orders" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO]}><POListPage /></ProtectedRoute>} />
          <Route path="/purchase/orders/:id" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO]}><PODetailPage /></ProtectedRoute>} />
          <Route path="/purchase/receipts" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO]}><GoodsReceiptListPage /></ProtectedRoute>} />
          <Route path="/purchase/bills" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO]}><SupplierBillListPage /></ProtectedRoute>} />
          <Route path="/purchase/reports" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO]}><PurchaseReportsPage /></ProtectedRoute>} />
          <Route path="/purchase/settings" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.FINANCE_OFFICER, UserRole.CEO]}><PurchaseSettingsPage /></ProtectedRoute>} />

          // Marketing Service Library (Phase B) — nav + page gated on effective perms
          <Route path="/service-library" element={<ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.CEO]}><ServiceLibraryPage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        </main>
        <HelpWidget />
        <HelpPanel />
        <TourOverlay />
        <HelpCenter />
      </div>
    </HelpProvider>
  );
}

export default function App() {
  const { isAuthenticated, fetchMe } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchMe();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
