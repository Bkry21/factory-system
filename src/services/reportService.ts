import api from './api';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
// legacy = نفس الـ API القديم متاح في النسخة الجديدة
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';
import type { ProductionReport, MachineReport, FaultReport } from '../types';

const BASE_URL = 'https://sublime-caring-production-efd3.up.railway.app/api';

export const reportService = {

  getProduction: async (
    period: 'daily' | 'weekly' | 'monthly',
    department?: string,
    date?: string,
  ): Promise<ProductionReport> => {
    const params: any = { period };
    if (department) params.department = department;
    if (date)       params.date       = date;
    const { data } = await api.get('/reports/production/', { params });
    return data;
  },

  getMachines: async (
    period: 'daily' | 'weekly' | 'monthly',
    department?: string,
  ): Promise<MachineReport> => {
    const params: any = { period };
    if (department) params.department = department;
    const { data } = await api.get('/reports/machines/', { params });
    return data;
  },

  getFaults: async (
    period: 'daily' | 'weekly' | 'monthly',
    date?: string,
  ): Promise<FaultReport> => {
    const params: any = { period };
    if (date) params.date = date;
    const { data } = await api.get('/reports/faults/', { params });
    return data;
  },

  export: async (params: {
    type:        'production' | 'machines' | 'faults';
    period:      'daily' | 'weekly' | 'monthly';
    file_format: 'excel' | 'pdf';
    department?: string;
    date?:       string;
  }): Promise<void> => {

    // ① الـ token
    const token = await SecureStore.getItemAsync('access_token');
    if (!token) {
      Alert.alert('خطأ', 'يرجى تسجيل الدخول أولاً');
      return;
    }

    // ② بناء الـ URL والمسار المحلي
    const query    = new URLSearchParams(params as any).toString();
    const url      = `${BASE_URL}/reports/export/?${query}`;
    const ext      = params.file_format === 'excel' ? 'xlsx' : 'pdf';
    const fileName = `report_${params.type}_${params.period}_${Date.now()}.${ext}`;
    const localUri = `${FileSystem.cacheDirectory}${fileName}`;

    // ③ تحميل الملف مع الـ token
    const downloadResult = await FileSystem.downloadAsync(url, localUri, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (downloadResult.status !== 200) {
      try {
        const body = await FileSystem.readAsStringAsync(downloadResult.uri);
        console.error('Server error body:', body);
      } catch (_) {}
      Alert.alert('خطأ', `فشل التحميل — كود: ${downloadResult.status}`);
      return;
    }

    // ④ شارك الملف
    const mimeType = params.file_format === 'excel'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf';

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(downloadResult.uri, {
        mimeType,
        dialogTitle: 'حفظ التقرير',
        UTI: params.file_format === 'excel'
          ? 'com.microsoft.excel.xlsx'
          : 'com.adobe.pdf',
      });
    } else {
      Alert.alert('تنبيه', 'مشاركة الملفات غير متاحة على هذا الجهاز');
    }
  },
};