import api from './api';
import {
  CleaningStandardResponse,
  CleaningStandardUpdateRequest,
  HousekeepingProductivityReportResponse
} from '../types/housekeeping';

export interface ProductivityQueryParams {
  period?: 'DAY' | 'WEEK' | 'MONTH' | 'CUSTOM';
  date?: string;
  startDate?: string;
  endDate?: string;
}

export const housekeepingProductivityApi = {
  // Lấy danh sách định mức thời gian dọn của các loại phòng
  getCleaningStandards: async (): Promise<CleaningStandardResponse[]> => {
    const response = await api.get<CleaningStandardResponse[]>('/housekeeping/standards');
    return response.data;
  },

  // Cập nhật định mức thời gian dọn (Chủ cơ sở / Quản trị viên)
  updateCleaningStandards: async (
    data: CleaningStandardUpdateRequest
  ): Promise<CleaningStandardResponse[]> => {
    const response = await api.put<CleaningStandardResponse[]>('/housekeeping/standards', data);
    return response.data;
  },

  // Lấy báo cáo năng suất buồng phòng
  getProductivityReport: async (
    params?: ProductivityQueryParams
  ): Promise<HousekeepingProductivityReportResponse> => {
    const response = await api.get<HousekeepingProductivityReportResponse>('/housekeeping/productivity', {
      params
    });
    return response.data;
  }
};

export default housekeepingProductivityApi;
