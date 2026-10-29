import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  Info,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import api from '../../lib/api';
import { useLang } from '../../i18n';

interface ParsedGuardRow {
  index: number;
  status: 'READY' | 'DUPLICATE' | 'INVALID';
  fullNameRaw: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: string;
  age?: number;
  dateOfBirth?: string;
  education?: string;
  address?: string;
  phone?: string;
  hireDate: string;
  siteName: string;
  siteExists: boolean;
  isLeader: boolean;
  position: string;
  salary: number;
  transportAllowance: number;
  guarantorName?: string;
  guarantorPhone?: string;
  notes?: string;
  warnings: string[];
}

interface ImportPreviewData {
  summary: {
    totalRows: number;
    readyCount: number;
    duplicateCount: number;
    invalidCount: number;
    newSitesCount: number;
  };
  newSites: string[];
  rows: ParsedGuardRow[];
}

interface GuardImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function GuardImportModal({ open, onClose, onSuccess }: GuardImportModalProps) {
  const lang = useLang();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'preview' | 'completed'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<'all' | 'ready' | 'duplicate'>('all');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showColumnsGuide, setShowColumnsGuide] = useState(false);

  if (!open) return null;

  const handleFileSelect = (selectedFile: File) => {
    setErrorMessage(null);
    if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      setErrorMessage(
        lang === 'am' ? 'እባክዎ ትክክለኛ የ Excel (.xlsx, .xls) ወይም CSV ፋይል ይምረጡ' : 'Please select a valid Excel (.xlsx, .xls) or CSV file'
      );
      return;
    }
    setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleParse = async () => {
    if (!file) return;
    setParsing(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/guards/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data: ImportPreviewData = res.data.data;
      setPreviewData(data);

      // Pre-select all ready rows
      const readySet = new Set<number>();
      data.rows.forEach((r) => {
        if (r.status === 'READY') readySet.add(r.index);
      });
      setSelectedIndices(readySet);
      setStep('preview');
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message ||
          (lang === 'am' ? 'ፋይሉን መክፈት አልተቻለም፤ እባክዎ ፋይሉን ያረጋግጡ' : 'Failed to parse spreadsheet. Please verify the file format.')
      );
    } finally {
      setParsing(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!previewData) return;
    const rowsToImport = previewData.rows.filter((r) => selectedIndices.has(r.index));
    if (rowsToImport.length === 0) {
      setErrorMessage(lang === 'am' ? 'እባክዎ ቢያንስ አንድ ሰራተኛ ይምረጡ' : 'Please select at least one guard row to import');
      return;
    }

    setImporting(true);
    setErrorMessage(null);
    try {
      const res = await api.post('/guards/import/execute', { rows: rowsToImport });
      setImportResult(res.data.data);
      setStep('completed');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message ||
          (lang === 'am' ? 'ሰራተኞችን ማስገባት አልተሳካም' : 'Failed to import guards. Please try again.')
      );
    } finally {
      setImporting(false);
    }
  };

  const toggleRow = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedIndices(next);
  };

  const toggleAll = () => {
    if (!previewData) return;
    const filterableRows = previewData.rows.filter((r) => {
      if (filter === 'ready') return r.status === 'READY';
      if (filter === 'duplicate') return r.status === 'DUPLICATE';
      return true;
    });

    const allSelected = filterableRows.every((r) => selectedIndices.has(r.index));
    const next = new Set(selectedIndices);

    if (allSelected) {
      filterableRows.forEach((r) => next.delete(r.index));
    } else {
      filterableRows.forEach((r) => {
        if (r.status !== 'INVALID') next.add(r.index);
      });
    }
    setSelectedIndices(next);
  };

  const resetAll = () => {
    setFile(null);
    setPreviewData(null);
    setSelectedIndices(new Set());
    setImportResult(null);
    setErrorMessage(null);
    setStep('upload');
  };

  const filteredRows = (previewData?.rows || []).filter((r) => {
    if (filter === 'ready') return r.status === 'READY';
    if (filter === 'duplicate') return r.status === 'DUPLICATE';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-overlayIn">
      <div
        className="bg-surface border border-line rounded-2xl shadow-overlay w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-modalIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-subtle/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-600 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">
                {lang === 'am' ? 'የጥበቃ አባላት መረጃ ከ Excel ማስገቢያ' : 'Import Guard Roster from Excel'}
              </h2>
              <p className="text-xs text-muted">
                {lang === 'am'
                  ? 'የተሟላ የሰራተኞች፣ የሳይት ምደባ፣ የደመወዝ እና የዋስትና ሰነድ መረጃን በአንድ ጊዜ ያስገቡ'
                  : 'Automated import for guard profiles, deployments, contracts, wages & guarantors'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-subtle transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-danger-subtle border border-danger-line flex items-center gap-2 text-xs text-danger-text">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-primary-500 bg-primary-500/5'
                    : file
                    ? 'border-primary-400 bg-surface'
                    : 'border-line hover:border-primary-400 bg-subtle/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />

                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-500/10 text-primary-600 flex items-center justify-center">
                  <UploadCloud className="w-8 h-8" />
                </div>

                {file ? (
                  <div>
                    <p className="text-sm font-semibold text-ink">{file.name}</p>
                    <p className="text-xs text-muted mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                    <span className="inline-block mt-3 px-3 py-1 rounded-full text-xs font-medium bg-primary-500/10 text-primary-700">
                      {lang === 'am' ? 'ፋይሉ ተመርጧል — ቅድመ ዕይታን ይጫኑ' : 'File selected — Click Preview to continue'}
                    </span>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {lang === 'am' ? 'የ Excel ፋይል እዚህ ይጎትቱ ወይም ፋይል ለመምረጥ ይጫኑ' : 'Drop your Excel spreadsheet here, or browse'}
                    </p>
                    <p className="text-xs text-muted mt-1">Supports .xlsx, .xls, .csv up to 15MB</p>
                  </div>
                )}
              </div>

              {/* Supported Columns Guide */}
              <div className="border border-line rounded-xl overflow-hidden bg-subtle/20">
                <button
                  type="button"
                  onClick={() => setShowColumnsGuide(!showColumnsGuide)}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-ink hover:bg-subtle/50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary-600" />
                    {lang === 'am' ? 'የሚደገፉ የአምድ ርዕሶች (Amharic & English Column Guide)' : 'Recognized Column Headers (Amharic & English)'}
                  </span>
                  {showColumnsGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showColumnsGuide && (
                  <div className="p-4 border-t border-line text-xs space-y-2 bg-surface">
                    <p className="text-muted">
                      {lang === 'am'
                        ? 'የስርዓቱ ፈላጊ የሚከተሉትን የአማርኛና የእንግሊዝኛ ርዕሶች በራሱ ለይቶ ያዛምዳል፡'
                        : 'The parser auto-recognizes and normalizes the following headers from your sheet:'}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 text-[11px]">
                      <div className="p-2 rounded-lg bg-subtle">
                        <strong>ሙሉ ስም (Full Name):</strong> አቶ ሌሊሳ ኢቲታ / First, Middle, Last
                      </div>
                      <div className="p-2 rounded-lg bg-subtle">
                        <strong>የተመደበበት ሳይት (Site):</strong> ቦሌ ቻይና ስ/ላ, ሲሲኢሲሲ (Auto-creates)
                      </div>
                      <div className="p-2 rounded-lg bg-subtle">
                        <strong>የደመወዝ መጠን ብር (Salary):</strong> Base wage amount (e.g. 2,692.32)
                      </div>
                      <div className="p-2 rounded-lg bg-subtle">
                        <strong>ትራንስፖርት አበል (Transport):</strong> Allowance amount in ETB
                      </div>
                      <div className="p-2 rounded-lg bg-subtle">
                        <strong>ስ. ቁጥር (Phone):</strong> 0905552332 (Auto-prefixes 0)
                      </div>
                      <div className="p-2 rounded-lg bg-subtle">
                        <strong>የዋስ ስም & ስልክ (Guarantor):</strong> Name and phone number
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW */}
          {step === 'preview' && previewData && (
            <div className="space-y-4">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-line bg-surface">
                  <p className="text-[11px] text-muted font-medium">{lang === 'am' ? 'ጠቅላላ የተገኙ' : 'Total Rows'}</p>
                  <p className="text-xl font-bold text-ink mt-0.5">{previewData.summary.totalRows}</p>
                </div>
                <div className="p-3.5 rounded-xl border border-success-line bg-success-subtle/30">
                  <p className="text-[11px] text-success-text font-medium">{lang === 'am' ? 'ለመግባት ዝግጁ' : 'Ready to Import'}</p>
                  <p className="text-xl font-bold text-success-text mt-0.5">{previewData.summary.readyCount}</p>
                </div>
                <div className="p-3.5 rounded-xl border border-warning-line bg-warning-subtle/30">
                  <p className="text-[11px] text-warning-text font-medium">{lang === 'am' ? 'ቀደም ሲል ያሉ' : 'Duplicates'}</p>
                  <p className="text-xl font-bold text-warning-text mt-0.5">{previewData.summary.duplicateCount}</p>
                </div>
                <div className="p-3.5 rounded-xl border border-info-line bg-info-subtle/30">
                  <p className="text-[11px] text-info-text font-medium">{lang === 'am' ? 'አዲስ የሚከፈቱ ሳይቶች' : 'New Sites'}</p>
                  <p className="text-xl font-bold text-info-text mt-0.5">{previewData.summary.newSitesCount}</p>
                </div>
              </div>

              {/* New Sites Notification */}
              {previewData.newSites.length > 0 && (
                <div className="p-3 rounded-xl bg-info-subtle/40 border border-info-line text-xs text-info-text flex items-start gap-2">
                  <Building2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">
                      {lang === 'am' ? 'በሲስተሙ ያልነበሩ አዳዲስ ሳይቶች በራስ-ሰር ይከፈታሉ፡ ' : 'The following new sites will be created: '}
                    </span>
                    <span className="opacity-90">{previewData.newSites.join(', ')}</span>
                  </div>
                </div>
              )}

              {/* Filter Tabs & Selection Info */}
              <div className="flex items-center justify-between gap-2 pt-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      filter === 'all' ? 'bg-primary-600 text-white' : 'bg-subtle text-muted hover:text-ink'
                    }`}
                  >
                    {lang === 'am' ? 'ሁሉንም' : 'All'} ({previewData.summary.totalRows})
                  </button>
                  <button
                    onClick={() => setFilter('ready')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      filter === 'ready' ? 'bg-success-text text-white' : 'bg-subtle text-muted hover:text-ink'
                    }`}
                  >
                    {lang === 'am' ? 'ዝግጁ የሆኑ' : 'Ready'} ({previewData.summary.readyCount})
                  </button>
                  {previewData.summary.duplicateCount > 0 && (
                    <button
                      onClick={() => setFilter('duplicate')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        filter === 'duplicate' ? 'bg-warning-text text-white' : 'bg-subtle text-muted hover:text-ink'
                      }`}
                    >
                      {lang === 'am' ? 'ቀደም ሲል ያሉ' : 'Duplicates'} ({previewData.summary.duplicateCount})
                    </button>
                  )}
                </div>

                <div className="text-xs text-muted">
                  {lang === 'am'
                    ? `${selectedIndices.size} ከ ${previewData.summary.totalRows} ተመርጠዋል`
                    : `${selectedIndices.size} of ${previewData.summary.totalRows} selected`}
                </div>
              </div>

              {/* Data Table Preview */}
              <div className="border border-line rounded-xl overflow-hidden overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-subtle/80 text-muted sticky top-0 border-b border-line">
                    <tr>
                      <th className="py-2.5 px-3 w-8">
                        <input
                          type="checkbox"
                          checked={filteredRows.length > 0 && filteredRows.every((r) => selectedIndices.has(r.index))}
                          onChange={toggleAll}
                          className="rounded border-line text-primary-600 focus:ring-primary-500"
                        />
                      </th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">{lang === 'am' ? 'ሙሉ ስም' : 'Guard Name'}</th>
                      <th className="py-2.5 px-3">{lang === 'am' ? 'ስልክ' : 'Phone'}</th>
                      <th className="py-2.5 px-3">{lang === 'am' ? 'የተመደበበት ሳይት' : 'Site'}</th>
                      <th className="py-2.5 px-3">{lang === 'am' ? 'የስራ ድርሻ' : 'Position'}</th>
                      <th className="py-2.5 px-3">{lang === 'am' ? 'መሰረታዊ ደመወዝ' : 'Salary (ETB)'}</th>
                      <th className="py-2.5 px-3">{lang === 'am' ? 'ትራንስፖርት' : 'Transport'}</th>
                      <th className="py-2.5 px-3">{lang === 'am' ? 'የዋስ ስም' : 'Guarantor'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-surface">
                    {filteredRows.map((row) => {
                      const isSelected = selectedIndices.has(row.index);
                      return (
                        <tr
                          key={row.index}
                          onClick={() => toggleRow(row.index)}
                          className={`hover:bg-subtle/40 cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary-500/5' : ''
                          }`}
                        >
                          <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRow(row.index)}
                              className="rounded border-line text-primary-600 focus:ring-primary-500"
                            />
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {row.status === 'READY' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-success-subtle text-success-text border border-success-line">
                                <CheckCircle2 className="w-3 h-3" /> Ready
                              </span>
                            )}
                            {row.status === 'DUPLICATE' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-warning-subtle text-warning-text border border-warning-line">
                                <AlertTriangle className="w-3 h-3" /> Duplicate
                              </span>
                            )}
                            {row.status === 'INVALID' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-danger-subtle text-danger-text border border-danger-line">
                                <XCircle className="w-3 h-3" /> Invalid
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-medium text-ink whitespace-nowrap">
                            {row.fullNameRaw}
                          </td>
                          <td className="py-2 px-3 text-muted whitespace-nowrap">{row.phone || '—'}</td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className="text-ink">{row.siteName}</span>
                            {!row.siteExists && (
                              <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-info-subtle text-info-text border border-info-line">
                                New
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {row.isLeader ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary-500/10 text-primary-700">
                                Site Leader
                              </span>
                            ) : (
                              <span className="text-muted">Guard</span>
                            )}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap font-medium text-ink">
                            {row.salary > 0 ? row.salary.toLocaleString() : '—'}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap text-muted">
                            {row.transportAllowance > 0 ? row.transportAllowance.toLocaleString() : '—'}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap text-muted">
                            {row.guarantorName ? (
                              <span>
                                {row.guarantorName}{' '}
                                {row.guarantorPhone && (
                                  <span className="text-[10px] text-subtext">({row.guarantorPhone})</span>
                                )}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: COMPLETED */}
          {step === 'completed' && importResult && (
            <div className="text-center py-8 space-y-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-success-subtle text-success-text flex items-center justify-center border-2 border-success-line">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-ink">
                  {lang === 'am' ? 'ሰራተኞቹ በተሳካ ሁኔታ ገብተዋል!' : 'Guard Roster Successfully Imported!'}
                </h3>
                <p className="text-xs text-muted mt-1">
                  {lang === 'am'
                    ? `${importResult.importedCount} ሰራተኞች እና ተጓዳኝ ሳይቶች፣ ውሎችና ዋሶች ተፈጥረዋል።`
                    : `${importResult.importedCount} guards imported with profiles, contracts, sites & guarantors.`}
                </p>
              </div>

              {/* List of created guards */}
              {importResult.createdEmployees?.length > 0 && (
                <div className="max-w-xl mx-auto border border-line rounded-xl overflow-hidden text-left max-h-48 overflow-y-auto">
                  <div className="bg-subtle px-4 py-2 border-b border-line text-xs font-semibold text-ink">
                    {lang === 'am' ? 'የተፈጠሩ ሰራተኞች ዝርዝር' : 'Created Guards List'}
                  </div>
                  <div className="divide-y divide-line text-xs">
                    {importResult.createdEmployees.map((g: any, i: number) => (
                      <div key={i} className="px-4 py-2 flex items-center justify-between">
                        <span className="font-semibold text-primary-600">{g.employeeCode}</span>
                        <span className="text-ink">{g.name}</span>
                        <span className="text-muted">{g.site}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-line bg-subtle/30">
          {step === 'upload' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 rounded-xl border border-line text-xs font-medium text-ink hover:bg-subtle transition-colors"
              >
                {lang === 'am' ? 'ይቅር' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={!file || parsing}
                onClick={handleParse}
                className="h-9 px-5 rounded-xl bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
              >
                {parsing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {lang === 'am' ? 'ፋይሉን ፈትሽና አሳይ' : 'Parse & Preview Roster'}
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="h-9 px-4 rounded-xl border border-line text-xs font-medium text-ink hover:bg-subtle transition-colors"
              >
                {lang === 'am' ? 'ተመለስ' : 'Back to Upload'}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetAll}
                  className="h-9 px-3 rounded-xl border border-line text-xs font-medium text-muted hover:text-ink transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={selectedIndices.size === 0 || importing}
                  onClick={handleExecuteImport}
                  className="h-9 px-5 rounded-xl bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
                >
                  {importing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <ShieldCheck className="w-4 h-4" />
                  {lang === 'am'
                    ? `${selectedIndices.size} ሰራተኞችን ወደ Vital ERP አስገባ`
                    : `Import ${selectedIndices.size} Guards into Vital ERP`}
                </button>
              </div>
            </>
          )}

          {step === 'completed' && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-6 rounded-xl bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 transition-colors"
              >
                {lang === 'am' ? 'ጨርስ' : 'Done & View Guards'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
