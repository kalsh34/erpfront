import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import {
  Receipt,
  Search,
  RefreshCw,
  CreditCard,
  Printer,
  X,
} from 'lucide-react';
import { PurchaseStatusBadge } from '../components/PurchaseStatusBadge';
import { PurchasePrintModal } from '../components/PurchasePrintModal';

export const SupplierBillListPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  // Selected Bill for Print / Preview
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // Payment Recording Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payingBill, setPayingBill] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'CASH' | 'CHECK'>('BANK_TRANSFER');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Post to Accounting Action Loading
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (search) params.search = search;
      if (status) params.status = status;

      const res = await api.get('/v2/procurement/bills', { params });
      if (res.data.success) {
        setBills(res.data.data);
        setTotal(res.data.pagination.total);
      }
    } catch (err) {
      console.error('Failed to fetch bills:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handlePostBill = async (billId: string) => {
    try {
      setActionId(billId);
      const res = await api.post(`/v2/procurement/bills/${billId}/post`);
      if (res.data.success) {
        await fetchBills();
        alert('Bill posted to General Ledger! Accounts Payable and Inventory accounts updated.');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to post bill to GL');
    } finally {
      setActionId(null);
    }
  };

  const handleOpenPayment = (bill: any) => {
    setPayingBill(bill);
    const balance = Math.max(0, (bill.totalAmount || 0) - (bill.paidAmount || 0));
    setPaymentAmount(balance);
    setReference(`PAY-${Date.now().toString().slice(-6)}`);
    setNotes('');
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingBill) return;
    if (paymentAmount <= 0) {
      alert('Payment amount must be greater than zero');
      return;
    }

    try {
      setPaymentLoading(true);
      const res = await api.post(`/v2/procurement/bills/${payingBill._id}/payments`, {
        amount: Number(paymentAmount),
        paymentMethod,
        reference,
        notes,
      });
      if (res.data.success) {
        setIsPaymentModalOpen(false);
        await fetchBills();
        alert('Payment recorded successfully!');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-7 h-7 text-amber-600" />
            Supplier Invoices & Bills (AP)
          </h1>
          <p className="text-sm text-slate-500 dark:text-navy-400 mt-1">
            Accounts Payable invoices, general ledger posting, and vendor disbursement tracking
          </p>
        </div>

        <button
          onClick={() => navigate('/purchase/orders')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
        >
          <Receipt className="w-4 h-4" />
          Create Bill from Purchase Order
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-navy-800 p-4 rounded-xl border border-slate-200 dark:border-navy-700 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Bill #, PO #, Invoice #, or supplier..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-navy-600 rounded-lg text-sm bg-slate-50 dark:bg-navy-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-slate-200 dark:border-navy-600 rounded-lg text-sm bg-white dark:bg-navy-900 text-slate-800 dark:text-white"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="POSTED">Posted (Unpaid)</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="PAID">Paid in Full</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <button
          onClick={fetchBills}
          className="p-2 border border-slate-200 dark:border-navy-600 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-600 dark:text-navy-300"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Bills Table */}
      <div className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading supplier bills...</div>
        ) : bills.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Receipt className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-slate-700 dark:text-navy-200">No supplier bills found</p>
            <p className="text-xs text-slate-400 mt-1">
              Bills are generated against purchase orders to record liabilities and process vendor payments.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-navy-900/50 text-slate-500 dark:text-navy-300 uppercase text-xs border-b border-slate-200 dark:border-navy-700">
                <tr>
                  <th className="px-6 py-3">Bill #</th>
                  <th className="px-6 py-3">Purchase Order</th>
                  <th className="px-6 py-3">Supplier</th>
                  <th className="px-6 py-3">Vendor Invoice #</th>
                  <th className="px-6 py-3">Due Date</th>
                  <th className="px-6 py-3 text-right">Total Amount</th>
                  <th className="px-6 py-3 text-right">Paid Amount</th>
                  <th className="px-6 py-3 text-right">Balance Due</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                {bills.map((bill) => {
                  const balance = Math.max(0, (bill.totalAmount || 0) - (bill.paidAmount || 0));
                  return (
                    <tr key={bill._id} className="hover:bg-slate-50/50 dark:hover:bg-navy-800/50 transition">
                      <td className="px-6 py-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                        {bill.billNumber}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        {bill.poId?.poNumber ? (
                          <button
                            onClick={() => navigate(`/purchase/orders/${bill.poId._id || bill.poId}`)}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {bill.poId.poNumber}
                          </button>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800 dark:text-navy-200">
                          {bill.supplierId?.name || 'Unknown Supplier'}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {bill.invoiceNumber || '—'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : 'Immediate'}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {bill.totalAmount?.toLocaleString()} {bill.currency}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {bill.paidAmount?.toLocaleString()} {bill.currency}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold">
                        <span className={balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}>
                          {balance.toLocaleString()} {bill.currency}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <PurchaseStatusBadge status={bill.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {bill.status === 'DRAFT' && (
                            <button
                              onClick={() => handlePostBill(bill._id)}
                              disabled={actionId === bill._id}
                              className="px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium disabled:opacity-50"
                            >
                              Post GL
                            </button>
                          )}

                          {['POSTED', 'PARTIALLY_PAID'].includes(bill.status) && (
                            <button
                              onClick={() => handleOpenPayment(bill)}
                              className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium flex items-center gap-1"
                            >
                              <CreditCard className="w-3 h-3" />
                              Pay
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setSelectedBill(bill);
                              setIsPrintOpen(true);
                            }}
                            className="p-1 border border-slate-200 dark:border-navy-600 rounded hover:bg-slate-100 dark:hover:bg-navy-700 text-slate-600 dark:text-navy-300"
                            title="Print Bill"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 15 && (
          <div className="px-6 py-3 border-t border-slate-200 dark:border-navy-700 flex justify-between items-center text-xs text-slate-500">
            <span>
              Showing {(page - 1) * 15 + 1} to {Math.min(page * 15, total)} of {total} bills
            </span>
            <div className="flex gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 border border-slate-200 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page * 15 >= total}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border border-slate-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {isPaymentModalOpen && payingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-navy-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-navy-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Record Vendor Payment
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-navy-900 rounded-lg text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Bill Number:</span>
                  <span className="font-mono font-bold text-amber-600">{payingBill.billNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vendor:</span>
                  <span className="font-medium text-slate-800 dark:text-navy-200">{payingBill.supplierId?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Billed:</span>
                  <span className="font-mono">{payingBill.totalAmount?.toLocaleString()} {payingBill.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Remaining Balance:</span>
                  <span className="font-mono font-bold text-rose-600">
                    {Math.max(0, payingBill.totalAmount - (payingBill.paidAmount || 0)).toLocaleString()} {payingBill.currency}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-navy-300 mb-1">
                  Payment Amount ({payingBill.currency}) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  max={Math.max(0, payingBill.totalAmount - (payingBill.paidAmount || 0))}
                  step="any"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-navy-300 mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                >
                  <option value="BANK_TRANSFER">Bank Transfer / CBE Birr / Telebirr</option>
                  <option value="CHECK">Check</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-navy-300 mb-1">
                  Payment Reference / Transaction ID
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. CBE-TX-998822"
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-navy-300 mb-1">
                  Disbursement Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional remarks on this payment..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-navy-700">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentLoading}
                  className="px-4 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Bill Modal */}
      {selectedBill && (
        <PurchasePrintModal
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          title="SUPPLIER INVOICE / BILL (AP)"
          documentNumber={selectedBill.billNumber}
          documentDate={selectedBill.billDate || selectedBill.createdAt}
          supplier={selectedBill.supplierId || { name: 'Supplier' }}
          currency={selectedBill.currency}
          lines={selectedBill.lines?.map((l: any) => ({
            description: l.description || l.productId?.name || 'Line Item',
            quantity: l.quantity,
            uom: l.uom || 'PCS',
            unitPrice: l.unitPrice,
            subtotal: l.subtotal,
          })) || []}
          subtotal={selectedBill.subtotal || selectedBill.totalAmount}
          totalTax={selectedBill.taxAmount}
          grandTotal={selectedBill.totalAmount}
          notes={selectedBill.notes ? `Notes: ${selectedBill.notes}` : undefined}
          terms={`1. Due Date: ${selectedBill.dueDate ? new Date(selectedBill.dueDate).toLocaleDateString() : 'Immediate'}\n2. Reference: ${selectedBill.invoiceNumber || 'N/A'}`}
        />
      )}
    </div>
  );
};
