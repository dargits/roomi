import api from './api';
import {
  WeekendPriceConfigResponse,
  WeekendPriceConfigRequest,
  HolidayPriceResponse,
  HolidayPriceRequest,
  MessageResponse
} from '../types';

const pricingApi = {
  // Giá cuối tuần
  getWeekendConfigs: async (roomTypeId: number | string): Promise<WeekendPriceConfigResponse[]> => {
    const response = await api.get<WeekendPriceConfigResponse[]>(`/pricing/weekend/${roomTypeId}`);
    return response.data;
  },

  saveWeekendConfig: async (data: WeekendPriceConfigRequest): Promise<WeekendPriceConfigResponse> => {
    const response = await api.post<WeekendPriceConfigResponse>('/pricing/weekend', data);
    return response.data;
  },

  deleteWeekendConfig: async (id: number | string): Promise<MessageResponse> => {
    const response = await api.delete<MessageResponse>(`/pricing/weekend/${id}`);
    return response.data;
  },

  // Giá ngày lễ
  getHolidayPrices: async (roomTypeId: number | string): Promise<HolidayPriceResponse[]> => {
    const response = await api.get<HolidayPriceResponse[]>(`/pricing/holidays/${roomTypeId}`);
    return response.data;
  },

  saveHolidayPrice: async (data: HolidayPriceRequest): Promise<HolidayPriceResponse> => {
    const response = await api.post<HolidayPriceResponse>('/pricing/holidays', data);
    return response.data;
  },

  deleteHolidayPrice: async (id: number | string): Promise<MessageResponse> => {
    const response = await api.delete<MessageResponse>(`/pricing/holidays/${id}`);
    return response.data;
  },

  // Bảng chi tiết giá từng đêm & phụ thu
  getPriceBreakdown: async (params: any): Promise<any> => {
    const response = await api.get('/pricing/breakdown', { params });
    return response.data;
  },
};

export default pricingApi;
