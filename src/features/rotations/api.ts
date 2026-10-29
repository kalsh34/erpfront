import api from '../../lib/api';
import type {
  PreviewResult, Rotation, RotationAssignmentRec, StatsReport, ConflictIssue,
  ShiftDefinition, RestRule,
} from './types';

async function unwrap<T>(p: Promise<{ data: any }>): Promise<T> {
  const res = await p;
  return res.data.data as T;
}

export const rotationsApi = {
  list: (params?: { status?: string; search?: string }) =>
    unwrap<Rotation[]>(api.get('/rotations', { params })),

  get: (id: string) => unwrap<Rotation>(api.get(`/rotations/${id}`)),

  create: (body: any) => unwrap<Rotation>(api.post('/rotations', body)),

  update: (id: string, body: any) => unwrap<Rotation>(api.put(`/rotations/${id}`, body)),

  remove: (id: string) => api.delete(`/rotations/${id}`),

  addGuards: (id: string, guardIds: string[]) =>
    unwrap<Rotation>(api.post(`/rotations/${id}/guards`, { guardIds })),

  removeGuard: (id: string, guardId: string) =>
    unwrap<Rotation>(api.delete(`/rotations/${id}/guards/${guardId}`)),

  reorderPool: (id: string, orderedGuardIds: string[]) =>
    unwrap<Rotation>(api.put(`/rotations/${id}/pool/reorder`, { orderedGuardIds })),

  preview: (id: string, days?: number, startDate?: string) =>
    unwrap<PreviewResult>(api.get(`/rotations/${id}/preview`, { params: { days, startDate } })),

  generate: (body: { days?: number; startDate?: string }) => {
    // path is fixed after; helper used with id below
    return body;
  },

  generateFor: (id: string, body: { days?: number; startDate?: string }) =>
    unwrap<any>(api.post(`/rotations/${id}/generate`, body)),

  validate: (id: string, body?: { days?: number; startDate?: string }) =>
    unwrap<any>(api.post(`/rotations/${id}/validate`, body || {})),

  stats: (id: string, days?: number) =>
    unwrap<StatsReport & { stale?: boolean }>(api.get(`/rotations/${id}/stats`, { params: { days } })),

  conflicts: (id: string) =>
    unwrap<{ conflicts: ConflictIssue[]; conflictCount: number; feasibility?: string; stale?: boolean }>(
      api.get(`/rotations/${id}/conflicts`),
    ),

  assignments: (id: string, startDate?: string, endDate?: string) =>
    unwrap<RotationAssignmentRec[]>(api.get(`/rotations/${id}/assignments`, { params: { startDate, endDate } })),

  approve: (id: string) => unwrap<Rotation>(api.post(`/rotations/${id}/approve`)),

  publish: (id: string) => unwrap<Rotation>(api.post(`/rotations/${id}/publish`)),

  activate: (id: string) => unwrap<Rotation>(api.post(`/rotations/${id}/activate`)),

  pause: (id: string) => unwrap<Rotation>(api.post(`/rotations/${id}/pause`)),

  archive: (id: string) => unwrap<Rotation>(api.post(`/rotations/${id}/archive`)),

  complete: (id: string) => unwrap<Rotation>(api.post(`/rotations/${id}/complete`)),

  cancel: (id: string) => unwrap<Rotation>(api.post(`/rotations/${id}/cancel`)),

  move: (id: string, body: { date: string; fromGuardId: string; toGuardId: string; shiftKey?: string }) =>
    api.post(`/rotations/${id}/move`, body),

  moveOverride: (id: string, body: { date: string; fromGuardId: string; toGuardId: string; shiftKey?: string }) =>
    api.post(`/rotations/${id}/move/override`, body),

  rotate: (id: string, body: { date?: string; dayIndex?: number; steps?: number }) =>
    unwrap<any>(api.post(`/rotations/${id}/rotate`, body)),

  recalculate: (id: string, body?: { days?: number }) =>
    unwrap<any>(api.post(`/rotations/${id}/recalculate`, body || {})),

  fairness: (poolSize: number, slotCount: number) =>
    unwrap<any>(api.get(`/rotations/utils/fairness`, { params: { poolSize, slotCount } })),
};

export type { ShiftDefinition, RestRule };
