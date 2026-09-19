import React, { ReactNode } from 'react';
import { AppConfigProvider } from '../context/AppConfigContext';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * AppProviders — Tập trung toàn bộ Context Providers vào một component duy nhất.
 *
 * Thứ tự Provider quan trọng:
 * 1. AppConfigProvider  → cung cấp config khách sạn (public, không cần auth)
 * 2. AuthProvider       → quản lý session, phụ thuộc vào config
 * 3. ToastProvider      → thông báo UI, có thể dùng ở mọi nơi
 *
 * @example
 *   // Trong AppRoutes.tsx hoặc main.tsx:
 *   <AppProviders>
 *     <BrowserRouter>...</BrowserRouter>
 *   </AppProviders>
 */
const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <AppConfigProvider>
      <AuthProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>
    </AppConfigProvider>
  );
};

export default AppProviders;
