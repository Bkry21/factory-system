import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import type { User } from '../types';
import api from '../services/api';
import { registerForPushNotifications, getToken } from '../services/notificationService';

interface AuthState {
  user:            User | null;
  isLoading:       boolean;
  isAuthenticated: boolean;
  login:           (username: string, password: string) => Promise<void>;
  logout:          () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,            setUser]            = useState<User | null>(null);
  const [isLoading,       setIsLoading]       = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

useEffect(() => {
  (async () => {
    try {
      const saved = await authService.getCurrentUser();
      if (saved) {
        setUser(saved);
        setIsAuthenticated(true);
        await registerForPushNotifications();
      }
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  })();
}, []);

const login = useCallback(async (username: string, password: string) => {
  const u = await authService.login(username, password);
  setUser(u);
  setIsAuthenticated(true);
  await registerForPushNotifications();
}, []);

const logout = useCallback(async () => {
  try {
    const pushToken = await getToken();
    await api.post('/auth/logout/', { push_token: pushToken });
  } catch {
    // ما يوقف الخروج لو فشل
  }
  await authService.logout();
  setUser(null);
  setIsAuthenticated(false);
}, []);

  return (
    <AuthContext.Provider value={{
      user, isLoading, isAuthenticated,
      login, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthState => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};