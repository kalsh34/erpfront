import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, Plus, Wrench } from 'lucide-react';
import { Badge, Button, Card, EmptyState, LoadingSpinner, Modal, Tabs } from '../../components/ui';
import { can, useAuthStore } from '../../stores/authStore';
import { useT } from '../../i18n';
import { PageHeader } from '../../components/ui';
import { fleetApi, unwrap, errOf, FleetVehicle, FleetDriver, FleetAssignment, FleetMaintenance } from './fleetApi';
import { Input, LabeledSelect } from './uiBits';

const VEHICLE_TYPES = ['CAR', 'PICKUP', 'MOTORCYCLE', 'TRUCK', 'VAN', 'OTHER'];
const MAINTENANCE_TYPES = ['ROUTINE_SERVICE', 'REPAIR', 'INSPECTION', 'TIRE_CHANGE', 'OTHER'];

const statusVariant = (status: string): 'default' | 'success' | 'warning' | 'danger' => {
  switch (status) {
    case 'ACTIVE': return 'success';
    case 'IN_MAINTENANCE': return 'warning';
    case 'DISPOSED': case 'INACTIVE': return 'danger';
    default: return 'default';
  }
};

export default function FleetPage() {
  const t = useT();
  const { user } = useAuthStore();
  const canManage = can(user?.permissions, 'fleet.manage');
  const canAssign = can(user?.permissions, 'fleet.assign');

  const [tab, setTab] = useState('vehicles');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [assignments, setAssignments] = useState<FleetAssignment[]>([]);
  const [maintenance, setMaintenance] = useState<FleetMaintenance[]>([]);
  const [vehicleModal, setVehicleModal] = useState(false);
  const [driverModal, setDriverModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [maintenanceModal, setMaintenanceModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');


  const [form, setForm] = useState<Record<string, string>>({});
  const setF = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = search.trim() ? { q: search.trim() } : {};
      const [v, d, a, m] = await Promise.all([
        fleetApi.vehicles(params), fleetApi.drivers(params), fleetApi.assignments({ current: 'true' }), fleetApi.maintenance({}),
      ]);
      setVehicles(unwrap(v) || []); setDrivers(unwrap(d) || []); setAssignments(unwrap(a) || []); setMaintenance(unwrap(m) || []);
      setError(null);
    } catch (e) { setError(errOf(e, 'Unable to load fleet data.')); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const refreshAfter = (op: () => Promise<unknown>) => op().then(() => { setNotice('Saved.'); return loadAll(); });

  const addVehicle = async () => {
    setBusy(true); setError(null);
    try { await refreshAfter(() => fleetApi.createVehicle(form)); setVehicleModal(false); setForm({}); }
    catch (e) { setError(errOf(e, 'Unable to add vehicle.')); }
    finally { setBusy(false); }
  };

  const addDriver = async () => {
    setBusy(true); setError(null);
    try { await refreshAfter(() => fleetApi.createDriver(form)); setDriverModal(false); setForm({}); }
    catch (e) { setError(errOf(e, 'Unable to register driver.')); }
    finally { setBusy(false); }
  };

  const addAssignment = async () => {
    setBusy(true); setError(null);
    try { await refreshAfter(() => fleetApi.createAssignment(form)); setAssignModal(false); setForm({}); }
    catch (e) { setError(errOf(e, 'Unable to assign vehicle.')); }
    finally { setBusy(false); }
  };

  const endAssignment = async (id: string) => {
    setBusy(true); setError(null);
    try { await refreshAfter(() => fleetApi.endAssignment(id)); setNotice('Assignment closed — vehicle and driver released.'); }
    catch (e) { setError(errOf(e, 'Unable to end assignment.')); }
    finally { setBusy(false); }
  };

  const scheduleMaintenance = async () => {
    setBusy(true); setError(null);
    try { await refreshAfter(() => fleetApi.createMaintenance(form)); setMaintenanceModal(false); setForm({}); }
    catch (e) { setError(errOf(e, 'Unable to schedule maintenance.')); }
    finally { setBusy(false); }
  };

  const completeMaintenance = async (id: string) => {
    setBusy(true); setError(null);
    try { await refreshAfter(() => fleetApi.updateMaintenance(id, { status: 'COMPLETED', completedDate: new Date().toISOString() })); }
    catch (e) { setError(errOf(e, 'Unable to complete maintenance.')); }
    finally { setBusy(false); }
  };

  const scanExpiry = async () => {
    setBusy(true); setError(null);
    try { const r = await fleetApi.scanExpiry(); const data = unwrap(r); setNotice(`Expiry check done: ${data?.notified ?? 0} notification(s) raised.`); }
    catch (e) { setError(errOf(e, 'Expiry check failed.')); }
    finally { setBusy(false); }
  };

  const driverName = (d: FleetDriver) => {
    const emp = typeof d.employeeId === 'object' ? d.employeeId : null;
    return emp ? `${emp.firstName} ${emp.lastName} (${emp.employeeCode})` : (d.employeeId as string);
  };

  return (
    <div className="p-3 sm:p-6 space-y-5">
      <PageHeader
        title={t('moduleFleet')}
        subtitle={t('moduleFleetSub')}
        action={(
          <div className="flex flex-wrap gap-2">
            {canManage && <Button onClick={() => setVehicleModal(true)}><Plus size={14} className="inline mr-1.5" />{t('fleetAddVehicle')}</Button>}
            {canManage && <Button variant="outline" onClick={() => setDriverModal(true)}><Plus size={14} className="inline mr-1.5" />{t('fleetAddDriver')}</Button>}
            {canAssign && <Button variant="outline" onClick={() => setAssignModal(true)}><Plus size={14} className="inline mr-1.5" />{t('fleetAssignVehicle')}</Button>}
            {canManage && <Button variant="outline" onClick={() => setMaintenanceModal(true)}><CalendarClock size={14} className="inline mr-1.5" />{t('fleetAddMaintenance')}</Button>}
            {canManage && <Button variant="outline" onClick={scanExpiry} disabled={busy}><AlertTriangle size={14} className="inline mr-1.5" />{t('fleetScanExpiry')}</Button>}
          </div>
        )}
      />

      {error && <div className="rounded-xl border border-danger-line bg-danger-subtle px-4 py-3 text-sm text-danger-text">{error}</div>}
      {notice && <div className="rounded-xl border border-success-line bg-success-subtle px-4 py-3 text-sm text-success-text">{notice}</div>}

      <Tabs
        tabs={[
          { key: 'vehicles', label: `${t('fleetVehicles')} (${vehicles.length})` },
          { key: 'assignments', label: `${t('fleetAssignments')} (${assignments.length})` },
          { key: 'maintenance', label: `${t('fleetMaintenance')} (${maintenance.length})` },
          { key: 'drivers', label: `${t('fleetDrivers')} (${drivers.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />

      <input className="v-input max-w-xs" placeholder="Search plate, make or model…" value={search} onChange={(e) => setSearch(e.target.value)} />

      {loading ? <LoadingSpinner /> : (
        <>
          {tab === 'vehicles' && (vehicles.length === 0 ? <EmptyState title="No vehicles yet" description="Add the first vehicle to get started." /> : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-subtext">
                  <th className="px-4 py-3">Plate</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Site</th><th className="px-4 py-3 text-right">Odometer</th><th className="px-4 py-3">Model</th>
                </tr></thead>
                <tbody>
                  {vehicles.map((v) => (
                    <tr key={v._id} className="border-b border-line last:border-0 hover:bg-subtle/50">
                      <td className="px-4 py-3 font-medium text-ink">{v.plateNumber}</td>
                      <td className="px-4 py-3 text-muted">{v.vehicleType}</td>
                      <td className="px-4 py-3"><Badge variant={statusVariant(v.status)}>{v.status}</Badge></td>
                      <td className="px-4 py-3 text-muted">{v.assignedSiteId && typeof v.assignedSiteId === 'object' ? v.assignedSiteId.siteName : '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{v.currentOdometer ?? 0} km</td>
                      <td className="px-4 py-3 text-muted">{v.make} {v.modelName || v.model}{v.year ? ` · ${v.year}` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ))}

          {tab === 'assignments' && (assignments.length === 0 ? <EmptyState title="No active assignments" description="Assign a vehicle to a driver to see it listed here." /> : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-subtext">
                  <th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Driver</th><th className="px-4 py-3">Purpose</th>
                  <th className="px-4 py-3">Effective from</th><th className="px-4 py-3 text-right">Actions</th>
                </tr></thead>
                <tbody>
                  {assignments.map((a) => {
                    const v = typeof a.vehicleId === 'object' ? a.vehicleId : null;
                    const d = typeof a.driverId === 'object' ? a.driverId : null;
                    const emp = d && typeof d.employeeId === 'object' ? d.employeeId : null;
                    return (
                      <tr key={a._id} className="border-b border-line last:border-0 hover:bg-subtle/50">
                        <td className="px-4 py-3 font-medium text-ink">{v?.plateNumber || (a.vehicleId as string)}</td>
                        <td className="px-4 py-3 text-muted">{d && emp ? `${emp.firstName} ${emp.lastName} (${emp.employeeCode})` : (a.driverId as string)}</td>
                        <td className="px-4 py-3 text-muted">{a.purpose || '—'}</td>
                        <td className="px-4 py-3 text-muted">{new Date(a.effectiveFrom).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          {canAssign && <Button variant="outline" size="sm" disabled={busy} onClick={() => endAssignment(a._id)}>{t('fleetEndAssignment')}</Button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          ))}

          {tab === 'maintenance' && (maintenance.length === 0 ? <EmptyState title="No maintenance scheduled" description="Schedule routine service or repairs for your vehicles." /> : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-subtext">
                  <th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Scheduled</th><th className="px-4 py-3 text-right">Actions</th>
                </tr></thead>
                <tbody>
                  {maintenance.map((m) => {
                    const v = typeof m.vehicleId === 'object' ? m.vehicleId : null;
                    return (
                      <tr key={m._id} className="border-b border-line last:border-0 hover:bg-subtle/50">
                        <td className="px-4 py-3 font-medium text-ink">{v?.plateNumber || (m.vehicleId as string)}</td>
                        <td className="px-4 py-3 text-muted">{m.maintenanceType}</td>
                        <td className="px-4 py-3"><Badge variant={m.status === 'COMPLETED' ? 'success' : m.status === 'SCHEDULED' ? 'info' : 'warning'}>{m.status}</Badge></td>
                        <td className="px-4 py-3 text-muted">{m.scheduledDate ? new Date(m.scheduledDate).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3 text-right">
                          {canManage && m.status === 'SCHEDULED' && (
                            <Button variant="outline" size="sm" disabled={busy} onClick={() => completeMaintenance(m._id)}>
                              <Wrench size={12} className="inline mr-1" />{t('fleetCompleteMaintenance')}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          ))}

          {tab === 'drivers' && (drivers.length === 0 ? <EmptyState title="No drivers registered" description="Link an active employee as a driver." /> : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-subtext">
                  <th className="px-4 py-3">Employee</th><th className="px-4 py-3">License</th><th className="px-4 py-3">Available</th>
                  <th className="px-4 py-3">License expiry</th>
                </tr></thead>
                <tbody>
                  {drivers.map((d) => (
                    <tr key={d._id} className="border-b border-line last:border-0 hover:bg-subtle/50">
                      <td className="px-4 py-3 font-medium text-ink">{driverName(d)}</td>
                      <td className="px-4 py-3 text-muted">{d.licenseNumber}{d.licenseType ? ` · ${d.licenseType}` : ''}</td>
                      <td className="px-4 py-3"><Badge variant={d.isAvailable ? 'success' : 'warning'}>{d.isAvailable ? 'Available' : 'Assigned'}</Badge></td>
                      <td className="px-4 py-3 text-muted">{d.licenseExpiry ? new Date(d.licenseExpiry).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ))}
        </>
      )}

      {/* Add vehicle */}
      <Modal open={vehicleModal} onClose={() => !busy && setVehicleModal(false)} title={t('fleetAddVehicle')}>
        <div className="space-y-3">
          <Input label="Plate number" value={form.plateNumber || ''} onChange={(e) => setF('plateNumber', e.target.value)} placeholder="AA-12345" />
          <Input label="Make" value={form.make || ''} onChange={(e) => setF('make', e.target.value)} placeholder="Toyota" />
          <Input label="Model" value={form.model || ''} onChange={(e) => setF('model', e.target.value)} placeholder="Corolla" />
          <LabeledSelect label="Vehicle type" value={form.vehicleType || ''} onChange={(e) => setF('vehicleType', e.target.value)}>
            <option value="">Select type…</option>
            {VEHICLE_TYPES.map((vt) => <option key={vt} value={vt}>{vt}</option>)}
          </LabeledSelect>
          <Input label="Year (optional)" type="number" value={form.year || ''} onChange={(e) => setF('year', e.target.value)} />
          <Input label="Color (optional)" value={form.color || ''} onChange={(e) => setF('color', e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" disabled={busy} onClick={() => setVehicleModal(false)}>Cancel</Button>
            <Button disabled={busy || !form.plateNumber || !form.make || !form.model || !form.vehicleType} onClick={addVehicle}>{busy ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      </Modal>

      {/* Register driver */}
      <Modal open={driverModal} onClose={() => !busy && setDriverModal(false)} title={t('fleetAddDriver')}>
        <div className="space-y-3">
          <Input label="Employee ID" value={form.employeeId || ''} onChange={(e) => setF('employeeId', e.target.value)} placeholder="Mongo ObjectId of an ACTIVE employee" />
          <Input label="License number" value={form.licenseNumber || ''} onChange={(e) => setF('licenseNumber', e.target.value)} />
          <Input label="License type (optional)" value={form.licenseType || ''} onChange={(e) => setF('licenseType', e.target.value)} />
          <Input label="License expiry (optional)" type="date" value={form.licenseExpiry || ''} onChange={(e) => setF('licenseExpiry', e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" disabled={busy} onClick={() => setDriverModal(false)}>Cancel</Button>
            <Button disabled={busy || !form.employeeId || !form.licenseNumber} onClick={addDriver}>{busy ? 'Saving…' : 'Register'}</Button>
          </div>
        </div>
      </Modal>

      {/* Assign vehicle */}
      <Modal open={assignModal} onClose={() => !busy && setAssignModal(false)} title={t('fleetAssignVehicle')}>
        <div className="space-y-3">
          <LabeledSelect label="Vehicle" value={form.vehicleId || ''} onChange={(e) => setF('vehicleId', e.target.value)}>
            <option value="">Select vehicle…</option>
            {vehicles.filter((v) => v.status === 'ACTIVE').map((v) => <option key={v._id} value={v._id}>{v.plateNumber} — {v.make} {v.modelName}</option>)}
          </LabeledSelect>
          <LabeledSelect label="Driver" value={form.driverId || ''} onChange={(e) => setF('driverId', e.target.value)}>
            <option value="">Select driver…</option>
            {drivers.filter((d) => d.isAvailable).map((d) => <option key={d._id} value={d._id}>{driverName(d)}</option>)}
          </LabeledSelect>
          <Input label="Purpose (optional)" value={form.purpose || ''} onChange={(e) => setF('purpose', e.target.value)} placeholder="Patrol / site supervision / staff transport" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" disabled={busy} onClick={() => setAssignModal(false)}>Cancel</Button>
            <Button disabled={busy || !form.vehicleId || !form.driverId} onClick={addAssignment}>{busy ? 'Assigning…' : 'Assign'}</Button>
          </div>
        </div>
      </Modal>

      {/* Schedule maintenance */}
      <Modal open={maintenanceModal} onClose={() => !busy && setMaintenanceModal(false)} title={t('fleetAddMaintenance')}>
        <div className="space-y-3">
          <LabeledSelect label="Vehicle" value={form.vehicleId || ''} onChange={(e) => setF('vehicleId', e.target.value)}>
            <option value="">Select vehicle…</option>
            {vehicles.map((v) => <option key={v._id} value={v._id}>{v.plateNumber} — {v.make} {v.modelName}</option>)}
          </LabeledSelect>
          <LabeledSelect label="Maintenance type" value={form.maintenanceType || ''} onChange={(e) => setF('maintenanceType', e.target.value)}>
            <option value="">Select type…</option>
            {MAINTENANCE_TYPES.map((mt) => <option key={mt} value={mt}>{mt}</option>)}
          </LabeledSelect>
          <Input label="Scheduled date" type="date" value={form.scheduledDate || ''} onChange={(e) => setF('scheduledDate', e.target.value)} />
          <Input label="Service center (optional)" value={form.serviceCenter || ''} onChange={(e) => setF('serviceCenter', e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" disabled={busy} onClick={() => setMaintenanceModal(false)}>Cancel</Button>
            <Button disabled={busy || !form.vehicleId || !form.maintenanceType} onClick={scheduleMaintenance}>{busy ? 'Saving…' : 'Schedule'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Re-export for App.tsx convenience
export { fleetApi, errOf };
