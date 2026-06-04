import axios from "axios";
import React, { createContext, useContext, useEffect, useState } from "react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8002';
export const API = `${BACKEND_URL}/api`;

const TOKEN_KEY = "miq_token";
const USER_KEY = "miq_user";

export const apiClient = axios.create({ baseURL: API });

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await apiClient.post("/auth/login", { email, password });
      setToken(data.access_token);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const { data } = await apiClient.post("/auth/register", payload);
      setToken(data.access_token);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  return (
    <AuthCtx.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

export function fileUrl(path) {
  const token = localStorage.getItem(TOKEN_KEY);
  return `${API}/files/${path}?auth=${encodeURIComponent(token || "")}`;
}
