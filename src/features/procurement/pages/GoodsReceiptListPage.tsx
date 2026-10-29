import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import {
  PackageCheck,
  Search,
  RefreshCw,
  Printer,
  Warehouse,
} from 'lucide-react';
import { PurchaseStatusBadge } from '../components/PurchaseStatusBadge';
import { PurchasePrintModal } from '../components/PurchasePrintModal';

export const GoodsReceiptListPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  // Selected GRN for preview/print
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (search) params.search = search;
      if (status) params.status = status;

      const res = await api.get('/v2/procurement/receipts', { params });
      if (res.data.success) {
        setReceipts(res.data.data);
        setTotal(res.data.pagination.total);
      }
    } catch (err) {
      console.error('Failed to fetch goods receipts:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const handlePrint = (grn: any) => {
    setSelectedReceipt(grn);
    setIsPrintOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PackageCheck className="w-7 h-7 text-teal-600" />
            Goods Receipt Notes (GRN)
          </h1>
          <p className="text-sm text-slate-500 dark:text-navy-400 mt-1">
            Warehouse inward inspection records and stock inventory updates against purchase orders
          </p>
        </div>

        <button
          onClick={() => navigate('/purchase/orders')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
        >
          <PackageCheck className="w-4 h-4" />
          Receive from Purchase Order
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-navy-800 p-4 rounded-xl border border-slate-200 dark:border-navy-700 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by GRN number, PO number, or delivery note..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-navy-600 rounded-lg text-sm bg-slate-50 dark:bg-navy-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
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
          <option value="RECEIVED">Received</option>
          <option value="RETURNED">Returned</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <button
          onClick={fetchReceipts}
          className="p-2 border border-slate-200 dark:border-navy-600 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-600 dark:text-navy-300"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Receipts Table */}
      <div className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading goods receipts...</div>
        ) : receipts.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <PackageCheck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-slate-700 dark:text-navy-200">No goods receipts found</p>
            <p className="text-xs text-slate-400 mt-1">
              Goods receipts are generated when items arrive against approved purchase orders.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-navy-900/50 text-slate-500 dark:text-navy-300 uppercase text-xs border-b border-slate-200 dark:border-navy-700">
                <tr>
                  <th className="px-6 py-3">GRN #</th>
                  <th className="px-6 py-3">Purchase Order</th>
                  <th className="px-6 py-3">Supplier</th>
                  <th className="px-6 py-3">Warehouse</th>
                  <th className="px-6 py-3">Delivery Note</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Items Received</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                {receipts.map((grn) => {
                  const totalItems = grn.lines?.reduce((sum: number, l: any) => sum + (l.receivedQuantity || 0), 0) || 0;
                  return (
                    <tr
                      key={grn._id}
                      className="hover:bg-slate-50/50 dark:hover:bg-navy-800/50 transition cursor-pointer"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-teal-600 dark:text-teal-400">
                        {grn.grnNumber}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        {grn.poId?.poNumber ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/purchase/orders/${grn.poId._id || grn.poId}`);
                            }}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {grn.poId.poNumber}
                          </button>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800 dark:text-navy-200">
                          {grn.supplierId?.name || 'Unknown Supplier'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 dark:text-navy-300">
                        <span className="flex items-center gap-1">
                          <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                          {grn.warehouse}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">
                        {grn.deliveryNoteNumber || '—'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(grn.receiptDate || grn.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-800 dark:text-white">
                        {totalItems} units
                      </td>
                      <td className="px-6 py-4">
                        <PurchaseStatusBadge status={grn.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrint(grn);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-slate-200 dark:border-navy-600 rounded hover:bg-slate-100 dark:hover:bg-navy-700 text-slate-600 dark:text-navy-300"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print GRN
                        </button>
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
              Showing {(page - 1) * 15 + 1} to {Math.min(page * 15, total)} of {total} receipts
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

      {/* Print GRN Modal */}
      {selectedReceipt && (
        <PurchasePrintModal
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          title="GOODS RECEIPT NOTE (GRN)"
          documentNumber={selectedReceipt.grnNumber}
          documentDate={selectedReceipt.receiptDate || selectedReceipt.createdAt}
          supplier={selectedReceipt.supplierId || { name: 'Supplier' }}
          deliveryAddress={selectedReceipt.warehouse}
          currency="ETB"
          lines={selectedReceipt.lines?.map((l: any) => ({
            description: l.productId?.name || l.productId,
            quantity: l.receivedQuantity,
            uom: l.productId?.uom || 'PCS',
            unitPrice: 0,
            subtotal: 0,
          })) || []}
          subtotal={0}
          grandTotal={0}
          notes={selectedReceipt.remarks ? `Remarks: ${selectedReceipt.remarks}` : undefined}
        />
      )}
    </div>
  );
};
