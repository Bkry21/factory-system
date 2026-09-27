import api from './api';
import type { Production, RawMaterialUsed } from '../types';

const mapProduction = (p: any): Production => ({
  id:               String(p.id),
  supervisorId:     String(p.supervisor ?? ''),
  supervisorName:   p.supervisor_name ?? '',
  date:             p.date,
  targetQuantity:   Number(p.target_quantity),
  actualQuantity:   Number(p.actual_quantity),
  rejectedQuantity: Number(p.rejected_quantity),
  achievementRate:  p.achievement_rate ?? 0,
  photoUrl:         p.photo ?? undefined,
  notes:            p.notes ?? '',
  rawMaterialsUsed: p.rawMaterialsUsed ?? p.raw_materials_used ?? [],
});

export const productionService = {

  getAll: async (filters?: { date?: string; department?: string }): Promise<Production[]> => {
    const params: any = {};
    if (filters?.date)       params.date       = filters.date;
    if (filters?.department) params.department = filters.department;
    const { data } = await api.get('/production/', { params });
    return data.map(mapProduction);
  },

  getToday: async (department?: string): Promise<Production | null> => {
    const todayStr = new Date().toISOString().split('T')[0];
    const params: any = { date: todayStr };
    if (department) params.department = department;
    const { data } = await api.get('/production/', { params });
    if (Array.isArray(data) && data.length > 0) return mapProduction(data[0]);
    return null;
  },

  create: async (payload: {
    targetQuantity:   number;
    actualQuantity:   number;
    rejectedQuantity: number;
    notes?:           string;
    department?:      string;
    photoUrl?:        string;
    rawMaterialsUsed?: RawMaterialUsed[];
  }): Promise<Production> => {
    const form = new FormData();
    form.append('target_quantity',   String(payload.targetQuantity));
    form.append('actual_quantity',   String(payload.actualQuantity));
    form.append('rejected_quantity', String(payload.rejectedQuantity));
    form.append('notes',             payload.notes ?? '');
    if (payload.department)
      form.append('department', payload.department);
    if (payload.rawMaterialsUsed)
      form.append('raw_materials_used', JSON.stringify(payload.rawMaterialsUsed));
    if (payload.photoUrl)
      form.append('photo', payload.photoUrl);

    const { data } = await api.post('/production/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return mapProduction(data);
  },

  update: async (
    id: string,
    payload: {
      targetQuantity?:   number;
      actualQuantity?:   number;
      rejectedQuantity?: number;
      notes?:            string;
      rawMaterialsUsed?: RawMaterialUsed[];
    }
  ): Promise<Production> => {
    const body: any = {};
    if (payload.targetQuantity   !== undefined) body.target_quantity   = payload.targetQuantity;
    if (payload.actualQuantity   !== undefined) body.actual_quantity   = payload.actualQuantity;
    if (payload.rejectedQuantity !== undefined) body.rejected_quantity = payload.rejectedQuantity;
    if (payload.notes            !== undefined) body.notes             = payload.notes;
    if (payload.rawMaterialsUsed !== undefined) body.raw_materials_used = payload.rawMaterialsUsed;
    const { data } = await api.patch(`/production/${id}/`, body);
    return mapProduction(data);
  },
};