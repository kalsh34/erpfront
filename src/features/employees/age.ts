/**
 * Age ⇄ date-of-birth helpers.
 *
 * The HR forms collect an employee's AGE (not their birth date) because HR
 * only knows the age from the personnel record. We store the derived
 * date-of-birth anchored to today's month/day: the shown age stays exactly
 * what the user typed until that "anniversary" passes a year later, and
 * reloading for edit shows the same age.
 */

/** Compute whole years between a stored birth date and today. */
export function ageFromDate(dob?: string): string {
  if (!dob) return '';
  const d = new Date(dob);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const beforeBirthday =
    now.getMonth() < d.getMonth() ||
    (now.getMonth() === d.getMonth() && now.getDate() < d.getDate());
  if (beforeBirthday) a -= 1;
  if (a < 0) return '';
  return String(a);
}

/** Derive a birth date (YYYY-MM-DD, anchored to today's month/day) from an age. */
export function dobFromAge(ageStr: string): string {
  const n = parseInt(ageStr, 10);
  if (!Number.isFinite(n) || n < 1 || n > 130) return '';
  const now = new Date();
  const d = new Date(now.getFullYear() - n, now.getMonth(), now.getDate());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
