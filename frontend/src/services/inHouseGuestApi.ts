import api from './api';
import { InHouseGuestResponse, InHouseFilterParams, InHouseFilterOptions, InHouseSummary } from '../types/booking';

export const inHouseGuestApi = {
  getInHouseGuests: async (params?: InHouseFilterParams): Promise<InHouseGuestResponse[]> => {
    const cleanParams: Record<string, any> = {};
    if (params) {
      if (params.floor && params.floor !== 'ALL') cleanParams.floor = params.floor;
      if (params.roomTypeId && params.roomTypeId !== 'ALL') cleanParams.roomTypeId = params.roomTypeId;
      if (params.checkingOutToday) cleanParams.checkingOutToday = true;
      if (typeof params.hasDebt === 'boolean') cleanParams.hasDebt = params.hasDebt;
      if (params.search && params.search.trim()) cleanParams.search = params.search.trim();
    }
    const response = await api.get<InHouseGuestResponse[]>('/in-house-guests', { params: cleanParams });
    return response.data;
  },

  getFilterOptions: async (): Promise<InHouseFilterOptions> => {
    const response = await api.get<InHouseFilterOptions>('/in-house-guests/filter-options');
    return response.data;
  },

  getSummary: async (): Promise<InHouseSummary> => {
    const response = await api.get<InHouseSummary>('/in-house-guests/summary');
    return response.data;
  }
};

export default inHouseGuestApi;

