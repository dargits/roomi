import api from './api';
import { LoyaltyTierResponse, LoyaltyTierRequest, MessageResponse } from '../types';

const loyaltyApi = {
  getTiers: async (): Promise<LoyaltyTierResponse[]> => {
    const response = await api.get<LoyaltyTierResponse[]>('/loyalty-tiers');
    return response.data;
  },

  getAllTiers: async (): Promise<LoyaltyTierResponse[]> => {
    const response = await api.get<LoyaltyTierResponse[]>('/loyalty-tiers');
    return response.data;
  },

  createTier: async (data: LoyaltyTierRequest): Promise<LoyaltyTierResponse> => {
    const response = await api.post<LoyaltyTierResponse>('/loyalty-tiers', data);
    return response.data;
  },

  updateTier: async (id: number | string, data: LoyaltyTierRequest): Promise<LoyaltyTierResponse> => {
    const response = await api.put<LoyaltyTierResponse>(`/loyalty-tiers/${id}`, data);
    return response.data;
  },

  deleteTier: async (id: number | string): Promise<MessageResponse> => {
    const response = await api.delete<MessageResponse>(`/loyalty-tiers/${id}`);
    return response.data;
  },
};

export { loyaltyApi };
export default loyaltyApi;
