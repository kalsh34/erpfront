/**
 * One place that turns a person record into a display name.
 *
 * Ethiopian employee records carry a middle name (father's name) and it must
 * never be dropped — the guard/employee pages show the full legal name, so
 * every screen renders names through this helper instead of hand-building
 * `firstName + lastName`.
 */
export interface PersonNameLike {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  /** Some payloads (payroll snapshots) already carry a composed name. */
  fullName?: string | null;
  name?: string | null;
}

/** First + middle + last (whitespace-trimmed, blanks skipped). */
export function fullName(p?: PersonNameLike | null): string {
  if (!p) return '';
  const parts = [p.firstName, p.middleName, p.lastName]
    .map((v) => (v == null ? '' : String(v).trim()))
    .filter(Boolean);
  if (parts.length) return parts.join(' ');
  return String(p.fullName || p.name || '').trim();
}
