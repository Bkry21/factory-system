import api from './api';
import { buildImageField } from '../components/form/PhotoPicker';
import type { Shift } from '../types';

const map = (s: any): Shift => ({
  id:               String(s.id),
  shiftType:        s.shift_type,
  shiftTypeDisplay: s.shift_type_display ?? s.shift_type,
  supervisorId:     String(s.supervisor ?? ''),
  supervisorName:   s.supervisor_name ?? '',
  startTime:        s.start_time,
  endTime:          s.end_time ?? undefined,
  isActive:         s.is_active,
  startPhoto:       s.start_photo_url ?? s.start_photo ?? '',
});

export const shiftService = {

  getActive: async (): Promise<Shift | null> => {
    const { data } = await api.get('/shifts/', { params: { is_active: true } });
    if (!data || data.length === 0) return null;
    return map(data[0]);
  },

  getAll: async (): Promise<Shift[]> => {
    const { data } = await api.get('/shifts/');
    return data.map(map);
  },

  start: async (shiftType: string, photoUri?: string): Promise<Shift> => {
    const form = new FormData();
    form.append('shift_type', shiftType);
    if (photoUri) form.append('start_photo', buildImageField(photoUri, 'start_photo'));

    const { data } = await api.post('/shifts/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return map(data);
  },

end: async (shiftId: string, photoUri?: string): Promise<Shift> => {
  if (!photoUri) {
    const { data } = await api.post(`/shifts/${shiftId}/end_shift/`, {});
    return map(data);
  }
  const form = new FormData();
  form.append('end_photo', buildImageField(photoUri, 'end_photo'));
  const { data } = await api.post(`/shifts/${shiftId}/end_shift/`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return map(data);
},
};