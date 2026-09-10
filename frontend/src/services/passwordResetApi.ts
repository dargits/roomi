import api from './api';
import {
  PasswordResetItemResponse,
  ForceChangePasswordRequest,
  ForgotPasswordRequest,
  AccountCheckResponse,
  MessageResponse
} from '../types';

export type { AccountCheckResponse };

export const passwordResetApi = {
  // Kiểm tra tài khoản có tồn tại trong hệ thống hay không (Public)
  checkAccount: async (account: string): Promise<AccountCheckResponse> => {
    const response = await api.get<AccountCheckResponse>('/auth/check-account', { params: { account } });
    return response.data;
  },

  // Yêu cầu cấp lại mật khẩu khi quên (Public)
  requestReset: async (account: string): Promise<MessageResponse> => {
    const response = await api.post<MessageResponse>('/auth/forgot-password', { account } as ForgotPasswordRequest);
    return response.data;
  },

  // Đổi mật khẩu bắt buộc sau khi đăng nhập bằng mật khẩu tạm
  forceChangePassword: async (data: ForceChangePasswordRequest): Promise<MessageResponse> => {
    const response = await api.post<MessageResponse>('/auth/force-change-password', data);
    return response.data;
  },

  // Quản trị viên xem tất cả yêu cầu
  getAllRequests: async (): Promise<PasswordResetItemResponse[]> => {
    const response = await api.get<PasswordResetItemResponse[]>('/admin/password-resets');
    return response.data;
  },

  // Quản trị viên cấp mật khẩu tạm
  issueTempPassword: async (id: number | string): Promise<{ message: string; temporaryPassword?: string }> => {
    const response = await api.post(`/admin/password-resets/${id}/issue`);
    return response.data;
  },

  // Quản trị viên từ chối yêu cầu cấp lại mật khẩu
  rejectRequest: async (id: number | string): Promise<MessageResponse> => {
    const response = await api.post<MessageResponse>(`/admin/password-resets/${id}/reject`);
    return response.data;
  },

  // Quản trị viên lấy số lượng yêu cầu đang chờ cấp (PENDING)
  getPendingCount: async (): Promise<{ count: number }> => {
    const response = await api.get('/admin/password-resets/pending-count');
    return response.data;
  },
};

export const notifyPasswordResetUpdated = (): void => {
  window.dispatchEvent(new Event('password-reset-updated'));
};
