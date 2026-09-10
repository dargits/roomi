import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiErrorResponse } from '../types';
import { env } from '../configs/env.config';
import { STORAGE_KEYS } from '../constants';

// Create an Axios instance
const api: AxiosInstance = axios.create({
  baseURL: env.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach token to headers
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN) || sessionStorage.getItem(STORAGE_KEYS.TOKEN);
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
