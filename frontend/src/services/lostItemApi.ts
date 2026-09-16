import api from './api';
import {
  LostItem,
  LostItemLog,
  LostItemSummary,
  CreateLostItemRequest,
  ReturnLostItemRequest,
  DisposeLostItemRequest,
  LostItemFilterParams,
  PageResponse,
} from '../types';

export const lostItemApi = {
  // Ghi nhận món đồ để quên mới
  create: async (data: CreateLostItemRequest): Promise<LostItem> => {
    const response = await api.post<LostItem>('/lost-items', data);
    return response.data;
  },

  // Lấy danh sách đồ để quên có lọc và phân trang
  getAll: async (params: LostItemFilterParams = {}): Promise<PageResponse<LostItem>> => {
    const response = await api.get<PageResponse<LostItem>>('/lost-items', { params });
    return response.data;
  },

  // Chi tiết món đồ
  getById: async (id: number | string): Promise<LostItem> => {
    const response = await api.get<LostItem>(`/lost-items/${id}`);
    return response.data;
  },

  // Đánh dấu đã liên hệ khách
  markContacted: async (id: number | string, notes?: string): Promise<LostItem> => {
    const response = await api.put<LostItem>(`/lost-items/${id}/contact`, null, {
      params: { notes },
    });
    return response.data;
  },

  // Trả đồ cho khách
  returnToGuest: async (id: number | string, data: ReturnLostItemRequest): Promise<LostItem> => {
    const response = await api.put<LostItem>(`/lost-items/${id}/return`, data);
    return response.data;
  },

  // Xử lý đồ quá hạn
  disposeItem: async (id: number | string, data: DisposeLostItemRequest): Promise<LostItem> => {
    const response = await api.put<LostItem>(`/lost-items/${id}/dispose`, data);
    return response.data;
  },

  // Lấy lịch sử nhật ký vòng đời
  getLogs: async (id: number | string): Promise<LostItemLog[]> => {
    const response = await api.get<LostItemLog[]>(`/lost-items/${id}/logs`);
    return response.data;
  },

  // Thống kê nhanh
  getSummary: async (): Promise<LostItemSummary> => {
    const response = await api.get<LostItemSummary>('/lost-items/summary');
    return response.data;
  },
};

export default lostItemApi;
