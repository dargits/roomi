import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach the Authorization token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('roomi_token');
    if (token) {
      // Send the token directly as the Authorization header (no "Bearer " prefix)
      config.headers['Authorization'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to format error messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let errorMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
    let errorCode = 'SYS_001';

    if (error.response && error.response.data) {
      const data = error.response.data;
      if (data.mess) {
        errorMessage = data.mess;
      }
      if (data.code) {
        errorCode = data.code;
      }
    }

    const formattedError = new Error(errorMessage);
    formattedError.code = errorCode;
    formattedError.status = error.response ? error.response.status : 500;
    formattedError.originalError = error;

    return Promise.reject(formattedError);
  }
);

export default api;
