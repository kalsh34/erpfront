import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { downloadCsv } from '../../payroll-shared/export';
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  Building,
  Package,
  Clock,
  PieChart as PieIcon,
  TrendingUp,
} from 'lucide-react';

export const PurchaseReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'summary' | 'supplier' | 'price' | 'outstanding' | 'analysis'>('summary');
  const [loading, setLoading] = useState(false);

  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [department, setDepartment] = useState('');
  const [productId, setProductId] = useState('');

  // Report Data States
  const [poSummary, setPoSummary] = useState<any[]>([]);
  const [supplierSpend, setSupplierSpend] = useState<any[]>([]);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [outstanding, setOutstanding] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any[]>([]);

  // Products list for price history filter
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    // Fetch products list for dropdown
    api.get('/v2/procurement/products?limit=100').then((res) => {
      if (res.data.success) {
        setProducts(res.data.data);
        if (res.data.data.length > 0) {
          setProductId(res.data.data[0]._id);
        }
      }
    }).catch(console.error);
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (department) params.department = department;

      if (activeTab === 'summary') {
        const res = await api.get('/v2/procurement/reports/po-summary', { params });
        if (res.data.success) setPoSummary(res.data.data);
      } else if (activeTab === 'supplier') {
        const res = await api.get('/v2/procurement/reports/supplier-spend', { params });
        if (res.data.success) setSupplierSpend(res.data.data);
      } else if (activeTab === 'price') {
        if (productId) {
          const res = await api.get('/v2/procurement/reports/price-history', {
            params: { ...params, productId },
          });
          if (res.data.success) setPriceHistory(res.data.data);
        }
      } else if (activeTab === 'outstanding') {
        const res = await api.get('/v2/procurement/reports/outstanding', { params });
        if (res.data.success) setOutstanding(res.data.data);
      } else if (activeTab === 'analysis') {
        const res = await api.get('/v2/procurement/reports/spend-analysis', { params });
        if (res.data.success) setAnalysis(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [activeTab, productId]);

  const exportCSV = () => {
    const filename = `purchase_report_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    // Rows go through the shared helper (UTF-8 BOM + proper <a download>):
    // a hand-built "data:text/csv" href loses commas/quotes in some browsers
    // and silently refuses to download.
    let rows: (string | number)[][] = [];

    if (activeTab === 'summary') {
      rows = [
        ['PO Number', 'Date', 'Supplier', 'Buyer', 'Department', 'Amount', 'Currency', 'Status'],
        ...poSummary.map((r) => [
          r.poNumber, new Date(r.orderDate).toLocaleDateString(), r.supplier, r.buyer,
          r.department, r.totalAmount, r.currency, r.status,
        ]),
      ];
    } else if (activeTab === 'supplier') {
      rows = [
        ['Supplier', 'Category', 'Total POs', 'Total Spend (ETB)', 'Average Order Value (ETB)'],
        ...supplierSpend.map((r) => [r.supplierName, r.category, r.totalOrders, r.totalSpend, r.averageOrderValue]),
      ];
    } else if (activeTab === 'price') {
      rows = [
        ['Product', 'Supplier', 'Order Date', 'PO Number', 'Unit Price', 'Currency', 'Quantity'],
        ...priceHistory.map((r) => [
          r.productName, r.supplierName, new Date(r.orderDate).toLocaleDateString(),
          r.poNumber, r.unitPrice, r.currency, r.quantity,
        ]),
      ];
    } else if (activeTab === 'outstanding') {
      rows = [
        ['PO Number', 'Supplier', 'Order Date', 'Expected Date', 'Ordered Qty', 'Received Qty', 'Remaining Qty', 'Remaining Value (ETB)'],
        ...outstanding.map((r) => [
          r.poNumber, r.supplier, new Date(r.orderDate).toLocaleDateString(),
          r.expectedDate ? new Date(r.expectedDate).toLocaleDateString() : 'N/A',
          r.orderedQuantity, r.receivedQuantity, r.remainingQuantity, r.remainingValue,
        ]),
      ];
    } else if (activeTab === 'analysis') {
      rows = [
        ['Category', 'Total Spend (ETB)', 'Order Count'],
        ...analysis.map((r) => [r.category, r.totalSpend, r.orderCount]),
      ];
    }

    downloadCsv(filename, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            Purchasing Analytics & Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-navy-400 mt-1">
            FRD section 16 audit and intelligence reporting: PO Summaries, Vendor Spend, Price Histories & Open Backorders
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-navy-600 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-navy-800 text-slate-700 dark:text-navy-200 shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-navy-700 space-x-4">
        {[
          { key: 'summary', label: '16.1 PO Summary', icon: BarChart3 },
          { key: 'supplier', label: '16.2 Supplier Spend', icon: Building },
          { key: 'price', label: '16.3 Price History', icon: TrendingUp },
          { key: 'outstanding', label: '16.4 Outstanding POs', icon: Clock },
          { key: 'analysis', label: '16.5 Category Analysis', icon: PieIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 pb-3 pt-1 text-sm font-medium transition border-b-2 ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-navy-400 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-navy-800 p-4 rounded-xl border border-slate-200 dark:border-navy-700 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600 dark:text-navy-300">From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2 py-1 text-xs border border-slate-200 dark:border-navy-600 rounded bg-white dark:bg-navy-900 text-slate-800 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-navy-300">To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2 py-1 text-xs border border-slate-200 dark:border-navy-600 rounded bg-white dark:bg-navy-900 text-slate-800 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-navy-300">Department:</span>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="px-2 py-1 text-xs border border-slate-200 dark:border-navy-600 rounded bg-white dark:bg-navy-900 text-slate-800 dark:text-white"
          >
            <option value="">All Departments</option>
            <option value="Security Operations">Security Operations</option>
            <option value="IT & Infrastructure">IT & Infrastructure</option>
            <option value="Logistics & Fleet">Logistics & Fleet</option>
            <option value="Administration">Administration</option>
          </select>
        </div>

        {activeTab === 'price' && (
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 dark:text-navy-300">Product:</span>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-200 dark:border-navy-600 rounded bg-white dark:bg-navy-900 text-slate-800 dark:text-white"
            >
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={fetchReportData}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium"
        >
          <Filter className="w-3.5 h-3.5" />
          Apply Filters
        </button>
      </div>

      {/* Report Data Views */}
      <div className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Generating report...</div>
        ) : (
          <>
            {/* 16.1 PO Summary Tab */}
            {activeTab === 'summary' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-navy-900/50 text-slate-500 uppercase text-xs border-b border-slate-200 dark:border-navy-700">
                    <tr>
                      <th className="px-6 py-3">PO Number</th>
                      <th className="px-6 py-3">Order Date</th>
                      <th className="px-6 py-3">Supplier</th>
                      <th className="px-6 py-3">Buyer</th>
                      <th className="px-6 py-3">Department</th>
                      <th className="px-6 py-3 text-right">Total Amount</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                    {poSummary.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-navy-800/50">
                        <td className="px-6 py-4 font-mono font-bold text-indigo-600">{r.poNumber}</td>
                        <td className="px-6 py-4 text-xs text-slate-500">{new Date(r.orderDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-medium text-slate-800 dark:text-navy-200">{r.supplier}</td>
                        <td className="px-6 py-4 text-xs text-slate-600 dark:text-navy-300">{r.buyer}</td>
                        <td className="px-6 py-4 text-xs text-slate-600 dark:text-navy-300">{r.department}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {r.totalAmount?.toLocaleString()} {r.currency}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold">{r.status}</td>
                      </tr>
                    ))}
                    {poSummary.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">No records found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 16.2 Supplier Spend Tab */}
            {activeTab === 'supplier' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-navy-900/50 text-slate-500 uppercase text-xs border-b border-slate-200 dark:border-navy-700">
                    <tr>
                      <th className="px-6 py-3">Supplier Name</th>
                      <th className="px-6 py-3">Category</th>
                      <th className="px-6 py-3 text-right">Completed POs</th>
                      <th className="px-6 py-3 text-right">Total Spend (ETB)</th>
                      <th className="px-6 py-3 text-right">Avg Order Value (ETB)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                    {supplierSpend.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-navy-800/50">
                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">{r.supplierName}</td>
                        <td className="px-6 py-4 text-xs text-slate-500">{r.category || 'General'}</td>
                        <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-navy-200">{r.totalOrders}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {r.totalSpend?.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-600 dark:text-navy-300">
                          {Math.round(r.averageOrderValue || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {supplierSpend.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">No spend records found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 16.3 Price History Tab */}
            {activeTab === 'price' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-navy-900/50 text-slate-500 uppercase text-xs border-b border-slate-200 dark:border-navy-700">
                    <tr>
                      <th className="px-6 py-3">Product Name</th>
                      <th className="px-6 py-3">Supplier</th>
                      <th className="px-6 py-3">PO Reference</th>
                      <th className="px-6 py-3">Order Date</th>
                      <th className="px-6 py-3 text-right">Quantity</th>
                      <th className="px-6 py-3 text-right">Historical Unit Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                    {priceHistory.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-navy-800/50">
                        <td className="px-6 py-4 font-semibold text-slate-800 dark:text-white">{r.productName}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-navy-300">{r.supplierName}</td>
                        <td className="px-6 py-4 font-mono text-xs text-indigo-600">{r.poNumber}</td>
                        <td className="px-6 py-4 text-xs text-slate-500">{new Date(r.orderDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-navy-200">{r.quantity}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {r.unitPrice?.toLocaleString()} {r.currency}
                        </td>
                      </tr>
                    ))}
                    {priceHistory.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          No price history entries found for the selected product.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 16.4 Outstanding POs Tab */}
            {activeTab === 'outstanding' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-navy-900/50 text-slate-500 uppercase text-xs border-b border-slate-200 dark:border-navy-700">
                    <tr>
                      <th className="px-6 py-3">PO Number</th>
                      <th className="px-6 py-3">Supplier</th>
                      <th className="px-6 py-3">Order Date</th>
                      <th className="px-6 py-3">Expected Date</th>
                      <th className="px-6 py-3 text-right">Ordered Qty</th>
                      <th className="px-6 py-3 text-right">Received Qty</th>
                      <th className="px-6 py-3 text-right">Pending Qty</th>
                      <th className="px-6 py-3 text-right">Pending Value (ETB)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                    {outstanding.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-navy-800/50">
                        <td className="px-6 py-4 font-mono font-bold text-indigo-600">{r.poNumber}</td>
                        <td className="px-6 py-4 font-medium text-slate-800 dark:text-navy-200">{r.supplier}</td>
                        <td className="px-6 py-4 text-xs text-slate-500">{new Date(r.orderDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {r.expectedDate ? new Date(r.expectedDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right font-medium">{r.orderedQuantity}</td>
                        <td className="px-6 py-4 text-right text-teal-600 font-semibold">{r.receivedQuantity}</td>
                        <td className="px-6 py-4 text-right font-bold text-amber-600">{r.remainingQuantity}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {r.remainingValue?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {outstanding.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">All purchase orders are fully received!</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 16.5 Category Spend Analysis Tab */}
            {activeTab === 'analysis' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-navy-900/50 text-slate-500 uppercase text-xs border-b border-slate-200 dark:border-navy-700">
                    <tr>
                      <th className="px-6 py-3">Category</th>
                      <th className="px-6 py-3 text-right">Orders Count</th>
                      <th className="px-6 py-3 text-right">Total Spend (ETB)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
                    {analysis.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-navy-800/50">
                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">{r.category}</td>
                        <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-navy-200">{r.orderCount}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {r.totalSpend?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {analysis.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-slate-400">No category breakdown data available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
