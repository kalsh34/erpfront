import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import {
  FileSignature,
  ShoppingCart,
  Clock,
  Truck,
  TrendingUp,
  Plus,
  Users,
  Package,
  ArrowRight,
  BarChart3,
  Star,
  RefreshCw,
} from 'lucide-react';
import { PurchaseStatusBadge } from '../components/PurchaseStatusBadge';

export const PurchaseDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/v2/procurement/reports/dashboard');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load purchase dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-2 text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading purchase dashboard...</span>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {
    openRFQs: 0,
    openPOs: 0,
    pendingApprovals: 0,
    outstandingDeliveries: 0,
    monthlyPurchases: 0,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-navy-700 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Procurement & Purchasing Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            End-to-end purchase workflow from quotation and order approval to goods receipt and billing.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDashboard}
            className="p-2 border border-slate-200 dark:border-navy-700 hover:bg-slate-100 dark:hover:bg-navy-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => navigate('/purchase/rfqs?new=true')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm"
          >
            <Plus size={16} />
            New RFQ
          </button>
          <button
            onClick={() => navigate('/purchase/orders?new=true')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors shadow-sm"
          >
            <Plus size={16} />
            New Order
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Open RFQs */}
        <div
          onClick={() => navigate('/purchase/rfqs')}
          className="bg-white dark:bg-navy-800 p-5 rounded-xl border border-slate-200 dark:border-navy-700 shadow-xs hover:border-blue-400 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Open RFQs
            </span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 group-hover:bg-amber-100 transition-colors">
              <FileSignature size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-3">{kpis.openRFQs}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 group-hover:text-blue-600">
            <span>View requests</span>
            <ArrowRight size={12} />
          </p>
        </div>

        {/* Open POs */}
        <div
          onClick={() => navigate('/purchase/orders')}
          className="bg-white dark:bg-navy-800 p-5 rounded-xl border border-slate-200 dark:border-navy-700 shadow-xs hover:border-blue-400 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active POs
            </span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 group-hover:bg-blue-100 transition-colors">
              <ShoppingCart size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-3">{kpis.openPOs}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 group-hover:text-blue-600">
            <span>In progress</span>
            <ArrowRight size={12} />
          </p>
        </div>

        {/* Pending Approval */}
        <div
          onClick={() => navigate('/purchase/orders?status=SUBMITTED')}
          className="bg-white dark:bg-navy-800 p-5 rounded-xl border border-slate-200 dark:border-navy-700 shadow-xs hover:border-amber-400 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pending Approval
            </span>
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 group-hover:bg-rose-100 transition-colors">
              <Clock size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-3">{kpis.pendingApprovals}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 group-hover:text-rose-600">
            <span>Awaiting signoff</span>
            <ArrowRight size={12} />
          </p>
        </div>

        {/* Outstanding Deliveries */}
        <div
          onClick={() => navigate('/purchase/receipts')}
          className="bg-white dark:bg-navy-800 p-5 rounded-xl border border-slate-200 dark:border-navy-700 shadow-xs hover:border-cyan-400 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Deliveries Due
            </span>
            <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-100 transition-colors">
              <Truck size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-3">{kpis.outstandingDeliveries}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 group-hover:text-cyan-600">
            <span>Track shipments</span>
            <ArrowRight size={12} />
          </p>
        </div>

        {/* Monthly Purchases */}
        <div
          onClick={() => navigate('/purchase/reports')}
          className="bg-white dark:bg-navy-800 p-5 rounded-xl border border-slate-200 dark:border-navy-700 shadow-xs hover:border-emerald-400 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Month Spend
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100 transition-colors">
              <TrendingUp size={18} />
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-3 truncate">
            {Number(kpis.monthlyPurchases).toLocaleString('en-US', { maximumFractionDigits: 0 })} <span className="text-xs font-normal text-slate-400">ETB</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 group-hover:text-emerald-600">
            <span>Spend reports</span>
            <ArrowRight size={12} />
          </p>
        </div>
      </div>

      {/* Quick Launchpad Buttons */}
      <div className="bg-slate-50 dark:bg-navy-900/60 p-4 rounded-xl border border-slate-200 dark:border-navy-700">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-3">
          Quick Workflows & Master Data
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <button
            onClick={() => navigate('/purchase/rfqs')}
            className="flex items-center gap-2.5 p-3 rounded-lg bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-blue-500 transition-colors shadow-xs"
          >
            <FileSignature size={16} className="text-amber-500" />
            <span>RFQs</span>
          </button>
          <button
            onClick={() => navigate('/purchase/compare')}
            className="flex items-center gap-2.5 p-3 rounded-lg bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-blue-500 transition-colors shadow-xs"
          >
            <BarChart3 size={16} className="text-purple-500" />
            <span>Quotation Matrix</span>
          </button>
          <button
            onClick={() => navigate('/purchase/orders')}
            className="flex items-center gap-2.5 p-3 rounded-lg bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-blue-500 transition-colors shadow-xs"
          >
            <ShoppingCart size={16} className="text-blue-500" />
            <span>Purchase Orders</span>
          </button>
          <button
            onClick={() => navigate('/purchase/receipts')}
            className="flex items-center gap-2.5 p-3 rounded-lg bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-blue-500 transition-colors shadow-xs"
          >
            <Truck size={16} className="text-cyan-500" />
            <span>Goods Receipts</span>
          </button>
          <button
            onClick={() => navigate('/purchase/suppliers')}
            className="flex items-center gap-2.5 p-3 rounded-lg bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-blue-500 transition-colors shadow-xs"
          >
            <Users size={16} className="text-emerald-500" />
            <span>Suppliers</span>
          </button>
          <button
            onClick={() => navigate('/purchase/products')}
            className="flex items-center gap-2.5 p-3 rounded-lg bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-blue-500 transition-colors shadow-xs"
          >
            <Package size={16} className="text-indigo-500" />
            <span>Products</span>
          </button>
        </div>
      </div>

      {/* Tables Row: Recent POs and RFQs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Purchase Orders */}
        <div className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 overflow-hidden shadow-xs">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-navy-700">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Recent Purchase Orders
            </h2>
            <button
              onClick={() => navigate('/purchase/orders')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-navy-700/50 text-xs">
            {data?.recentPOs?.length > 0 ? (
              data.recentPOs.map((po: any) => (
                <div
                  key={po._id}
                  onClick={() => navigate(`/purchase/orders/${po._id}`)}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-navy-750 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{po.poNumber}</span>
                      <PurchaseStatusBadge status={po.status} />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                      {po.supplierId?.name || 'Direct Order'} &bull; {new Date(po.poDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-slate-900 dark:text-white">
                      {Number(po.grandTotal).toLocaleString()} {po.currency}
                    </p>
                    <p className="text-slate-400 text-[11px] mt-0.5">{po.approvalStage || 'Active'}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400">No purchase orders created yet.</div>
            )}
          </div>
        </div>

        {/* Recent Requests for Quotation */}
        <div className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 overflow-hidden shadow-xs">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-navy-700">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Recent RFQs
            </h2>
            <button
              onClick={() => navigate('/purchase/rfqs')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-navy-700/50 text-xs">
            {data?.recentRFQs?.length > 0 ? (
              data.recentRFQs.map((rfq: any) => (
                <div
                  key={rfq._id}
                  onClick={() => navigate(`/purchase/rfqs/${rfq._id}`)}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-navy-750 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{rfq.rfqNumber}</span>
                      <PurchaseStatusBadge status={rfq.status} />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                      {rfq.supplierId?.name || 'Vendor Quotation'} &bull; {new Date(rfq.rfqDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-slate-900 dark:text-white">
                      {Number(rfq.totalQuotedAmount || rfq.totalEstimatedAmount).toLocaleString()} {rfq.currency}
                    </p>
                    <p className="text-slate-400 text-[11px] mt-0.5">{rfq.requestingDepartment}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400">No quotation requests found.</div>
            )}
          </div>
        </div>
      </div>

      {/* Top Suppliers Strip */}
      {data?.topSuppliers?.length > 0 && (
        <div className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Key Strategic Suppliers & Spend
            </h2>
            <button
              onClick={() => navigate('/purchase/suppliers')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              All suppliers <ArrowRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {data.topSuppliers.map((s: any) => (
              <div
                key={s._id}
                onClick={() => navigate('/purchase/suppliers')}
                className="p-3.5 rounded-lg border border-slate-100 dark:border-navy-700 bg-slate-50/50 dark:bg-navy-900/40 hover:border-blue-400 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-slate-400">{s.code}</span>
                  <div className="flex items-center text-amber-500">
                    <Star size={12} fill="currentColor" />
                    <span className="text-[11px] font-bold ml-0.5">{s.supplierRating || 5}</span>
                  </div>
                </div>
                <p className="font-semibold text-xs text-slate-900 dark:text-white truncate mt-1">{s.name}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-mono">
                  {Number(s.totalPurchaseSpend).toLocaleString()} ETB
                </p>
                <p className="text-[10px] text-slate-400">{s.totalOrdersCount || 0} orders fulfilled</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
