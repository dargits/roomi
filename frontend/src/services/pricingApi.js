import api from './api';

const pricingApi = {
  // Giá cuối tuần
  getWeekendConfigs: async (roomTypeId) => {
    const response = await api.get(`/pricing/weekend/${roomTypeId}`);
    return response.data;
  },

  saveWeekendConfig: async (data) => {
    const response = await api.post('/pricing/weekend', data);
    return response.data;
  },

  deleteWeekendConfig: async (id) => {
    const response = await api.delete(`/pricing/weekend/${id}`);
    return response.data;
  },

  // Giá ngày lễ
  getHolidayPrices: async (roomTypeId) => {
    const response = await api.get(`/pricing/holidays/${roomTypeId}`);
    return response.data;
  },

  saveHolidayPrice: async (data) => {
    const response = await api.post('/pricing/holidays', data);
    return response.data;
  },

  deleteHolidayPrice: async (id) => {
    const response = await api.delete(`/pricing/holidays/${id}`);
    return response.data;
  },

  // Bảng chi tiết giá từng đêm & phụ thu
  getPriceBreakdown: async (params) => {
    const response = await api.get('/pricing/breakdown', { params });
    return response.data;
  },
};

export default pricingApi;
