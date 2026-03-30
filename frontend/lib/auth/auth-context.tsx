import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { postJson } from '@/lib/api/client';

type AuthState = {
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

type LoginResp = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

type RegisterResp = {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    const res = await postJson<{ email: string; password: string }, LoginResp>('/auth/login', {
      email,
      password,
    });
    setToken(res.accessToken);
  }, []);

  const register = useCallback(async (email: string, password: string, username: string) => {
    const res = await postJson<
      { email: string; password: string; username: string },
      RegisterResp
    >('/auth/register', {
      email,
      password,
      username,
    });
    setToken(res.accessToken);
  }, []);

  const logout = useCallback(() => setToken(null), []);

  const value = useMemo<AuthState>(
    () => ({
      token,
      login,
      register,
      logout,
    }),
    [token, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthState => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
