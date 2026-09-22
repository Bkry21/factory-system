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

  // تشغيل ماكينة — POST /api/machine-logs/
start: async (machineId: string, shiftId: string, photoUrl?: string): Promise<void> => {
  await api.post('/machine-logs/', {
    machine: Number(machineId),
    shift:   Number(shiftId),
    status:  'running',
    ...(photoUrl ? { photo: photoUrl } : {}),
  });
},
  // إيقاف ماكينة — POST /api/machine-logs/
  stop: async (machineId: string, shiftId: string): Promise<void> => {
    await api.post('/machine-logs/', {
      machine: Number(machineId),
      shift:   Number(shiftId),
      status:  'stopped',
    });
  },
};