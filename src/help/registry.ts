import { UserRole } from '../types';
import { PageGuide, Tour, HelpArticle, RouteGuide } from './types';

/** Route → guide mapping. Patterns are tested against location.pathname. */
const ROUTE_PATTERNS: { pattern: RegExp; guideId: string }[] = [
  { pattern: /^\/login$/, guideId: 'login' },
  { pattern: /^\/$/, guideId: 'dashboard' },
  { pattern: /^\/employees\/new$/, guideId: 'employee-form' },
  { pattern: /^\/employees\/[^/]+\/edit$/, guideId: 'employee-form' },
  { pattern: /^\/employees\/[^/]+\/guarantor$/, guideId: 'guarantor' },
  { pattern: /^\/employees$/, guideId: 'employees' },
  { pattern: /^\/contracts\//, guideId: 'contract' },
  { pattern: /^\/companies$/, guideId: 'companies' },
  { pattern: /^\/sites\/qr-codes$/, guideId: 'site-qr-codes' },
  { pattern: /^\/sites\/[^/]+$/, guideId: 'site-detail' },
  { pattern: /^\/sites$/, guideId: 'sites' },
  { pattern: /^\/guards$/, guideId: 'guards' },
  { pattern: /^\/rotations\/new$/, guideId: 'rotation-wizard' },
  { pattern: /^\/rotations\/[^/]+$/, guideId: 'rotation-detail' },
  { pattern: /^\/rotations$/, guideId: 'rotations' },
  { pattern: /^\/staff-attendance$/, guideId: 'staff-attendance' },
  { pattern: /^\/attendance$/, guideId: 'guard-attendance' },
  { pattern: /^\/departments$/, guideId: 'departments' },
  { pattern: /^\/staff-payroll$/, guideId: 'staff-payroll' },
  { pattern: /^\/guard-payroll$/, guideId: 'guard-payroll' },
  { pattern: /^\/profile$/, guideId: 'profile' },
  { pattern: /^\/settings$/, guideId: 'settings' },
  { pattern: /^\/reports$/, guideId: 'reports' },
  { pattern: /^\/guard$/, guideId: 'guard-dashboard' },
  { pattern: /^\/guard\/scan$/, guideId: 'guard-scan' },
  { pattern: /^\/guard\/shifts$/, guideId: 'guard-shifts' },
  { pattern: /^\/my-sites$/, guideId: 'guard-my-sites' },
  { pattern: /^\/my-profile$/, guideId: 'guard-my-profile' },
];

const ADMIN_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.CEO,
];
const PAYROLL_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO,
];
const COMPANY_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.CEO,
];
const OPS_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.OPERATIONS, UserRole.CEO,
];
const ALL_ADMIN_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.OPERATIONS, UserRole.HEAD, UserRole.CEO,
];

// ─────────────────────────────────────────────────────────────────────────────
// PAGE GUIDES — one per implemented route/page. Keep in sync with routes in
// App.tsx (each guide's roles mirror that route's ProtectedRoute).
// ─────────────────────────────────────────────────────────────────────────────
const GUIDES: PageGuide[] = [
  {
    id: 'login',
    module: 'Authentication',
    title: 'Sign In',
    purpose: 'The single entry point. Your email and password identify you, and your account role then decides everything you can see and do inside Vital-ERP.',
    prerequisites: [
      'A system account created by a Super Admin (Settings → Provision New User). Password minimum is enforced by the backend.',
      'Your account must be in the ACTIVE state — suspended accounts are rejected with a message.',
    ],
    steps: [{ title: 'Sign in', items: [
      { text: 'Enter your work email and password.', example: 'Passwords are case-sensitive.' },
      { text: 'Press Sign In. You land on the Dashboard (guards land on their own Guard Dashboard).', example: 'Your session is remembered in this browser until you log out.' },
      { text: 'If sign-in fails, the exact reason is shown — usually a wrong password or a deactivated account.' },
    ]}],
    problems: { title: 'Common mistakes', items: [
      { text: 'Using the wrong email — each staff member has exactly one system account; contact an admin rather than creating another.' },
      { text: 'Expecting a "forgot password" button — password resets are done by a Super Admin in Settings.' },
    ]},
    actions: [
      { label: 'Sign In', does: 'Authenticates you and loads your role, permissions, and dashboard.', impact: 'statutory', disabledWhen: 'Disabled while the request is running ("Signing in...").' },
      { label: 'Show / hide password', does: 'Toggles password visibility so you can check what you typed.' },
    ],
    next: [{ label: 'Dashboard', route: '/', note: 'Your starting hub after sign-in.' }],
    roles: [],
  },
  {
    id: 'dashboard',
    module: 'Overview',
    title: 'Dashboard',
    purpose: 'A role-aware landing page: counters for your domain (total/active/on-leave/new-hire stats for HR, payroll figures for Finance, module cards for navigation).',
    prerequisites: [
      'Nothing — it works immediately and shows only modules your role may access.',
    ],
    steps: [{ title: 'Using the dashboard', items: [
      { text: 'Read the welcome header with the current date and the module cards below.', example: 'Cards labeled SOON under development.' },
      { text: 'Click a module card to open it; the top navigation then switches to that module\u2019s tabs.' },
      { text: 'Use the search box at the top to jump by module name, employee, or site.', example: 'Typing "q" or "?" anywhere (when not typing in a field) opens the page guide.' },
    ]}],
    problems: { title: 'Common mistakes', items: [
      { text: 'Looking for payroll menus under HR — payroll lives in the Payroll module group in the navigation.' },
      { text: 'Expecting a card for a module you cannot access — the dashboard intentionally hides modules outside your role.' },
    ]},
    actions: [
      { label: 'Module cards', does: 'Navigate to each implemented module. Clicking requires that your role has access; cards without a route are placeholders.' },
      { label: 'Profile chip', does: 'Opens your own Profile page (not another user\u2019s).' },
    ],
    next: [
      { label: 'Employees', route: '/employees', note: 'HR starts here.' },
      { label: 'Guard Payroll', route: '/guard-payroll', note: 'Finance starts here.' },
      { label: 'Reports', route: '/reports', note: 'Cross-module data with CSV export.' },
    ],
    roles: ALL_ADMIN_ROLES,
  },
  {
    id: 'employees',
    module: 'HR & People',
    title: 'Employees',
    purpose: 'The workforce directory: browse employees, inspect personal/employment details, change status, register guarantors and contracts from the tabs, and delete records.',
    prerequisites: [
      'An account with an HR-capable role (Super Admin, System Admin, HR Admin, or CEO).',
      'Departments and positions already exist — create them first on Departments & Positions.',
    ],
    steps: [{ title: 'Working with employees', items: [
      { text: 'Search by name or employee code, then filter by role, department, or status.' },
      { text: 'Click a row to open the detail panel on the right with Personal, Employment, Compensation and Guard information tabs.' },
      { text: 'Use the tabs above the table: Directory, Guarantor, Contract, Attendance, Performance.', example: 'New hires start INACTIVE — they become ACTIVE only after an active contract and a verified guarantor are on file.' },
      { text: 'Change status with the status control in the detail panel; a reason (min 3 chars) is recorded with the employee code of the actor for audit.' },
    ]}],
    problems: { title: 'Common mistakes', items: [
      { text: 'Deleting an employee that payroll depends on — deletion is permanent and history is kept only through audit records.' },
      { text: 'Setting salary in the employee form for guards — guards\u2019 pay comes from site compensation, not a salary field.' },
    ]},
    actions: [
      { label: 'New employee', does: 'Opens the 3-step registration wizard (Personal → Employment → Documents).', requiresPermission: 'employee.create' },
      { label: 'Edit', does: 'Reopens the wizard with saved values; changes are saved per tab.' },
      { label: 'Deactivate / Delete', does: 'Removes the employee record after a typed confirmation. This cannot be undone.', impact: 'irreversible', requiresPermission: 'employee.delete' },
      { label: 'Change Status', does: 'Moves the employee between ACTIVE / INACTIVE / ON_LEAVE / TERMINATED with a mandatory reason and audit entry.' },
      { label: 'Export CSV', does: 'Downloads the filtered directory as a CSV file — no server change.' },
    ],
    next: [
      { label: 'Contract page', route: '/contracts', note: 'Open from the Contract tab for a selected employee.' },
      { label: 'Departments & Positions', route: '/departments' },
    ],
    roles: ADMIN_ROLES,
  },
  {
    id: 'employee-form',
    module: 'HR & People',
    title: 'Register / Edit Employee',
    purpose: 'A three-step wizard that creates or updates the core employee record: identity, placement & pay, and documents.',
    prerequisites: [
      'At least First Name, Last Name and Phone — the wizard requires them before the next step.',
      'For guards: a planned assignment later in Operations → Guards.',
    ],
    steps: [{ title: 'Wizard steps', items: [
      { text: 'Personal: identity, gender, date of birth, address, and emergency contact.' },
      { text: 'Employment: category (Guard or Office Staff), department, position, join date, employment type.', example: 'Salary and transport allowance can be left blank — set them from the contract once the contract exists.' },
      { text: 'Documents: attach ID copies or certificates with a title, optionally several files.' },
      { text: 'Press Create/Save. You return to the directory with the employee listed INACTIVE until contract + guarantor are complete.' },
    ]}],
    problems: { title: 'Common mistakes', items: [
      { text: 'Choosing the wrong category — Guard vs Office Staff decides which payroll system the person enters, and it is not meant to flip later.' },
      { text: 'Entering a salary for a guard here — guard pay is derived from the site compensation amount at payroll time.' },
    ]},
    actions: [
      { label: 'Back / Next', does: 'Moves between wizard steps; validation blocks Next until the step is valid.' },
      { label: 'Create / Save', does: 'Persists the employee. Disabled while saving.' },
      { label: 'Add another file', does: 'Adds another document row; only files with a chosen file are uploaded.' },
    ],
    next: [{ label: 'Guarantor page', route: '/employees', note: 'Open the employee \u2192 Guarantor tab next.' }],
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN],
  },
  {
    id: 'guarantor',
    module: 'HR & People',
    title: 'Guarantor Management',
    purpose: 'Records and verifies the guarantor attached to one employee — a prerequisite for activation and a reference point for loans.',
    prerequisites: [
      'The employee record exists (open from the employee\u2019s Guarantor tab).',
      'Client name and ID number for persons, plate/make/year for vehicles, or title number/value for property.',
    ],
    steps: [{ title: 'Registering a guarantor', items: [
      { text: 'Pick the guarantor type: Person, Vehicle Collateral, or Property Collateral — the form adapts.' },
      { text: 'Fill the required fields plus relationship and document description; attach supporting documents.' },
      { text: 'Save, then a verifier (HR/management) uses Verify or Reject on the submitted record.', example: 'Reject requires a reason which is shown on the record.' },
      { text: 'Only a verify-verified guarantor satisfies the activation requirement.' },
    ]}],
    problems: { title: 'Common mistakes', items: [
      { text: 'Saving with missing collateral details for vehicle/property types — Verify checks completeness first.' },
      { text: 'Expecting the employee to activate immediately — activation also needs an active contract.' },
    ]},
    actions: [
      { label: 'Add Guarantor', does: 'Creates a new guarantor record for this employee.', requiresPermission: 'employee.update' },
      { label: 'Edit', does: 'Reopens the form; changes are appended to the record\u2019s history.' },
      { label: 'Verify / Reject', does: 'Confirms or refuses the guarantor; rejected records carry the reason.', impact: 'statutory' },
      { label: 'Delete', does: 'Removes the guarantor record after confirmation. Cannot be undone.', impact: 'irreversible' },
    ],
    next: [{ label: 'Back to employee', route: '/employees', note: 'Continue with the Contract tab.' }],
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.CEO],
  },
  {
    id: 'contract',
    module: 'HR & People',
    title: 'New / Update Contract',
    purpose: 'Creates or updates an employee\u2019s employment contract: dates, position, salary grade, earnings lines and pension participation. The contract feeds Staff Payroll directly.',
    prerequisites: [
      'An employee record (the URL contains the employee id).',
      'Positions and pay grades fromHR\u2019s Departments & Positions page.',
    ],
    steps: [{ title: 'Building the contract', items: [
      { text: 'Contract information: pick the employee (on create), type (Full-Time, Part-Time, Contract, Temporary, Internship), start date and optional end date.' },
      { text: 'Choose a salary grade to pre-fill earnings, or select "No structure — manual entry" and type amounts yourself.' },
      { text: 'Salary lines: Basic Salary, allowances (transport, responsibility, tele, taxable transport, non-taxable allowance).', example: 'Guards receive only a transport allowance — other lines stay zero.' },
      { text: 'Pension: tick "Employee participates in pension scheme". Leaving it unticked is a pension opt-out — no employee (7%) or employer (11%) contributions.' },
      { text: 'Save Contract. Staff Payroll snapshots contract values at each calculation, so later edits never rewrite past payslips.' },
    ]}],
    problems: { title: 'Common mistakes', items: [
      { text: 'Setting an end date before the start date — validation rejects it.' },
      { text: 'Thinking an edit recalculates past payroll — it does not; snapshots stay frozen.' },
    ]},
    actions: [
      { label: 'Save Contract', does: 'Creates or updates the contract and its salary history. The initial salary is recorded as history on create.' },
      { label: 'Back to Employees', does: 'Leaves without saving only if nothing was changed.' },
    ],
    next: [{ label: 'Staff Payroll', route: '/staff-payroll', note: 'Contracts flow into the next staff payroll run.' }],
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.CEO],
  },
  {
    id: 'companies',
    module: 'Company',
    title: 'Companies',
    purpose: 'Client companies that own sites: contact and agreement data (TIN, payment price, OT price, agreement dates) with CSV export and deactivation.',
    prerequisites: [
      'Company name and TIN from the client.',
      'Often created together with the first site under the company.',
    ],
    steps: [{ title: 'Managing companies', items: [
      { text: 'Search or paginate the table; use the column picker to hide/show columns.' },
      { text: 'Add Company opens a modal: name, TIN, payment price, default OT price, agreement start / end, contact person.' },
      { text: 'Agreement end must be on or afterstart — the modal validates before saving.' },
      { text: 'Deactivate keeps the company for history but blocks new financial use.' },
    ]}],
    problems: { title: 'Common mistakes', items: [
      { text: 'Entering the payment price per guard vs per site — confirm the client\u2019s agreement wording before saving.' },
      { text: 'Deleting in the head — the action offered is deactivation, which is safer and reversible.' },
    ]},
    actions: [
      { label: 'Add Company', does: 'Creates the client record.', requiresPermission: 'company.create' },
      { label: 'Edit', does: 'Updates company details in a modal.' },
      { label: 'Deactivate', does: 'Marks the company inactive after a typed confirmation; kept for history.', impact: 'irreversible' },
      { label: 'Export CSV', does: 'Downloads the current (filtered) list.' },
    ],
    next: [{ label: 'Sites', route: '/sites', note: 'Sites belong to companies.' }],
    roles: COMPANY_ROLES,
  },
  {
    id: 'sites',
    module: 'Company',
    title: 'Sites',
    purpose: 'Client sites where guard work happens: identity, location, classification, manpower, contact, tax center / pension site, and note history. Sites carry QR codes for attendance.',
    prerequisites: [
      'A company exists to attach the site to (optional but recommended).',
      'Site name, code, and area/zone are the hard-required fields.',
    ],
    steps: [{ title: 'Managing sites', items: [
      { text: 'Search or filter; open a site row to see its full detail page.' },
      { text: 'Add Site opens the creation form with sections: Site Identity, Type & Classification, Location, Manpower, Contact Person.' },
      { text: 'Site code is unique — it is also what guards scan/type on the Scan QR page.', example: 'Codes are case-sensitive as typed.' },
      { text: 'Use Site QR Codes (top of the table) to print QR sheets for the new site.' },
      { text: 'Export CSV downloads the filtered table.' },
    ]}],
    problems: { title: 'Common mistakes', items: [
      { text: 'Reusing a site code — guards would clock into the wrong site; the code is the attendance key.' },
      { text: 'Creating a site without specifying tax center / pension site — these feed payroll statutorily.' },
    ]},
    actions: [
      { label: 'Add Site', does: 'Creates the site record.', requiresPermission: 'site.create' },
      { label: 'Edit', does: 'Modifies site info.', requiresPermission: 'site.update' },
      { label: 'Deactivate', does: 'Deactivates the site after typing its code; guards on it are relieved and it remains for history.', impact: 'irreversible', requiresPermission: 'site.update' },
      { label: 'Site QR Codes', does: 'Navigates to the printable QR sheet for all sites.' },
      { label: 'Export CSV', does: 'Downloads the list; disabled while generating.' },
    ],
    next: [
      { label: 'Site detail', route: '/sites', note: 'Click a row for overview, shifts, guards, notes.' },
      { label: 'Guards', route: '/guards', note: 'Assign guards to the site.' },
    ],
    roles: COMPANY_ROLES,
  },
  {
    id: 'site-detail',
    module: 'Company',
    title: 'Site Detail',
    purpose: 'Everything about one site: overview with statistics and price history, the generated shift schedule, guard coverage, and site notes.',
    prerequisites: [
      'The site exists (open from Sites).',
    ],
    steps: [{ title: 'Touring the tabs', items: [
      { text: 'Overview: site information, active assignments, statistics, price history, and rotations for this site.' },
      { text: 'Shifts: the shift schedule generated by rotations plus currently active assignments.' },
      { text: 'Guards: who is assigned, with a primary-site marker for the payroll contract site.' },
      { text: 'Notes: an audit-style note history; Add Site Note appends a timestamped note.', example: 'Notes are for operational context — they do not change data.' },
    ]}],
    problems: { title: 'Common mistakes', items: [
      { text: 'Editing the site name or code after guards started scanning the old code — attendance history is keyed by the code.' },
    ]},
    actions: [
      { label: 'Save (edit mode)', does: 'Persists changes to the site record.' },
      { label: 'Add Site Note', does: 'Appends a note; disabled until text is entered.' },
      { label: 'Deactivate Site', does: 'Asks you to type the exact site code, then deactivates and relieves guards. For history only afterwards.', impact: 'irreversible' },
    ],
    next: [
      { label: 'Guards', route: '/guards' },
      { label: 'Rotations', route: '/rotations' },
    ],
    roles: COMPANY_ROLES,
  },
  {
    id: 'site-qr-codes',
    module: 'Company',
    title: 'Site QR Codes',
    purpose: 'Generates printable QR sheets for active sites so guards can scan at the gate to clock in and out.',
    prerequisites: [
      'At least one ACTIVE site with a site code.',
      'A camera-capable phone or scanner app on the guard\u2019s side.',
    ],
    steps: [{ title: 'Printing QR codes', items: [
      { text: 'Open the page from Sites (QR Codes button).' },
      { text: 'Print all sheets, or download a single site\u2019s QR code.' },
      { text: 'Post the sheet at the site entrance; guards scan it on the Scan QR page to record attendance.' },
    ]}],
    problems: { title: 'Common mistakes', items: [
      { text: 'Reprinting after a site code change without updating the posted sheet — the old poster stops matching guards.' },
    ]},
    actions: [
      { label: 'Print all', does: 'Opens the print dialog with one card per active site.' },
      { label: 'Download', does: 'Saves the QR image for one site.' },
    ],
    next: [{ label: 'Guard portal · Scan QR', route: '/guard/scan', note: 'What guards see when scanning.' }],
    roles: OPS_ROLES,
  },
  {
    id: 'guards',
    module: 'Operations',
    title: 'Guards',
    purpose: 'The operations hub for guard staff: the roster with employment details and a rate summary, plus site assignments with an audited correction mode.',
    prerequisites: [
      'Guards registered in HR (category GUARD) with an attendable status.',
      'Sites exist to assign them to.',
    ],
    steps: [{ title: 'Assigning and supervising guards', items: [
      { text: 'Filter the roster by assignment (all / assigned / unassigned), site, and status; search by name or code.' },
      { text: 'Select a guard to open the detail panel: profile rate, transport allowance, employment info, site assignments with primary marker.' },
      { text: 'Assign Guard opens a modal to choose the site and effective date; the guard joins as GUARD — supervision is managed per site.' },
      { text: '\u2605 Make primary schedules the date a site becomes the payroll contract site; confirm shows the effective change before applying.' },
      { text: 'Relieve removes a site assignment after confirmation; the guard becomes unassigned.' },
      { text: 'Correct history opens an audited correction: every change records a mandatory reason and the actor.' },
    ]}],
    problems: { title: 'Common mistakes', items: [
      { text: 'Leaving a guard with two primary sites or none — payroll needs exactly one primary site per period.', example: 'Payroll readiness in Guard Payroll reports exactly this problem.' },
      { text: 'Assigning guards retroactively to a date with existing attendance — assignments are date-effective and past attendance stays intact.' },
    ]},
    actions: [
      { label: 'Assign Guard', does: 'Creates a site assignment effective from the chosen date.' },
      { label: '\u2605 Make primary', does: 'Sets a site as the contract site for payroll from the effective date; overlapping assignments are checked.', impact: 'statutory' },
      { label: 'Relieve', does: 'Ends the site assignment after typed confirmation.', impact: 'locking' },
      { label: 'Correct history', does: 'Adjusts past assignments with a mandatory audit reason; used only for real data mistakes.', impact: 'irreversible' },
      { label: 'Export CSV', does: 'Downloads the roster.' },
    ],
    next: [
      { label: 'Attendance', route: '/attendance', note: 'Record daily hours per site.' },
      { label: 'Guard Payroll', route: '/guard-payroll', note: 'Pay once hours and compensation are ready.' },
    ],
    roles: OPS_ROLES,
  },
  {
    id: 'rotations',
    module: 'Operations',
    title: 'Rotations',
    purpose: 'Constraint-based guard scheduling: build a rotation for one site, let the engine generate a fair shift schedule, then approve and publish it.',
    prerequisites: [
      'A site and a guard pool (assigned guards).',
      'Rest rules awareness: after shifts of up to N hours, guards must rest at least N hours.',
    ],
    steps: [{ title: 'Rotation lifecycle', items: [
      { text: 'Create rotation from the list: name, site, start (and optional end) date.' },
      { text: 'In the wizard choose shift design (standard 12h day/night, single 24h, or custom) and recovery rules, then add guards to the pool.' },
      { text: 'Generate the schedule; the engine flags conflicts and stale schedules regenerate.' },
      { text: 'Approve, then Publish so assignments become the site\u2019s working schedule.', example: 'Rotation statuses move Draft \u2192 Generated \u2192 In review \u2192 Approved \u2192 Published.' },
    ]}],
    problems: { title: 'Common mistakes', items: [
      { text: 'Pool smaller than the required guards per shift — generation stops with a clear shortfall message.' },
      { text: 'Editing a published rotation manually instead of regenerating — published schedules are used for real attendance comparisons.' },
    ]},
    actions: [
      { label: 'New rotation', does: 'Opens the wizard to configure a new schedule.' },
      { label: 'Generate', does: 'Runs the scheduling engine; preview first to inspect without committing.' },
      { label: 'Approve', does: 'Locks the generated schedule for review sign-off.' },
      { label: 'Publish', does: 'Makes the rotation active for the site with a typed confirmation.', impact: 'locking' },
      { label: 'Delete', does: 'Removes a draft rotation permanently.', impact: 'irreversible' },
    ],
    next: [{ label: 'Attendance', route: '/attendance', note: 'Actual hours are compared against the schedule.' }],
    roles: [UserRole.SUPER_ADMIN, UserRole.HR_ADMIN, UserRole.OPERATIONS, UserRole.HEAD, UserRole.CEO],
  },
  {
    id: 'rotation-wizard',
    module: 'Operations',
    title: 'Rotation Wizard',
    purpose: 'Three-step creator for a rotation: basics (site, dates), shift design with recovery rules, and the guard pool. The engine handles fairness after this.',
    prerequisites: [
      'A site and enough assigned guards for the shifts you require.',
    ],
    steps: [{ title: 'Wizard steps', items: [
      { text: 'Step 1 — Basics: unique name, site, start date, optional end date.' },
      { text: 'Step 2 — Shifts & rest: day/night 12h, one 24h shift, or custom shifts (start/end may cross midnight); configure minimum rest per shift length.' },
      { text: 'Step 3 — Guard pool: add guards; requirement is at least the per-shift headcount.' },
      { text: 'Create rotation runs generation and lands you on the rotation detail.' },
    ]}],
    problems: { title: 'Common mistakes', items: [
      { text: 'Entering zero guards required but selecting a pool — validation wants at least one shift with headcount.' },
    ]},
    actions: [
      { label: 'Next / Back', does: 'Moves between steps; each validates its inputs first.' },
      { label: 'Create rotation', does: 'Creates the rotation and immediately generates its first schedule.', impact: 'statutory' },
    ],
    next: [{ label: 'Rotation detail', route: '/rotations', note: 'Review the generated schedule.' }],
    roles: [UserRole.SUPER_ADMIN, UserRole.HR_ADMIN, UserRole.OPERATIONS],
  },
  {
    id: 'rotation-detail',
    module: 'Operations',
    title: 'Rotation Detail',
    purpose: 'Inspect and operate one rotation: the generated schedule per guard/day, conflict list, approve / publish / pause actions, and pool management.',
    prerequisites: [
      'A rotation exists (generated or not).',
    ],
    steps: [{ title: 'Reviewing a schedule', items: [
      { text: 'Check the schedule table and conflict panel — conflicts cite the broken rule (rest, double assignment, staffing).' },
      { text: 'Preview shows a what-if schedule before Generate commits it.' },
      { text: 'Approve when the schedule is acceptable, then Publish with a typed confirmation.' },
      { text: 'Rotate-manually overrides guard assignments when a real-world swap is needed.' },
    ]}],
    problems: { title: 'Common mistakes', items: [
      { text: 'Publishing with unresolved critical conflicts — fix rest/staffing issues first.' },
    ]},
    actions: [
      { label: 'Generate', does: 'Creates or regenerates the schedule from the pool and rules.' },
      { label: 'Approve', does: 'Marks the schedule approved for publishing.' },
      { label: 'Publish', does: 'Activates the published rotation with typed confirmation.', impact: 'locking' },
      { label: 'Pause / Resume', does: 'Stops or continues an active rotation.' },
      { label: 'Delete', does: 'Permanently removes the rotation.', impact: 'irreversible' },
    ],
    next: [{ label: 'Rotations list', route: '/rotations' }],
    roles: [UserRole.SUPER_ADMIN, UserRole.HR_ADMIN, UserRole.OPERATIONS, UserRole.HEAD, UserRole.CEO],
  },
  {
    id: 'staff-attendance',
    module: 'HR & People',
    title: 'Staff Attendance',
    purpose: 'Monthly grid of office-staff daily status (Present, Absent, leaves, Half Day, Holiday, Weekend) plus a payable-days summary that Staff Payroll uses.',
    prerequisites: [
      'Office staff employees exist.',
      'A payroll period for the month — periods are created automatically when attendance is first filed.',
    ],
    steps: [{ title: 'Marking a month', items: [
      { text: 'Navigate months with the arrows; switch between Grid and Summary views.' },
      { text: 'In the grid, select a whole row or a day column and choose the status — the selection applies at once with a confirmation for bulk marks.' },
      { text: 'Quick actions mark everyone as Present or Absent for today only', example: 'ABSENT and UNPAID_LEAVE do not count toward payable days; WEEKEND counts as payable.' },
      { text: 'Open the Periods tab to lock a period before payroll, or unlock it during correction with a reason.' },
      { text: 'Print Report gives a printable month summary.' },
    ]}],
    problems: { title: 'Common mistakes', items: [
      { text: 'Marking statuses after payroll — locked periods are read-only by design; ask Finance to unlock with a reason.' },
      { text: 'Using closed periods — after payroll finalization only a Super Admin reopens them.' },
    ]},
    actions: [
      { label: 'Status cells / bulk mark', does: 'Applies the chosen status per day; requires confirmation for bulk operations.', requiresPermission: 'staff-attendance.manage' },
      { label: 'Mark All Present / Absent Today', does: 'One click for everyone for today\u2019s date only.' },
      { label: 'Lock Period', does: 'Freezes the month for payroll; requires a reason and is shown read-only afterwards.', impact: 'locking' },
      { label: 'Unlock', does: 'Reopens a locked period with a mandatory reason; kept in the audit log.', impact: 'statutory' },
      { label: 'Print Report', does: 'Printable attendance summary; changes nothing.' },
    ],
    next: [{ label: 'Staff Payroll', route: '/staff-payroll', note: 'Payable days feed the staff calculation.' }],
    roles: ADMIN_ROLES,
  },
  {
    id: 'guard-attendance',
    module: 'Operations',
    title: 'Guard Attendance',
    purpose: 'Records how many hours each guard worked per site per day or month, and classifies them into normal / holiday / Sunday hours — the input for Guard Payroll.',
    prerequisites: [
      'Guards assigned to the site (Operations → Guards) with an attendable status.',
      'A payroll period that is not locked by Guard Payroll.',
    ],
    steps: [{ title: 'The three tabs', items: [
      { text: 'Daily Entry: pick a site and date, see the roster, and enter each guard\u2019s hours; today/yesterday shortcuts preselect dates.' },
      { text: 'Monthly Hours: one sheet per guard and month, split into Normal, Holiday, and Sunday hours — Slide saves all sheets at once.' },
      { text: 'Monthly Totals: read-only comparison of monthly sheets vs daily records plus payroll readiness and issue counts.' },
    ]}],
    problems: { title: 'Common mistakes', items: [
      { text: 'Entering hours on a future date without the future-entry permission, or negative/over-max values — validation rejections show inline with the reason.' },
      { text: 'Frames double entry — Void an erroneous record (with a reason) instead of re-typing; voided rows remain in the audit history.' },
      { text: 'Forgetting that holiday and Sunday hours are multiplied by the OT rate — enter them explicitly, not as normal hours.' },
    ]},
    actions: [
      { label: 'Save attendance', does: 'Saves the visible day\u2019s entries; only rows with changes are sent.', requiresPermission: 'guard-attendance.manage' },
      { label: 'Save monthly hours', does: 'Saves all modified sheets for the period.', requiresPermission: 'guard-attendance.manage' },
      { label: 'Void entry', does: 'Removes the hours from a record (with reason) while keeping the audit trail.', impact: 'irreversible' },
      { label: 'Today / Yesterday', does: 'Jumps the date selector.' },
    ],
    next: [{ label: 'Guard Payroll', route: '/guard-payroll', note: 'Runs use the saved monthly hours.' }],
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.OPERATIONS, UserRole.FINANCE_OFFICER, UserRole.CEO],
  },
  {
    id: 'departments',
    module: 'HR & People',
    title: 'Departments & Positions',
    purpose: 'Maintains the org structure: departments, their positions, and pay grades used as the salary-structure picker on contracts.',
    prerequisites: [
      'HR-level account (Super Admin, System Admin, HR Admin, CEO). Other roles see a read-only note.',
    ],
    steps: [{ title: 'Building the structure', items: [
      { text: 'Add a department first, then add positions inside it (e.g. CFO under Finance).' },
      { text: 'Pay grades are global (e.g. "G1 - Junior"): name, min and max salary, optional description.', example: 'Deleting a grade keeps its name on existing contracts but removes it from future pickers.' },
      { text: 'Contract pages read this data live — check spelling before saving.' },
    ]}],
    problems: { title: 'Common mistakes', items: [
      { text: 'Deleting a department with positions — positions survive but become unassigned.' },
      { text: 'Typing max salary below min — validation blocks saving the grade.' },
    ]},
    actions: [
      { label: 'Add department / position', does: 'Creates entries used by employee and contract forms.', requiresPermission: 'organization.manage' },
      { label: 'Add Grade', does: 'Creates a pay grade with a salary range.', requiresPermission: 'organization.manage' },
      { label: 'Delete (department/position/grade)', does: 'Removes after typed confirmation, as described above.', impact: 'irreversible' },
    ],
    next: [{ label: 'Contracts', route: '/contracts', note: 'Grades appear as salary structures.' }],
    roles: ADMIN_ROLES,
  },
  {
    id: 'staff-payroll',
    module: 'Payroll',
    title: 'Staff Payroll',
    purpose: 'Contract-driven office payroll: one frozen company formula per employee (basic + allowances, 7/11 pension, progressive tax), one run per month, with a full review lifecycle, per-run detail and formal payslips.',
    prerequisites: [
      'Active contracts with earnings lines for all staff.',
      'Attendance period filed and locked for the month.',
      'Income tax table and pension rule configured in the Tax & pension tab, effective for the month.',
    ],
    steps: [{ title: 'A payroll month', items: [
      { text: 'Runs tab: pick month/year and press Calculate payroll — the run computes every staff member from their contract snapshot.' },
      { text: 'Fix problem entries listed on the run (everything is a link into the right tab: overtime, deductions, config).' },
      { text: 'Enter per-employee extras in Overtime & bonus (taxable) — remember that Bonus is outside the formula: untaxed, non-pensionable, added after net pay.' },
      { text: 'Deductions tab: create loan or penalty deductions with type, amount, and optional monthly installment; attendance-based suggestions appear in the run where absence was flagged.' },
      { text: 'Lifecycle: Submit \u2192 Check \u2192 Approve \u2192 Mark as paid; Return for correction reopens a run for recalculation. Each action shows a confirmation and records who did it and when.' },
      { text: 'Open a record\u2019s breakdown modal for the full formula trace, or the formal Payslip view for printing.' },
    ]}],
    problems: { title: 'Common mistakes', items: [
      { text: 'Entering a bonus as overtime — overtime is taxed and pensionable, a bonus is neither.' },
      { text: 'Expecting recalculations to change an approved run — only DRAFT runs recalculate; approved/paid runs keep their snapshot.' },
      { text: 'Paying without checking the run list first — payment reference numbers and bank exports live under the run actions.' },
    ]},
    actions: [
      { label: 'Calculate payroll', does: 'Creates the month\u2019s run and computes all staff from contract snapshots + tax/pension config.', requiresPermission: 'office-payroll.create' },
      { label: 'Submit', does: 'Locks the run for review; inputs become read-only until returned.', impact: 'locking' },
      { label: 'Check', does: 'Records the checker and prepares state for approval.', impact: 'statutory' },
      { label: 'Approve', does: 'Finalizes amounts and settles active loan/advance installments.', impact: 'statutory' },
      { label: 'Mark as paid', does: 'Records the payment reference; not a bank transfer on its own.', requiresPermission: 'office-payroll.pay' },
      { label: 'Return for correction', does: 'Reopens a submitted-or-later run to DRAFT with a mandatory reason; audit trail kept.', impact: 'statutory', requiresPermission: 'office-payroll.return' },
      { label: 'Recalculate', does: 'Recomputes a DRAFT run from current inputs; later stages do not recalculate.' },
      { label: 'Export bank / tax / pension / register', does: 'CSVs for the bank transfer file and statutory reports; register is the per-employee summary.' },
      { label: 'Overtime & bonus', does: 'Saves per-month employee entries that merge into the next calculation.' },
    ],
    next: [
      { label: 'Guard Payroll', route: '/guard-payroll', note: 'The guards\u2019 parallel payroll system.' },
      { label: 'Reports', route: '/reports' },
    ],
    roles: PAYROLL_ROLES,
  },
  {
    id: 'guard-payroll',
    module: 'Payroll',
    title: 'Guard Payroll',
    purpose: 'The guards\u2019 paysystem: monthly attendance hours per site are converted into pay using each site\u2019s compensation amount, with a strict readiness gate, site-by-site breakdown, and a review lifecycle ending in payment.',
    prerequisites: [
      'Every guard has: an ACTIVE contract, exactly one primary site, a compensation amount for each site worked, and monthly hours recorded.',
      'Tax/pension configuration effective for the month (Settings tab).',
      'An unlocked period while entering data; the period locks on Submit.',
    ],
    steps: [{ title: 'A payroll month', items: [
      { text: 'Setup & readiness: the page lists exactly what is missing and links to the fix (assignments, attendance, compensation, settings).' },
      { text: 'Calculate payroll becomes enabled once readiness is green; the run computes primary-site pay (OT rate = compensation \u00F7 240, structural Sunday allocation, 20% transport, basic hourly = remainder \u00F7 208) plus per-additional-site earnings at that site\u2019s OT rate.' },
      { text: 'Pension applies to primary pay only; income tax applies across sites; transport is not taxable.' },
      { text: 'Review the results table, open View breakdown for a transparent per-site calculation, then Submit \u2192 Check \u2192 Approve \u2192 Mark as paid.', example: 'Return for correction reopens the run with a mandatory reason; recalculation only exists before submission.' },
      { text: 'Site Compensation tab: record each site\u2019s agreed amount with an effective date — old rows retire automatically, history is immutable.' },
      { text: 'Deductions tab: loans and penalties with monthly installments, settled at approval.' },
      { text: 'Settings tab: transport %, OT divisor, Sunday structural hours, basic hourly divisor, tax tables and pension rules.' },
    ]}],
    problems: { title: 'Common mistakes', items: [
      { text: 'Recalculating expectations after Submit — the run is locked; use Return for correction, then Recalculate.' },
      { text: 'Changing site compensation before a historic payroll question — history reads the row that was effective that month, not the current one.' },
      { text: 'Paying before the run is APPROVED — Mark as paid appears only then.' },
    ]},
    actions: [
      { label: 'Calculate payroll', does: 'Creates the run for the selected month; blocked until every readiness item is resolved and the period is not locked.', requiresPermission: 'guard-payroll.calculate', impact: 'statutory' },
      { label: 'Refresh readiness', does: 'Re-checks the requirements list.' },
      { label: 'Submit', does: 'Locks attendance and payroll for the period and moves the run into review.', impact: 'locking' },
      { label: 'Check', does: 'Confirms guard results and statutory deductions were checked.', impact: 'statutory' },
      { label: 'Approve', does: 'Finalizes amounts and settles loan installments.', impact: 'statutory' },
      { label: 'Mark as paid', does: 'Records payment reference per guard; does not execute a bank transfer itself.', requiresPermission: 'guard-payroll.pay', impact: 'irreversible' },
      { label: 'Return for correction', does: 'Reopens the run for editing with a mandatory written reason.', requiresPermission: 'guard-payroll.return', impact: 'statutory' },
      { label: 'Recalculate', does: 'Replaces the editable calculation with current attendance, rates and deductions.' },
      { label: 'View breakdown', does: 'Opens the per-guard, per-site calculation trace; read-only once submitted.' },
      { label: 'Save compensation', does: 'Records a site\u2019s compensation effective from a date.', requiresPermission: 'guard-payroll.rates', impact: 'statutory' },
      { label: 'Exports (bank/tax/pension/register)', does: 'CSVs for statutory filings and banks; enabled for APPROVED/PAID runs.' },
    ],
    next: [
      { label: 'Staff Payroll', route: '/staff-payroll' },
      { label: 'Attendance', route: '/attendance', note: 'Where the hours come from.' },
    ],
    roles: PAYROLL_ROLES,
  },
  {
    id: 'profile',
    module: 'Administration',
    title: 'My Profile',
    purpose: 'Your own account: contact details, avatar, and password change. Changes affect only your account.',
    prerequisites: [
      'Signed in — every role has this page.',
    ],
    steps: [{ title: 'Self-service', items: [
      { text: 'Update contact information and press Save Changes; a success toast confirms.' },
      { text: 'Change photo accepts image files only.' },
      { text: 'Change password needs your current password; the new password must be at least 6 characters and match its confirmation.' },
    ]}],
    problems: { title: 'Common mistakes', items: [
      { text: 'Expecting role changes here — role assignment is a Settings (provisioning) function.' },
    ]},
    actions: [
      { label: 'Save Changes', does: 'Persists profile edits.' },
      { label: 'Update Password', does: 'Changes your password after verifying the current one; you keep your session.' },
    ],
    next: [{ label: 'Dashboard', route: '/' }],
    roles: ALL_ADMIN_ROLES,
  },
  {
    id: 'settings',
    module: 'Administration',
    title: 'System & User Directory',
    purpose: 'Administration hub: provision users, see and adjust their module access, read the effective role\u2192permission matrix, and follow the audit log.',
    prerequisites: [
      'Super Admin, System Admin, Finance Officer, or CEO role.',
    ],
    steps: [{ title: 'Administration tasks', items: [
      { text: 'Users tab: search users, review role / department / last login / 2FA / state, and adjust per-user Module Access (GRANT or DENY).' },
      { text: 'Provision New User creates a login with a role; the role baseline is what the Roles & Permissions tab displays.', example: 'A user\u2019s DENY beats the role\u2019s GRANT, and module grants stack on top of the role\u2019s base permissions.' },
      { text: 'Roles & Permissions tab: click a role row to expand its full effective permission list.' },
      { text: 'Audit Log shows security-important events; System Settings and Integrations tabs are placeholders and say so explicitly.' },
    ]}],
    problems: { title: 'Common mistakes', items: [
      { text: 'Granting a whole module for quick fixes without removing it later — access reviews rely on this being deliberate.' },
      { text: 'Looking for a "forgot password" tool — password reset today is re-provisioning by an admin.' },
    ]},
    actions: [
      { label: 'Provision User', does: 'Creates the account with First/Last name, email, password and role.', requiresPermission: 'user.create' },
      { label: 'Access', does: 'Opens per-user module grants/denies; DENY overrides role defaults.', requiresPermission: 'user.update' },
      { label: 'Expand role row', does: 'Shows every effective permission — read-only.' },
    ],
    next: [{ label: 'Reports', route: '/reports' }],
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.FINANCE_OFFICER, UserRole.CEO],
  },
  {
    id: 'reports',
    module: 'Reports',
    title: 'Reports',
    purpose: 'One filterable report for each module with CSV export and printing — no data editing here.',
    prerequisites: [
      'Data in the source module (employees, sites, attendance, payroll runs).',
    ],
    steps: [{ title: 'Reading reports', items: [
      { text: 'Pick the report tab for your module; tabs you cannot access are not shown.' },
      { text: 'Filter by period and status, then export CSV or print.' },
      { text: 'Numbers reconcile with the module pages — payroll runs export from their own run actions too.' },
    ]}],
    problems: { title: 'Common mistakes', items: [
      { text: 'Treating report rows as editable — corrections happen in the owning module.' },
    ]},
    actions: [
      { label: 'Export CSV', does: 'Downloads the filtered report.' },
      { label: 'Print', does: 'Printable version of the report.' },
    ],
    next: [{ label: 'Dashboard', route: '/' }],
    roles: ALL_ADMIN_ROLES,
  },
  {
    id: 'guard-dashboard',
    module: 'Guard Portal',
    title: 'Guard Dashboard',
    purpose: 'The guard\u2019s own space: current shift status, quick Scan QR action, recorded hours today and this month, and recent shifts.',
    prerequisites: [
      'A GUARD-role account linked to an employee record with sites.',
    ],
    steps: [{ title: 'Daily use', items: [
      { text: 'Check the open shift card — it shows the site and running elapsed time when you are on shift.' },
      { text: 'Use Start scan to record arrival; the portal guides clock-in then clock-out with the same scanned QR.' },
      { text: 'Monthly hours and recent entries update from your recorded shifts.' },
    ]}],
    problems: { title: 'Common mistakes', items: [
      { text: 'Scanning a different site\u2019s QR while on shift — the portal blocks a second open shift per day with a clear message.' },
    ]},
    actions: [
      { label: 'Scan QR', does: 'Opens the scanner to clock in or out at your site.' },
    ],
    next: [{ label: 'My Shifts', route: '/guard/shifts' }],
    roles: [UserRole.GUARD],
  },
  {
    id: 'guard-scan',
    module: 'Guard Portal',
    title: 'Scan QR',
    purpose: 'Records attendance by scanning (or typing) the site code at the gate — the source of clock-in/out pairs used for daily hours.',
    prerequisites: [
      'Camera permission (or use the manual code entry below the scanner).',
      'The site\u2019s posted QR sheet.',
    ],
    steps: [{ title: 'Clocking in / out', items: [
      { text: 'Press Start camera or enter the site code manually and press Go.' },
      { text: 'A clock-in starts your shift; scanning the same site later ends it.', example: 'The message "You are already on shift at X" means one open shift per day at a time.' },
      { text: 'Results show the site found and confirm the recorded time.' },
    ]}],
    problems: { title: 'Common mistakes', items: [
      { text: 'Typing a code with wrong case or spacing — codes must match the site exactly.' },
      { text: 'Scanning before being assigned — attendance requires an effective site assignment.' },
    ]},
    actions: [
      { label: 'Start camera', does: 'Starts the QR scanner; retry with manual code entry if the camera is unavailable.' },
      { label: 'Clock out', does: 'Ends the current open shift.', impact: 'statutory' },
    ],
    next: [{ label: 'My Shifts', route: '/guard/shifts', note: 'Verify your recorded pairs.' }],
    roles: [UserRole.GUARD],
  },
  {
    id: 'guard-shifts',
    module: 'Guard Portal',
    title: 'My Shifts',
    purpose: 'Your clock-in / clock-out history with the hours per shift.',
    prerequisites: ['Recorded attendance through Scan QR.'],
    steps: [{ title: 'Reading your history', items: [
      { text: 'Browse recorded shifts per site and date; totals appear per entry.' },
      { text: 'Discrepancies are corrected by supervisors in Operations — guards cannot edit records.' },
    ]}],
    problems: null,
    actions: [],
    next: [{ label: 'Scan QR', route: '/guard/scan' }],
    roles: [UserRole.GUARD],
  },
  {
    id: 'guard-my-sites',
    module: 'Guard Portal',
    title: 'My Sites',
    purpose: 'Your active and past site assignments with which one is primary.',
    prerequisites: ['Assignments made by your Operations team.'],
    steps: [{ title: 'Reading assignments', items: [{ text: 'Active assignments show the site and effective dates; past assignments stay below.' }] }],
    problems: null,
    actions: [],
    next: [{ label: 'Guard Dashboard', route: '/guard' }],
    roles: [UserRole.GUARD],
  },
  {
    id: 'guard-my-profile',
    module: 'Guard Portal',
    title: 'My Profile (guard)',
    purpose: 'Read-only lifecycle view of your employee record: personal and employment details, documents, site, and app access.',
    prerequisites: ['A linked employee record.'],
    steps: [{ title: 'Viewing your record', items: [{ text: 'Tabs show personal, employment, documents, site and access info. Corrections are requested through HR.' }] }],
    problems: null,
    actions: [],
    next: [{ label: 'My Profile (account settings)', route: '/profile', note: 'The editable account settings.' }],
    roles: [UserRole.GUARD],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// GUIDED TOURS — steps spotlight real elements via [data-tour="…"] anchors.
// Steps whose anchor is missing render as a centered card, so tours are safe
// on any device or state. No step ever clicks a business action.
// ─────────────────────────────────────────────────────────────────────────────
const TOURS: Tour[] = [
  {
    id: 'dashboard-tour',
    title: 'Your first five minutes',
    description: 'Find your modules, understand the navigation, and know where help lives.',
    routePrefixes: ['/'],
    roles: ALL_ADMIN_ROLES,
    steps: [
      { title: 'This is your dashboard', body: 'Your modules are the cards below. Each card is one domain of the ERP; anything outside your role is not shown at all.' },
      { title: 'Module navigation', body: 'When a module opens, its tabs appear in this top bar. You can always return here from the profile area.', target: 'dashboard-welcome' },
      { title: 'Help is one click away', body: 'The round ? button at the bottom right opens this page guide, guided tours, and the help center — on every page. Open it any time; nothing behind it changes data.' },
    ],
  },
  {
    id: 'guard-payroll-monthly-tour',
    title: 'Run a guard payroll month',
    description: 'From readiness to payment: how the monthly guard payroll cycle walks through this page.',
    routePrefixes: ['/guard-payroll'],
    roles: PAYROLL_ROLES,
    steps: [
      { title: 'Setup & readiness first', body: 'This checklist is the gate: contracts, exactly one primary site per guard, compensation per site, and monthly hours. Calculate stays disabled until everything is green.', target: 'gp-readiness' },
      { title: 'Validate rates before calculating', body: 'Each site\u2019s compensation amount and its effective date come from the Site Compensation tab. Past months always use the row that was effective then.', target: 'gp-runs-actions' },
      { title: 'Calculate payroll', body: 'One press computes every guard from the recorded hours. Problems (if any) list above the table with links into the right fix tab. Nothing is final yet — review now.', target: 'gp-results' },
      { title: 'Review the lifecycle actions', body: 'Submit locks the period, Check confirms review, Approve finalizes amounts, Mark as paid records the payment reference, and Return for correction reopens a submitted run. Every action shows a confirmation and an audit entry.', target: 'gp-lifecycle' },
      { title: 'Site Compensation tab', body: 'Record agreed amounts per site with effective dates — this is the source of truth the calculation reads.' },
      { title: 'Settings tab', body: 'Transport %, dividers, tax tables and pension rules live here, each with its own effective date.' },
      { title: 'You\u2019re ready', body: 'The recommended order: readiness \u2192 calculate \u2192 review breakdowns \u2192 submit \u2192 check \u2192 approve \u2192 exports \u2192 mark paid. Restart this tour any time from the ? button.' },
    ],
  },
  {
    id: 'guard-attendance-tour',
    title: 'Enter guard attendance',
    description: 'Daily hours, monthly sheets, and how payroll consumes them.',
    routePrefixes: ['/attendance'],
    roles: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.OPERATIONS, UserRole.CEO],
    steps: [
      { title: 'Daily Entry', body: 'Pick the site and date, then enter each assigned guard\u2019s hours. The roster only shows guards assigned to that site on that date.', target: 'att-tabs' },
      { title: 'Monthly Hours', body: 'For each guard, split the month into Normal, Holiday and Sunday hours. Holiday and Sunday hours are multiplied by the OT rate in payroll — enter them explicitly.' },
      { title: 'Monthly Totals', body: 'Read-only comparison: monthly sheets vs daily records, plus the payroll readiness check that Guard Payroll also enforces.' },
      { title: 'Save rules', body: 'Save attendance saves the visible day; Save monthly hours saves all changed sheets. Locked periods (payroll submitted) make everything read-only until Finance returns for correction.', target: 'att-save-daily' },
    ],
  },
  {
    id: 'employees-tour',
    title: 'Onboard an employee',
    description: 'From registration to an active, contract-backed employee.',
    routePrefixes: ['/employees'],
    roles: ADMIN_ROLES,
    steps: [
      { title: 'The directory', body: 'Search, filter, and select an employee. New hires start INACTIVE by design.', target: 'emp-toolbar' },
      { title: 'Detail panel', body: 'Personal, employment, compensation and guard info live in this panel; status changes need a reason and are audited.', target: 'emp-detail' },
      { title: 'The tabs', body: 'Guarantor and Contract tabs are the activation path: a contract plus a verified guarantor makes the employee ACTIVE.', target: 'emp-tabs' },
      { title: 'Registration wizard', body: 'New employee runs Personal \u2192 Employment \u2192 Documents. First name, last name and phone are required.' },
    ],
  },
  {
    id: 'guards-tour',
    title: 'Manage guard assignments',
    description: 'Assign, make primary, relieve, and correct history safely.',
    routePrefixes: ['/guards'],
    roles: OPS_ROLES,
    steps: [
      { title: 'The roster', body: 'Filter by assignment state, site and status. Select a guard to work with them.', target: 'guards-roster' },
      { title: 'Assignments panel', body: 'Each row is one site assignment with its effective date range and primary marker.', target: 'guards-detail' },
      { title: 'Make primary', body: 'A guard needs exactly one primary site per payroll month — payroll readiness reports any deviation.' },
      { title: 'Correct history', body: 'For real data mistakes: changes are audited with a mandatory reason. Regular day-to-day changes are Model / Relieve instead.' },
    ],
  },
  {
    id: 'staff-payroll-tour',
    title: 'Run a staff payroll month',
    description: 'Calculate, extras, deductions, and the review lifecycle.',
    routePrefixes: ['/staff-payroll'],
    roles: PAYROLL_ROLES,
    steps: [
      { title: 'Runs tab', body: 'Choose month and year, then Calculate payroll. Staff are computed from their contract snapshots.', target: 'sp-calc' },
      { title: 'Fix problems first', body: 'Missing tax/pension config or contract gaps surface here with links into the right tab.', target: 'sp-runs' },
      { title: 'Overtime & bonus', body: 'Overtime is taxable and pensionable; Bonus is outside the formula entirely.' },
      { title: 'Deductions', body: 'Loans deduct monthly until settled at approval; penalties hit once.' },
      { title: 'Lifecycle', body: 'Submit \u2192 Check \u2192 Approve \u2192 Mark as paid, with Return for correction to reopen. Recalculate exists only before submission.', target: 'sp-actions' },
    ],
  },
  {
    id: 'sites-tour',
    title: 'Set up a client site',
    description: 'Create the site, keep codes exact, print QRs.',
    routePrefixes: ['/sites'],
    roles: COMPANY_ROLES,
    steps: [
      { title: 'Sites table', body: 'Every client location lives here. Search and filter before creating duplicates.', target: 'sites-toolbar' },
      { title: 'Add Site', body: 'Identity, classification, location, manpower and contact — name, code and area/zone are required.', target: 'sites-add' },
      { title: 'Site code discipline', body: 'The code is what guards scan; treat it as permanent once posted.' },
      { title: 'QR codes', body: 'Print sheets for guards from the Site QR Codes page.' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ARTICLES — conceptual help-center entries (no single owning page).
// ─────────────────────────────────────────────────────────────────────────────
const ARTICLES: HelpArticle[] = [
  {
    id: 'concept-primary-site',
    module: 'Payroll',
    title: 'What is a primary site?',
    keywords: ['primary', 'site', 'assignment', 'payroll', 'contract site'],
    roles: ALL_ADMIN_ROLES,
    body: [
      'A guard\u2019s primary site is their contract site for a payroll month. Primary-site work earns the structured calculation: OT rate = compensation \u00F7 240, a structural Sunday allocation (OT rate \u00D7 32) deducted from the compensation, transport = 20% of the remainder, and a basic hourly rate (basic \u00F7 208) for normal hours. Structural Sunday hours are never paid again as actual hours.',
      'Every additional site the same guard worked pays all of its hours at that site\u2019s own OT rate — no basic salary, no transport, and never the primary site\u2019s rate.',
      'Exactly one primary site per guard must be effective for the payroll month; the readiness checklist enforces it, and Operations \u2192 \u2605 Make primary creates it with an effective date.',
    ],
  },
  {
    id: 'concept-payroll-states',
    module: 'Payroll',
    title: 'Payroll run states and what you may still change',
    keywords: ['lifecycle', 'states', 'submit', 'approve', 'return', 'locked'],
    roles: ALL_ADMIN_ROLES,
    body: [
      'A run moves DRAFT \u2192 SUBMITTED \u2192 CHECKED \u2192 APPROVED \u2192 PAID. Calculations and corrections only happen in DRAFT; submitted-or-later runs are locked.',
      'Return for correction is the controlled way back: it reopens a locked run and requires a written reason that is kept in the audit trail. Recalculation then replaces the draft with current inputs.',
      'Approved and paid runs keep their snapshot forever — later edits to attendance, contracts or compensation never rewrite them.',
    ],
  },
  {
    id: 'concept-roles',
    module: 'Administration',
    title: 'How roles and permissions work',
    keywords: ['roles', 'permissions', 'access', 'denied'],
    roles: ALL_ADMIN_ROLES,
    body: [
      'Every user has one role (Super Admin, System Admin, HR Admin, Finance Officer, Operations, Head, CEO, or Guard). The role carries a baseline permission set.',
      'Admins can add per-user exceptions in Settings: grant/deny whole modules. A DENY always wins, regardless of role.',
      'If a menu or button is hidden, it is because your effective permissions do not include it — not a bug. Ask your administrator for what you need.',
    ],
  },
  {
    id: 'concept-period-locking',
    module: 'Attendance',
    title: 'Attendance locking and payroll periods',
    keywords: ['lock', 'period', 'attendance', 'locked', 'read-only'],
    roles: ALL_ADMIN_ROLES,
    body: [
      'Payroll periods are created when attendance is first filed for a month, and can be locked before payroll so figures stop moving.',
      'Guard Payroll locks automatically when a run is Submitted; Staff attendance supports manual lock/unlock with reasons.',
      'Unlocking a period with a submitted payroll requires the run to be returned for correction first.',
    ],
  },
  {
    id: 'concept-ot-sunday',
    module: 'Guard Payroll',
    title: 'Holiday, Sunday and the OT rate in guard pay',
    keywords: ['ot', 'sunday', 'holiday', 'structural', '240'],
    roles: PAYROLL_ROLES,
    body: [
      'Each site\u2019s OT rate equals its compensation amount \u00F7 240 (divisor configurable in Settings).',
      'A structural allocation of 32 Sunday hours (\u201COctober math\u201D: 52 Sundays \u00F7 12 months \u2248 4.33 \u00D7 7.4h average Sunday shift) is reserved inside the compensation; only worked Sunday hours beyond structural allocation are actual earnings at the OT rate.',
      'Holiday hours also pay at the OT rate on both primary and additional sites.',
    ],
  },
  {
    id: 'concept-help-system',
    module: 'Help',
    title: 'About this help system',
    keywords: ['help', 'tour', 'guide', 'support'],
    roles: undefined,
    body: [
      'Every page has a ? help button with a page guide tailored to your role. Guides list prerequisites, steps, common mistakes, and every important action with its consequences.',
      'Guided tours highlight the real interface elements with Next/Back/Skip/Exit/Restart controls. Tours never click anything for you.',
      'Completed tours are remembered for your account in this browser; you can restart any guide or tour at will.',
    ],
  },
];

/** Set of guides the user's role can reach, to bound help-center content. */
export function isAdminRole(userRole?: UserRole): boolean {
  return ALL_ADMIN_ROLES.includes(userRole as UserRole);
}

export function getRouteGuide(pathname: string, userRole?: UserRole): RouteGuide | null {
  for (const { pattern, guideId } of ROUTE_PATTERNS) {
    if (pattern.test(pathname)) {
      const guide = GUIDES.find((g) => g.id === guideId);
      if (!guide) return null;
      if (guide.roles.length > 0 && userRole && !guide.roles.includes(userRole)) {
        // The role cannot actually reach this route (route guard would bounce).
        return null;
      }
      const tourIds = TOURS.filter((t) => t.routePrefixes.some((p) => pathname.startsWith(p) && (p === '/' || pathname.startsWith(p)))).map((t) => t.id);
      return { guide, tourIds };
    }
  }
  return null;
}

export function getGuideById(id: string): PageGuide | undefined {
  return GUIDES.find((g) => g.id === id);
}

export function getToursForPath(pathname: string, userRole?: UserRole): Tour[] {
  const isAdmin = isAdminRole(userRole);
  return TOURS.filter((t) => t.routePrefixes.some((p) => pathname.startsWith(p) && (p === '/' || pathname.startsWith(p))))
    .filter((t) => (isAdmin ? true : (t.roles.includes(userRole as UserRole))));
}

export function getTourById(id: string): Tour | undefined {
  return TOURS.find((t) => t.id === id);
}

export function allGuidesForRole(userRole?: UserRole): PageGuide[] {
  return GUIDES.filter((g) => g.roles.length === 0 || (userRole && (isAdminRole(userRole) ? true : g.roles.includes(userRole))));
}

export function allToursForRole(userRole?: UserRole): Tour[] {
  const isAdmin = isAdminRole(userRole);
  return TOURS.filter((t) => isAdmin || t.roles.includes(userRole as UserRole));
}

export function allArticlesForRole(userRole?: UserRole): HelpArticle[] {
  return ARTICLES.filter((a) => a.roles === undefined || isAdminRole(userRole) || a.roles.includes(userRole as UserRole));
}
