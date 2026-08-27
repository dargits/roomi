import api from './api';

export const invoiceApi = {
  // Lấy hóa đơn của một booking
  getInvoiceByBooking: async (bookingId) => {
    const response = await api.get(`/bookings/${bookingId}/invoice`);
    return response.data;
  },

  // Lập hóa đơn mới cho booking
  createInvoice: async (bookingId) => {
    const response = await api.post(`/bookings/${bookingId}/invoice`);
    return response.data;
  },

  // Lấy chi tiết hóa đơn theo ID
  getInvoiceById: async (invoiceId) => {
    const response = await api.get(`/invoices/${invoiceId}`);
    return response.data;
  },

  // Lấy danh sách các khoản thanh toán của hóa đơn
  getPayments: async (invoiceId) => {
    const response = await api.get(`/invoices/${invoiceId}/payments`);
    return response.data;
  },

  // Ghi nhận thanh toán (Cash/Transfer/POS)
  recordPayment: async (invoiceId, paymentData) => {
    const payload = {
      amount: paymentData.amount,
      method: paymentData.method || paymentData.paymentMethod || 'CASH',
      note: paymentData.note
    };
    const response = await api.post(`/invoices/${invoiceId}/payments`, payload);
    return response.data;
  },


  // Lập hóa đơn điều chỉnh
  adjustInvoice: async (invoiceId, adjustData) => {
    // adjustData = { roomCharge: 1500000, servicesCharge: 200000, note: "..." }
    const response = await api.post(`/invoices/${invoiceId}/adjust`, adjustData);
    return response.data;
  },

  // ===== DISCOUNT =====

  /** Lấy khoản giảm giá đang hiệu lực */
  getActiveDiscount: async (invoiceId) => {
    const response = await api.get(`/invoices/${invoiceId}/discount`);
    return response.data;
  },

  /** Lễ tân áp dụng giảm giá */
  applyDiscount: async (invoiceId, payload) => {
    const response = await api.post(`/invoices/${invoiceId}/discount`, payload);
    return response.data;
  },

  /** Xóa khoản giảm giá */
  removeDiscount: async (invoiceId) => {
    const response = await api.delete(`/invoices/${invoiceId}/discount`);
    return response.data;
  },

  /** Owner phê duyệt giảm giá */
  approveDiscount: async (invoiceId) => {
    const response = await api.post(`/invoices/${invoiceId}/discount/approve`);
    return response.data;
  },

  /** Owner từ chối giảm giá */
  rejectDiscount: async (invoiceId, payload) => {
    const response = await api.post(`/invoices/${invoiceId}/discount/reject`, payload);
    return response.data;
  },
};

export default invoiceApi;

