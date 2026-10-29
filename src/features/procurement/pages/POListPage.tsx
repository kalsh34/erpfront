import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import {
  ShoppingCart,
  Search,
  Plus,
  RefreshCw,
  ArrowRight,
  X,
  Trash2,
} from 'lucide-react';
import { PurchaseStatusBadge } from '../components/PurchaseStatusBadge';

export const POListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Direct PO Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    supplierId: '',
    department: 'Security Operations',
    warehouse: 'Central Addis Warehouse',
    paymentTerms: 'NET_30',
    deliveryTerms: 'EXW',
    currency: 'ETB',
    expectedDeliveryDate: '',
    notes: '',
    lines: [
      { productId: '', description: '', quantity: 1, uom: 'PCS', unitPrice: 0, discount: 0, tax: 15 },
    ],
  });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (search) params.search = search;
      if (status) params.status = status;

      const res = await api.get('/v2/procurement/orders', { params });
      if (res.data.success) {
        setOrders(res.data.data);
        setTotal(res.data.pagination.total);
      }
    } catch (err) {
      console.error('Failed to fetch POs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  const fetchDropdowns = async () => {
    try {
      const [supRes, prodRes] = await Promise.all([
        api.get('/v2/procurement/contacts', { params: { isSupplier: true, limit: 100 } }),
        api.get('/v2/procurement/products', { params: { limit: 100 } }),
      ]);
      if (supRes.data.success) setSuppliers(supRes.data.data);
      if (prodRes.data.success) setProducts(prodRes.data.data);
    } catch (err) {
      console.error('Failed to load suppliers/products:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchDropdowns();
  }, [fetchOrders]);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  const handleAddLine = () => {
    setFormData({
      ...formData,
      lines: [
        ...formData.lines,
        { productId: '', description: '', quantity: 1, uom: 'PCS', unitPrice: 0, discount: 0, tax: 15 },
      ],
    });
  };

  const handleRemoveLine = (idx: number) => {
    if (formData.lines.length <= 1) return;
    const nextLines = [...formData.lines];
    nextLines.splice(idx, 1);
    setFormData({ ...formData, lines: nextLines });
  };

  const handleProductChange = (idx: number, productId: string) => {
    const selected = products.find((p) => p._id === productId);
    const nextLines = [...formData.lines];
    nextLines[idx] = {
      ...nextLines[idx],
      productId,
      description: selected ? selected.name : '',
      uom: selected ? selected.uom : 'PCS',
      unitPrice: selected ? selected.purchasePrice : 0,
      tax: selected ? selected.taxRate : 15,
    };
    setFormData({ ...formData, lines: nextLines });
  };

  const handleLineFieldChange = (idx: number, field: string, value: any) => {
    const nextLines = [...formData.lines];
    (nextLines[idx] as any)[field] = value;
    setFormData({ ...formData, lines: nextLines });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId) {
      alert('Please select a supplier');
      return;
    }
    const hasValidLine = formData.lines.some((l) => l.productId && l.quantity > 0 && l.unitPrice > 0);
    if (!hasValidLine) {
      alert('Please add at least one line with product, quantity, and unit price');
      return;
    }

    try {
      const res = await api.post('/v2/procurement/orders', formData);
      if (res.data.success) {
        setIsModalOpen(false);
        fetchOrders();
        navigate(`/purchase/orders/${res.data.data._id}`);
      }
    } catch (err) {
      console.error('Failed to create Purchase Order:', err);
      alert('Error creating Purchase Order. Please check inputs.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-navy-700 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShoppingCart className="text-blue-600" />
            Purchase Orders (POs)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Official purchasing agreements, approval thresholds, revisions, and fulfillment tracking.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Create Direct PO
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-navy-800 p-4 rounded-xl border border-slate-200 dark:border-navy-700 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search PO number, department..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900 text-slate-700 dark:text-slate-200"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted / Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="SENT_TO_VENDOR">Sent to Vendor</option>
            <option value="PARTIALLY_RECEIVED">Partially Received</option>
            <option value="FULLY_RECEIVED">Fully Received</option>
            <option value="CLOSED">Closed</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <button
            onClick={fetchOrders}
            className="p-2 border border-slate-200 dark:border-navy-700 hover:bg-slate-100 dark:hover:bg-navy-700 rounded-lg text-slate-600 dark:text-slate-300"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-navy-900/50 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-navy-700">
              <tr>
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Warehouse</th>
                <th className="py-3 px-4">Approval Stage</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-700/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading purchase orders...
                  </td>
                </tr>
              ) : orders.length > 0 ? (
                orders.map((po) => (
                  <tr
                    key={po._id}
                    onClick={() => navigate(`/purchase/orders/${po._id}`)}
                    className="hover:bg-slate-50/70 dark:hover:bg-navy-750/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 block">
                          {po.poNumber}
                        </span>
                        {po.revisionNumber > 0 && (
                          <span className="font-mono text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded font-medium">
                            Rev {po.revisionNumber}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {new Date(po.poDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                      {po.supplierId?.name || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {po.warehouse || 'Central Warehouse'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      {po.approvalStage || 'Active'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {Number(po.grandTotal).toLocaleString()} {po.currency}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <PurchaseStatusBadge status={po.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-blue-600 hover:text-blue-500 font-medium inline-flex items-center gap-1">
                        View <ArrowRight size={12} />
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No purchase orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Direct PO Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white dark:bg-navy-800 rounded-xl shadow-2xl overflow-hidden my-8 border border-slate-200 dark:border-navy-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingCart size={18} className="text-blue-600" />
                Create Direct Purchase Order
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Select Supplier / Vendor *
                  </label>
                  <select
                    required
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                  >
                    <option value="">-- Choose Vendor --</option>
                    {suppliers.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Delivery Warehouse
                  </label>
                  <input
                    type="text"
                    value={formData.warehouse}
                    onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={formData.expectedDeliveryDate}
                    onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="border-t border-slate-200 dark:border-navy-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    Order Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-500 font-medium"
                  >
                    <Plus size={14} /> Add Item Line
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.lines.map((line, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 p-3 bg-slate-50 dark:bg-navy-900 rounded-lg border border-slate-200 dark:border-navy-700 items-center"
                    >
                      <div className="col-span-4">
                        <select
                          required
                          value={line.productId}
                          onChange={(e) => handleProductChange(idx, e.target.value)}
                          className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                        >
                          <option value="">-- Choose Product --</option>
                          {products.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.name} ({p.sku})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="Description"
                          value={line.description}
                          onChange={(e) => handleLineFieldChange(idx, 'description', e.target.value)}
                          className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={line.quantity}
                          onChange={(e) => handleLineFieldChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Unit Price"
                          value={line.unitPrice}
                          onChange={(e) => handleLineFieldChange(idx, 'unitPrice', Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-800 text-slate-900 dark:text-white font-mono"
                        />
                      </div>

                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Order Comments
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-navy-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 font-medium"
                >
                  Create Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
