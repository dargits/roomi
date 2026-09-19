import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { STORAGE_KEYS, API_CONFIG } from '../constants';
import { ApiErrorResponse } from '../types';

// ── Base URL ──────────────────────────────────────────────────────────────────
const getBaseURL = (): string => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL as string;
  }
  // Khi chạy local dev (npm run dev)
  if (import.meta.env.DEV) {
    return 'http://localhost:8080/api/v1';
  }
  // Môi trường production: dùng relative path để tự động theo đúng domain hiện tại
  return '/api/v1';
};

// ── Tạo Axios Instance ────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor: Đính kèm JWT token ───────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token =
      localStorage.getItem(STORAGE_KEYS.TOKEN) ||
      sessionStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// ── Response Interceptor: Xử lý lỗi chung ────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<ApiErrorResponse>) => {
    if (error.response && error.response.status === 401) {
      console.warn('[API] Unauthorized — token có thể đã hết hạn.');
    }
    return Promise.reject(error);
  }
);

// ── Helper: Trích xuất thông báo lỗi chuẩn hóa ───────────────────────────────
/**
 * Trích xuất error message từ phản hồi của Spring Boot Backend.
 * Hỗ trợ các format: string, { message }, { field: "message" } (validation).
 */
export const extractErrorMessage = (
  error: any,
  defaultMsg = 'Đã có lỗi xảy ra. Vui lòng thử lại.'
): string => {
  if (!error) return defaultMsg;

  if (error.response?.data) {
    const data = error.response.data;
    if (typeof data === 'string') return data;
    if (data.message && typeof data.message === 'string') return data.message;
    // Spring validation errors format: { field: "message", ... }
    const firstFieldErr = Object.entries(data).find(
      ([key, val]) => key !== 'timestamp' && key !== 'status' && typeof val === 'string'
    );
    if (firstFieldErr) return firstFieldErr[1] as string;
  }

  return error.message || defaultMsg;
};

export default api;
