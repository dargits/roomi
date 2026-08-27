import api from './api';

const bookingApi = {
  // Lấy danh sách đặt phòng
  getAllBookings: async () => {
    const response = await api.get('/bookings');
    return response.data;
  },

  // Lấy chi tiết đặt phòng
  getBookingById: async (id) => {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  },

  // Xem lịch phòng
  getBookingCalendar: async (from, to) => {
    const response = await api.get('/bookings/calendar', { params: { from, to } });
    return response.data;
  },

  // Tạo đặt phòng mới
  createBooking: async (data) => {
    const response = await api.post('/bookings', data);
    return response.data;
  },

  // Gắn phòng (khi khách đến hoặc xếp phòng trước)
  assignRoom: async (id, roomId) => {
    const response = await api.put(`/bookings/${id}/assign-room`, null, { params: { roomId } });
    return response.data;
  },

  // Hủy đặt phòng
  cancelBooking: async (id) => {
    const response = await api.put(`/bookings/${id}/cancel`);
    return response.data;
  },

  // Đổi phòng
  changeRoom: async (id, newRoomId) => {
    const response = await api.put(`/bookings/${id}/change-room`, null, { params: { newRoomId } });
    return response.data;
  },

  // Khách không đến
  noShow: async (id) => {
    const response = await api.put(`/bookings/${id}/no-show`);
    return response.data;
  },

  // Nhận phòng (kèm danh sách khách lưu trú - Khởi tạo từ CheckInRequest)
  checkIn: async (id, checkInData) => {
    // checkInData = { guests: [{ name: "...", idNumber: "..." }, ...] }
    const response = await api.put(`/bookings/${id}/check-in`, checkInData);
    return response.data;
  },

  // Nhận phòng theo đoàn (Bulk Check-in)
  bulkCheckIn: async (bulkData) => {
    // bulkData = { rooms: [{ bookingId: 1, guests: [...] }, ...] }
    const response = await api.put('/bookings/bulk-check-in', bulkData);
    return response.data;
  },

  // Trả phòng
  checkOut: async (id) => {
    const response = await api.put(`/bookings/${id}/check-out`);
    return response.data;
  },

  // === DỊCH VỤ PHỤ THU TRONG BOOKING ===
  getBookingServices: async (id) => {
    const response = await api.get(`/bookings/${id}/services`);
    return response.data;
  },

  addBookingService: async (id, data) => {
    // data = { serviceId: 1, quantity: 2, note: "..." }
    const response = await api.post(`/bookings/${id}/services`, data);
    return response.data;
  },

  removeBookingService: async (id, usageId) => {
    const response = await api.delete(`/bookings/${id}/services/${usageId}`);
    return response.data;
  },

  // === NCL-04-CN-007: Gia hạn thêm đêm giữa kỳ lưu trú ===
  extendStay: async (id, data) => {
    // data = { additionalNights, note? }
    const response = await api.put(`/bookings/${id}/extend-stay`, data);
    return response.data;
  },

  // Kiểm tra khả dụng gia hạn trước khi thực hiện
  getExtendAvailability: async (id, nights) => {
    const response = await api.get(`/bookings/${id}/extend-availability`, { params: { nights } });
    return response.data;
  },

  // === NCL-04-CN-008: Nâng/hạ hạng phòng giữa kỳ lưu trú ===
  upgradeRoom: async (id, data) => {
    // data = { newRoomId, reason? }
    const response = await api.put(`/bookings/${id}/upgrade-room`, data);
    return response.data;
  },

  // === NCL-04-CN-NEW: Dời lịch đặt phòng chưa nhận phòng (NEW/CONFIRMED) ===
  // Preview: GET /bookings/{id}/reschedule-preview — kiểm tra + tính giá, KHÔNG lưu DB
  previewReschedule: async (id, newCheckInDate, newCheckOutDate) => {
    const response = await api.get(`/bookings/${id}/reschedule-preview`, {
      params: { newCheckInDate, newCheckOutDate },
    });
    return response.data;
  },

  // Confirm: PUT /bookings/{id}/reschedule — lưu ngày mới vào DB
  confirmReschedule: async (id, data) => {
    // data = { newCheckInDate, newCheckOutDate, reason? }
    const response = await api.put(`/bookings/${id}/reschedule`, data);
    return response.data;
  },
};

export default bookingApi;
