import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('recruitx_user') || localStorage.getItem('talentiq_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('recruitx_token') || localStorage.getItem('talentiq_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const resp = await authApi.getMe();
          if (resp.data && resp.data.user) {
            setUser(resp.data.user);
            localStorage.setItem('recruitx_user', JSON.stringify(resp.data.user));
            localStorage.removeItem('talentiq_user');
          }
        } catch (err) {
          console.warn('Session verification failed, clearing auth.');
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = (authToken, authUser) => {
    localStorage.setItem('recruitx_token', authToken);
    localStorage.setItem('recruitx_user', JSON.stringify(authUser));
    localStorage.removeItem('talentiq_token');
    localStorage.removeItem('talentiq_user');
    setToken(authToken);
    setUser(authUser);
  };

  const logout = () => {
    localStorage.removeItem('recruitx_token');
    localStorage.removeItem('recruitx_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
