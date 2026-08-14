import api from './api';

const userApi = {
  /**
   * Lấy thông tin tài khoản đang đăng nhập
   * Endpoint: GET /api/v1/users/me
   */
  getProfile: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },

  /**
   * Cập nhật thông tin tài khoản đang đăng nhập
   * Endpoint: PUT /api/v1/users/me
   * @param {Object} data - Thông tin cập nhật (name, phone, email)
   */
  updateProfile: async (data) => {
    const response = await api.put('/users/me', data);
    return response.data;
  },

  /**
   * Đổi mật khẩu
   * Endpoint: PUT /api/v1/users/me/password
   * @param {string} oldPassword 
   * @param {string} newPassword 
   */
  changePassword: async (oldPassword, newPassword) => {
    const response = await api.put('/users/me/password', {
      oldPassword,
      newPassword
    });
    return response.data;
  },

  /** ADMIN/OWNER: Lấy danh sách toàn bộ nhân sự */
  getAllUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },

  /** ADMIN/OWNER: Cập nhật thông tin nhân viên */
  updateUserByAdmin: async (id, data) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  /** ADMIN/OWNER: Đổi vai trò (Role) của nhân viên */
  updateUserRole: async (id, role) => {
    const response = await api.put(`/users/${id}/role?role=${role}`);
    return response.data;
  },

  /** ADMIN/OWNER: Khóa tài khoản nhân viên */
  lockUser: async (id) => {
    const response = await api.put(`/users/${id}/lock`);
    return response.data;
  },

  /** ADMIN/OWNER: Mở khóa tài khoản nhân viên */
  unlockUser: async (id) => {
    const response = await api.put(`/users/${id}/unlock`);
    return response.data;
  }
};

export default userApi;
