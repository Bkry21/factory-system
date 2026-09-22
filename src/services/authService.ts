import * as SecureStore from 'expo-secure-store';
import api from './api';
import type { User } from '../types';

export const authService = {

  login: async (username: string, password: string): Promise<User> => {
    const { data } = await api.post('/auth/login/', { username, password });
    await SecureStore.setItemAsync('access_token', data.access);
    await SecureStore.setItemAsync('refresh_token', data.refresh);
    const { data: userData } = await api.get('/auth/me/');
    return userData;
  },

  logout: async (): Promise<void> => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
  },

  getCurrentUser: async (): Promise<User | null> => {
    const token = await SecureStore.getItemAsync('access_token');
    if (!token) return null;
    try {
      const { data } = await api.get('/auth/me/');
      return data;
    } catch {
      return null;
    }
  },
};