import api from './api';
import { RoomStayGuestResponseDto, RoomStayGuestCreateDto, StayingGuestsSummaryDto, MessageResponse } from '../types';

export const stayingGuestsApi = {
  // Lấy danh sách khách cùng phòng
  getStayingGuests: async (bookingId: number | string): Promise<RoomStayGuestResponseDto[]> => {
    const response = await api.get<RoomStayGuestResponseDto[]>(`/bookings/${bookingId}/staying-guests`);
    return response.data;
  },

  // Lấy tổng hợp danh sách khách & chi tiết phụ thu vượt ngưỡng
  getStayingGuestsSummary: async (bookingId: number | string): Promise<StayingGuestsSummaryDto> => {
    const response = await api.get<StayingGuestsSummaryDto>(`/bookings/${bookingId}/staying-guests/summary`);
    return response.data;
  },

  // Thêm người cùng ở
  addStayingGuest: async (bookingId: number | string, data: RoomStayGuestCreateDto): Promise<RoomStayGuestResponseDto> => {
    const response = await api.post<RoomStayGuestResponseDto>(`/bookings/${bookingId}/staying-guests`, data);
    return response.data;
  },

  // Đánh dấu rời sớm kèm thời điểm
  markLeftEarly: async (bookingId: number | string, guestId: number | string): Promise<RoomStayGuestResponseDto> => {
    const response = await api.put<RoomStayGuestResponseDto>(`/bookings/${bookingId}/staying-guests/${guestId}/leave-early`);
    return response.data;
  },

  // Xóa khách (nếu chưa kết xuất tờ khai)
  removeStayingGuest: async (bookingId: number | string, guestId: number | string): Promise<MessageResponse> => {
    const response = await api.delete<MessageResponse>(`/bookings/${bookingId}/staying-guests/${guestId}`);
    return response.data;
  },
};

export default stayingGuestsApi;
