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

  // Nhận phòng
  checkIn: async (id) => {
    const response = await api.put(`/bookings/${id}/check-in`);
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
  }
};

export default bookingApi;
