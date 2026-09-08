import api from './api';

const loyaltyApi = {
  getTiers: async () => {
    const response = await api.get('/loyalty-tiers');
    return response.data;
  },

  // alias for backward compat
  getAllTiers: async () => {
    const response = await api.get('/loyalty-tiers');
    return response.data;
  },

  createTier: async (data) => {
    const response = await api.post('/loyalty-tiers', data);
    return response.data;
  },

  updateTier: async (id, data) => {
    const response = await api.put(`/loyalty-tiers/${id}`, data);
    return response.data;
  },

  deleteTier: async (id) => {
    const response = await api.delete(`/loyalty-tiers/${id}`);
    return response.data;
  },
};

export { loyaltyApi };
export default loyaltyApi;
