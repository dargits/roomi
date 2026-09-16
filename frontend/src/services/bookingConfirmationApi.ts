import api from './api';
import {
  BookingResponse,
  BookingConfirmationData,
  BookingConfirmationLog,
  SendConfirmationRequest
} from '../types';

export const bookingConfirmationApi = {
  // Xác nhận đặt phòng (chuyển trạng thái NEW -> CONFIRMED)
  confirmBooking: async (bookingId: number | string): Promise<BookingResponse> => {
    const response = await api.put<BookingResponse>(`/bookings/${bookingId}/confirm`);
    return response.data;
  },

  // Lấy dữ liệu bản xác nhận đặt phòng đầy đủ
  getConfirmationData: async (bookingId: number | string): Promise<BookingConfirmationData> => {
    const response = await api.get<BookingConfirmationData>(`/bookings/${bookingId}/confirmation`);
    return response.data;
  },

  // Gửi hoặc ghi nhật ký kết xuất bản xác nhận đặt phòng
  sendConfirmation: async (
    bookingId: number | string,
    req: SendConfirmationRequest
  ): Promise<BookingConfirmationLog> => {
    const response = await api.post<BookingConfirmationLog>(`/bookings/${bookingId}/send-confirmation`, req);
    return response.data;
  },

  // Lấy lịch sử các lần gửi xác nhận
  getConfirmationLogs: async (bookingId: number | string): Promise<BookingConfirmationLog[]> => {
    const response = await api.get<BookingConfirmationLog[]>(`/bookings/${bookingId}/confirmation-logs`);
    return response.data;
  }
};

export default bookingConfirmationApi;
