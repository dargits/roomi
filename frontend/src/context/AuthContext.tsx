import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import authApi from '../services/authApi';
import { UserResponse } from '../types';

export interface LoginResult {
  success: boolean;
  user?: UserResponse;
  message?: string;
}

export interface AuthContextType {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (account: string, password: string, rememberMe?: boolean) => Promise<LoginResult>;
  logout: () => void;
  updateUser: (updatedUser: UserResponse) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  const login = async (account: string, password: string, rememberMe = false): Promise<LoginResult> => {
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
        return { success: true, user: data.user };
      } else {
        return { success: false, message: 'Phản hồi không chứa token' };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || error.message || 'Lỗi kết nối đến máy chủ';
      return { success: false, message };
    }
  };

  const updateUser = (updatedUser: UserResponse): void => {
    setUser(updatedUser);
    if (localStorage.getItem('staygo_user')) {
      localStorage.setItem('staygo_user', JSON.stringify(updatedUser));
    }
    if (sessionStorage.getItem('staygo_user')) {
      sessionStorage.setItem('staygo_user', JSON.stringify(updatedUser));
    }
  };

  const logout = (): void => {
    localStorage.removeItem('staygo_token');
    localStorage.removeItem('staygo_user');
    sessionStorage.removeItem('staygo_token');
    sessionStorage.removeItem('staygo_user');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
