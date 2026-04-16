import { useState, useCallback, useContext, createContext, type ReactNode } from "react";
import { api, setToken, getToken } from "../lib/api";
import type { AuthResponse } from "../types";

interface AuthState {
  isAuthenticated: boolean;
  userName: string;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredAuth(): AuthState {
  const token = getToken();
  const name = localStorage.getItem("healthtracker_userName");
  if (token && name) {
    return { isAuthenticated: true, userName: name };
  }
  return { isAuthenticated: false, userName: "" };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(getStoredAuth);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    localStorage.setItem("healthtracker_userName", data.user.name);
    setAuth({ isAuthenticated: true, userName: data.user.name });
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const data = await api<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    setToken(data.token);
    localStorage.setItem("healthtracker_userName", data.user.name);
    setAuth({ isAuthenticated: true, userName: data.user.name });
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem("healthtracker_userName");
    setAuth({ isAuthenticated: false, userName: "" });
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
