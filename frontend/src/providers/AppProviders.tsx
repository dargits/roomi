import React, { ReactNode } from 'react';
import { GlobalErrorBoundary } from '../components/common/GlobalErrorBoundary';
import { AppConfigProvider } from '../context/AppConfigContext';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Enterprise Unified Providers
 * Consolidates all root-level contexts and error boundary into a single wrapper.
 * Keeps App.tsx clean and simple.
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <GlobalErrorBoundary>
      <AppConfigProvider>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </AppConfigProvider>
    </GlobalErrorBoundary>
  );
};

export default AppProviders;
