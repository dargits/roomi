import api from './api';
import { LoginResponse, RegisterRequest, MessageResponse } from '../types';

const authApi = {
  /**
   * Đăng nhập (Login)
   * Endpoint: POST /api/v1/auth/login
   */
  login: async (account: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', {
      account,
      password
    });
    return response.data;
  },

  /**
   * Đăng ký tài khoản (Register) - Dành cho ADMIN/OWNER
   * Endpoint: POST /api/v1/auth/register
   */
  register: async (data: RegisterRequest): Promise<MessageResponse> => {
    const response = await api.post<MessageResponse>('/auth/register', data);
    return response.data;
  }
};

export default authApi;
