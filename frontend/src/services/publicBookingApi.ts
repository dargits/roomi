import api from './api';

const publicBookingApi = {
  // Lấy chi tiết đặt phòng công khai
  getPublicBookingById: async (id: number | string): Promise<any> => {
    const response = await api.get(`/public/bookings/${id}`);
    return response.data;
  },

  // Lấy danh sách dịch vụ phụ thu của đặt phòng
  getPublicBookingServices: async (id: number | string): Promise<any[]> => {
    const response = await api.get(`/public/bookings/${id}/services`);
    return response.data;
  },

  // Lấy thông tin hóa đơn & thanh toán
  getPublicBookingInvoice: async (id: number | string, phone?: string): Promise<any> => {
    const response = await api.get(`/public/bookings/${id}/invoice`, {
      params: phone ? { phone } : {}
    });
    return response.data;
  },

  // NCL-09-CN-008: Tra cứu hóa đơn bằng mã đặt phòng và số điện thoại
  lookupInvoice: async (bookingCode: string, phone: string): Promise<any> => {
    const response = await api.get('/public/invoices/lookup', {
      params: { bookingCode, phone }
    });
    return response.data;
  },

  // NCL-09-CN-008-TC-04: Ghi nhật ký in/tải hóa đơn công khai
  logPublicInvoiceAccess: async (invoiceId: number | string, actionType: 'PRINT' | 'EXPORT' = 'PRINT'): Promise<any> => {
    const response = await api.post(`/public/invoices/${invoiceId}/log-access`, null, {
      params: { actionType }
    });
    return response.data;
  },

  // Lấy thông tin đặt cọc
  getPublicBookingDeposits: async (id: number | string): Promise<any[]> => {
    const response = await api.get(`/public/bookings/${id}/deposits`);
    return response.data;
  }
};

export default publicBookingApi;
