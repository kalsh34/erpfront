import React, { useRef } from 'react';
import { Printer, X } from 'lucide-react';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  documentNumber: string;
  documentDate: string | Date;
  supplier: {
    name: string;
    code?: string;
    email?: string;
    phone?: string;
    address?: string;
    tin?: string;
  };
  deliveryAddress?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  currency?: string;
  lines: Array<{
    description: string;
    quantity: number;
    uom: string;
    unitPrice: number;
    discount?: number;
    tax?: number;
    subtotal: number;
  }>;
  subtotal: number;
  totalDiscount?: number;
  totalTax?: number;
  grandTotal: number;
  notes?: string;
  terms?: string;
}

export const PurchasePrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  title,
  documentNumber,
  documentDate,
  supplier,
  deliveryAddress = 'Vital Security PLC Central Warehouse, Addis Ababa, Ethiopia',
  paymentTerms = 'NET 30',
  deliveryTerms = 'EXW',
  currency = 'ETB',
  lines,
  subtotal,
  totalDiscount = 0,
  totalTax = 0,
  grandTotal,
  notes,
  terms,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(documentDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white text-slate-900 rounded-xl shadow-2xl overflow-hidden my-8 border border-slate-200">
        {/* Modal Controls Bar (Hidden during print) */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-wide">Document Preview & Print</span>
            <span className="text-xs bg-blue-600 px-2 py-0.5 rounded font-mono">{documentNumber}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors shadow-sm"
            >
              <Printer size={14} />
              Print / Save as PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div ref={printRef} className="p-8 md:p-12 bg-white print:p-0">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                  V
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">VITAL SECURITY PLC</h1>
                  <p className="text-xs text-slate-500">Integrated Security & ERP Solutions</p>
                </div>
              </div>
              <div className="text-xs text-slate-600 mt-3 space-y-0.5">
                <p>Bole Subcity, Woreda 03, House No. 412</p>
                <p>Addis Ababa, Ethiopia | TIN: 0012345678</p>
                <p>Email: procurement@vitalsecurity.et | Tel: +251 11 612 3456</p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block text-xl font-extrabold uppercase tracking-wider text-slate-900 mb-1">
                {title}
              </span>
              <p className="text-sm font-mono font-bold text-blue-700">{documentNumber}</p>
              <p className="text-xs text-slate-500 mt-1">Date: {formattedDate}</p>
              <p className="text-xs text-slate-500">Payment Terms: {paymentTerms}</p>
              <p className="text-xs text-slate-500">Delivery Terms: {deliveryTerms}</p>
            </div>
          </div>

          {/* Supplier & Delivery Info Grid */}
          <div className="grid grid-cols-2 gap-6 p-4 rounded-lg bg-slate-50 border border-slate-100 mb-6 text-xs">
            <div>
              <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1 text-[11px]">
                Vendor / Supplier
              </span>
              <p className="font-semibold text-sm text-slate-900">{supplier.name}</p>
              {supplier.code && <p className="text-slate-500">Supplier Code: {supplier.code}</p>}
              {supplier.tin && <p className="text-slate-500">TIN: {supplier.tin}</p>}
              {supplier.address && <p className="text-slate-600">{supplier.address}</p>}
              {supplier.phone && <p className="text-slate-600">Tel: {supplier.phone}</p>}
              {supplier.email && <p className="text-slate-600">Email: {supplier.email}</p>}
            </div>

            <div>
              <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1 text-[11px]">
                Ship / Deliver To
              </span>
              <p className="font-semibold text-sm text-slate-900">Vital Security Logistics</p>
              <p className="text-slate-600 mt-0.5">{deliveryAddress}</p>
              <p className="text-slate-500 mt-2">Currency: <span className="font-semibold text-slate-900">{currency}</span></p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mb-6 overflow-hidden rounded border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right w-16">Qty</th>
                  <th className="py-2.5 px-3 text-center w-16">UOM</th>
                  <th className="py-2.5 px-3 text-right w-24">Unit Price</th>
                  <th className="py-2.5 px-3 text-right w-16">Disc %</th>
                  <th className="py-2.5 px-3 text-right w-28">Amount ({currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{item.description}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-center text-slate-500">{item.uom}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2.5 px-3 text-right text-slate-500">{item.discount || 0}%</td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                      {item.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-900">{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-100 text-rose-600">
                  <span>Discount:</span>
                  <span className="font-mono">-{totalDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>VAT / Tax (15%):</span>
                <span className="font-mono text-slate-900">{totalTax.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}</span>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-slate-900 font-bold text-sm text-slate-900">
                <span>Grand Total:</span>
                <span className="font-mono text-blue-700">{grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}</span>
              </div>
            </div>
          </div>

          {/* Notes and Terms */}
          {(notes || terms) && (
            <div className="p-4 bg-slate-50 rounded border border-slate-200/80 mb-8 text-[11px] text-slate-600 space-y-2">
              {notes && (
                <div>
                  <span className="font-bold text-slate-800">Special Instructions / Notes: </span>
                  <span>{notes}</span>
                </div>
              )}
              {terms && (
                <div>
                  <span className="font-bold text-slate-800 block mb-0.5">Terms & Conditions:</span>
                  <p className="whitespace-pre-line text-slate-500">{terms}</p>
                </div>
              )}
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-8 pt-8 border-t border-slate-200 text-xs text-center text-slate-500 mt-12">
            <div>
              <div className="h-14 border-b border-dashed border-slate-300"></div>
              <p className="mt-2 font-medium text-slate-700">Prepared By (Purchaser)</p>
            </div>
            <div>
              <div className="h-14 border-b border-dashed border-slate-300"></div>
              <p className="mt-2 font-medium text-slate-700">Department / Finance Approval</p>
            </div>
            <div>
              <div className="h-14 border-b border-dashed border-slate-300"></div>
              <p className="mt-2 font-medium text-slate-700">Vendor Acceptance</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
