import api from './api';
import type { Machine } from '../types';

const mapMachine = (m: any): Machine => ({
  id:          String(m.id),
  name:        m.name,
  type:        m.machine_type_display ?? m.machine_type,
  department:  m.department_display   ?? m.department,
  status:      m.status,
  lastUpdated: m.created_at ?? new Date().toISOString(),
  image:       m.image ?? undefined,
});

export const machineService = {

  getAll: async (department?: string): Promise<Machine[]> => {
    const { data } = await api.get('/machines/', {
      params: department ? { department } : undefined,
    });
    return data.map(mapMachine);
  },

  // ✅ حذف shiftId — بس machineId
  start: async (machineId: string): Promise<void> => {
    await api.post('/machine-logs/', {
      machine: Number(machineId),
      status:  'running',
    });
  },

  // ✅ حذف shiftId — بس machineId
  stop: async (machineId: string): Promise<void> => {
    await api.post('/machine-logs/', {
      machine: Number(machineId),
      status:  'stopped',
    });
  },
};