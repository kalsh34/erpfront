import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Card, StatusBadge, LoadingSpinner } from '../../components/ui';
import GuardLayout from './GuardLayout';
import { useT } from '../../i18n';

interface SiteAssignment {
  _id: string;
  siteId: { siteName: string; siteCode: string; location: string };
  hourlyRate: number;
  standardMonthlyHours: number;
  isCurrent: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
}

export default function MySitesPage() {
  const t = useT();
  const [sites, setSites] = useState<SiteAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    try {
      const meRes = await api.get('/auth/me');
      const empId = meRes.data.data.employeeId;
      const res = await api.get(`/guards/${empId}/sites`);
      setSites(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <GuardLayout><LoadingSpinner text={t('loading')} /></GuardLayout>;

  const activeSites = sites.filter((s) => s.isCurrent);
  const pastSites = sites.filter((s) => !s.isCurrent);

  return (
    <GuardLayout>
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-lg font-bold text-ink mb-4">{t('mySites')}</h1>

        {activeSites.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-600 mb-3">Active Assignments</h2>
            {activeSites.map((s) => (
              <Card key={s._id} className="mb-3 border-l-4 border-green-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{s.siteId?.siteName}</p>
                    <p className="text-sm text-gray-500">{s.siteId?.siteCode} - {s.siteId?.location}</p>
                  </div>
                  <StatusBadge status="ACTIVE" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Hourly Rate</p>
                    <p className="font-medium">{s.hourlyRate.toFixed(2)} ETB</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Monthly Hours</p>
                    <p className="font-medium">{s.standardMonthlyHours}h</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {pastSites.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-600 mb-3">Past Assignments</h2>
            {pastSites.map((s) => (
              <Card key={s._id} className="mb-2 opacity-60">
                <p className="font-medium text-sm">{s.siteId?.siteName}</p>
                <p className="text-xs text-gray-500">Until {new Date(s.effectiveTo || s.effectiveFrom).toLocaleDateString()}</p>
              </Card>
            ))}
          </div>
        )}

        {sites.length === 0 && (
          <Card className="text-center text-gray-500">
            No site assignments yet
          </Card>
        )}
      </div>
    </GuardLayout>
  );
}
