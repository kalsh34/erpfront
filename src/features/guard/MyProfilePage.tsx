import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/api';
import { Tabs, LoadingSpinner } from '../../components/ui';

interface EmployeeData {
  _id: string;
  employeeCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  category: string;
  status: string;
  phone?: string;
  email?: string;
  hireDate: string;
  department?: string;
  position?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  salary?: number;
  guardInfo?: {
    employmentType: string;
    idCardNumber?: string;
  };
}

interface GuardProfileData {
  position: string;
  idCardNumber?: string;
  employmentType: string;
  rate?: number;
  transportAllowance?: number;
}

interface SiteAssignmentData {
  _id: string;
  siteId: { siteName: string; siteCode: string; location: string };
  hourlyRate: number;
  standardMonthlyHours: number;
  isCurrent: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
}

type TabKey = 'personal' | 'employment' | 'documents' | 'site' | 'access';

const STEPS = [
  { key: 'created', label: 'Created', completed: true },
  { key: 'employment', label: 'Employment Details', active: true },
  { key: 'documents', label: 'Documents' },
  { key: 'site', label: 'Site Assignment' },
  { key: 'access', label: 'Access Setup' },
  { key: 'activated', label: 'Activated' },
];

const DOCUMENT_CHECKLIST = [
  { label: 'National ID / Passport', checked: true },
  { label: 'Signed Contract', checked: true },
  { label: 'Enhanced Background Check', checked: true },
  { label: 'First Aid Certification', checked: false },
  { label: 'Uniform Issue Record', checked: false },
];

export default function MyProfilePage() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [profile, setProfile] = useState<GuardProfileData | null>(null);
  const [assignments, setAssignments] = useState<SiteAssignmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('employment');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const meRes = await api.get('/auth/me');
      const empId = meRes.data.data.employeeId;
      const res = await api.get(`/guards/${empId}`);
      setEmployee(res.data.data.employee);
      setProfile(res.data.data.profile);
      setAssignments(res.data.data.assignments || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading profile..." />;
  if (!employee) return <LoadingSpinner text="Profile not found" />;

  const initials = `${employee.firstName[0]}${employee.lastName[0]}`;
  const fullName = [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(' ');
  const categoryLabel = employee.category === 'GUARD' ? 'Guard' : 'Office Staff';
  const tabs = [
    { key: 'personal', label: 'Personal Info' },
    { key: 'employment', label: 'Employment Details' },
    { key: 'documents', label: 'Documents' },
    { key: 'site', label: 'Site Assignment' },
    { key: 'access', label: 'Access' },
  ];

  return (
    <div className="min-h-screen bg-canvas ">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <button onClick={() => navigate('/my-sites')} className="hover:text-blue-600 transition-colors">HR &amp; People</button>
            <span>/</span>
            <span className="text-gray-900 font-medium">Employee Profile Lifecycle</span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Employee Profile Lifecycle</h1>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Onboarding Stepper */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            {STEPS.map((step, i) => (
              <div key={step.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      step.completed
                        ? 'bg-green-500 text-white'
                        : step.active
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                          : 'bg-gray-100 text-gray-400 border-2 border-gray-300'
                    }`}
                  >
                    {step.completed ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`text-xs mt-2 whitespace-nowrap ${
                      step.completed
                        ? 'text-green-600 font-semibold'
                        : step.active
                          ? 'text-blue-600 font-semibold'
                          : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-3 rounded ${
                      step.completed ? 'bg-green-400' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Card - Employee Info */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-6">
              {/* Avatar */}
              <div className="flex flex-col items-center mb-5">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center text-3xl font-bold mb-3 shadow-lg">
                  {initials}
                </div>
                <h2 className="text-lg font-bold text-gray-900 text-center">{fullName}</h2>
                <p className="text-sm text-gray-500">{employee.employeeCode}</p>
                <div className="flex gap-2 mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {categoryLabel}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {employee.status}
                  </span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3 text-sm border-t border-gray-100 pt-4">
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <div>
                    <p className="text-gray-400 text-xs">Phone</p>
                    <p className="font-medium text-gray-900">{employee.phone || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="text-gray-400 text-xs">Email</p>
                    <p className="font-medium text-gray-900">{employee.email || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="text-gray-400 text-xs">Emergency Contact</p>
                    <p className="font-medium text-gray-900">Not set</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <div>
                    <p className="text-gray-400 text-xs">Emergency Phone</p>
                    <p className="font-medium text-gray-900">Not set</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center Content */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-4 border-b border-gray-100">
                <Tabs tabs={tabs} active={activeTab} onChange={(k) => setActiveTab(k as TabKey)} />
              </div>

              <div className="p-6">
                {/* Personal Info Tab */}
                {activeTab === 'personal' && (
                  <div className="space-y-5">
                    <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <InfoField label="Full Name" value={fullName} />
                      <InfoField label="Employee Code" value={employee.employeeCode} />
                      <InfoField label="Date of Birth" value={employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : '—'} />
                      <InfoField label="Gender" value={employee.gender || '—'} />
                      <InfoField label="Phone" value={employee.phone || '—'} />
                      <InfoField label="Email" value={employee.email || '—'} />
                      <div className="col-span-2">
                        <InfoField label="Address" value={employee.address || '—'} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Employment Details Tab */}
                {activeTab === 'employment' && (
                  <div className="space-y-5">
                    <h3 className="text-lg font-semibold text-gray-900">Employment Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <InfoField label="Contract Type" value={profile?.employmentType || employee.guardInfo?.employmentType || '—'} />
                      <InfoField label="Reporting Manager" value="—" />
                      <InfoField label="Pay Grade" value={profile?.rate ? `${profile.rate.toFixed(2)} ETB/hr` : '—'} />
                      <InfoField label="Default Shift Pattern" value="Standard" />
                      <InfoField label="Hire Date" value={new Date(employee.hireDate).toLocaleDateString()} />
                      <InfoField label="Employment Type" value={profile?.employmentType || '—'} />
                      <InfoField label="Department" value={employee.department || '—'} />
                      <InfoField label="Position" value={employee.position || profile?.position || '—'} />
                    </div>
                  </div>
                )}

                {/* Documents Tab */}
                {activeTab === 'documents' && (
                  <div className="space-y-5">
                    <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
                    <div className="space-y-3">
                      {DOCUMENT_CHECKLIST.map((doc) => (
                        <div key={doc.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded flex items-center justify-center ${doc.checked ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                              {doc.checked && (
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className="text-sm font-medium text-gray-700">{doc.label}</span>
                          </div>
                          <span className={`text-xs font-medium ${doc.checked ? 'text-green-600' : 'text-gray-400'}`}>
                            {doc.checked ? 'Uploaded' : 'Pending'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Site Assignment Tab */}
                {activeTab === 'site' && (
                  <div className="space-y-5">
                    <h3 className="text-lg font-semibold text-gray-900">Site Assignment History</h3>
                    {assignments.length === 0 ? (
                      <p className="text-sm text-gray-500">No site assignments yet.</p>
                    ) : (
                      <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200" />
                        <div className="space-y-4">
                          {assignments.map((assignment, idx) => (
                            <div key={assignment._id} className="relative flex gap-4">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${
                                  assignment.isCurrent
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-200 text-gray-500'
                                }`}
                              >
                                {assignment.isCurrent ? (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <span className="text-xs font-bold">{assignments.length - idx}</span>
                                )}
                              </div>
                              <div className={`flex-1 p-3 rounded-lg border ${assignment.isCurrent ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-semibold text-gray-900">{assignment.siteId?.siteName || 'Unknown Site'}</p>
                                    <p className="text-sm text-gray-500">{assignment.siteId?.siteCode} — {assignment.siteId?.location}</p>
                                  </div>
                                  {assignment.isCurrent && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                      Current
                                    </span>
                                  )}
                                </div>
                                <div className="mt-2 flex gap-4 text-xs text-gray-500">
                                  <span>From: {new Date(assignment.effectiveFrom).toLocaleDateString()}</span>
                                  {assignment.effectiveTo && (
                                    <span>To: {new Date(assignment.effectiveTo).toLocaleDateString()}</span>
                                  )}
                                </div>
                                <div className="mt-2 flex gap-4 text-xs">
                                  <span className="text-gray-600">Rate: <strong>{assignment.hourlyRate.toFixed(2)} ETB/hr</strong></span>
                                  <span className="text-gray-600">Hours: <strong>{assignment.standardMonthlyHours}h/mo</strong></span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Access Tab */}
                {activeTab === 'access' && (
                  <div className="space-y-5">
                    <h3 className="text-lg font-semibold text-gray-900">Access Setup</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <InfoField label="Role" value={categoryLabel} />
                      <InfoField label="Pay Rate" value={profile?.rate ? `${profile.rate.toFixed(2)} ETB/hr` : '—'} />
                      <InfoField label="Transport Allowance" value={profile?.transportAllowance ? `${profile.transportAllowance.toFixed(2)} ETB` : '—'} />
                      <InfoField label="ID Card Number" value={profile?.idCardNumber || employee.guardInfo?.idCardNumber || '—'} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-3 space-y-6">
            {/* Workforce Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Workforce Actions</h3>
              <div className="space-y-2">
                <SidebarButton
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                  label="Assign to Site"
                />
                <SidebarButton
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                  label="Update Documents"
                />
                <SidebarButton
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
                    </svg>
                  }
                  label="Generate ID Badge"
                />
                <SidebarButton
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  }
                  label="Initiate Termination"
                  variant="danger"
                />
              </div>
            </div>

            {/* Document Checklist */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Document Checklist</h3>
              <div className="space-y-3">
                {DOCUMENT_CHECKLIST.map((doc) => (
                  <div key={doc.label} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${doc.checked ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                      {doc.checked && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm ${doc.checked ? 'text-gray-700' : 'text-gray-500'}`}>{doc.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

function SidebarButton({
  icon,
  label,
  variant = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
        variant === 'danger'
          ? 'text-red-600 hover:bg-red-50 border border-red-200'
          : 'text-gray-700 hover:bg-gray-50 border border-gray-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
