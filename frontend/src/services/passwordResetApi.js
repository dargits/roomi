import api from './api';

export const passwordResetApi = {
  // Yêu cầu cấp lại mật khẩu khi quên (Public)
  requestReset: async (account) => {
    const response = await api.post('/auth/forgot-password', { account });
    return response.data;
  },

  // Đổi mật khẩu bắt buộc sau khi đăng nhập bằng mật khẩu tạm
  forceChangePassword: async (data) => {
    const response = await api.post('/auth/force-change-password', data);
    return response.data;
  },

  // Quản trị viên xem tất cả yêu cầu
  getAllRequests: async () => {
    const response = await api.get('/admin/password-resets');
    return response.data;
  },

  // Quản trị viên cấp mật khẩu tạm
  issueTempPassword: async (id) => {
    const response = await api.post(`/admin/password-resets/${id}/issue`);
    return response.data;
  },

  // Quản trị viên lấy số lượng yêu cầu đang chờ cấp (PENDING)
  getPendingCount: async () => {
    const response = await api.get('/admin/password-resets/pending-count');
    return response.data;
  },
};

export const notifyPasswordResetUpdated = () => {
  window.dispatchEvent(new Event('password-reset-updated'));
};
