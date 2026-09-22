import api from './api';
import { buildImageField } from '../components/form/PhotoPicker';
import type { Fault } from '../types';

const map = (f: any): Fault => ({
  id:              String(f.id),
  machineId:       String(f.machine),
  machineName:     f.machine_name ?? String(f.machine),
  shiftId:         String(f.shift),
  reportedById:    String(f.reported_by ?? ''),
  reportedByName:  f.reported_by_name ?? '',
  assignedToId:    f.assigned_to ? String(f.assigned_to) : undefined,
  assignedToName:  f.assigned_to_name ?? undefined,
  description:     f.description,
  status:          f.status,
  reportedAt:      f.reported_at,
  acceptedAt:      f.accepted_at ?? undefined,
  resolvedAt:      f.resolved_at ?? undefined,
  beforePhoto:     f.before_photo_url ?? f.before_photo ?? '',
  afterPhoto:      f.after_photo_url  ?? f.after_photo  ?? undefined,
  resolutionNotes: f.resolution_notes ?? '',
});

export const faultService = {

  getAll: async (filters?: { status?: string; machineId?: string; department?: string }): Promise<Fault[]> => {
    const params: any = {};
    if (filters?.status)    params.status  = filters.status;
    if (filters?.machineId) params.machine = filters.machineId;
    if (filters?.department) params.department = filters.department;  
    const { data } = await api.get('/faults/', { params });
    return data.map(map);
  },

  create: async (payload: {
    machineId:    string;
    shiftId:      string;
    description:  string;
    beforePhoto?: string;  
  }): Promise<Fault> => {
    const form = new FormData();
    form.append('machine',     payload.machineId);
    form.append('shift',       payload.shiftId);
    form.append('description', payload.description);
    if (payload.beforePhoto)
      form.append('before_photo', buildImageField(payload.beforePhoto, 'before_photo'));

    const { data } = await api.post('/faults/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return map(data);
  },

  accept: async (faultId: string): Promise<Fault> => {
    const { data } = await api.post(`/faults/${faultId}/accept/`);
    return map(data);
  },

  resolve: async (faultId: string, afterPhotoUri?: string, notes?: string): Promise<Fault> => {
    const form = new FormData();
    if (notes) form.append('resolution_notes', notes);
    if (afterPhotoUri)
      form.append('after_photo', buildImageField(afterPhotoUri, 'after_photo'));

    const { data } = await api.post(`/faults/${faultId}/resolve/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return map(data);
  },
  unaccept: async (faultId: string): Promise<Fault> => {
  const { data } = await api.post(`/faults/${faultId}/unaccept/`);
  return map(data);
},
};