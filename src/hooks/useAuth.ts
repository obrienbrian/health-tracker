import { useState, useCallback } from "react";

const AUTH_STORAGE_KEY = "healthtracker_auth";

interface AuthState {
  isAuthenticated: boolean;
  userName: string;
}

function getStoredAuth(): AuthState {
  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as AuthState;
    } catch {
      // Fall through to default
    }
  }
  return { isAuthenticated: false, userName: "" };
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>(getStoredAuth);

  const login = useCallback((_email: string, _password: string) => {
    const name = _email
      .split("@")[0]
      .replace(/[._-]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const newAuth: AuthState = { isAuthenticated: true, userName: name };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newAuth));
    setAuth(newAuth);
  }, []);

  const logout = useCallback(() => {
    const newAuth: AuthState = { isAuthenticated: false, userName: "" };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newAuth));
    setAuth(newAuth);
  }, []);

  return {
    isAuthenticated: auth.isAuthenticated,
    userName: auth.userName,
    login,
    logout,
  };
}
