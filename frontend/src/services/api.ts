import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiErrorResponse } from '../types';

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

// Create an Axios instance
const api: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach token to headers
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('staygo_token') || sessionStorage.getItem('staygo_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<ApiErrorResponse>) => {
    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized access. Token might be expired.');
    }
    return Promise.reject(error);
  }
);

/**
 * Trích xuất thông báo lỗi chuẩn hóa từ phản hồi của Spring Boot Backend
 */
export const extractErrorMessage = (error: any, defaultMsg = 'Đã có lỗi xảy ra. Vui lòng thử lại.'): string => {
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
