import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { postJson } from '@/lib/api/client';
import { session } from './session';
import { sessionUserId } from './session-user';

type AuthState = {
  token: string | null;
  userId: string | null;
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const unsubscribe = session.subscribe(() => setToken(session.current?.accessToken ?? null));
    void session.restore().finally(() => {
      if (active) {
        setToken(session.current?.accessToken ?? null);
        setIsLoading(false);
      }
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await postJson<{ email: string; password: string }, LoginResp>('/auth/login', {
      email,
      password,
    });
    await session.set(res);
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
    await session.set(res);
  }, []);

  const logout = useCallback(() => {
    const refreshToken = session.current?.refreshToken;
    void session.clear().catch(() => {});
    if (refreshToken) void postJson('/auth/logout', { refreshToken }).catch(() => {});
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      token,
      userId: sessionUserId(token),
      isLoading,
      login,
      register,
      logout,
    }),
    [token, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthState => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
