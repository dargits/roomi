import api from './api';

const hotelSettingApi = {
  /**
   * Lấy cấu hình cơ sở (Dành cho khách - không cần Token)
   * Endpoint: GET /api/v1/hotel-setting/public
   */
  getPublicSetting: async () => {
    const response = await api.get('/hotel-setting/public');
    return response.data;
  },

  /**
   * Lấy cấu hình cơ sở (Dành cho phần quản trị - Cần Token)
   * Endpoint: GET /api/v1/hotel-setting
   */
  getAdminSetting: async () => {
    const response = await api.get('/hotel-setting');
    return response.data;
  },

  /**
   * Cập nhật thông tin cấu hình của cơ sở (Cần Token + Quyền OWNER)
   * Endpoint: PUT /api/v1/hotel-setting
   * @param {Object} data - Dữ liệu cấu hình cần cập nhật
   */
  updateSetting: async (data) => {
    const response = await api.put('/hotel-setting', data);
    return response.data;
  },
};

export default hotelSettingApi;
