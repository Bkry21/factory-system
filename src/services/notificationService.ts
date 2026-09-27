import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// طلب صلاحية الإشعارات وجيب الـ token
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('الإشعارات تشتغل على جهاز حقيقي فقط');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('المستخدم رفض صلاحية الإشعارات');
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: '2a03c759-3310-4f10-ae26-dc0a39da709b',
  })).data;

await api.post('/auth/notifications/register-token/', { token });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}

export async function getToken(): Promise<string | null> {
  try {
    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: '2a03c759-3310-4f10-ae26-dc0a39da709b',
    })).data;
    return token;
  } catch {
    return null;
  }
}