import api from './api';
import { HotelSettingResponse, HotelSettingRequest } from '../types';

const hotelSettingApi = {
  /** Lấy cấu hình cơ sở (Dành cho khách - không cần Token) */
  getPublicSetting: async (): Promise<HotelSettingResponse> => {
    const response = await api.get<HotelSettingResponse>('/hotel-setting/public');
    return response.data;
  },

  /** Lấy cấu hình cơ sở (Dành cho phần quản trị - Cần Token) */
  getAdminSetting: async (): Promise<HotelSettingResponse> => {
    const response = await api.get<HotelSettingResponse>('/hotel-setting');
    return response.data;
  },

  /** Cập nhật thông tin cấu hình của cơ sở (Cần Token + Quyền OWNER) */
  updateSetting: async (data: HotelSettingRequest): Promise<HotelSettingResponse> => {
    const response = await api.put<HotelSettingResponse>('/hotel-setting', data);
    return response.data;
  },

  /** Lấy danh sách Google API Key đã lưu (chỉ OWNER) */
  getGoogleApiKeys: async (): Promise<{ googleApiKeys: string }> => {
    const response = await api.get<{ googleApiKeys: string }>('/hotel-setting/google-api-keys');
    return response.data;
  },

  /** Lưu/cập nhật danh sách Google API Key (chỉ OWNER) */
  updateGoogleApiKeys: async (googleApiKeys: string): Promise<{ message: string }> => {
    const response = await api.put<{ message: string }>('/hotel-setting/google-api-keys', { googleApiKeys });
    return response.data;
  },
};

export default hotelSettingApi;
