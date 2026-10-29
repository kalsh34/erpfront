import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, Camera, Keyboard, Play, Square, CheckCircle2, RefreshCw, ArrowLeft, Route } from 'lucide-react';
import GuardLayout from './GuardLayout';
import { fetchMyShifts, fetchScanSite, patrolScan, clockIn, clockOut, errorMessage, fmtTime, GuardShiftRow } from './guardApi';
import { parseSiteQrPayload } from '../../lib/siteQr';
import { useT } from '../../i18n';

interface SiteInfo {
  _id: string;
  siteName: string;
  siteCode: string;
  location?: string;
  status: string;
}

type ScanState = 'idle' | 'scanning' | 'starting' | 'ready' | 'error';

export default function GuardScanPage() {
  const t = useT();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [scanError, setScanError] = useState('');
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [siteError, setSiteError] = useState('');
  const [openShift, setOpenShift] = useState<GuardShiftRow | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ kind: 'in' | 'out' | 'patrol'; message: string } | null>(null);
  // Bumped to (re)start the camera once the viewfinder is mounted.
  const [scanAttempt, setScanAttempt] = useState(0);

  // Camera start/stop calls run one at a time. StrictMode mounts effects twice in dev,
  // and two Html5Qrcode instances on the same element fail to start.
  const scannerQueueRef = useRef<Promise<void>>(Promise.resolve());
  const queueScanner = useCallback((task: () => Promise<void>) => {
    const run = scannerQueueRef.current.then(task);
    scannerQueueRef.current = run.catch(() => {});
    return run;
  }, []);

  const stopScanner = useCallback(() => queueScanner(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try { await scanner.stop(); } catch { /* already stopped */ }
      try { scanner.clear(); } catch { /* noop */ }
    }
  }), [queueScanner]);

  const resolveSite = useCallback(async (siteId: string) => {
    setSiteError('');
    try {
      const [siteData, shiftsRes] = await Promise.all([
        fetchScanSite(siteId),
        fetchMyShifts(),
      ]);
      setSite(siteData);
      setOpenShift(shiftsRes.openShift);
      setScanState('ready');
    } catch (err: any) {
      setSiteError(errorMessage(err, 'Could not resolve this site'));
      setScanState('error');
    }
  }, []);

  const onDecoded = useCallback(
    (raw: string) => {
      if (handledRef.current) return;
      const siteId = parseSiteQrPayload(raw);
      if (!siteId) return; // not one of ours — keep scanning
      handledRef.current = true;
      stopScanner().finally(() => resolveSite(siteId));
    },
    [resolveSite, stopScanner]
  );

  const startScanner = useCallback(() => queueScanner(async () => {
    setScanError('');
    setScanState('starting');
    handledRef.current = false;
    // Browsers only expose the camera on HTTPS or localhost. A phone opening the
    // dev server over plain http (or an untrusted https cert) gets no camera.
    if (!window.isSecureContext) {
      setScanError('The camera needs a secure connection (HTTPS with a trusted certificate). Enter the site code below instead.');
      setScanState('error');
      return;
    }
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => onDecoded(decoded),
        () => { /* per-frame decode miss — ignore */ }
      );
      setScanState('scanning');
    } catch (err: any) {
      scannerRef.current = null;
      setScanError(err?.message ? `${err.message}${err?.name ? ` (${err.name})` : ''}` : t('cameraError'));
      setScanState('error');
    }
  }), [onDecoded, t, queueScanner]);

  // Start the camera after the viewfinder is in the DOM. Runs on mount and on every retry.
  useEffect(() => {
    startScanner();
    return () => { stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanAttempt]);

  const onManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const siteId = parseSiteQrPayload(manualCode);
    if (!siteId) {
      setScanError(t('invalidCode'));
      return;
    }
    stopScanner();
    setScanError('');
    resolveSite(siteId);
  };

  const doClockIn = async () => {
    if (!site) return;
    setBusy(true);
    setSiteError('');
    try {
      await clockIn(site._id);
      setResult({ kind: 'in', message: `${t('shiftStarted')} — ${site.siteName}` });
    } catch (err) {
      setSiteError(errorMessage(err, 'Clock in failed'));
    } finally {
      setBusy(false);
    }
  };

  const doPatrol = async () => {
    if (!site) return;
    setBusy(true);
    setSiteError('');
    try {
      await patrolScan(site._id);
      setResult({ kind: 'patrol', message: `${t('patrolRecorded')} — ${site.siteName}` });
    } catch (err) {
      setSiteError(errorMessage(err, 'Patrol scan failed'));
    } finally {
      setBusy(false);
    }
  };

  const doClockOut = async () => {
    setBusy(true);
    setSiteError('');
    try {
      const res = await clockOut();
      setResult({ kind: 'out', message: `${t('shiftEnded')} — ${res.hours.toFixed(2)}h` });
    } catch (err) {
      setSiteError(errorMessage(err, 'Clock out failed'));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setSite(null);
    setOpenShift(null);
    setResult(null);
    setScanError('');
    setSiteError('');
    setManualCode('');
    setScanState('starting');
    setScanAttempt((n) => n + 1);
  };

  return (
    <GuardLayout>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center gap-3">
          <Link to="/guard" className="p-2 rounded-lg text-muted hover:text-ink hover:bg-subtle transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-ink">{t('scanQr')}</h1>
            <p className="text-xs text-muted">{t('scanQrSub')}</p>
          </div>
        </div>

        {/* Result card */}
        {result && (
          <div className="v-card p-6 text-center border-l-4 border-green-500">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <h2 className="text-lg font-bold text-ink mt-3">{result.message}</h2>
            <p className="text-sm text-muted mt-1">{fmtTime(new Date().toISOString())}</p>
            <div className="mt-5 flex gap-3">
              <Link
                to="/guard"
                className="flex-1 py-3 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                {t('dashboard')}
              </Link>
              <button
                onClick={reset}
                className="flex-1 py-3 rounded-xl border border-line text-ink text-sm font-medium hover:bg-subtle transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {t('scanAgain')}
              </button>
            </div>
          </div>
        )}

        {/* Site action card */}
        {!result && scanState === 'ready' && site && (
          <div className="v-card p-6 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 text-xs font-semibold">
              <QrCode className="w-3.5 h-3.5" />
              {t('siteFound')}
            </span>
            <h2 className="text-xl font-bold text-ink mt-3">{site.siteName}</h2>
            <p className="text-sm text-muted font-mono">{site.siteCode}</p>
            {site.location && <p className="text-xs text-muted mt-0.5">{site.location}</p>}

            {openShift && openShift.siteId?._id !== site._id && (
              <div className="mt-4 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-3 text-sm">
                {t('alreadyOnShiftAt', { site: openShift.siteId?.siteName || '' })}
              </div>
            )}

            {siteError && (
              <div className="mt-4 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3 text-sm">
                {siteError}
              </div>
            )}

            <div className="mt-5 flex gap-3">
              {!openShift && (
                <button
                  onClick={doClockIn}
                  disabled={busy}
                  className="flex-1 py-4 rounded-2xl bg-green-600 text-white font-bold text-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  {busy ? t('saving') : t('clockIn')}
                </button>
              )}
              {openShift && openShift.siteId?._id === site._id && (
                <button
                  onClick={doClockOut}
                  disabled={busy}
                  className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-bold text-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Square className="w-5 h-5" />
                  {busy ? t('saving') : t('clockOut')}
                </button>
              )}
            </div>

            {openShift && openShift.siteId?._id === site._id && (
              <button
                onClick={doPatrol}
                disabled={busy}
                className="mt-3 w-full py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <Route className="w-5 h-5" />
                {busy ? t('saving') : t('patrolScan')}
              </button>
            )}

            {!openShift && (
              <p className="text-xs text-muted mt-3">{t('clockInHint')}</p>
            )}
          </div>
        )}

        {/* Scanner viewfinder */}
        {!result && scanState !== 'ready' && (
          <div className="v-card p-5">
            {/* Must stay laid out while the camera starts: html5-qrcode sizes its
                video from this element, and a display:none container breaks it on phones. */}
            <div id="qr-reader" className="rounded-xl overflow-hidden bg-black min-h-[16rem]" />
            {scanState === 'starting' && (
              <p className="mt-3 text-center text-muted text-sm flex items-center justify-center gap-2">
                <Camera className="w-4 h-4 animate-pulse" />
                {t('startingCamera')}
              </p>
            )}
            {(scanState === 'error' || scanState === 'idle') && (
              <div className="h-40 flex flex-col items-center justify-center text-muted text-sm gap-2 text-center px-4">
                <Camera className="w-8 h-8 opacity-50" />
                {scanError || t('cameraError')}
              </div>
            )}
            {scanState === 'error' && (
              <button
                onClick={() => setScanAttempt((n) => n + 1)}
                className="mt-3 w-full py-3 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {t('startCamera')}
              </button>
            )}
          </div>
        )}

        {/* Manual fallback */}
        {!result && (
          <form onSubmit={onManualSubmit} className="v-card p-5">
            <p className="text-sm font-medium text-ink flex items-center gap-2 mb-3">
              <Keyboard className="w-4 h-4 text-muted" />
              {t('enterCodeManually')}
            </p>
            <div className="flex gap-2">
              <input
                className="v-input flex-1 font-mono text-sm"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="VITALPAYROLL-SITE:…"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                {t('go')}
              </button>
            </div>
          </form>
        )}
      </div>
    </GuardLayout>
  );
}
