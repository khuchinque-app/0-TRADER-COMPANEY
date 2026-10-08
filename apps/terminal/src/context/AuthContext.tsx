import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:11110';

interface User {
  id: string;
  email: string;
  name: string;
  balance_usdt: number;
  balance_idr: number;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  socialLogin: (provider: string, email: string, name: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = React.createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [isLoading, setIsLoading] = useState(false);

  // Load user on mount
  useEffect(() => {
    if (token) {
      fetchUser();
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data.data);
    } catch {
      logout();
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      const { token, data } = response.data;
      localStorage.setItem('auth_token', token);
      setToken(token);
      setUser(data);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, { email, password, name });
      const { token, data } = response.data;
      localStorage.setItem('auth_token', token);
      setToken(token);
      setUser(data);
    } finally {
      setIsLoading(false);
    }
  };

  const socialLogin = async (provider: string, email: string, name: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/social-login`, { provider, email, name });
      const { token, data } = response.data;
      localStorage.setItem('auth_token', token);
      setToken(token);
      setUser(data);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, socialLogin, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
