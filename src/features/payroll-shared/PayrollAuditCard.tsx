import { useCallback, useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import api from '../../lib/api';
import { Badge, Card, LoadingSpinner } from '../../components/ui';
import { useT } from '../../i18n';

interface AuditLogRow {
  _id: string;
  action: string;
  entity: string;
  entityId: string;
  newValues?: Record<string, unknown> | null;
  createdAt: string;
  userId?: { firstName?: string; lastName?: string; email?: string } | string | null;
}

const userName = (u: AuditLogRow['userId']) =>
  typeof u === 'object' && u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || '—' : '—';

/**
 * PAYROLL AUDIT TRAIL — who calculated, submitted, checked, approved, returned
 * or paid a run, straight from the audit log (read-only).
 */
export function PayrollAuditCard({ runId }: { runId: string }) {
  const t = useT();
  const [logs, setLogs] = useState<AuditLogRow[] | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/audit-logs', { params: { entityId: runId, limit: 30 } });
      setLogs(res.data.data || []);
    } catch {
      setLogs([]);
    }
  }, [runId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!logs) return <LoadingSpinner />;
  if (logs.length === 0) return null;

  return (
    <Card className="p-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-ink mb-3">
        <ScrollText size={15} className="text-primary-600" />
        {t('payAuditTrail')}
      </h4>
      <ul className="space-y-1.5">
        {logs.map((log) => (
          <li key={log._id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
            <Badge variant="info">{log.action.replace('GUARD_PAYROLL_', '').replace('STAFF_PAYROLL_', '')}</Badge>
            <span className="text-ink">{userName(log.userId)}</span>
            <span>·</span>
            <span>{new Date(log.createdAt).toLocaleString()}</span>
            {log.newValues && typeof log.newValues.netPay === 'number' && (
              <span className="tabular-nums">
                · net {(log.newValues.netPay as number).toLocaleString()}
              </span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
