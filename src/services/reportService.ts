import api from './api';
import * as Sharing     from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem  from 'expo-file-system/legacy';

const BASE_URL = 'https://sublime-caring-production-efd3.up.railway.app/api';

export type Period = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface PeriodParams {
  period:      Period;
  start_date?: string;   // للـ custom فقط — YYYY-MM-DD
  end_date?:   string;
}

export const reportService = {

  getSummary: async () => {
    const { data } = await api.get('/reports/summary/');
    return data as {
      production: { achievementRate: number; totalActual: number; totalTarget: number };
      faults:     { pending: number; inProgress: number; resolved: number; total: number };
      machines:   { total: number; running: number; maintenance: number; stopped: number };
    };
  },

  getProduction: async (p: PeriodParams) => {
    const { data } = await api.get('/reports/production/', { params: p });
    return data;
  },

  getMachines: async (p: PeriodParams) => {
    const { data } = await api.get('/reports/machines/', { params: p });
    return data;
  },

  getFaults: async (p: PeriodParams) => {
    const { data } = await api.get('/reports/faults/', { params: p });
    return data;
  },

  exportWord: async (params: {
    type:       'production' | 'machines' | 'faults';
    periodParams: PeriodParams;
  }): Promise<void> => {
    const token = await SecureStore.getItemAsync('access_token');
    if (!token) throw new Error('يرجى تسجيل الدخول أولاً');

    const query    = new URLSearchParams({
      type: params.type,
      ...params.periodParams,
    } as any).toString();

    const url      = `${BASE_URL}/reports/export/?${query}`;
    const fileName = `report_${params.type}_${Date.now()}.docx`;
    const localUri = `${FileSystem.cacheDirectory}${fileName}`;

    const result = await FileSystem.downloadAsync(url, localUri, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (result.status !== 200) {
      throw new Error(`فشل التحميل — كود: ${result.status}`);
    }

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(result.uri, {
        mimeType:    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        dialogTitle: 'حفظ التقرير',
        UTI:         'org.openxmlformats.wordprocessingml.document',
      });
    } else {
      throw new Error('مشاركة الملفات غير متاحة على هذا الجهاز');
    }
  },
};