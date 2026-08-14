import React, { createContext, useState, useContext, useEffect } from 'react';
import authApi from '../services/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Khôi phục session khi tải lại trang
  useEffect(() => {
    const token = localStorage.getItem('staygo_token') || sessionStorage.getItem('staygo_token');
    const storedUser = localStorage.getItem('staygo_user') || sessionStorage.getItem('staygo_user');
    
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch (e) {
        console.error('Failed to parse stored user data', e);
        logout();
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (account, password, rememberMe = false) => {
    try {
      const data = await authApi.login(account, password);
      if (data.token) {
        if (rememberMe) {
          localStorage.setItem('staygo_token', data.token);
          localStorage.setItem('staygo_user', JSON.stringify(data.user));
        } else {
          sessionStorage.setItem('staygo_token', data.token);
          sessionStorage.setItem('staygo_user', JSON.stringify(data.user));
        }
        setUser(data.user);
        setIsAuthenticated(true);
        return { success: true };
      } else {
        return { success: false, message: 'Phản hồi không chứa token' };
      }
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || error.message || 'Lỗi kết nối đến máy chủ';
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem('staygo_token');
    localStorage.removeItem('staygo_user');
    sessionStorage.removeItem('staygo_token');
    sessionStorage.removeItem('staygo_user');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
