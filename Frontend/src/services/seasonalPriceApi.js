import api from './api';

const seasonalPriceApi = {
  /**
   * Lấy tất cả giá theo mùa của một loại phòng
   * GET /api/v1/room-types/{roomTypeId}/seasonal-prices
   * Role: OWNER
   */
  getAll: async (roomTypeId) => {
    const response = await api.get(`/room-types/${roomTypeId}/seasonal-prices`);
    return response.data;
  },

  /**
   * Tạo mới giá theo mùa
   * POST /api/v1/room-types/{roomTypeId}/seasonal-prices
   * Body: { startDate, endDate, pricePerNight }
   */
  create: async (roomTypeId, data) => {
    const response = await api.post(`/room-types/${roomTypeId}/seasonal-prices`, data);
    return response.data;
  },

  /**
   * Cập nhật giá theo mùa
   * PUT /api/v1/room-types/{roomTypeId}/seasonal-prices/{priceId}
   */
  update: async (roomTypeId, priceId, data) => {
    const response = await api.put(`/room-types/${roomTypeId}/seasonal-prices/${priceId}`, data);
    return response.data;
  },

  /**
   * Xóa giá theo mùa
   * DELETE /api/v1/room-types/{roomTypeId}/seasonal-prices/{priceId}
   */
  delete: async (roomTypeId, priceId) => {
    const response = await api.delete(`/room-types/${roomTypeId}/seasonal-prices/${priceId}`);
    return response.data;
  }
};

export default seasonalPriceApi;
