import React, { useEffect } from 'react';
import { I18nManager } from 'react-native';
import * as Updates from 'expo-updates';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/hooks/useAuth';
import { ThemeProvider } from './src/context/ThemeContext';
import { useDialog } from './src/components/ui/AppDialog';
import { 
  registerForPushNotifications, 
} from './src/services/notificationService';

I18nManager.forceRTL(true);
I18nManager.allowRTL(true);

function AppContent() {
  const { show: showDialog, dialog } = useDialog();

  useEffect(() => {
    // 1. تسجيل الجهاز للحصول على التوكن وحفظه في الباك إند
    registerForPushNotifications();


    // 3. التحقق المباشر من التحديثات عند فتح التطبيق
    checkForUpdates();
  }, []);

  async function checkForUpdates() {
    try {
      if (__DEV__) return;
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        showDialog(
          'success', 'تحديث جديد',
          'تم تحميل تحديث جديد، سيتم إعادة التشغيل الآن لتطبيقه.',
          [{ text: 'حسناً', onPress: () => Updates.reloadAsync() }]
        );
      }
    } catch (e) {
      // إغفال الخطأ في البيئة المحلية
    }
  }

  return (
    <>
      <RootNavigator />
      {dialog}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

