import api from './api';
import { SeasonalPriceResponse, SeasonalPriceRequest, MessageResponse } from '../types';

const seasonalPriceApi = {
  /** Lấy tất cả giá theo mùa của một loại phòng */
  getAll: async (roomTypeId: number | string): Promise<SeasonalPriceResponse[]> => {
    const response = await api.get<SeasonalPriceResponse[]>(`/room-types/${roomTypeId}/seasonal-prices`);
    return response.data;
  },

  /** Tạo mới giá theo mùa */
  create: async (roomTypeId: number | string, data: SeasonalPriceRequest): Promise<SeasonalPriceResponse> => {
    const response = await api.post<SeasonalPriceResponse>(`/room-types/${roomTypeId}/seasonal-prices`, data);
    return response.data;
  },

  /** Cập nhật giá theo mùa */
  update: async (roomTypeId: number | string, priceId: number | string, data: SeasonalPriceRequest): Promise<SeasonalPriceResponse> => {
    const response = await api.put<SeasonalPriceResponse>(`/room-types/${roomTypeId}/seasonal-prices/${priceId}`, data);
    return response.data;
  },

  /** Xóa giá theo mùa */
  delete: async (roomTypeId: number | string, priceId: number | string): Promise<MessageResponse> => {
    const response = await api.delete<MessageResponse>(`/room-types/${roomTypeId}/seasonal-prices/${priceId}`);
    return response.data;
  }
};

export default seasonalPriceApi;
