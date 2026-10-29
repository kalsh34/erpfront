type StatusVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
}

const STATUS_MAP: Record<string, StatusVariant> = {
  ACTIVE: 'success', ON: 'success', PRESENT: 'success', PAID: 'success', APPROVED: 'success',
  PENDING: 'warning', DRAFT: 'warning', SUBMITTED: 'info', IN_PROGRESS: 'info',
  OVERDUE: 'danger', ABSENT: 'danger', REJECTED: 'danger', CANCELLED: 'danger',
  ON_LEAVE: 'info', SICK_LEAVE: 'info', UNPAID_LEAVE: 'purple',
  HOLIDAY: 'purple', WEEKEND_OFF: 'default',
  OPEN: 'success', CLOSED: 'default', LOCKED: 'warning',
  CHECKED: 'info', RATE_ENTERED: 'info', CALCULATED: 'info',
  PAYMENT_PROCESSING: 'info', RETURNED: 'danger',
  INACTIVE: 'default', TERMINATED: 'danger',
  FULL_TIME: 'info', PART_TIME: 'warning', CONTRACT: 'purple',
};

function getVariant(status: string, override?: StatusVariant): StatusVariant {
  if (override) return override;
  return STATUS_MAP[status] || 'default';
}

export function StatusBadge({ status, variant, className = '' }: StatusBadgeProps) {
  const v = getVariant(status ?? '', variant);
  // Semantic palette: success=green, warning=amber, error=red, info=blue.
  const styles: Record<StatusVariant, string> = {
    default: 'bg-subtle text-muted border border-line',
    success: 'bg-success-subtle text-success-text border border-success-line',
    warning: 'bg-warning-subtle text-warning-text border border-warning-line',
    danger: 'bg-danger-subtle text-danger-text border border-danger-line',
    info: 'bg-info-subtle text-info-text border border-info-line',
    purple: 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300 border border-primary-200 dark:border-primary-500/30',
  };

  const label = (status ?? '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[v]} ${className}`}>
      {label}
    </span>
  );
}
