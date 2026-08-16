import api from './api';

/**
 * API quản lý đặt cọc — NCL-11-CN-001 đến NCL-11-CN-006
 */
export const depositApi = {
  // === Chính sách đặt cọc (NCL-11-CN-001) ===
  getAllPolicies: async () => {
    const res = await api.get('/deposit-policies');
    return res.data;
  },

  createPolicy: async (data) => {
    // data = { roomTypeId?: number, depositPercent: number }
    const res = await api.post('/deposit-policies', data);
    return res.data;
  },

  updatePolicy: async (id, data) => {
    const res = await api.put(`/deposit-policies/${id}`, data);
    return res.data;
  },

  deletePolicy: async (id) => {
    const res = await api.delete(`/deposit-policies/${id}`);
    return res.data;
  },

  // === Khoản cọc theo booking (NCL-11-CN-002 đến NCL-11-CN-006) ===
  
  // NCL-11-CN-006: Xem lịch sử cọc của booking
  getDepositsByBooking: async (bookingId) => {
    const res = await api.get(`/bookings/${bookingId}/deposit`);
    return res.data;
  },

  // NCL-11-CN-004: Tính phí hủy dự kiến
  getCancellationFee: async (bookingId) => {
    const res = await api.get(`/bookings/${bookingId}/deposit/fee`);
    return res.data;
  },

  // NCL-11-CN-002: Thu tiền đặt cọc
  recordDeposit: async (bookingId, data) => {
    // data = { amount, paymentMethod, note?, shortPaidReason? }
    const res = await api.post(`/bookings/${bookingId}/deposit`, data);
    return res.data;
  },

  // NCL-11-CN-003/004: Hoàn tiền cọc khi hủy
  refundDeposit: async (bookingId, data) => {
    // data = { reason? }
    const res = await api.post(`/bookings/${bookingId}/deposit/refund`, data);
    return res.data;
  },

  // NCL-11-CN-005: Xử lý cọc no-show
  noShowDeposit: async (bookingId, data) => {
    // data = { reason?, penaltyOverride? }
    const res = await api.post(`/bookings/${bookingId}/deposit/no-show`, data);
    return res.data;
  },
};

export default depositApi;
