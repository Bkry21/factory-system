import api from './api';
import type { Production, RawMaterialUsed } from '../types';

const mapProduction = (p: any): Production => ({
  id: String(p.id),
  shiftId: String(p.shift),
  supervisorId: String(p.supervisor ?? ''),
  supervisorName: p.supervisor_name ?? '',
  date: p.date,
  targetQuantity: Number(p.target_quantity),
  actualQuantity: Number(p.actual_quantity),
  rejectedQuantity: Number(p.rejected_quantity),
  achievementRate: p.achievement_rate ?? 0,
  photoUrl: p.photo ?? undefined,  
  notes: p.notes ?? '',
  rawMaterialsUsed: p.rawMaterialsUsed ?? p.raw_materials_used ?? [],
});

export const productionService = {

  getAll: async (filters?: { date?: string; shiftId?: string; department?: string }): Promise<Production[]> => {
    const params: any = {};
    if (filters?.date) params.date = filters.date;
    if (filters?.shiftId) params.shift = filters.shiftId;
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
    shiftId?: string | number;
    shift?: string | number;
    targetQuantity: number;
    actualQuantity: number;
    rejectedQuantity: number;
    notes?: string;
    department?: string;
    supervisorId?: string | number;
    rawMaterialsUsed?: RawMaterialUsed[];
  }): Promise<Production> => {
    const shiftValue = payload.shiftId ?? payload.shift;
    if (!shiftValue) throw new Error('لا توجد وردية نشطة');
    const { data } = await api.post('/production/', {
      shift: Number(shiftValue),
      target_quantity: payload.targetQuantity,
      actual_quantity: payload.actualQuantity,
      rejected_quantity: payload.rejectedQuantity,
      notes: payload.notes ?? '',
      raw_materials_used: payload.rawMaterialsUsed ?? [],
      // ❌ photo محذوف كلياً
    });
    return mapProduction(data);
  },

  update: async (
    id: string,
    payload: {
      targetQuantity?: number;
      actualQuantity?: number;
      rejectedQuantity?: number;
      notes?: string;
      shiftId?: string | number;
      shift?: string | number;
      rawMaterialsUsed?: RawMaterialUsed[];
    }
  ): Promise<Production> => {
    const body: any = {};
    if (payload.targetQuantity !== undefined) body.target_quantity = payload.targetQuantity;
    if (payload.actualQuantity !== undefined) body.actual_quantity = payload.actualQuantity;
    if (payload.rejectedQuantity !== undefined) body.rejected_quantity = payload.rejectedQuantity;
    if (payload.notes !== undefined) body.notes = payload.notes;
    if (payload.rawMaterialsUsed !== undefined) body.raw_materials_used = payload.rawMaterialsUsed;
    const shiftVal = payload.shiftId ?? payload.shift;
    if (shiftVal !== undefined) body.shift = Number(shiftVal);
    const { data } = await api.patch(`/production/${id}/`, body);
    return mapProduction(data);
  },
};