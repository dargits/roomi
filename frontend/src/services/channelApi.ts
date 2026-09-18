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

  // Kiểm tra kết nối kênh OTA (kiểm tra tính hợp lệ của feed và externalCalendarUrl)
  testConnection: async (id: number | string): Promise<Channel> => {
    const response = await api.post<Channel>(`/channels/${id}/test-connection`);
    return response.data;
  },

  // Đồng bộ lại tất cả kênh đang hoạt động
  syncAll: async (reason?: string): Promise<Channel[]> => {
    const response = await api.post<Channel[]>('/channels/sync-all', null, {
      params: reason ? { reason } : undefined,
    });
    return response.data;
  },

  // Lấy dữ liệu tổng quan cảnh báo mất kết nối và tình trạng đồng bộ
  getWarningSummary: async (): Promise<import('../types').ChannelWarningSummary> => {
    const response = await api.get<import('../types').ChannelWarningSummary>('/channels/warning-summary');
    return response.data;
  },

  // Lịch sử nhật ký sinh tệp của 1 kênh
  getChannelLogs: async (id: number | string): Promise<ChannelCalendarSyncLog[]> => {
    const response = await api.get<ChannelCalendarSyncLog[]>(`/channels/${id}/logs`);
    return response.data;
  },

  // Lấy nhật ký đồng bộ có hỗ trợ lọc theo kênh, trạng thái và loại kích hoạt
  getLogsWithFilter: async (params?: {
    channelId?: number | string;
    status?: string;
    triggeredBy?: string;
  }): Promise<ChannelCalendarSyncLog[]> => {
    const response = await api.get<ChannelCalendarSyncLog[]>('/channels/logs', {
      params,
    });
    return response.data;
  },

  // 100 nhật ký sinh tệp gần nhất
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

  // Chuyển lượt chặn từ kênh thành đặt phòng chính thức
  convertBlockToBooking: async (
    blockId: number | string,
    data: import('../types').ConvertBlockRequest
  ): Promise<import('../types').BookingResponse> => {
    const response = await api.post<import('../types').BookingResponse>(
      `/channels/blocks/${blockId}/convert`,
      data
    );
    return response.data;
  },

  // Lấy danh sách lượt chặn phòng từ kênh (có bộ lọc)
  getBlocks: async (params?: {
    channelId?: number | string;
    roomTypeId?: number | string;
    status?: string;
  }): Promise<import('../types').ChannelRoomBlock[]> => {
    const response = await api.get<import('../types').ChannelRoomBlock[]>('/channels/blocks', {
      params,
    });
    return response.data;
  },

  // Lấy danh sách lượt chặn phòng đang hoạt động (BLOCKED)
  getActiveBlocks: async (): Promise<import('../types').ChannelRoomBlock[]> => {
    const response = await api.get<import('../types').ChannelRoomBlock[]>('/channels/blocks/active');
    return response.data;
  },

  // Từ chối lượt chặn phòng từ kênh OTA kèm ghi chú lý do (NCL-15-CN-004)
  rejectBlock: async (
    blockId: number | string,
    reason: string
  ): Promise<import('../types').ChannelRoomBlock> => {
    const response = await api.post<import('../types').ChannelRoomBlock>(
      `/channels/blocks/${blockId}/reject`,
      { reason }
    );
    return response.data;
  },
};

