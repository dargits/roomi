import api from './api';

export const loyaltyApi = {
  // Lấy danh sách hạng thành viên
  getAllTiers: async () => {
    const response = await api.get('/loyalty-tiers');
    return response.data;
  },
  // (Optional - Các API khác theo cấu trúc nếu cần)
};
