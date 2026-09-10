import api from './api';
import {
  BookingResponse,
  BookingRequest,
  CheckInRequest,
  BulkCheckInRequest,
  BulkCheckInResultResponse,
  RescheduleDatePreviewResponse,
  UpgradeRoomRequest,
  MessageResponse
} from '../types';

export interface BookingSearchParams {
  q?: string;
  status?: string;
  from?: string;
  to?: string;
}

const bookingApi = {
  // Lấy danh sách đặt phòng
  getAllBookings: async (): Promise<BookingResponse[]> => {
    const response = await api.get<BookingResponse[]>('/bookings');
    return response.data;
  },

  // NCL-03-CN-010: Tra cứu nhanh đặt phòng theo mã, tên khách hoặc SĐT
  searchBookings: async ({ q, status, from, to }: BookingSearchParams = {}): Promise<BookingResponse[]> => {
    const response = await api.get<BookingResponse[]>('/bookings/search', { params: { q, status, from, to } });
    return response.data;
  },

  // Lấy chi tiết đặt phòng
  getBookingById: async (id: number | string): Promise<BookingResponse> => {
    const response = await api.get<BookingResponse>(`/bookings/${id}`);
    return response.data;
  },

  // Xem lịch phòng
  getBookingCalendar: async (from?: string, to?: string): Promise<BookingResponse[]> => {
    const response = await api.get<BookingResponse[]>('/bookings/calendar', { params: { from, to } });
    return response.data;
  },

  // Tạo đặt phòng mới
  createBooking: async (data: BookingRequest | Record<string, any>): Promise<BookingResponse> => {
    const response = await api.post<BookingResponse>('/bookings', data);
    return response.data;
  },

  // Gắn phòng (khi khách đến hoặc xếp phòng trước)
  assignRoom: async (id: number | string, roomId: number | string): Promise<BookingResponse> => {
    const response = await api.put<BookingResponse>(`/bookings/${id}/assign-room`, null, { params: { roomId } });
    return response.data;
  },

  // Hủy đặt phòng
  cancelBooking: async (id: number | string): Promise<BookingResponse> => {
    const response = await api.put<BookingResponse>(`/bookings/${id}/cancel`);
    return response.data;
  },

  // Đổi phòng
  changeRoom: async (id: number | string, newRoomId: number | string): Promise<BookingResponse> => {
    const response = await api.put<BookingResponse>(`/bookings/${id}/change-room`, null, { params: { newRoomId } });
    return response.data;
  },

  // Khách không đến
  noShow: async (id: number | string): Promise<BookingResponse> => {
    const response = await api.put<BookingResponse>(`/bookings/${id}/no-show`);
    return response.data;
  },

  // Nhận phòng (kèm danh sách khách lưu trú - Khởi tạo từ CheckInRequest)
  checkIn: async (id: number | string, checkInData?: CheckInRequest | any): Promise<BookingResponse> => {
    const response = await api.put<BookingResponse>(`/bookings/${id}/check-in`, checkInData);
    return response.data;
  },

  // Nhận phòng theo đoàn (Bulk Check-in)
  bulkCheckIn: async (bulkData: BulkCheckInRequest | any): Promise<BulkCheckInResultResponse> => {
    const response = await api.put<BulkCheckInResultResponse>('/bookings/bulk-check-in', bulkData);
    return response.data;
  },

  // Trả phòng
  checkOut: async (id: number | string): Promise<BookingResponse> => {
    const response = await api.put<BookingResponse>(`/bookings/${id}/check-out`);
    return response.data;
  },

  // === DỊCH VỤ PHỤ THU TRONG BOOKING ===
  getBookingServices: async (id: number | string): Promise<any[]> => {
    const response = await api.get<any[]>(`/bookings/${id}/services`);
    return response.data;
  },

  addBookingService: async (id: number | string, data: any): Promise<any> => {
    const response = await api.post(`/bookings/${id}/services`, data);
    return response.data;
  },

  removeBookingService: async (id: number | string, usageId: number | string): Promise<MessageResponse> => {
    const response = await api.delete<MessageResponse>(`/bookings/${id}/services/${usageId}`);
    return response.data;
  },

  // === NCL-04-CN-007: Gia hạn thêm đêm giữa kỳ lưu trú ===
  extendStay: async (id: number | string, data: { additionalNights: number; note?: string }): Promise<BookingResponse> => {
    const response = await api.put<BookingResponse>(`/bookings/${id}/extend-stay`, data);
    return response.data;
  },

  // Kiểm tra khả dụng gia hạn trước khi thực hiện
  getExtendAvailability: async (id: number | string, nights: number): Promise<any> => {
    const response = await api.get(`/bookings/${id}/extend-availability`, { params: { nights } });
    return response.data;
  },

  // === NCL-04-CN-008: Nâng/hạ hạng phòng giữa kỳ lưu trú ===
  upgradeRoom: async (id: number | string, data: UpgradeRoomRequest | any): Promise<BookingResponse> => {
    const response = await api.put<BookingResponse>(`/bookings/${id}/upgrade-room`, data);
    return response.data;
  },

  // === NCL-04-CN-NEW: Dời lịch đặt phòng chưa nhận phòng (NEW/CONFIRMED) ===
  previewReschedule: async (id: number | string, newCheckInDate: string, newCheckOutDate: string): Promise<RescheduleDatePreviewResponse> => {
    const response = await api.get<RescheduleDatePreviewResponse>(`/bookings/${id}/reschedule-preview`, {
      params: { newCheckInDate, newCheckOutDate },
    });
    return response.data;
  },

  confirmReschedule: async (id: number | string, data: { newCheckInDate: string; newCheckOutDate: string; reason?: string }): Promise<BookingResponse> => {
    const response = await api.put<BookingResponse>(`/bookings/${id}/reschedule`, data);
    return response.data;
  },

  // === NCL-04-CN-NEW: Trả phòng sớm ===
  previewEarlyCheckout: async (id: number | string): Promise<any> => {
    const response = await api.get(`/bookings/${id}/early-checkout-preview`);
    return response.data;
  },

  confirmEarlyCheckout: async (id: number | string): Promise<BookingResponse> => {
    const response = await api.put<BookingResponse>(`/bookings/${id}/early-checkout`);
    return response.data;
  },
};

export default bookingApi;
