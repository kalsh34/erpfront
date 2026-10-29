import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import {
  Settings,
  Save,
  Plus,
  Trash2,
  Building,
  Shield,
  Layers,
  FileCheck,
  CheckCircle,
} from 'lucide-react';

export const PurchaseSettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [settings, setSettings] = useState({
    defaultCurrency: 'ETB',
    defaultPaymentTerms: 'NET_30',
    defaultDeliveryTerms: 'EXW',
    approvalThresholds: [
      { minAmount: 0, maxAmount: 50000, requiredRoles: ['DEPARTMENT_MANAGER'] },
      { minAmount: 50000, maxAmount: 500000, requiredRoles: ['DEPARTMENT_MANAGER', 'FINANCE_MANAGER'] },
      { minAmount: 500000, maxAmount: 999999999, requiredRoles: ['DEPARTMENT_MANAGER', 'FINANCE_MANAGER', 'MANAGING_DIRECTOR'] },
    ],
    numberingSequences: {
      rfqPrefix: 'RFQ',
      poPrefix: 'PO',
      grnPrefix: 'GRN',
      billPrefix: 'BILL',
    },
    companyBranding: {
      companyName: 'Vital-ERP Security & Trading S.C.',
      address: 'Bole Subcity, Woreda 03, Addis Ababa, Ethiopia',
      phone: '+251 11 661 2345 / +251 91 123 4567',
      email: 'procurement@vital-erp.com',
      tinNumber: '0098765432',
      logoUrl: '',
    },
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/v2/procurement/settings');
      if (res.data.success && res.data.data) {
        setSettings({
          ...settings,
          ...res.data.data,
          numberingSequences: {
            ...settings.numberingSequences,
            ...(res.data.data.numberingSequences || {}),
          },
          companyBranding: {
            ...settings.companyBranding,
            ...(res.data.data.companyBranding || {}),
          },
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      const res = await api.put('/v2/procurement/settings', settings);
      if (res.data.success) {
        setSuccessMsg('Purchasing settings updated successfully!');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTier = () => {
    setSettings({
      ...settings,
      approvalThresholds: [
        ...settings.approvalThresholds,
        { minAmount: 100000, maxAmount: 250000, requiredRoles: ['FINANCE_MANAGER'] },
      ],
    });
  };

  const handleRemoveTier = (idx: number) => {
    const updated = settings.approvalThresholds.filter((_, i) => i !== idx);
    setSettings({ ...settings, approvalThresholds: updated });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-7 h-7 text-indigo-600" />
            Purchasing Configuration & Approval Rules
          </h1>
          <p className="text-sm text-slate-500 dark:text-navy-400 mt-1">
            Configure approval tiers (FRD section 11), document sequence prefixes, and company PO print branding
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition shadow-sm disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 flex items-center gap-2 text-sm font-medium">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 11: Multi-Tier Approval Rules */}
        <div className="bg-white dark:bg-navy-800 p-6 rounded-xl border border-slate-200 dark:border-navy-700 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Multi-Tier PO Approval Thresholds (FRD Section 11)
              </h2>
            </div>
            <button
              type="button"
              onClick={handleAddTier}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-indigo-200 text-indigo-600 dark:border-indigo-800 dark:text-indigo-400 hover:bg-indigo-50 rounded-lg text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Threshold Tier
            </button>
          </div>

          <p className="text-xs text-slate-500 dark:text-navy-400">
            Define mandatory sign-off escalation policies based on purchase value in {settings.defaultCurrency}. Orders within tier ranges require the listed roles before release.
          </p>

          <div className="space-y-3">
            {settings.approvalThresholds.map((tier, idx) => (
              <div
                key={idx}
                className="p-4 border border-slate-200 dark:border-navy-700 rounded-xl grid grid-cols-12 gap-3 items-center bg-slate-50/50 dark:bg-navy-900/40"
              >
                <div className="col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Min Amount (ETB)</label>
                  <input
                    type="number"
                    value={tier.minAmount}
                    onChange={(e) => {
                      const updated = [...settings.approvalThresholds];
                      updated[idx].minAmount = Number(e.target.value);
                      setSettings({ ...settings, approvalThresholds: updated });
                    }}
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 dark:border-navy-600 rounded bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Max Amount (ETB)</label>
                  <input
                    type="number"
                    value={tier.maxAmount}
                    onChange={(e) => {
                      const updated = [...settings.approvalThresholds];
                      updated[idx].maxAmount = Number(e.target.value);
                      setSettings({ ...settings, approvalThresholds: updated });
                    }}
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 dark:border-navy-600 rounded bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="col-span-5">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Required Approver Roles (Comma-separated)</label>
                  <input
                    type="text"
                    value={tier.requiredRoles.join(', ')}
                    onChange={(e) => {
                      const updated = [...settings.approvalThresholds];
                      updated[idx].requiredRoles = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                      setSettings({ ...settings, approvalThresholds: updated });
                    }}
                    placeholder="e.g. DEPARTMENT_MANAGER, FINANCE_MANAGER"
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 dark:border-navy-600 rounded bg-white dark:bg-navy-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="col-span-1 text-right pt-4">
                  {settings.approvalThresholds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTier(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Company PO Printout Branding & Info */}
        <div className="bg-white dark:bg-navy-800 p-6 rounded-xl border border-slate-200 dark:border-navy-700 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Company Branding & PO Header Information (FRD Section 12)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-navy-300 mb-1">
                Company Legal Name
              </label>
              <input
                type="text"
                value={settings.companyBranding.companyName}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    companyBranding: { ...settings.companyBranding, companyName: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-navy-300 mb-1">
                Tax Identification Number (TIN)
              </label>
              <input
                type="text"
                value={settings.companyBranding.tinNumber}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    companyBranding: { ...settings.companyBranding, tinNumber: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-navy-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={settings.companyBranding.email}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    companyBranding: { ...settings.companyBranding, email: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-navy-300 mb-1">
                Telephone Numbers
              </label>
              <input
                type="text"
                value={settings.companyBranding.phone}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    companyBranding: { ...settings.companyBranding, phone: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-navy-300 mb-1">
                Physical Office Address
              </label>
              <input
                type="text"
                value={settings.companyBranding.address}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    companyBranding: { ...settings.companyBranding, address: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Default Commercial Terms & Prefix Sequences */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Defaults */}
          <div className="bg-white dark:bg-navy-800 p-6 rounded-xl border border-slate-200 dark:border-navy-700 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Default Procurement Terms
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-navy-300 mb-1">
                  Default Currency
                </label>
                <select
                  value={settings.defaultCurrency}
                  onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                >
                  <option value="ETB">ETB (Ethiopian Birr)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-navy-300 mb-1">
                  Default Payment Terms
                </label>
                <select
                  value={settings.defaultPaymentTerms}
                  onChange={(e) => setSettings({ ...settings, defaultPaymentTerms: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                >
                  <option value="IMMEDIATE">Immediate / Cash on Delivery</option>
                  <option value="NET_15">Net 15 Days</option>
                  <option value="NET_30">Net 30 Days</option>
                  <option value="NET_60">Net 60 Days</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-navy-300 mb-1">
                  Default Incoterms / Delivery Terms
                </label>
                <select
                  value={settings.defaultDeliveryTerms}
                  onChange={(e) => setSettings({ ...settings, defaultDeliveryTerms: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                >
                  <option value="EXW">EXW (Ex Works)</option>
                  <option value="FOB">FOB (Free On Board)</option>
                  <option value="CIF">CIF (Cost, Insurance & Freight)</option>
                  <option value="DDP">DDP (Delivered Duty Paid)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Numbering Sequencer */}
          <div className="bg-white dark:bg-navy-800 p-6 rounded-xl border border-slate-200 dark:border-navy-700 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-indigo-600" />
              Document Numbering Prefixes
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-navy-300 mb-1">
                  RFQ Prefix
                </label>
                <input
                  type="text"
                  value={settings.numberingSequences.rfqPrefix}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      numberingSequences: { ...settings.numberingSequences, rfqPrefix: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-navy-300 mb-1">
                  Purchase Order Prefix
                </label>
                <input
                  type="text"
                  value={settings.numberingSequences.poPrefix}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      numberingSequences: { ...settings.numberingSequences, poPrefix: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-navy-300 mb-1">
                  Goods Receipt (GRN) Prefix
                </label>
                <input
                  type="text"
                  value={settings.numberingSequences.grnPrefix}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      numberingSequences: { ...settings.numberingSequences, grnPrefix: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-navy-300 mb-1">
                  Supplier Bill (AP) Prefix
                </label>
                <input
                  type="text"
                  value={settings.numberingSequences.billPrefix}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      numberingSequences: { ...settings.numberingSequences, billPrefix: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 dark:border-navy-600 rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
