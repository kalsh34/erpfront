import api from '../../lib/api';
import type { Proforma, ProformaCompany, ProformaSite, ServiceRole } from './types';

export interface Page<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/** Turn an axios error into the backend's business message. */
export function apiError(error: unknown): string {
  const e = error as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || 'Something went wrong. Please try again.';
}

export const marketing = {
  companies: {
    list: async (params: Record<string, unknown> = {}): Promise<Page<ProformaCompany>> =>
      (await api.get('/marketing/companies', { params })).data,
    get: async (id: string): Promise<{ company: ProformaCompany; sites: ProformaSite[] }> =>
      (await api.get(`/marketing/companies/${id}`)).data,
    create: async (body: unknown): Promise<ProformaCompany> =>
      (await api.post('/marketing/companies', body)).data.data,
    update: async (id: string, body: unknown): Promise<ProformaCompany> =>
      (await api.put(`/marketing/companies/${id}`, body)).data.data,
    deactivate: async (id: string): Promise<ProformaCompany> =>
      (await api.post(`/marketing/companies/${id}/deactivate`)).data.data,
  },
  sites: {
    list: async (params: Record<string, unknown> = {}): Promise<{ data: ProformaSite[] }> =>
      (await api.get('/marketing/sites', { params })).data,
    create: async (body: unknown): Promise<ProformaSite> =>
      (await api.post('/marketing/sites', body)).data.data,
    update: async (id: string, body: unknown): Promise<ProformaSite> =>
      (await api.put(`/marketing/sites/${id}`, body)).data.data,
  },
  roles: {
    list: async (params: Record<string, unknown> = {}): Promise<{ data: ServiceRole[] }> =>
      (await api.get('/marketing/service-roles', { params })).data,
    create: async (body: unknown): Promise<ServiceRole> =>
      (await api.post('/marketing/service-roles', body)).data.data,
    update: async (id: string, body: unknown): Promise<ServiceRole> =>
      (await api.put(`/marketing/service-roles/${id}`, body)).data.data,
  },
  proformas: {
    list: async (params: Record<string, unknown> = {}): Promise<Page<Proforma>> =>
      (await api.get('/marketing/proformas', { params })).data,
    get: async (id: string): Promise<Proforma> =>
      (await api.get(`/marketing/proformas/${id}`)).data.data,
    create: async (body: unknown): Promise<Proforma> =>
      (await api.post('/marketing/proformas', body)).data.data,
    update: async (id: string, body: unknown): Promise<Proforma> =>
      (await api.put(`/marketing/proformas/${id}`, body)).data.data,
    issue: async (id: string): Promise<Proforma> =>
      (await api.post(`/marketing/proformas/${id}/issue`)).data.data,
    setStatus: async (id: string, status: string): Promise<Proforma> =>
      (await api.post(`/marketing/proformas/${id}/status`, { status })).data.data,
  },
};
