import api from './api';
import { MessageResponse } from '../types';

export const bookingRequestApi = {
  // Public: Tìm phòng trống
  getPublicAvailability: async (from?: string, to?: string): Promise<any[]> => {
    const response = await api.get('/room-types/public/availability', {
      params: { from, to }
    });
    return response.data;
  },

  // Public: Khách gửi yêu cầu đặt phòng
  createBookingRequest: async (data: any): Promise<any> => {
    const response = await api.post('/booking-requests', data);
    return response.data;
  },

  // Admin: Lấy danh sách yêu cầu
  getAllBookingRequests: async (): Promise<any[]> => {
    const response = await api.get('/booking-requests');
    return response.data;
  },

  // Admin: Lễ tân duyệt yêu cầu
  approveRequest: async (id: number | string): Promise<any> => {
    const response = await api.put(`/booking-requests/${id}/approve`);
    return response.data;
  },

  // Admin: Lễ tân từ chối yêu cầu
  rejectRequest: async (id: number | string, reason?: string): Promise<MessageResponse> => {
    const response = await api.put<MessageResponse>(`/booking-requests/${id}/reject`, null, {
      params: { reason }
    });
    return response.data;
  }
};

export default bookingRequestApi;
