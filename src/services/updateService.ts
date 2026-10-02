import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

export async function handleAppUpdateCheck(latestVersion?: string) {
  if (__DEV__) return;

  try {
    const update = await Updates.checkForUpdateAsync();

    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();

      Alert.alert(
        'تحديث جديد متوفر 🚀',
        `يتوفر إصدار جديد من التطبيق (${latestVersion || 'تحديث جديد'}). هل تريد تطبيق التحديث الآن؟`,
        [
          { text: 'لاحقاً', style: 'cancel' },
          { 
            text: 'تحديث الآن', 
            onPress: async () => {
              await Updates.reloadAsync();
            } 
          }
        ]
      );
    }
  } catch (error) {
    console.log('Error checking updates:', error);
  }
}