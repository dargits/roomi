import api from './api';
import { Channel, ChannelRequest, ChannelCalendarSyncLog, ChannelAvailabilityCheckResponse } from '../types';

export const channelApi = {
  // Lấy tất cả kênh phân phối
  getAll: async (): Promise<Channel[]> => {
    const response = await api.get<Channel[]>('/channels');
    return response.data;
  },

  // Chi tiết 1 kênh
  getById: async (id: number | string): Promise<Channel> => {
    const response = await api.get<Channel>(`/channels/${id}`);
    return response.data;
  },

  // Tạo kênh phân phối mới
  create: async (data: ChannelRequest): Promise<Channel> => {
    const response = await api.post<Channel>('/channels', data);
    return response.data;
  },

  // Cập nhật kênh
  update: async (id: number | string, data: ChannelRequest): Promise<Channel> => {
    const response = await api.put<Channel>(`/channels/${id}`, data);
    return response.data;
  },

  // Xóa kênh
  delete: async (id: number | string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/channels/${id}`);
    return response.data;
  },

  // Bật hoặc tắt trạng thái đồng bộ kênh
  toggleActive: async (id: number | string): Promise<Channel> => {
    const response = await api.patch<Channel>(`/channels/${id}/toggle`);
    return response.data;
  },

  // Làm mới token đường dẫn tệp lịch khi nghi ngờ bị lộ
  refreshToken: async (id: number | string): Promise<Channel> => {
    const response = await api.post<Channel>(`/channels/${id}/refresh-token`);
    return response.data;
  },

  // Kích hoạt đồng bộ lịch thủ công
  syncChannel: async (id: number | string): Promise<Channel> => {
    const response = await api.post<Channel>(`/channels/${id}/sync`);
    return response.data;
  },

  // Lịch sử nhật ký sinh tệp của 1 kênh
  getChannelLogs: async (id: number | string): Promise<ChannelCalendarSyncLog[]> => {
    const response = await api.get<ChannelCalendarSyncLog[]>(`/channels/${id}/logs`);
    return response.data;
  },

  // 50 nhật ký sinh tệp gần nhất
  getRecentLogs: async (): Promise<ChannelCalendarSyncLog[]> => {
    const response = await api.get<ChannelCalendarSyncLog[]>('/channels/logs/recent');
    return response.data;
  },

  // Kiểm tra loại phòng trên kênh đã hết phòng hay chưa theo thời gian nhận / trả
  checkAvailability: async (
    channelId: number | string,
    params: {
      roomTypeId?: number | string;
      externalRoomTypeCode?: string;
      checkInDate: string;
      checkOutDate: string;
    }
  ): Promise<ChannelAvailabilityCheckResponse> => {
    const response = await api.get<ChannelAvailabilityCheckResponse>(
      `/channels/${channelId}/check-availability`,
      { params }
    );
    return response.data;
  },
};
