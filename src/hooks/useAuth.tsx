import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, registerUnauthorizedHandler, setAuthToken } from '../services/api.ts';

export interface AuthUser {
  adminId: number;
  fullName: string;
  email: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  initialized: boolean | null;
  envConfigured: boolean;
  loadingStatus: boolean;
  refreshStatus: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  setupAdmin: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initialized, setInitialized] = useState<boolean | null>(null);
  const [envConfigured, setEnvConfigured] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  const refreshStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await api.get<{
        success: boolean;
        data: { initialized: boolean; envConfigured: boolean };
      }>('/auth/status');
      setInitialized(res.data.data.initialized);
      setEnvConfigured(res.data.data.envConfigured);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(logout);
    void refreshStatus();
  }, [logout, refreshStatus]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{
      success: boolean;
      data: { token: string; user: AuthUser };
    }>('/auth/login', { email, password });
    setAuthToken(res.data.data.token);
    setUser(res.data.data.user);
    setInitialized(true);
  }, []);

  const setupAdmin = useCallback(async (fullName: string, email: string, password: string) => {
    const res = await api.post<{
      success: boolean;
      data: { token: string; user: AuthUser };
    }>('/auth/setup', { fullName, email, password });
    setAuthToken(res.data.data.token);
    setUser(res.data.data.user);
    setInitialized(true);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        initialized,
        envConfigured,
        loadingStatus,
        refreshStatus,
        login,
        setupAdmin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
