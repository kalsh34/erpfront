import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import {
  ArrowLeft,
  Printer,
  CheckCircle,
  XCircle,
  Send,
  Calendar,
  Building,
  PackageCheck,
  Receipt,
  FileText,
  History,
  Edit,
  X,
} from 'lucide-react';
import { PurchaseStatusBadge } from '../components/PurchaseStatusBadge';
import { PurchasePrintModal } from '../components/PurchasePrintModal';

export const PODetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [po, setPo] = useState<any>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // Approval note modal
  const [approvalModal, setApprovalModal] = useState<{ open: boolean; action: 'approve' | 'reject' | null }>({
    open: false,
    action: null,
  });
  const [approvalNotes, setApprovalNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Revision Modal
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [revisionLines, setRevisionLines] = useState<any[]>([]);

  // Goods Receipt Modal
  const [isGRNModalOpen, setIsGRNModalOpen] = useState(false);
  const [grnWarehouse, setGrnWarehouse] = useState('Central Addis Warehouse');
  const [grnDeliveryNote, setGrnDeliveryNote] = useState('');
  const [grnRemarks, setGrnRemarks] = useState('');
  const [grnLines, setGrnLines] = useState<any[]>([]);

  // Bill Modal
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [billInvoiceNumber, setBillInvoiceNumber] = useState('');
  const [billDueDate, setBillDueDate] = useState('');
  const [billNotes, setBillNotes] = useState('');

  const fetchPO = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/v2/procurement/orders/${id}`);
      if (res.data.success) {
        const order = res.data.data;
        setPo(order);

        // Prepopulate revision lines
        setRevisionLines(
          order.lines.map((l: any) => ({
            productId: l.productId?._id || l.productId,
            description: l.description,
            quantity: l.quantity,
            uom: l.uom,
            unitPrice: l.unitPrice,
            discount: l.discount || 0,
            tax: l.tax || 0,
          }))
        );

        // Prepopulate GRN lines with remaining quantities
        setGrnLines(
          order.lines
            .filter((l: any) => (l.quantity - (l.receivedQuantity || 0)) > 0)
            .map((l: any) => ({
              productId: l.productId?._id || l.productId,
              productName: l.productId?.name || l.description,
              orderedQuantity: l.quantity,
              alreadyReceived: l.receivedQuantity || 0,
              remaining: l.quantity - (l.receivedQuantity || 0),
              receivedQuantity: l.quantity - (l.receivedQuantity || 0),
            }))
        );

        // Default bill due date (30 days from now)
        const due = new Date();
        due.setDate(due.getDate() + 30);
        setBillDueDate(due.toISOString().split('T')[0]);
      }
    } catch (err) {
      console.error('Failed to load PO:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPO();
  }, [id]);

  const handleSubmit = async () => {
    try {
      setActionLoading(true);
      await api.post(`/v2/procurement/orders/${id}/submit`);
      await fetchPO();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit PO');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveReject = async () => {
    if (!approvalModal.action) return;
    try {
      setActionLoading(true);
      const endpoint = approvalModal.action === 'approve' ? 'approve' : 'reject';
      await api.post(`/v2/procurement/orders/${id}/${endpoint}`, {
        notes: approvalNotes,
      });
      setApprovalModal({ open: false, action: null });
      setApprovalNotes('');
      await fetchPO();
    } catch (err: any) {
      alert(err.response?.data?.message || `Failed to ${approvalModal.action} PO`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendVendor = async () => {
    try {
      setActionLoading(true);
      await api.post(`/v2/procurement/orders/${id}/send`);
      await fetchPO();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to mark PO as sent');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevisePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionReason.trim()) {
      alert('Revision reason is required');
      return;
    }

    try {
      setActionLoading(true);
      await api.post(`/v2/procurement/orders/${id}/revise`, {
        reason: revisionReason,
        lines: revisionLines,
      });
      setIsRevisionModalOpen(false);
      setRevisionReason('');
      await fetchPO();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to revise PO');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    const linesToReceive = grnLines
      .filter((l) => Number(l.receivedQuantity) > 0)
      .map((l) => ({
        productId: l.productId,
        quantity: Number(l.receivedQuantity),
      }));

    if (linesToReceive.length === 0) {
      alert('Please specify at least one item quantity to receive');
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.post('/v2/procurement/receipts', {
        poId: id,
        warehouse: grnWarehouse,
        deliveryNoteNumber: grnDeliveryNote,
        remarks: grnRemarks,
        lines: linesToReceive,
      });
      if (res.data.success) {
        setIsGRNModalOpen(false);
        await fetchPO();
        alert(`Goods Receipt Note ${res.data.data.grnNumber} created successfully! Stock updated.`);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record goods receipt');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await api.post('/v2/procurement/bills', {
        poId: id,
        invoiceNumber: billInvoiceNumber || undefined,
        dueDate: billDueDate || undefined,
        notes: billNotes,
      });
      if (res.data.success) {
        setIsBillModalOpen(false);
        await fetchPO();
        alert(`Supplier Bill ${res.data.data.billNumber} created successfully!`);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate supplier bill');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Purchase Order not found.</p>
        <button
          onClick={() => navigate('/purchase/orders')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm"
        >
          Back to Purchase Orders
        </button>
      </div>
    );
  }

  const supplier = po.supplierId;
  const isPendingApproval = po.status === 'SUBMITTED';
  const isApproved = po.status === 'APPROVED';
  const isReceivable = ['APPROVED', 'SENT_TO_VENDOR', 'PARTIALLY_RECEIVED'].includes(po.status);
  const totalReceivedQty = po.lines.reduce((sum: number, l: any) => sum + (l.receivedQuantity || 0), 0);
  const totalOrderedQty = po.lines.reduce((sum: number, l: any) => sum + (l.quantity || 0), 0);
  const receiptProgress = totalOrderedQty > 0 ? Math.round((totalReceivedQty / totalOrderedQty) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/purchase/orders')}
            className="p-2 border border-slate-200 dark:border-navy-700 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-800 transition"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-navy-300" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {po.poNumber}
              </h1>
              <PurchaseStatusBadge status={po.status} />
              {po.revisionNumber > 0 && (
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                  Rev {po.revisionNumber}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-navy-400 mt-1">
              Created on {new Date(po.createdAt).toLocaleDateString()} by {po.buyerId?.fullName || 'Purchaser'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsPrintOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 dark:border-navy-700 text-slate-700 dark:text-navy-200 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-navy-800 transition"
          >
            <Printer className="w-4 h-4" />
            Print / PDF
          </button>

          {po.status === 'DRAFT' && (
            <button
              onClick={handleSubmit}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Submit for Approval
            </button>
          )}

          {isPendingApproval && (
            <>
              <button
                onClick={() => setApprovalModal({ open: true, action: 'approve' })}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition shadow-sm disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Approve PO
              </button>
              <button
                onClick={() => setApprovalModal({ open: true, action: 'reject' })}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition shadow-sm disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </>
          )}

          {isApproved && (
            <button
              onClick={handleSendVendor}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Mark Sent to Vendor
            </button>
          )}

          {isReceivable && (
            <>
              <button
                onClick={() => setIsGRNModalOpen(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
              >
                <PackageCheck className="w-4 h-4" />
                Receive Goods (GRN)
              </button>
              <button
                onClick={() => setIsBillModalOpen(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
              >
                <Receipt className="w-4 h-4" />
                Create Bill
              </button>
            </>
          )}

          {!['DRAFT', 'CANCELLED', 'CLOSED'].includes(po.status) && (
            <button
              onClick={() => setIsRevisionModalOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-purple-300 text-purple-700 dark:border-purple-800 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg text-sm font-medium transition"
            >
              <Edit className="w-4 h-4" />
              Revise PO
            </button>
          )}
        </div>
      </div>

      {/* Fulfillment Progress Bar */}
      <div className="bg-white dark:bg-navy-800 p-4 rounded-xl border border-slate-200 dark:border-navy-700 shadow-sm">
        <div className="flex justify-between items-center text-sm mb-2">
          <span className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-teal-600" />
            Receipt & Fulfillment Progress
          </span>
          <span className="text-xs text-slate-500 dark:text-navy-400">
            {totalReceivedQty} of {totalOrderedQty} items received ({receiptProgress}%)
          </span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-navy-900 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              receiptProgress === 100
                ? 'bg-emerald-500'
                : receiptProgress > 0
                ? 'bg-teal-500'
                : 'bg-slate-300 dark:bg-navy-700'
            }`}
            style={{ width: `${receiptProgress}%` }}
          />
        </div>
      </div>

      {/* Grid: Supplier & Meta details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Supplier Info */}
        <div className="bg-white dark:bg-navy-800 p-5 rounded-xl border border-slate-200 dark:border-navy-700 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-3 font-semibold text-sm">
            <Building className="w-4 h-4" />
            Supplier Details
          </div>
          <div className="text-sm space-y-1.5">
            <p className="font-bold text-slate-900 dark:text-white text-base">
              {supplier?.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-navy-400">
              Code: <span className="font-mono">{supplier?.code || 'N/A'}</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-navy-400">
              TIN: {supplier?.tinNumber || 'N/A'}
            </p>
            <p className="text-xs text-slate-500 dark:text-navy-400">
              Email: {supplier?.email || 'N/A'}
            </p>
            <p className="text-xs text-slate-500 dark:text-navy-400">
              Phone: {supplier?.phone || 'N/A'}
            </p>
            <p className="text-xs text-slate-500 dark:text-navy-400">
              Address: {supplier?.address?.city}, {supplier?.address?.country}
            </p>
          </div>
        </div>

        {/* Order Logistics */}
        <div className="bg-white dark:bg-navy-800 p-5 rounded-xl border border-slate-200 dark:border-navy-700 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-3 font-semibold text-sm">
            <Calendar className="w-4 h-4" />
            Terms & Logistics
          </div>
          <div className="text-sm space-y-2">
            <div>
              <span className="text-xs text-slate-500 dark:text-navy-400 block">Department</span>
              <span className="font-medium text-slate-800 dark:text-navy-200">{po.department || 'General'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-navy-400 block">Warehouse</span>
              <span className="font-medium text-slate-800 dark:text-navy-200">{po.warehouse || 'Default'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-navy-400 block">Expected Delivery</span>
              <span className="font-medium text-slate-800 dark:text-navy-200">
                {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'Immediate'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-navy-400 block">Payment Terms</span>
              <span className="font-medium text-slate-800 dark:text-navy-200">{po.paymentTerms || 'NET_30'}</span>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-white dark:bg-navy-800 p-5 rounded-xl border border-slate-200 dark:border-navy-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-3 font-semibold text-sm">
              <FileText className="w-4 h-4" />
              Financial Total
            </div>
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-navy-300">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono font-medium">{po.subtotal?.toLocaleString()} {po.currency}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount:</span>
                <span className="font-mono font-medium text-rose-500">-{po.discountAmount?.toLocaleString()} {po.currency}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span className="font-mono font-medium">+{po.taxAmount?.toLocaleString()} {po.currency}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-navy-700">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-bold text-slate-900 dark:text-white">Total Amount:</span>
              <span className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                {po.totalAmount?.toLocaleString()} {po.currency}
              </span>
            </div>
            {po.rfqId && (
              <p className="text-[11px] text-slate-400 mt-2">
                Derived from RFQ:{' '}
                <button
                  onClick={() => navigate(`/purchase/rfqs/${po.rfqId._id || po.rfqId}`)}
                  className="text-indigo-500 hover:underline"
                >
                  {po.rfqId.rfqNumber || 'View RFQ'}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* PO Line Items */}
      <div className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-navy-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Order Line Items ({po.lines?.length || 0})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-navy-900/50 text-slate-500 dark:text-navy-300 uppercase text-xs border-b border-slate-200 dark:border-navy-700">
              <tr>
                <th className="px-6 py-3">#</th>
                <th className="px-6 py-3">Product / Description</th>
                <th className="px-6 py-3 text-right">Qty Ordered</th>
                <th className="px-6 py-3 text-right">Qty Received</th>
                <th className="px-6 py-3 text-right">Qty Remaining</th>
                <th className="px-6 py-3">UOM</th>
                <th className="px-6 py-3 text-right">Unit Price</th>
                <th className="px-6 py-3 text-right">Tax (%)</th>
                <th className="px-6 py-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
              {po.lines.map((line: any, idx: number) => {
                const remaining = line.quantity - (line.receivedQuantity || 0);
                return (
                  <tr key={line._id || idx} className="hover:bg-slate-50/50 dark:hover:bg-navy-800/50">
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {line.productId?.name || line.description}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-navy-400">
                        SKU: {line.productId?.sku || 'N/A'} {line.description && line.description !== line.productId?.name && `| ${line.description}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-800 dark:text-white">
                      {line.quantity}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-teal-600 dark:text-teal-400">
                      {line.receivedQuantity || 0}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold">
                      <span className={remaining > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}>
                        {remaining}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500">{line.uom}</td>
                    <td className="px-6 py-4 text-right font-mono">
                      {line.unitPrice?.toLocaleString()} {po.currency}
                    </td>
                    <td className="px-6 py-4 text-right text-xs font-mono">{line.tax}%</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {line.subtotal?.toLocaleString()} {po.currency}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval & Revisions History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Approvals */}
        <div className="bg-white dark:bg-navy-800 p-5 rounded-xl border border-slate-200 dark:border-navy-700 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-indigo-600" />
            Approval History ({po.approvalHistory?.length || 0})
          </h3>
          {po.approvalHistory?.length > 0 ? (
            <div className="space-y-3">
              {po.approvalHistory.map((app: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-navy-900 rounded-lg text-xs flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-white">
                      {app.approverRole || 'Approver'}: {app.approverId?.fullName || 'Manager'}
                    </div>
                    {app.notes && <p className="text-slate-500 mt-1 italic">"{app.notes}"</p>}
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {new Date(app.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      app.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                    }`}
                  >
                    {app.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No approvals recorded yet.</p>
          )}
        </div>

        {/* Revisions History */}
        <div className="bg-white dark:bg-navy-800 p-5 rounded-xl border border-slate-200 dark:border-navy-700 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-purple-600" />
            Revision Audit Trail ({po.revisions?.length || 0})
          </h3>
          {po.revisions?.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {po.revisions.map((rev: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-navy-900 rounded-lg text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-purple-700 dark:text-purple-300">
                      Revision {rev.revisionNumber}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(rev.revisedAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-navy-200 font-medium">Reason: {rev.reason}</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Value before revision: {rev.totalAmount?.toLocaleString()} {po.currency} ({rev.lines?.length} items)
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">This is the original order (Revision 0).</p>
          )}
        </div>
      </div>

      {/* Approval Confirmation Modal */}
      {approvalModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-navy-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-navy-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {approvalModal.action === 'approve' ? 'Approve Purchase Order' : 'Reject Purchase Order'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {approvalModal.action === 'approve'
                ? 'Confirming approval authorizes the procurement team to issue this order to the vendor.'
                : 'Rejecting this purchase order will prevent it from being sent or fulfilled.'}
            </p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-navy-300 mb-1">
                Approval Remarks / Comments (Optional)
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Enter notes for audit trail..."
                rows={3}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setApprovalModal({ open: false, action: null })}
                className="px-4 py-2 text-xs font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveReject}
                disabled={actionLoading}
                className={`px-4 py-2 text-xs font-medium text-white rounded-lg ${
                  approvalModal.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirm {approvalModal.action === 'approve' ? 'Approval' : 'Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PO Revision Modal */}
      {isRevisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-navy-800 rounded-xl shadow-xl max-w-3xl w-full p-6 border border-slate-200 dark:border-navy-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Revise Purchase Order {po.poNumber}
              </h3>
              <button onClick={() => setIsRevisionModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleRevisePO} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-navy-300 mb-1">
                  Revision Reason (Required) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Supplier negotiated unit price reduction from ETB 1000 to ETB 920"
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-navy-300 mb-2">
                  Line Items (Adjust Quantities or Prices)
                </label>
                <div className="space-y-3">
                  {revisionLines.map((line, idx) => (
                    <div key={idx} className="p-3 border border-slate-200 dark:border-navy-700 rounded-lg grid grid-cols-12 gap-2 items-center text-xs">
                      <div className="col-span-5">
                        <span className="font-semibold text-slate-800 dark:text-white block truncate">{line.description}</span>
                        <span className="text-[11px] text-slate-400">UOM: {line.uom}</span>
                      </div>
                      <div className="col-span-3">
                        <label className="block text-[10px] text-slate-400">Quantity</label>
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={line.quantity}
                          onChange={(e) => {
                            const updated = [...revisionLines];
                            updated[idx].quantity = Number(e.target.value);
                            setRevisionLines(updated);
                          }}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white dark:bg-navy-900"
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="block text-[10px] text-slate-400">Unit Price ({po.currency})</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={line.unitPrice}
                          onChange={(e) => {
                            const updated = [...revisionLines];
                            updated[idx].unitPrice = Number(e.target.value);
                            setRevisionLines(updated);
                          }}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white dark:bg-navy-900"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-navy-700">
                <button
                  type="button"
                  onClick={() => setIsRevisionModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm"
                >
                  Save Revision (Rev {po.revisionNumber + 1})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Goods (GRN) Modal */}
      {isGRNModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-navy-800 rounded-xl shadow-xl max-w-2xl w-full p-6 border border-slate-200 dark:border-navy-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-teal-600" />
                Record Goods Receipt (GRN)
              </h3>
              <button onClick={() => setIsGRNModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateGRN} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-navy-300 mb-1">
                    Receiving Warehouse *
                  </label>
                  <input
                    type="text"
                    required
                    value={grnWarehouse}
                    onChange={(e) => setGrnWarehouse(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-navy-300 mb-1">
                    Delivery Note / Waybill #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., DN-78901"
                    value={grnDeliveryNote}
                    onChange={(e) => setGrnDeliveryNote(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-navy-300 mb-2">
                  Items to Receive (Enter quantity received in this shipment)
                </label>
                <div className="space-y-3">
                  {grnLines.map((line, idx) => (
                    <div key={idx} className="p-3 border border-slate-200 dark:border-navy-700 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-white">{line.productName}</div>
                        <div className="text-[11px] text-slate-400">
                          Ordered: {line.orderedQuantity} | Previously Received: {line.alreadyReceived} | Remaining: {line.remaining}
                        </div>
                      </div>
                      <div className="w-32">
                        <label className="block text-[10px] text-slate-400">Receiving Qty</label>
                        <input
                          type="number"
                          min="0"
                          max={line.remaining}
                          step="any"
                          value={line.receivedQuantity}
                          onChange={(e) => {
                            const updated = [...grnLines];
                            updated[idx].receivedQuantity = Number(e.target.value);
                            setGrnLines(updated);
                          }}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-semibold text-teal-700 bg-white dark:bg-navy-900"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-navy-300 mb-1">
                  Inspection Remarks / Quality Notes
                </label>
                <textarea
                  rows={2}
                  value={grnRemarks}
                  onChange={(e) => setGrnRemarks(e.target.value)}
                  placeholder="Notes on packaging condition, inspection results..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-navy-700">
                <button
                  type="button"
                  onClick={() => setIsGRNModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm"
                >
                  Generate GRN & Update Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Supplier Bill Modal */}
      {isBillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-navy-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-navy-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-600" />
                Generate Accounts Payable Bill
              </h3>
              <button onClick={() => setIsBillModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateBill} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-navy-300 mb-1">
                  Vendor Invoice / Reference Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-2026-908"
                  value={billInvoiceNumber}
                  onChange={(e) => setBillInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-navy-300 mb-1">
                  Payment Due Date
                </label>
                <input
                  type="date"
                  value={billDueDate}
                  onChange={(e) => setBillDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-navy-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={billNotes}
                  onChange={(e) => setBillNotes(e.target.value)}
                  placeholder="Billing terms and references..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                Bill total will be initialized from PO lines: <span className="font-bold">{po.totalAmount?.toLocaleString()} {po.currency}</span>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-navy-700">
                <button
                  type="button"
                  onClick={() => setIsBillModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm"
                >
                  Create Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Document Modal */}
      <PurchasePrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="PURCHASE ORDER"
        documentNumber={po.poNumber}
        documentDate={po.orderDate || po.createdAt}
        supplier={po.supplierId || { name: 'Supplier' }}
        deliveryAddress={po.warehouse}
        paymentTerms={po.paymentTerms}
        deliveryTerms={po.deliveryTerms}
        currency={po.currency}
        lines={po.lines.map((l: any) => ({
          description: l.description || l.productId?.name,
          quantity: l.quantity,
          uom: l.uom,
          unitPrice: l.unitPrice,
          discount: l.discount,
          tax: l.tax,
          subtotal: l.subtotal,
        }))}
        subtotal={po.subtotal}
        totalDiscount={po.discountAmount}
        totalTax={po.taxAmount}
        grandTotal={po.totalAmount}
        notes={po.notes}
        terms="1. Goods subject to warehouse inspection and acceptance upon arrival.\n2. Invoice must reference this Purchase Order number."
      />
    </div>
  );
};
