/**
 * Ethiopian banks — single source of truth for bank selection dropdowns
 * (employee/payroll forms) and bank batch transfer exports.
 *
 * `value` is short and stable (what gets stored in bankName / used as a
 * filter); `fullName` is the official name shown in dropdowns and export
 * labels. Add newer entrants here as the company starts using them.
 */

export interface EthiopianBank {
  value: string;
  fullName: string;
}

export const ETHIOPIAN_BANKS: EthiopianBank[] = [
  { value: 'CBE', fullName: 'Commercial Bank of Ethiopia (CBE)' },
  { value: 'Awash', fullName: 'Awash Bank' },
  { value: 'Dashen', fullName: 'Dashen Bank' },
  { value: 'Abyssinia', fullName: 'Bank of Abyssinia' },
  { value: 'Nib', fullName: 'Nib International Bank' },
  { value: 'Coopbank', fullName: 'Cooperative Bank of Oromia (Coopbank)' },
  { value: 'Hibret', fullName: 'Hibret Bank (formerly United Bank)' },
  { value: 'Birhan', fullName: 'Berhan Bank' },
  { value: 'Zemen', fullName: 'Zemen Bank' },
  { value: 'Abay', fullName: 'Abay Bank' },
  { value: 'Bunna', fullName: 'Bunna Bank' },
  { value: 'Gadaa', fullName: 'Gadaa Bank' },
  { value: 'Oromia', fullName: 'Oromia Bank' },
  { value: 'Wegagen', fullName: 'Wegagen Bank' },
  { value: 'ENAT', fullName: 'Enat Bank' },
  { value: 'Siinqee', fullName: 'Siinqee Bank' },
  { value: 'Tsedey', fullName: 'Tsedey Bank' },
  { value: 'Shabelle', fullName: 'Shabelle Bank' },
  { value: 'Rammis', fullName: 'Rammis Bank' },
  { value: 'Ahadu', fullName: 'Ahadu Bank' },
  { value: 'TeleBirr', fullName: 'telebirr (Ethio Telecom)' },
];

/** Dropdown-safe copy a page may mutate — never redefine the base list. */
export const ETHIOPIAN_BANK_NAMES = ETHIOPIAN_BANKS.map((b) => b.value);

/** Resolve a stored value (or legacy free-text) to its official full name. */
export const bankFullName = (value: string): string => {
  const v = (value || '').trim();
  if (!v) return '';
  const byValue = ETHIOPIAN_BANKS.find((b) => b.value.toLowerCase() === v.toLowerCase());
  if (byValue) return byValue.fullName;
  const byName = ETHIOPIAN_BANKS.find((b) => b.fullName.toLowerCase() === v.toLowerCase());
  return byName?.fullName ?? v;
};
