import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../lib/api';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Star,
  Mail,
  Phone,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';

export const SupplierListPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    contactType: 'COMPANY',
    isSupplier: true,
    isCustomer: false,
    supplierCategory: 'DISTRIBUTOR',
    email: '',
    phone: '',
    tin: '',
    address: '',
    city: 'Addis Ababa',
    country: 'Ethiopia',
    paymentTerms: 'NET_30',
    deliveryTerms: 'EXW',
    currency: 'ETB',
    supplierRating: 5,
    notes: '',
  });

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15, isSupplier: true };
      if (search) params.search = search;
      if (category) params.category = category;

      const res = await api.get('/v2/procurement/contacts', { params });
      if (res.data.success) {
        setSuppliers(res.data.data);
        setTotal(res.data.pagination.total);
      }
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, category]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      contactType: 'COMPANY',
      isSupplier: true,
      isCustomer: false,
      supplierCategory: 'DISTRIBUTOR',
      email: '',
      phone: '',
      tin: '',
      address: '',
      city: 'Addis Ababa',
      country: 'Ethiopia',
      paymentTerms: 'NET_30',
      deliveryTerms: 'EXW',
      currency: 'ETB',
      supplierRating: 5,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: any) => {
    setEditingSupplier(s);
    setFormData({
      name: s.name,
      contactType: s.contactType || 'COMPANY',
      isSupplier: s.isSupplier !== false,
      isCustomer: !!s.isCustomer,
      supplierCategory: s.supplierCategory || 'DISTRIBUTOR',
      email: s.email || '',
      phone: s.phone || '',
      tin: s.tin || '',
      address: s.address || '',
      city: s.city || 'Addis Ababa',
      country: s.country || 'Ethiopia',
      paymentTerms: s.paymentTerms || 'NET_30',
      deliveryTerms: s.deliveryTerms || 'EXW',
      currency: s.currency || 'ETB',
      supplierRating: s.supplierRating || 5,
      notes: s.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await api.put(`/v2/procurement/contacts/${editingSupplier._id}`, formData);
      } else {
        await api.post('/v2/procurement/contacts', formData);
      }
      setIsModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      console.error('Failed to save supplier:', err);
      alert('Error saving supplier. Please ensure name is provided.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete / deactivate this supplier?')) return;
    try {
      await api.delete(`/v2/procurement/contacts/${id}`);
      fetchSuppliers();
    } catch (err) {
      console.error('Failed to delete supplier:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-navy-700 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="text-blue-600" />
            Centralized Suppliers & Vendors
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Master partner directory shared across Purchasing, Sales, Inventory, and Accounting.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Add Supplier
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-navy-800 p-4 rounded-xl border border-slate-200 dark:border-navy-700 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search supplier, code, TIN, email..."
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
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900 text-slate-700 dark:text-slate-200"
          >
            <option value="">All Categories</option>
            <option value="MANUFACTURER">Manufacturer</option>
            <option value="DISTRIBUTOR">Distributor</option>
            <option value="SERVICE_PROVIDER">Service Provider</option>
            <option value="WHOLESALER">Wholesaler</option>
          </select>

          <button
            onClick={fetchSuppliers}
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
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">TIN / Tax</th>
                <th className="py-3 px-4">Terms</th>
                <th className="py-3 px-4 text-center">Rating</th>
                <th className="py-3 px-4 text-right">Spend (ETB)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-700/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading suppliers...
                  </td>
                </tr>
              ) : suppliers.length > 0 ? (
                suppliers.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/70 dark:hover:bg-navy-750/50 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white block">{s.name}</span>
                        <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                          {s.code}
                        </span>
                        {s.isCustomer && (
                          <span className="inline-block mt-0.5 ml-1 text-[9px] px-1.5 py-0.2 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded font-medium">
                            Also Customer
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                      {s.supplierCategory || 'General'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 space-y-0.5">
                      {s.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone size={11} /> <span>{s.phone}</span>
                        </div>
                      )}
                      {s.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail size={11} /> <span>{s.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {s.tin || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      <span className="block">{s.paymentTerms}</span>
                      <span className="text-[10px] text-slate-400">{s.deliveryTerms}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-0.5 text-amber-500 font-bold">
                        <Star size={12} fill="currentColor" />
                        <span>{s.supplierRating || 5}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-900 dark:text-white">
                      {Number(s.totalPurchaseSpend || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          s.isActive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-navy-700 rounded text-slate-500 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(s._id)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-navy-700 rounded text-slate-500 hover:text-rose-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No suppliers found matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Create / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-navy-800 rounded-xl shadow-2xl overflow-hidden my-8 border border-slate-200 dark:border-navy-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {editingSupplier ? 'Edit Supplier' : 'Register New Supplier / Business Partner'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Company / Supplier Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                    placeholder="e.g. Acme Security Equipment PLC"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Supplier Category</label>
                  <select
                    value={formData.supplierCategory}
                    onChange={(e) => setFormData({ ...formData, supplierCategory: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                  >
                    <option value="MANUFACTURER">Manufacturer</option>
                    <option value="DISTRIBUTOR">Distributor</option>
                    <option value="SERVICE_PROVIDER">Service Provider</option>
                    <option value="WHOLESALER">Wholesaler</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Tax ID / TIN</label>
                  <input
                    type="text"
                    value={formData.tin}
                    onChange={(e) => setFormData({ ...formData, tin: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                    placeholder="e.g. 0098765432"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                    placeholder="sales@supplier.com"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                    placeholder="+251 91 123 4567"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Payment Terms</label>
                  <select
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                  >
                    <option value="IMMEDIATE">Immediate / Cash</option>
                    <option value="NET_15">Net 15 Days</option>
                    <option value="NET_30">Net 30 Days</option>
                    <option value="NET_45">Net 45 Days</option>
                    <option value="NET_60">Net 60 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Delivery Terms</label>
                  <select
                    value={formData.deliveryTerms}
                    onChange={(e) => setFormData({ ...formData, deliveryTerms: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                  >
                    <option value="EXW">EXW - Ex Works</option>
                    <option value="FOB">FOB - Free on Board</option>
                    <option value="CIF">CIF - Cost, Insurance & Freight</option>
                    <option value="DDP">DDP - Delivered Duty Paid</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Supplier Rating (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.supplierRating}
                    onChange={(e) => setFormData({ ...formData, supplierRating: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-6 mt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isCustomer}
                      onChange={(e) => setFormData({ ...formData, isCustomer: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-700 dark:text-slate-300">Also functions as Customer</span>
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                    placeholder="Street, Building, Woreda"
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
                  {editingSupplier ? 'Save Changes' : 'Create Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
