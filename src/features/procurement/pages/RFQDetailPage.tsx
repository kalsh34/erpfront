import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import {
  ArrowLeft,
  Printer,
  CheckCircle,
  XCircle,
  Send,
  ShoppingCart,
  DollarSign,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { PurchaseStatusBadge } from '../components/PurchaseStatusBadge';
import { PurchasePrintModal } from '../components/PurchasePrintModal';

export const RFQDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [rfq, setRfq] = useState<any>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // Vendor Quotation Modal
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quotesData, setQuotesData] = useState<any[]>([]);

  // Convert to PO Modal
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertWarehouse, setConvertWarehouse] = useState('Central Addis Warehouse');

  const fetchRFQ = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/v2/procurement/rfqs/${id}`);
      if (res.data.success) {
        setRfq(res.data.data);
        // Pre-fill quote lines
        setQuotesData(
          res.data.data.lines.map((l: any) => ({
            lineId: l._id,
            description: l.description || l.productId?.name,
            quantity: l.quantity,
            uom: l.uom,
            vendorPrice: l.vendorPrice || l.estimatedPrice || 0,
            discount: l.discount || 0,
            tax: l.tax !== undefined ? l.tax : 15,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load RFQ:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRFQ();
  }, [id]);

  const handleSubmit = async () => {
    try {
      await api.post(`/v2/procurement/rfqs/${id}/submit`);
      fetchRFQ();
    } catch (err) {
      console.error(err);
      alert('Error submitting RFQ');
    }
  };

  const handleSend = async () => {
    try {
      await api.post(`/v2/procurement/rfqs/${id}/send`);
      fetchRFQ();
    } catch (err) {
      console.error(err);
      alert('Error marking RFQ as sent');
    }
  };

  const handleSaveQuotes = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/v2/procurement/rfqs/${id}/quote`, { quotes: quotesData });
      setIsQuoteModalOpen(false);
      fetchRFQ();
    } catch (err) {
      console.error(err);
      alert('Error recording vendor quotation');
    }
  };

  const handleApprove = async () => {
    try {
      await api.post(`/v2/procurement/rfqs/${id}/approve`);
      fetchRFQ();
    } catch (err) {
      console.error(err);
      alert('Error approving RFQ');
    }
  };

  const handleReject = async () => {
    const reason = prompt('Please enter reason for rejection:');
    if (!reason) return;
    try {
      await api.post(`/v2/procurement/rfqs/${id}/reject`, { reason });
      fetchRFQ();
    } catch (err) {
      console.error(err);
      alert('Error rejecting RFQ');
    }
  };

  const handleConvertToPO = async () => {
    try {
      const res = await api.post(`/v2/procurement/rfqs/${id}/convert-to-po`, {
        warehouse: convertWarehouse,
      });
      if (res.data.success) {
        setIsConvertModalOpen(false);
        navigate(`/purchase/orders/${res.data.data._id}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error converting RFQ to Purchase Order');
    }
  };

  if (loading || !rfq) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-2 text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading RFQ details...</span>
        </div>
      </div>
    );
  }

  const supplier = rfq.supplierId || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/purchase/rfqs')}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back to RFQ List
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsPrintOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-navy-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-700 shadow-xs"
          >
            <Printer size={14} /> Print / PDF
          </button>

          {rfq.status === 'DRAFT' && (
            <button
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-500 shadow-xs"
            >
              Submit RFQ
            </button>
          )}

          {rfq.status === 'SUBMITTED' && (
            <button
              onClick={handleSend}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-medium hover:bg-sky-500 shadow-xs"
            >
              <Send size={13} /> Mark as Sent to Vendor
            </button>
          )}

          {['SENT_TO_VENDOR', 'QUOTATION_RECEIVED', 'UNDER_EVALUATION'].includes(rfq.status) && (
            <button
              onClick={() => setIsQuoteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-500 shadow-xs"
            >
              <DollarSign size={13} /> Enter Vendor Quote
            </button>
          )}

          {['QUOTATION_RECEIVED', 'UNDER_EVALUATION'].includes(rfq.status) && (
            <>
              <button
                onClick={handleApprove}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-500 shadow-xs"
              >
                <CheckCircle size={13} /> Approve RFQ
              </button>
              <button
                onClick={handleReject}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-500 shadow-xs"
              >
                <XCircle size={13} /> Reject
              </button>
            </>
          )}

          {rfq.status === 'APPROVED' && (
            <button
              onClick={() => setIsConvertModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-500 shadow-xs"
            >
              <ShoppingCart size={14} /> Convert to Purchase Order
            </button>
          )}

          {rfq.status === 'PO_CREATED' && rfq.purchaseOrderId && (
            <button
              onClick={() => navigate(`/purchase/orders/${rfq.purchaseOrderId._id}`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-medium shadow-xs"
            >
              <ExternalLink size={14} /> View PO {rfq.purchaseOrderId.poNumber}
            </button>
          )}
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 overflow-hidden shadow-xs">
        {/* Header Strip */}
        <div className="p-6 border-b border-slate-200 dark:border-navy-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                {rfq.rfqNumber}
              </h1>
              <PurchaseStatusBadge status={rfq.status} size="md" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Created on {new Date(rfq.rfqDate).toLocaleDateString()} by{' '}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {rfq.buyerId ? `${rfq.buyerId.firstName} ${rfq.buyerId.lastName}` : 'Buyer'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Estimated Total</span>
              <span className="font-mono text-sm font-medium text-slate-700 dark:text-slate-200">
                {Number(rfq.totalEstimatedAmount || 0).toLocaleString()} {rfq.currency}
              </span>
            </div>
            <div className="text-right border-l border-slate-200 dark:border-navy-700 pl-6">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Vendor Quoted Total</span>
              <span className="font-mono text-base font-bold text-blue-600 dark:text-blue-400">
                {rfq.totalQuotedAmount > 0
                  ? `${Number(rfq.totalQuotedAmount).toLocaleString()} ${rfq.currency}`
                  : 'Pending Bid'}
              </span>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-50/50 dark:bg-navy-900/30 border-b border-slate-200 dark:border-navy-700 text-xs">
          <div>
            <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1 text-[10px]">
              Supplier Information
            </span>
            <p className="font-semibold text-sm text-slate-900 dark:text-white">{supplier.name || '-'}</p>
            <p className="text-slate-500 font-mono text-[11px] mt-0.5">Code: {supplier.code || '-'}</p>
            {supplier.email && <p className="text-slate-500">{supplier.email}</p>}
            {supplier.phone && <p className="text-slate-500">{supplier.phone}</p>}
            {supplier.tin && <p className="text-slate-500">TIN: {supplier.tin}</p>}
          </div>

          <div>
            <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1 text-[10px]">
              Terms & Delivery
            </span>
            <p className="text-slate-700 dark:text-slate-300">
              <span className="text-slate-400">Payment:</span> {rfq.paymentTerms || 'NET_30'}
            </p>
            <p className="text-slate-700 dark:text-slate-300 mt-1">
              <span className="text-slate-400">Delivery Terms:</span> {rfq.deliveryTerms || 'EXW'}
            </p>
            <p className="text-slate-700 dark:text-slate-300 mt-1">
              <span className="text-slate-400">Expected Delivery:</span>{' '}
              {rfq.expectedDeliveryDate ? new Date(rfq.expectedDeliveryDate).toLocaleDateString() : 'Not specified'}
            </p>
          </div>

          <div>
            <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1 text-[10px]">
              Internal Department & Notes
            </span>
            <p className="text-slate-700 dark:text-slate-300">
              <span className="text-slate-400">Department:</span> {rfq.requestingDepartment}
            </p>
            {rfq.notes && (
              <p className="text-slate-500 dark:text-slate-400 mt-1.5 italic">
                "{rfq.notes}"
              </p>
            )}
          </div>
        </div>

        {/* Lines Table */}
        <div className="p-6">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
            Quotation Line Items
          </h2>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-navy-700">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-navy-900 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-navy-700">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Product / Specification</th>
                  <th className="py-3 px-4 text-right">Requested Qty</th>
                  <th className="py-3 px-4 text-center">UOM</th>
                  <th className="py-3 px-4 text-right">Est. Unit Price</th>
                  <th className="py-3 px-4 text-right">Vendor Quoted Price</th>
                  <th className="py-3 px-4 text-right">Disc %</th>
                  <th className="py-3 px-4 text-right">Tax %</th>
                  <th className="py-3 px-4 text-right">Subtotal ({rfq.currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-700/60">
                {rfq.lines.map((l: any, idx: number) => (
                  <tr key={l._id || idx} className="hover:bg-slate-50/50 dark:hover:bg-navy-750/30">
                    <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        {l.productId?.name || l.description}
                      </span>
                      {l.productId?.sku && (
                        <span className="font-mono text-[10px] text-slate-400">{l.productId.sku}</span>
                      )}
                      {l.description && l.description !== l.productId?.name && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{l.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium">{l.quantity}</td>
                    <td className="py-3 px-4 text-center text-slate-500">{l.uom}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {Number(l.estimatedPrice || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                      {l.vendorPrice > 0 ? Number(l.vendorPrice).toLocaleString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">{l.discount || 0}%</td>
                    <td className="py-3 px-4 text-right text-slate-500">{l.tax || 15}%</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {l.subtotal > 0 ? Number(l.subtotal).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Record Vendor Quotation Modal */}
      {isQuoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white dark:bg-navy-800 rounded-xl shadow-2xl overflow-hidden my-8 border border-slate-200 dark:border-navy-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign size={16} className="text-indigo-500" />
                Record Supplier Quotation Pricing ({supplier.name})
              </h3>
              <button onClick={() => setIsQuoteModalOpen(false)} className="text-slate-400 hover:text-white">
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveQuotes} className="p-6 space-y-4 text-xs">
              <p className="text-slate-500 dark:text-slate-400">
                Enter the unit price, discount, and tax quoted by the vendor for each requested item.
              </p>

              <div className="space-y-3">
                {quotesData.map((q, idx) => (
                  <div
                    key={q.lineId || idx}
                    className="p-3 bg-slate-50 dark:bg-navy-900 rounded-lg border border-slate-200 dark:border-navy-700 grid grid-cols-12 gap-3 items-center"
                  >
                    <div className="col-span-5">
                      <span className="font-semibold text-slate-900 dark:text-white block">{q.description}</span>
                      <span className="text-[11px] text-slate-400">Qty: {q.quantity} {q.uom}</span>
                    </div>

                    <div className="col-span-3">
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                        Quoted Price ({rfq.currency}) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={q.vendorPrice}
                        onChange={(e) => {
                          const next = [...quotesData];
                          next[idx].vendorPrice = Number(e.target.value);
                          setQuotesData(next);
                        }}
                        className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-800 text-slate-900 dark:text-white font-mono"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                        Discount %
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={q.discount}
                        onChange={(e) => {
                          const next = [...quotesData];
                          next[idx].discount = Number(e.target.value);
                          setQuotesData(next);
                        }}
                        className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                        Tax %
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={q.tax}
                        onChange={(e) => {
                          const next = [...quotesData];
                          next[idx].tax = Number(e.target.value);
                          setQuotesData(next);
                        }}
                        className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-navy-700">
                <button
                  type="button"
                  onClick={() => setIsQuoteModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 font-medium"
                >
                  Save Quotation Pricing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to PO Modal */}
      {isConvertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-navy-800 rounded-xl shadow-2xl p-6 border border-slate-200 dark:border-navy-700 text-xs">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <ShoppingCart size={16} className="text-blue-600" />
              Convert to Purchase Order
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              This will generate an official Purchase Order for <span className="font-semibold text-slate-900 dark:text-white">{supplier.name}</span> with grand total of <span className="font-mono font-bold text-blue-600">{Number(rfq.totalQuotedAmount).toLocaleString()} {rfq.currency}</span>.
            </p>

            <div className="mb-4">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Destination Warehouse / Delivery Site
              </label>
              <input
                type="text"
                value={convertWarehouse}
                onChange={(e) => setConvertWarehouse(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setIsConvertModalOpen(false)}
                className="px-3 py-1.5 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConvertToPO}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 font-medium"
              >
                Confirm & Create PO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      <PurchasePrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="REQUEST FOR QUOTATION"
        documentNumber={rfq.rfqNumber}
        documentDate={rfq.rfqDate}
        supplier={rfq.supplierId || { name: 'Supplier' }}
        currency={rfq.currency}
        lines={rfq.lines.map((l: any) => ({
          description: l.description || l.productId?.name,
          quantity: l.quantity,
          uom: l.uom,
          unitPrice: l.vendorPrice || l.estimatedPrice,
          discount: l.discount,
          tax: l.tax,
          subtotal: l.subtotal || l.quantity * (l.vendorPrice || l.estimatedPrice),
        }))}
        subtotal={rfq.totalQuotedAmount || rfq.totalEstimatedAmount}
        grandTotal={rfq.totalQuotedAmount || rfq.totalEstimatedAmount}
        notes={rfq.notes}
      />
    </div>
  );
};
