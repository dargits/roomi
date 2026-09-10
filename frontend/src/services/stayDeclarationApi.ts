import api from './api';
import { StayDeclarationResponseDTO, MessageResponse } from '../types';

/**
 * API service cho module Khai báo lưu trú (NCL-12).
 * Tất cả response có số giấy tờ đã được mask theo vai trò người dùng (QTN-24).
 */
const stayDeclarationApi = {
  /** NCL-12-CN-002: Lấy danh sách khai báo hôm nay */
  getToday: async (): Promise<StayDeclarationResponseDTO[]> => {
    const response = await api.get<StayDeclarationResponseDTO[]>('/stay-declarations/today');
    return response.data;
  },

  /** NCL-12-CN-002: Lấy danh sách khai báo theo ngày cụ thể */
  getByDate: async (date?: string): Promise<StayDeclarationResponseDTO[]> => {
    const params = date ? { date } : {};
    const response = await api.get<StayDeclarationResponseDTO[]>('/stay-declarations', { params });
    return response.data;
  },

  /** NCL-12-CN-003: Kết xuất Excel danh sách khai báo lưu trú */
  exportExcel: async (date?: string): Promise<any> => {
    const params = date ? { date } : {};
    const response = await api.get('/stay-declarations/export', {
      params,
      responseType: 'blob',
    });
    return response;
  },

  /** Đánh dấu đã hoàn tất khai báo lưu trú cho một booking */
  complete: async (bookingId: number | string): Promise<StayDeclarationResponseDTO> => {
    const response = await api.put<StayDeclarationResponseDTO>(`/stay-declarations/${bookingId}/complete`);
    return response.data;
  },

  /** Lấy lịch sử lưu trú theo khoảng thời gian và bộ lọc */
  getHistory: async (params: any = {}): Promise<StayDeclarationResponseDTO[]> => {
    const response = await api.get<StayDeclarationResponseDTO[]>('/stay-declarations/history', { params });
    return response.data;
  },

  /** Kết xuất Excel lịch sử lưu trú */
  exportHistoryExcel: async (params: any = {}): Promise<any> => {
    const response = await api.get('/stay-declarations/history/export', {
      params,
      responseType: 'blob',
    });
    return response;
  },
};

export default stayDeclarationApi;
