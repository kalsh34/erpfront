import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../lib/api';
import {
  Package,
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  TrendingDown,
} from 'lucide-react';

export const ProductCatalogPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'STOCKABLE',
    category: 'Equipment',
    uom: 'PCS',
    purchasePrice: 0,
    salesPrice: 0,
    taxRate: 15,
    barcode: '',
    description: '',
    defaultSupplierId: '',
    minOrderQuantity: 1,
    leadTimeDays: 5,
    currentStock: 0,
    reorderLevel: 10,
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (search) params.search = search;
      if (type) params.type = type;
      if (lowStockOnly) params.lowStock = true;

      const res = await api.get('/v2/procurement/products', { params });
      if (res.data.success) {
        setProducts(res.data.data);
        setTotal(res.data.pagination.total);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, type, lowStockOnly]);

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/v2/procurement/contacts', { params: { isSupplier: true, limit: 100 } });
      if (res.data.success) {
        setSuppliers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
  }, [fetchProducts]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      type: 'STOCKABLE',
      category: 'Equipment',
      uom: 'PCS',
      purchasePrice: 0,
      salesPrice: 0,
      taxRate: 15,
      barcode: '',
      description: '',
      defaultSupplierId: '',
      minOrderQuantity: 1,
      leadTimeDays: 5,
      currentStock: 0,
      reorderLevel: 10,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: any) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      type: p.type || 'STOCKABLE',
      category: p.category || 'Equipment',
      uom: p.uom || 'PCS',
      purchasePrice: p.purchasePrice || 0,
      salesPrice: p.salesPrice || 0,
      taxRate: p.taxRate !== undefined ? p.taxRate : 15,
      barcode: p.barcode || '',
      description: p.description || '',
      defaultSupplierId: p.defaultSupplierId?._id || p.defaultSupplierId || '',
      minOrderQuantity: p.minOrderQuantity || 1,
      leadTimeDays: p.leadTimeDays || 5,
      currentStock: p.currentStock || 0,
      reorderLevel: p.reorderLevel || 10,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Empty-string ids must be dropped, or Mongoose ObjectId casting fails.
      const payload = Object.fromEntries(
        Object.entries(formData).filter(([, v]) => v !== '')
      );
      if (editingProduct) {
        await api.put(`/v2/procurement/products/${editingProduct._id}`, payload);
      } else {
        await api.post('/v2/procurement/products', payload);
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      console.error('Failed to save product:', err);
      alert('Error saving product. Please check name and parameters.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete / deactivate this product?')) return;
    try {
      await api.delete(`/v2/procurement/products/${id}`);
      fetchProducts();
    } catch (err) {
      console.error('Failed to delete product:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-navy-700 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Package className="text-blue-600" />
            Centralized Product & Service Master
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Universal catalog shared across Purchase, Sales, Inventory, and Financial Accounting.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-navy-800 p-4 rounded-xl border border-slate-200 dark:border-navy-700 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU, name, barcode..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900 text-slate-700 dark:text-slate-200"
          >
            <option value="">All Types</option>
            <option value="STOCKABLE">Stockable</option>
            <option value="CONSUMABLE">Consumable</option>
            <option value="SERVICE">Service</option>
          </select>

          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer bg-slate-50 dark:bg-navy-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-navy-700">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="rounded text-rose-600 focus:ring-rose-500"
            />
            <span className="flex items-center gap-1 font-medium text-rose-600">
              <TrendingDown size={14} /> Low Stock Alert
            </span>
          </label>

          <button
            onClick={fetchProducts}
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
                <th className="py-3 px-4">SKU / Item</th>
                <th className="py-3 px-4">Type & Category</th>
                <th className="py-3 px-4">UOM</th>
                <th className="py-3 px-4 text-right">Purchase Cost</th>
                <th className="py-3 px-4 text-right">Sales Price</th>
                <th className="py-3 px-4 text-right">On Hand</th>
                <th className="py-3 px-4 text-right">Incoming</th>
                <th className="py-3 px-4">Primary Supplier</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-700/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading products...
                  </td>
                </tr>
              ) : products.length > 0 ? (
                products.map((p) => {
                  const isLowStock = p.type === 'STOCKABLE' && p.currentStock <= p.reorderLevel;
                  return (
                    <tr key={p._id} className="hover:bg-slate-50/70 dark:hover:bg-navy-750/50 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-white block">{p.name}</span>
                          <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                            {p.sku}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-700 dark:text-slate-300 block">{p.category}</span>
                        <span className="text-[10px] text-slate-400 uppercase">{p.type}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">{p.uom}</td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-900 dark:text-white">
                        {Number(p.purchasePrice || 0).toLocaleString()} ETB
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                        {Number(p.salesPrice || 0).toLocaleString()} ETB
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <span
                          className={`font-bold ${
                            isLowStock ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded' : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {p.currentStock || 0}
                        </span>
                        {isLowStock && (
                          <span className="block text-[9px] text-rose-500 font-sans">Min: {p.reorderLevel}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-blue-600 font-medium">
                        {p.incomingStock > 0 ? `+${p.incomingStock}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {p.defaultSupplierId ? (
                          <span className="font-medium">{p.defaultSupplierId.name}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-navy-700 rounded text-slate-500 hover:text-blue-600"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(p._id)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-navy-700 rounded text-slate-500 hover:text-rose-600"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No products found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-navy-800 rounded-xl shadow-2xl overflow-hidden my-8 border border-slate-200 dark:border-navy-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {editingProduct ? 'Edit Product Master' : 'Create Centralized Product'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                    placeholder="e.g. Security Officer Tactical Vest (Level III)"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Product Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                  >
                    <option value="STOCKABLE">Stockable Product</option>
                    <option value="CONSUMABLE">Consumable Supplies</option>
                    <option value="SERVICE">Service</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                    placeholder="e.g. Uniforms, Radios, Fuel"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Unit of Measure (UOM)</label>
                  <select
                    value={formData.uom}
                    onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                  >
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="SET">SET</option>
                    <option value="PAIR">PAIR</option>
                    <option value="BOX">BOX</option>
                    <option value="KG">KG (Kilograms)</option>
                    <option value="LTR">LTR (Liters)</option>
                    <option value="METER">METER</option>
                    <option value="HOUR">HOUR (Service)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Default Supplier</label>
                  <select
                    value={formData.defaultSupplierId}
                    onChange={(e) => setFormData({ ...formData, defaultSupplierId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                  >
                    <option value="">None / Choose Later</option>
                    {suppliers.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Purchase Price (ETB)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Sales Price (ETB)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.salesPrice}
                    onChange={(e) => setFormData({ ...formData, salesPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Min Order Qty (MOQ)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.minOrderQuantity}
                    onChange={(e) => setFormData({ ...formData, minOrderQuantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Reorder Point (Min Stock)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Current Stock (On Hand)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.leadTimeDays}
                    onChange={(e) => setFormData({ ...formData, leadTimeDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-navy-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 font-medium"
                >
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
