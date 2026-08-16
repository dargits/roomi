import axios from 'axios';

const getBaseURL = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // Nếu đang chạy dev cục bộ
  if (import.meta.env.DEV) {
    return 'http://localhost:8080/api/v1';
  }
  // Trên production / mobile: Dùng relative path để tự động trỏ về domain hiện tại
  return '/api/v1';
};

// Create an Axios instance
const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach token to headers
api.interceptors.request.use(
  (config) => {
    // You can customize where you store your token. Here we use localStorage or sessionStorage.
    const token = localStorage.getItem('staygo_token') || sessionStorage.getItem('staygo_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized (Token expired or invalid)
    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized access. Token might be expired.');
      // Optional: Handle auto-logout or redirect to login page here
      // localStorage.removeItem('staygo_token');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
