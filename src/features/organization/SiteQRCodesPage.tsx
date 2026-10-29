import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { ArrowLeft, Download, Printer, QrCode as QrCodeIcon } from 'lucide-react';
import api from '../../lib/api';
import { siteQrPayload } from '../../lib/siteQr';
import { LoadingSpinner, InfoTooltip } from '../../components/ui';
import { useT } from '../../i18n';

interface SiteRow {
  _id: string;
  siteName: string;
  siteCode: string;
  location: string;
  status: string;
}

interface QrCard extends SiteRow {
  dataUrl: string;
}

export default function SiteQRCodesPage() {
  const t = useT();
  const [cards, setCards] = useState<QrCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/sites', { params: { limit: 500, status: 'ACTIVE' } });
        const sites: SiteRow[] = res.data.data || [];
        const withQr = await Promise.all(
          sites.map(async (s) => ({
            ...s,
            dataUrl: await QRCode.toDataURL(siteQrPayload(s._id), {
              width: 512,
              margin: 2,
              errorCorrectionLevel: 'M',
            }),
          }))
        );
        setCards(withQr);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load sites');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const download = (card: QrCard) => {
    const link = document.createElement('a');
    link.href = card.dataUrl;
    link.download = `QR-${card.siteCode || card._id}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-canvas">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-grid { display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .qr-card { break-inside: avoid; border: 1px solid #ddd !important; box-shadow: none !important; }
        }
      `}</style>

      <div className="bg-surface border-b border-line px-6 py-3.5 flex items-center justify-between sticky top-0 z-40 no-print">
        <div className="flex items-center gap-4">
          <Link to="/sites" className="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t('back')}
          </Link>
          <div className="h-4 w-px bg-line" />
          <div className="flex items-center gap-2">
            <QrCodeIcon className="w-4 h-4 text-primary-600" />
            <h1 className="text-sm font-bold text-ink">{t('siteQrCodes')}</h1>
            <InfoTooltip content={t('siteQrCodesSub')} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            disabled={cards.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" />
            {t('printAll')}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {loading && <LoadingSpinner text={t('loading')} />}

        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-900 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && cards.length === 0 && (
          <div className="v-card p-10 text-center text-muted text-sm">{t('noActiveSites')}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 print-grid">
          {cards.map((card) => (
            <div key={card._id} className="qr-card bg-surface border border-line rounded-2xl p-5 flex flex-col items-center text-center shadow-sm">
              <h2 className="font-semibold text-ink">{card.siteName}</h2>
              <p className="text-xs text-muted mt-0.5 font-mono">{card.siteCode}</p>
              <p className="text-xs text-muted">{card.location}</p>
              <img src={card.dataUrl} alt={`QR ${card.siteName}`} className="w-44 h-44 my-4 rounded-lg border border-line" />
              <p className="text-[11px] text-muted leading-snug">{t('scanAtSite')}</p>
              <button
                onClick={() => download(card)}
                className="mt-3 flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium no-print"
              >
                <Download className="w-3.5 h-3.5" />
                {t('download')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
