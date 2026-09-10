/**
 * Enterprise Environment Configuration
 * Type-safe access to Vite environment variables with intelligent fallbacks.
 */
export const env = {
  API_BASE_URL: (import.meta.env.VITE_API_BASE_URL as string) || 
    (import.meta.env.DEV ? 'http://localhost:8080/api/v1' : '/api/v1'),
  IS_DEV: Boolean(import.meta.env.DEV),
  IS_PROD: Boolean(import.meta.env.PROD),
  APP_TITLE: (import.meta.env.VITE_APP_TITLE as string) || 'Roomi - Quản lý khách sạn',
} as const;
