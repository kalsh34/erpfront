import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import {
  Scale,
  Star,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { PurchaseStatusBadge } from '../components/PurchaseStatusBadge';

export const QuotationComparePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rfqs, setRfqs] = useState<any[]>([]);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/v2/procurement/rfqs/compare');
      if (res.data.success) {
        setRfqs(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load quotation comparison:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-navy-700 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Scale className="text-purple-600" />
            Vendor Quotation Comparison Matrix
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Compare bids across suppliers on price, lead times, payment terms, and ratings to select the winning vendor.
          </p>
        </div>
        <button
          onClick={fetchQuotations}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-navy-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-700 shadow-xs"
        >
          <RefreshCw size={14} /> Refresh Quotes
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
          <span>Loading quotation bids...</span>
        </div>
      ) : rfqs.length === 0 ? (
        <div className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-12 text-center text-slate-400">
          <p className="text-sm">No quotations ready for comparison.</p>
          <p className="text-xs text-slate-500 mt-1">
            Create RFQs and record vendor quotes to compare supplier terms here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rfqs.map((rfq) => {
            const supplier = rfq.supplierId || {};
            const isApproved = rfq.status === 'APPROVED' || rfq.status === 'PO_CREATED';

            return (
              <div
                key={rfq._id}
                className={`bg-white dark:bg-navy-800 rounded-xl border transition-all shadow-xs flex flex-col justify-between overflow-hidden ${
                  isApproved
                    ? 'border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-500/10'
                    : 'border-slate-200 dark:border-navy-700 hover:border-blue-400'
                }`}
              >
                <div>
                  {/* Top Bar */}
                  <div className="p-5 border-b border-slate-100 dark:border-navy-700/60 bg-slate-50/50 dark:bg-navy-900/40 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                          {rfq.rfqNumber}
                        </span>
                        <PurchaseStatusBadge status={rfq.status} />
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-2">
                        {supplier.name || 'Vendor'}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono">Code: {supplier.code}</p>
                    </div>

                    <div className="flex items-center gap-1 text-amber-500 font-bold text-xs bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                      <Star size={13} fill="currentColor" />
                      <span>{supplier.supplierRating || 5}.0</span>
                    </div>
                  </div>

                  {/* Commercial Terms Strip */}
                  <div className="grid grid-cols-2 gap-3 p-4 bg-white dark:bg-navy-800 text-[11px] border-b border-slate-100 dark:border-navy-700/60">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Payment</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{rfq.paymentTerms || supplier.paymentTerms || 'NET 30'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Delivery</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{rfq.deliveryTerms || supplier.deliveryTerms || 'EXW'}</span>
                    </div>
                  </div>

                  {/* Quoted Items */}
                  <div className="p-4 space-y-2.5 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Quoted Items & Pricing
                    </span>
                    <div className="space-y-1.5">
                      {rfq.lines.map((l: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-navy-700/40 text-[11px]"
                        >
                          <span className="text-slate-700 dark:text-slate-300 truncate max-w-[170px]">
                            {l.productId?.name || l.description} ({l.quantity} {l.uom})
                          </span>
                          <span className="font-mono font-medium text-slate-900 dark:text-white">
                            {Number(l.vendorPrice || l.estimatedPrice).toLocaleString()} {rfq.currency}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer with Total and Action */}
                <div className="p-4 bg-slate-50 dark:bg-navy-900 border-t border-slate-200 dark:border-navy-700 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Bid</span>
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {Number(rfq.totalQuotedAmount || rfq.totalEstimatedAmount).toLocaleString()} {rfq.currency}
                    </span>
                  </div>

                  <button
                    onClick={() => navigate(`/purchase/rfqs/${rfq._id}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-500 shadow-xs"
                  >
                    <span>Inspect</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
