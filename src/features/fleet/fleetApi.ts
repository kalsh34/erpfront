import api from '../../lib/api';

export interface FleetVehicle {
  _id: string;
  plateNumber: string;
  make: string;
  modelName?: string;
  model?: string;
  vehicleType: string;
  year?: number;
  color?: string;
  vin?: string;
  status: string;
  assignedSiteId?: { _id: string; siteName: string; siteCode?: string } | null;
  currentOdometer?: number;
  notes?: string;
}

export interface FleetDriver {
  _id: string;
  employeeId: { _id: string; employeeCode: string; firstName: string; lastName: string; status?: string } | string;
  licenseNumber: string;
  licenseType?: string;
  licenseExpiry?: string | null;
  isAvailable: boolean;
  notes?: string;
}

export interface FleetAssignment {
  _id: string;
  vehicleId: { _id: string; plateNumber: string; make?: string; modelName?: string; vehicleType?: string } | string;
  driverId: { _id: string; employeeId?: { employeeCode: string; firstName: string; lastName: string } } | string;
  purpose?: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isCurrent: boolean;
}

export interface FleetMaintenance {
  _id: string;
  vehicleId: { _id: string; plateNumber: string; make?: string; modelName?: string } | string;
  maintenanceType: string;
  status: string;
  scheduledDate?: string | null;
  completedDate?: string | null;
  odometerAtService?: number;
  description?: string;
  serviceCenter?: string;
}

export interface FleetDocument {
  _id: string;
  vehicleId: { _id: string; plateNumber: string } | string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  issuedDate?: string | null;
  expiryDate?: string | null;
}

export const fleetApi = {
  vehicles: (params: Record<string, string> = {}) => api.get('/v2/fleet/vehicles', { params }),
  vehicle: (id: string) => api.get(`/v2/fleet/vehicles/${id}`),
  createVehicle: (body: Record<string, unknown>) => api.post('/v2/fleet/vehicles', body),
  updateVehicle: (id: string, body: Record<string, unknown>) => api.put(`/v2/fleet/vehicles/${id}`, body),
  setVehicleStatus: (id: string, status: string) => api.patch(`/v2/fleet/vehicles/${id}/status`, { status }),
  drivers: (params: Record<string, string> = {}) => api.get('/v2/fleet/drivers', { params }),
  createDriver: (body: Record<string, unknown>) => api.post('/v2/fleet/drivers', body),
  updateDriver: (id: string, body: Record<string, unknown>) => api.put(`/v2/fleet/drivers/${id}`, body),
  assignments: (params: Record<string, string> = {}) => api.get('/v2/fleet/assignments', { params }),
  createAssignment: (body: Record<string, unknown>) => api.post('/v2/fleet/assignments', body),
  endAssignment: (id: string) => api.post(`/v2/fleet/assignments/${id}/end`, {}),
  maintenance: (params: Record<string, string> = {}) => api.get('/v2/fleet/maintenance', { params }),
  createMaintenance: (body: Record<string, unknown>) => api.post('/v2/fleet/maintenance', body),
  updateMaintenance: (id: string, body: Record<string, unknown>) => api.put(`/v2/fleet/maintenance/${id}`, body),
  documents: (vehicleId: string) => api.get(`/v2/fleet/vehicles/${vehicleId}/documents`),
  createDocument: (body: Record<string, unknown>) => api.post('/v2/fleet/documents', body),
  deleteDocument: (id: string) => api.delete(`/v2/fleet/documents/${id}`),
  scanExpiry: () => api.post('/v2/fleet/documents/scan-expiry', {}),
};

/** Unwrap AxiosAPIv2 `data` payload with a safe fallback. */
export const unwrap = (d: any) => d?.data?.data ?? d?.data ?? d;

export const errOf = (e: any, fallback: string) => e?.response?.data?.message || e?.message || fallback;
