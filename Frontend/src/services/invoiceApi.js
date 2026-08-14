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

  // Ghi nhận thanh toán (Cash/Transfer)
  recordPayment: async (invoiceId, paymentData) => {
    // paymentData = { amount: 1000000, paymentMethod: "CASH", note: "..." }
    const response = await api.post(`/invoices/${invoiceId}/payments`, paymentData);
    return response.data;
  },

  // Lập hóa đơn điều chỉnh
  adjustInvoice: async (invoiceId, adjustData) => {
    // adjustData = { roomCharge: 1500000, servicesCharge: 200000, note: "..." }
    const response = await api.post(`/invoices/${invoiceId}/adjust`, adjustData);
    return response.data;
  }
};

export default invoiceApi;
