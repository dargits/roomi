import api from './api';
import {
  InvoiceResponse,
  PaymentResponse,
  PaymentRequest,
  DiscountResponse,
  ApplyDiscountRequest,
  MessageResponse
} from '../types';

export const invoiceApi = {
  // Lấy hóa đơn của một booking
  getInvoiceByBooking: async (bookingId: number | string): Promise<InvoiceResponse> => {
    const response = await api.get<InvoiceResponse>(`/bookings/${bookingId}/invoice`);
    return response.data;
  },

  // Lập hóa đơn mới cho booking
  createInvoice: async (bookingId: number | string): Promise<InvoiceResponse> => {
    const response = await api.post<InvoiceResponse>(`/bookings/${bookingId}/invoice`);
    return response.data;
  },

  // Lấy chi tiết hóa đơn theo ID
  getInvoiceById: async (invoiceId: number | string): Promise<InvoiceResponse> => {
    const response = await api.get<InvoiceResponse>(`/invoices/${invoiceId}`);
    return response.data;
  },

  // Lấy danh sách các khoản thanh toán của hóa đơn
  getPayments: async (invoiceId: number | string): Promise<PaymentResponse[]> => {
    const response = await api.get<PaymentResponse[]>(`/invoices/${invoiceId}/payments`);
    return response.data;
  },

  // Ghi nhận thanh toán (Cash/Transfer/POS)
  recordPayment: async (invoiceId: number | string, paymentData: Partial<PaymentRequest> & any): Promise<PaymentResponse> => {
    const payload = {
      amount: paymentData.amount,
      method: paymentData.method || paymentData.paymentMethod || 'CASH',
      note: paymentData.note
    };
    const response = await api.post<PaymentResponse>(`/invoices/${invoiceId}/payments`, payload);
    return response.data;
  },

  // Lập hóa đơn điều chỉnh
  adjustInvoice: async (invoiceId: number | string, adjustData: any): Promise<InvoiceResponse> => {
    const response = await api.post<InvoiceResponse>(`/invoices/${invoiceId}/adjust`, adjustData);
    return response.data;
  },

  // ===== DISCOUNT =====
  /** Lấy khoản giảm giá đang hiệu lực */
  getActiveDiscount: async (invoiceId: number | string): Promise<DiscountResponse> => {
    const response = await api.get<DiscountResponse>(`/invoices/${invoiceId}/discount`);
    return response.data;
  },

  /** Lễ tân áp dụng giảm giá */
  applyDiscount: async (invoiceId: number | string, payload: ApplyDiscountRequest | any): Promise<DiscountResponse> => {
    const response = await api.post<DiscountResponse>(`/invoices/${invoiceId}/discount`, payload);
    return response.data;
  },

  /** Xóa khoản giảm giá */
  removeDiscount: async (invoiceId: number | string): Promise<MessageResponse> => {
    const response = await api.delete<MessageResponse>(`/invoices/${invoiceId}/discount`);
    return response.data;
  },

  /** Owner phê duyệt giảm giá */
  approveDiscount: async (invoiceId: number | string): Promise<DiscountResponse> => {
    const response = await api.post<DiscountResponse>(`/invoices/${invoiceId}/discount/approve`);
    return response.data;
  },

  /** Owner từ chối giảm giá */
  rejectDiscount: async (invoiceId: number | string, payload?: { reason?: string } | any): Promise<DiscountResponse> => {
    const response = await api.post<DiscountResponse>(`/invoices/${invoiceId}/discount/reject`, payload);
    return response.data;
  },

  /** NCL-05-CN-009: Ghi nhật ký in hoặc kết xuất hóa đơn (QTN-10) */
  logPrint: async (invoiceId: number | string, actionType = 'PRINT'): Promise<any> => {
    const response = await api.post(`/invoices/${invoiceId}/log-print`, null, { params: { actionType } });
    return response.data;
  },

  /** Gửi email hóa đơn thanh toán cho khách hàng */
  sendInvoiceEmail: async (invoiceId: number | string, email?: string): Promise<MessageResponse> => {
    const payload = email ? { email } : {};
    const response = await api.post<MessageResponse>(`/invoices/${invoiceId}/send-email`, payload);
    return response.data;
  },
};

export default invoiceApi;
