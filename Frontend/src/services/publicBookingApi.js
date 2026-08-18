import api from './api';

const publicBookingApi = {
  // Lấy chi tiết đặt phòng công khai
  getPublicBookingById: async (id) => {
    const response = await api.get(`/public/bookings/${id}`);
    return response.data;
  },

  // Lấy danh sách dịch vụ phụ thu của đặt phòng
  getPublicBookingServices: async (id) => {
    const response = await api.get(`/public/bookings/${id}/services`);
    return response.data;
  },

  // Lấy thông tin hóa đơn & thanh toán
  getPublicBookingInvoice: async (id) => {
    const response = await api.get(`/public/bookings/${id}/invoice`);
    return response.data;
  },

  // Lấy thông tin đặt cọc
  getPublicBookingDeposits: async (id) => {
    const response = await api.get(`/public/bookings/${id}/deposits`);
    return response.data;
  }
};

export default publicBookingApi;
