import { useState, useEffect } from 'react';
import { ChevronLeft, Download } from 'lucide-react';
import api from '../../lib/api';
import { LoadingSpinner } from '../ui';


interface PayslipData {
  company: {
    name: string;
    address: string;
    department: string;
  };
  period: string;
  status: string;
  employee: {
    id: string;
    code: string;
    fullName: string;
    department?: string;
    jobPosition?: string;
    bankName?: string;
    accountNumber?: string;
    pensionEnrolled?: boolean;
  };
  earnings: {
    // Guard
    primarySite?: {
      name: string;
      code?: string;
      normalHours: number;
      normalPay: number;
      sundayHours: number;
      sundayPay: number;
      holidayHours: number;
      holidayPay: number;
      transportPaid: number;
      compensationAmount?: number;
      basicHourlyRate?: number;
      otRate?: number;
      basicSalary?: number;
      transportPercent?: number;
    };
    additionalSites?: {
      name: string;
      code?: string;
      totalHours: number;
      compensationAmount?: number;
      otRate?: number;
      normalHours?: number;
      sundayHours?: number;
      holidayHours?: number;
      siteEarnings: number;
    }[];
    // Staff
    basicSalary?: number;
    responsibilityAllowance?: number;
    teleAllowance?: number;
    taxableTransport?: number;
    nonTaxableTransport?: number;
    overtimeAmount?: number;
    grossEarnings: number;
  };
  deductions: {
    employeePension: number;
    employerPension: number;
    incomeTax: number;
    otherDeductions?: { type?: string; label?: string; amount: number }[];
    totalDeductions: number;
  };
  taxableEarnings?: number;
  pensionBase?: number;
  paymentRef?: string;
  netPay: number;
  bonus?: number;
  finalAmountPaid?: number;
  generatedAt: string;
  watermark: string;
}

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordId: string | null;
  type: 'GUARD' | 'STAFF';
}

const formatETB = (n?: number) =>
  `ETB ${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PayslipModal({ isOpen, onClose, recordId, type }: PayslipModalProps) {
  const [data, setData] = useState<PayslipData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !recordId) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setData(null);
    const fetchPayslip = async () => {
      setLoading(true);
      setError(null);
      try {
        const endpoint = type === 'GUARD'
          ? `/guard-payroll/records/${recordId}/payslip`
          : `/staff-payroll/records/${recordId}/payslip`;
        const res = await api.get(endpoint);
        if (!cancelled) setData(res.data.data || res.data);
      } catch (err: any) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load official payslip');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPayslip();
    return () => { cancelled = true; };
  }, [isOpen, recordId, type]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  /** Download the payslip as a standalone .html receipt copy (opens/prints offline). */
  const handleDownload = () => {
    const paper = document.getElementById('official-payslip-paper');
    if (!paper || !data) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payslip ${data.employee.code} ${data.period}<\/title>
<style>body{font-family:'Segoe UI',Arial,sans-serif;margin:24px;background:#fff}.wrap{max-width:640px;margin:0 auto}</style>
</head><body><div class="wrap">${paper.innerHTML.replace(/print:hidden/g, 'x')}</div></body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payslip-${data.employee.code}-${data.period}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Payroll payslip" className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-navy-100 overflow-hidden my-8">
        {/* Modal Toolbar (hidden on print) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 bg-navy-950 border-b border-navy-800 text-white">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              aria-label="Back to payroll"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-navy-200 hover:text-white hover:bg-navy-800 text-xs font-semibold transition-colors"
            >
              <ChevronLeft size={14} />
              Back
            </button>
            <span className="w-2.5 h-2.5 rounded-full bg-cobalt-400 animate-pulse" />
            <h3 className="text-sm font-semibold tracking-wide uppercase text-navy-100">
              Official Document Preview • {type === 'GUARD' ? 'Guard Payslip' : 'Staff Payslip'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={loading || !data}
              className="flex items-center gap-2 px-3 py-1.5 bg-navy-800 hover:bg-navy-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              <Download size={14} />
              Download
            </button>
            <button
              onClick={handlePrint}
              disabled={loading || !data}
              className="flex items-center gap-2 px-3 py-1.5 bg-cobalt-600 hover:bg-cobalt-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              aria-label="Close payslip"
              className="p-1.5 text-navy-400 hover:text-white hover:bg-navy-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Payslip Paper Content */}
        <div className="p-8 bg-white text-slate-800" id="official-payslip-paper">
          {loading ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner text="Generating official payslip..." />
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold">!</div>
              <p className="text-sm font-semibold text-slate-900 mb-1">Unable to Load Payslip</p>
              <p className="text-xs text-slate-500 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
              >
                Close
              </button>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Official Header */}
              <div className="flex items-start justify-between border-b-2 border-navy-900 pb-4">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-navy-950 uppercase">
                    {data.company.name}
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">{data.company.address}</p>
                  <p className="text-xs text-cobalt-600 font-semibold mt-0.5">{data.company.department}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-navy-900 text-white text-xs font-bold tracking-wider rounded uppercase">
                    PAYSLIP • {data.period}
                  </span>
                  <p className="text-[11px] text-slate-400 font-mono mt-1">Ref: {data.watermark}</p>
                </div>
              </div>

              {/* Employee Meta Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                <div className="space-y-1.5">
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-semibold tracking-wide">Employee</span>
                    <p className="font-bold text-slate-900 text-sm">{data.employee.fullName}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-semibold tracking-wide">Employee Code</span>
                    <p className="font-mono font-medium text-slate-700">{data.employee.code}</p>
                  </div>
                  {data.employee.department && (
                    <div>
                      <span className="text-slate-400 uppercase text-[10px] font-semibold tracking-wide">Department / Position</span>
                      <p className="font-medium text-slate-700">{data.employee.department} — {data.employee.jobPosition || 'Staff'}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-semibold tracking-wide">Disbursement Bank</span>
                    <p className="font-bold text-slate-900">{data.employee.bankName || 'Bank details missing'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-semibold tracking-wide">Account Number</span>
                    <p className="font-mono font-medium text-slate-700">{data.employee.accountNumber ? `••••${data.employee.accountNumber.slice(-4)}` : 'Bank account missing'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-semibold tracking-wide">Pension Status</span>
                    <p className="font-semibold text-emerald-700">
                      {data.employee.pensionEnrolled === true ? 'Enrolled — snapshot contributions below' : data.employee.pensionEnrolled === false ? 'Not enrolled' : 'Enrollment not recorded'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions Breakdown Tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Earnings Column */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200 font-bold text-navy-950 uppercase tracking-wide text-[11px]">
                    <span>Earnings Item</span>
                    <span>Amount</span>
                  </div>

                  {type === 'GUARD' && data.earnings.primarySite ? (
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-900">Primary: {data.earnings.primarySite.name}</p>
                      <p className="text-slate-500">Agreed compensation: {formatETB(data.earnings.primarySite.compensationAmount)} · Basic: {formatETB(data.earnings.primarySite.basicSalary)}</p>
                      <p className="text-slate-500">Basic hourly: {data.earnings.primarySite.basicHourlyRate} · OT hourly: {data.earnings.primarySite.otRate}</p>
                      <div className="flex justify-between text-slate-600">
                        <span>Normal Hours ({data.earnings.primarySite.normalHours}h)</span>
                        <span className="font-mono font-medium text-slate-900">{formatETB(data.earnings.primarySite.normalPay)}</span>
                      </div>
                      {data.earnings.primarySite.sundayPay > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Sunday OT ({data.earnings.primarySite.sundayHours}h)</span>
                          <span className="font-mono font-medium text-slate-900">{formatETB(data.earnings.primarySite.sundayPay)}</span>
                        </div>
                      )}
                      {data.earnings.primarySite.holidayPay > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Holiday OT ({data.earnings.primarySite.holidayHours}h)</span>
                          <span className="font-mono font-medium text-slate-900">{formatETB(data.earnings.primarySite.holidayPay)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-600">
                        <span>Non-taxable Transport ({data.earnings.primarySite.transportPercent ?? '—'}%)</span>
                        <span className="font-mono font-medium text-slate-900">{formatETB(data.earnings.primarySite.transportPaid)}</span>
                      </div>
                      {data.earnings.additionalSites?.map((s, idx) => (
                        <div key={idx} className="flex justify-between text-slate-600">
                          <span>Additional: {s.name} ({s.totalHours}h × {s.otRate})<small className="block">Compensation {formatETB(s.compensationAmount)} · Normal {s.normalHours}h / Sunday {s.sundayHours}h / Holiday {s.holidayHours}h</small></span>
                          <span className="font-mono font-medium text-slate-900">{formatETB(s.siteEarnings)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between text-slate-600">
                        <span>Basic Salary</span>
                        <span className="font-mono font-medium text-slate-900">{formatETB(data.earnings.basicSalary)}</span>
                      </div>
                      {!!data.earnings.responsibilityAllowance && (
                        <div className="flex justify-between text-slate-600">
                          <span>Responsibility Allowance</span>
                          <span className="font-mono font-medium text-slate-900">{formatETB(data.earnings.responsibilityAllowance)}</span>
                        </div>
                      )}
                      {!!data.earnings.teleAllowance && (
                        <div className="flex justify-between text-slate-600">
                          <span>Telephone Allowance</span>
                          <span className="font-mono font-medium text-slate-900">{formatETB(data.earnings.teleAllowance)}</span>
                        </div>
                      )}
                      {!!data.earnings.taxableTransport && (
                        <div className="flex justify-between text-slate-600">
                          <span>Transport (Taxable)</span>
                          <span className="font-mono font-medium text-slate-900">{formatETB(data.earnings.taxableTransport)}</span>
                        </div>
                      )}
                      {!!data.earnings.nonTaxableTransport && (
                        <div className="flex justify-between text-slate-600">
                          <span>Transport (Non-Taxable)</span>
                          <span className="font-mono font-medium text-slate-900">{formatETB(data.earnings.nonTaxableTransport)}</span>
                        </div>
                      )}
                      {!!data.earnings.overtimeAmount && (
                        <div className="flex justify-between text-slate-600">
                          <span>Overtime Pay</span>
                          <span className="font-mono font-medium text-slate-900">{formatETB(data.earnings.overtimeAmount)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                    <span>Total Gross Earnings</span>
                    <span className="font-mono text-cobalt-700">{formatETB(data.earnings.grossEarnings)}</span>
                  </div>
                </div>

                {/* Deductions Column */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200 font-bold text-navy-950 uppercase tracking-wide text-[11px]">
                    <span>Deduction / Withholding</span>
                    <span>Amount</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-slate-600">
                      <span>Income Tax (ERCA)</span>
                      <span className="font-mono font-medium text-red-600">-{formatETB(data.deductions.incomeTax)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Employee Pension</span>
                      <span className="font-mono font-medium text-red-600">-{formatETB(data.deductions.employeePension)}</span>
                    </div>
                    {data.deductions.otherDeductions?.map((d, i) => (
                      <div key={i} className="flex justify-between text-slate-600">
                        <span>{d.label || d.type || 'Other Deduction'}</span>
                        <span className="font-mono font-medium text-red-600">-{formatETB(d.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-slate-400 italic text-[11px] pt-1">
                      <span>Employer Pension (company expense, not deducted)</span>
                      <span className="font-mono">{formatETB(data.deductions.employerPension)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                    <span>Total Deductions</span>
                    <span className="font-mono text-red-600">-{formatETB(data.deductions.totalDeductions)}</span>
                  </div>
                </div>
              </div>

              {type === 'GUARD' && <div className="rounded-lg border border-slate-200 p-3 text-xs space-y-1">
                <p>Taxable earnings (all sites, transport excluded): <b>{formatETB(data.taxableEarnings)}</b></p>
                <p>Pension base (primary normal + Sunday earnings): <b>{formatETB(data.pensionBase)}</b></p>
                <p>Payroll status: <b>{data.status}</b>{data.paymentRef ? ` · Recorded payment reference: ${data.paymentRef}` : ''}</p>
                <p className="text-slate-500">Saved payroll snapshot. A bank CSV is payment instructions only; it does not prove bank execution.</p>
              </div>}
              {/* Net Pay & Bonus Summary Banner */}
              <div className="p-5 rounded-xl bg-gradient-to-r from-navy-900 to-navy-950 text-white flex items-center justify-between shadow-md">
                <div>
                  <p className="text-[11px] font-semibold text-navy-200 uppercase tracking-wider">
                    {data.bonus ? 'Net Take-Home Pay (Before Bonus)' : 'Net Payable Amount'}
                  </p>
                  <p className="text-2xl font-black tracking-tight font-mono text-white mt-0.5">
                    {formatETB(data.netPay)}
                  </p>
                  {!!data.bonus && (
                    <p className="text-xs text-cobalt-300 font-semibold mt-1">
                      + Discretionary Bonus: {formatETB(data.bonus)}
                    </p>
                  )}
                </div>

                {data.finalAmountPaid ? (
                  <div className="text-right pl-6 border-l border-navy-800">
                    <p className="text-[10px] font-semibold text-cobalt-400 uppercase tracking-widest">
                      Final Total Remittance
                    </p>
                    <p className="text-2xl font-black font-mono text-cobalt-300">
                      {formatETB(data.finalAmountPaid)}
                    </p>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl border border-dashed border-navy-700 flex items-center justify-center text-[10px] text-navy-400 text-center font-bold uppercase tracking-widest">
                    {data.status}
                  </div>
                )}
              </div>

              {/* Signatures & Legal Watermark */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-4 text-center text-[11px] text-slate-500">
                <div>
                  <div className="h-10 border-b border-dashed border-slate-300 mb-1" />
                  <p className="font-semibold text-slate-700">Prepared By</p>
                  <p className="text-[10px] text-slate-400">Payroll Specialist</p>
                </div>
                <div>
                  <div className="h-10 border-b border-dashed border-slate-300 mb-1" />
                  <p className="font-semibold text-slate-700">Verified By</p>
                  <p className="text-[10px] text-slate-400">Finance Controller</p>
                </div>
                <div>
                  <div className="h-10 border-b border-dashed border-slate-300 mb-1" />
                  <p className="font-semibold text-slate-700">Authorized By</p>
                  <p className="text-[10px] text-slate-400">Chief Executive Officer</p>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono pt-2">
                <span>Timestamp: {new Date(data.generatedAt).toLocaleString()}</span>
                <span>System Watermark: {data.watermark}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
