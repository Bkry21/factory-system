import api from './api';
import type { DailyRollLog } from '../types';

export interface DailyRollLogCreate {
  machine:   number;
  rollCount: number;
  notes?:    string;
}

export const dayService = {

  // تسجيل رولات الكيس — المشغل أو المشرف
  createRollLog: async (payload: DailyRollLogCreate): Promise<DailyRollLog> => {
    const { data } = await api.post('/roll-logs/', {
      machine:    payload.machine,
      roll_count: payload.rollCount,
      notes:      payload.notes ?? '',
    });
    return {
      id:          String(data.id),
      machineId:   String(data.machine),
      machineName: data.machine_name ?? '',
      date:        data.date,
      rollCount:   Number(data.roll_count),
      notes:       data.notes ?? '',
    };
  },

  // جلب سجلات الرولات
  getRollLogs: async (filters?: { machine?: string; date?: string }): Promise<DailyRollLog[]> => {
    const params: any = {};
    if (filters?.machine) params.machine = filters.machine;
    if (filters?.date)    params.date    = filters.date;
    const { data } = await api.get('/roll-logs/', { params });
    return data.map((d: any) => ({
      id:          String(d.id),
      machineId:   String(d.machine),
      machineName: d.machine_name ?? '',
      date:        d.date,
      rollCount:   Number(d.roll_count),
      notes:       d.notes ?? '',
    }));
  },
};