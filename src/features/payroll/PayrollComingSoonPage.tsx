import { useEffect, useState } from 'react';
import { Construction, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Card } from '../../components/ui';
import { useT } from '../../i18n';

interface StatusData {
  system: string;
  version: number;
  state: string;
  message: string;
  inputs: string[];
}

/** Shared placeholder for the two payroll v2 systems (staff / guard). */
export function PayrollComingSoonPage({ system }: { system: 'STAFF_PAYROLL' | 'GUARD_PAYROLL' }) {
  const t = useT();
  const navigate = useNavigate();
  const [status, setStatus] = useState<StatusData | null>(null);

  useEffect(() => {
    const url = system === 'STAFF_PAYROLL' ? '/staff-payroll/status' : '/guard-payroll/status';
    api.get(url)
      .then((res) => setStatus(res.data?.data || null))
      .catch(() => setStatus(null));
  }, [system]);

  const title = system === 'STAFF_PAYROLL' ? t('moduleStaffPayroll') : t('moduleGuardPayroll');
  const subtitle = system === 'STAFF_PAYROLL' ? t('moduleStaffPayrollSub') : t('moduleGuardPayrollSub');

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors"
      >
        <ChevronLeft size={16} />
        {t('back')}
      </button>

      <Card className="p-8">
        <div className="flex flex-col items-center text-center gap-4 py-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(217,119,6,0.12)' }}>
            <Construction size={32} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">{title}</h1>
            <p className="text-sm text-muted mt-1">{subtitle}</p>
          </div>
          <p className="max-w-md text-sm text-muted leading-relaxed">{t('comingSoonPayroll')}</p>
          {status && (
            <div className="mt-2 w-full max-w-md rounded-xl border border-line bg-subtle p-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
                {status.system} · v{status.version} · {status.state}
              </p>
              <ul className="space-y-1 text-xs text-muted">
                {status.inputs.map((inp) => (
                  <li key={inp} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>{inp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export function StaffPayrollComingSoonPage() {
  return <PayrollComingSoonPage system="STAFF_PAYROLL" />;
}

export function GuardPayrollComingSoonPage() {
  return <PayrollComingSoonPage system="GUARD_PAYROLL" />;
}
