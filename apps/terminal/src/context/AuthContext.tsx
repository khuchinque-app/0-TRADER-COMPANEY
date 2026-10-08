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
      const { token } = response.data;
      localStorage.setItem('auth_token', token);
      setToken(token);
      // Fetch user details
      const userResponse = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser({ ...userResponse.data, name: userResponse.data.email.split('@')[0] });
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/signup`, { email, password });
      // Auto-login after signup
      const loginResponse = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      const { token } = loginResponse.data;
      localStorage.setItem('auth_token', token);
      setToken(token);
      setUser({ id: response.data.userId, email, name, balance_usdt: 10000, balance_idr: 10000 * 15850, created_at: new Date().toISOString() });
    } finally {
      setIsLoading(false);
    }
  };

  const socialLogin = async (provider: string, _email: string, name: string) => {
    setIsLoading(true);
    try {
      // For social login, create a guest account first
      const response = await axios.post(`${API_URL}/api/auth/guest`);
      const { token } = response.data;
      localStorage.setItem('auth_token', token);
      setToken(token);
      setUser({ id: response.data.userId, email: `${name.toLowerCase()}_user@example.com`, name, balance_usdt: 10000, balance_idr: 10000 * 15850, created_at: new Date().toISOString() });
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
