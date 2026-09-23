import api from './api';
import {
  PriceSuggestionResponse,
  PriceSuggestionConfigRequest,
  PriceSuggestionConfigResponse,
  MessageResponse,
} from '../types';

const priceSuggestionApi = {
  /**
   * Lấy danh sách gợi ý điều chỉnh giá theo công suất trong N ngày tới
   */
  getSuggestions: async (days: number = 30, includeDismissed: boolean = false): Promise<PriceSuggestionResponse> => {
    const response = await api.get<PriceSuggestionResponse>('/pricing/suggestions', {
      params: { days, includeDismissed },
    });
    return response.data;
  },

  /**
   * Lấy cấu hình ngưỡng lấp đầy và đánh giá dữ liệu lịch sử
   */
  getConfig: async (): Promise<PriceSuggestionConfigResponse> => {
    const response = await api.get<PriceSuggestionConfigResponse>('/pricing/suggestions/config');
    return response.data;
  },

  /**
   * Cập nhật ngưỡng lấp đầy do Chủ cơ sở thiết lập
   */
  updateConfig: async (data: PriceSuggestionConfigRequest): Promise<PriceSuggestionConfigResponse> => {
    const response = await api.put<PriceSuggestionConfigResponse>('/pricing/suggestions/config', data);
    return response.data;
  },

  /**
   * Bỏ qua gợi ý điều chỉnh giá cho một ngày cụ thể
   */
  dismissSuggestion: async (targetDate: string): Promise<MessageResponse> => {
    const response = await api.post<MessageResponse>(`/pricing/suggestions/${targetDate}/dismiss`);
    return response.data;
  },

  /**
   * Khôi phục gợi ý đã bị bỏ qua
   */
  restoreSuggestion: async (targetDate: string): Promise<MessageResponse> => {
    const response = await api.delete<MessageResponse>(`/pricing/suggestions/${targetDate}/dismiss`);
    return response.data;
  },
};

export default priceSuggestionApi;
