import api from './api';

export const stayingGuestsApi = {
  // Lấy danh sách khách cùng phòng
  getStayingGuests: async (bookingId) => {
    const response = await api.get(`/bookings/${bookingId}/staying-guests`);
    return response.data;
  },

  // Thêm người cùng ở
  addStayingGuest: async (bookingId, data) => {
    const response = await api.post(`/bookings/${bookingId}/staying-guests`, data);
    return response.data;
  },

  // Đánh dấu rời sớm kèm thời điểm
  markLeftEarly: async (bookingId, guestId) => {
    const response = await api.put(`/bookings/${bookingId}/staying-guests/${guestId}/leave-early`);
    return response.data;
  },

  // Xóa khách (nếu chưa kết xuất tờ khai)
  removeStayingGuest: async (bookingId, guestId) => {
    const response = await api.delete(`/bookings/${bookingId}/staying-guests/${guestId}`);
    return response.data;
  },
};
