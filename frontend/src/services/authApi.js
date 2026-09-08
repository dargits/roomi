import api from './api';

const authApi = {
  /**
   * Đăng nhập (Login)
   * Endpoint: POST /api/v1/auth/login
   * @param {string} account - Tài khoản của người dùng
   * @param {string} password - Mật khẩu
   * @returns {Promise} Trả về Token và thông tin user
   */
  login: async (account, password) => {
    const response = await api.post('/auth/login', {
      account,
      password
    });
    return response.data;
  },
  
  /**
   * Đăng ký tài khoản (Register) - Dành cho ADMIN/OWNER
   * Endpoint: POST /api/v1/auth/register
   * @param {Object} data - Thông tin người dùng cần đăng ký
   * @returns {Promise} Trả về message thành công
   */
  register: async (data) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  }
};

export default authApi;
