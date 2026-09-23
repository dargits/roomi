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
    const status = error.response?.status;
    const msg = extractErrorMessage(error, '');

    // Kiểm tra nếu là lỗi phân quyền (Forbidden / Không đủ quyền hạn)
    // Tuyệt đối KHÔNG đăng xuất, KHÔNG xóa token và KHÔNG chuyển hướng về login
    const isPermissionError =
      status === 403 ||
      (msg && (
        msg.toLowerCase().includes('quyền') ||
        msg.toLowerCase().includes('chỉ chủ sở hữu') ||
        msg.toLowerCase().includes('chỉ owner') ||
        msg.toLowerCase().includes('chỉ admin') ||
        msg.toLowerCase().includes('chỉ lễ tân') ||
        msg.toLowerCase().includes('dành cho') ||
        msg.toLowerCase().includes('không được phép')
      ));

    if (isPermissionError) {
      console.warn('[API] Permission denied (không đủ quyền hạn) — giữ nguyên phiên đăng nhập:', msg);
      return Promise.reject(error);
    }

    // Chỉ khi là 401 thực sự (hết phiên đăng nhập, token không hợp lệ hoặc bị hủy phiên từ xa)
    if (status === 401) {
      console.warn('[API] Unauthorized — token có thể đã hết hạn hoặc bị kết thúc.');
      const logoutMsg = msg || 'Phiên đăng nhập đã hết hạn hoặc bị kết thúc từ xa.';
      
      // Không ghi đè nếu đang ở màn hình login
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        sessionStorage.setItem('stayaway_logout_reason', logoutMsg);
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
        sessionStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem('staygo_token');
        localStorage.removeItem('staygo_user');
        sessionStorage.removeItem('staygo_token');
        sessionStorage.removeItem('staygo_user');
        
        // Điều hướng mượt mà về login
        window.location.href = '/login';
      }
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
    if (typeof data === 'string') {
      const trimmed = data.trim();
      if (trimmed.startsWith('<')) {
        if (error.response?.status === 401) {
          return 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.';
        }
        if (error.response?.status === 403) {
          return 'Bạn không có quyền thực hiện thao tác này.';
        }
        return defaultMsg;
      }
      return data;
    }
    if (data.message && typeof data.message === 'string') return data.message;
    // Spring validation errors format: { field: "message", ... }
    const firstFieldErr = Object.entries(data).find(
      ([key, val]) => key !== 'timestamp' && key !== 'status' && typeof val === 'string'
    );
    if (firstFieldErr) return firstFieldErr[1] as string;
  }

  if (error.response?.status === 401) {
    return 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.';
  }

  return error.message || defaultMsg;
};

export default api;
