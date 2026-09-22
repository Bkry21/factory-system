import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { shiftService } from '../services/shiftService';
import type { User, Shift } from '../types';
import { AppState } from 'react-native';

interface AuthState {
  user:            User | null;
  isLoading:       boolean;
  isAuthenticated: boolean;
  activeShift:     Shift | null;
  setActiveShift:  (s: Shift | null) => void;
  login:           (username: string, password: string) => Promise<void>;
  logout:          () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,            setUser]            = useState<User | null>(null);
  const [isLoading,       setIsLoading]       = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeShift,     setActiveShift]     = useState<Shift | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const saved = await authService.getCurrentUser();
        if (saved) {
          setUser(saved);
          setIsAuthenticated(true);
          // جيب الوردية مرة واحدة عند بداية التطبيق
          const shift = await shiftService.getActive();
          setActiveShift(shift);
        }
      } catch {
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
  const sub = AppState.addEventListener('change', async (state) => {
    if (state === 'active' && isAuthenticated) {
      const shift = await shiftService.getActive();
      setActiveShift(shift);
    }
  });
  return () => sub.remove();
}, [isAuthenticated]);

  const login = useCallback(async (username: string, password: string) => {
    const u = await authService.login(username, password);
    setUser(u);
    setIsAuthenticated(true);
    const shift = await shiftService.getActive();
    setActiveShift(shift);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setActiveShift(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, isLoading, isAuthenticated,
      activeShift, setActiveShift,
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