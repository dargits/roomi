import api from './api';
import { DiscountResponse, MessageResponse } from '../types';

/**
 * API calls cho tính năng giảm giá hóa đơn.
 * Tất cả endpoints đều nằm dưới: /api/v1/invoices/{invoiceId}/discount
 */
export const discountApi = {
  /** Lấy khoản giảm giá đang hiệu lực của hóa đơn */
  getActiveDiscount: async (invoiceId: number | string): Promise<DiscountResponse | null> => {
    const response = await api.get<DiscountResponse>(`/invoices/${invoiceId}/discount`);
    return response.data;
  },

  /** Lễ tân áp dụng giảm giá */
  applyDiscount: async (
    invoiceId: number | string,
    payload: { discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'; discountValue: number; reason: string }
  ): Promise<DiscountResponse> => {
    const response = await api.post<DiscountResponse>(`/invoices/${invoiceId}/discount`, payload);
    return response.data;
  },

  /** Xóa khoản giảm giá hiện tại khỏi hóa đơn */
  removeDiscount: async (invoiceId: number | string): Promise<MessageResponse> => {
    const response = await api.delete<MessageResponse>(`/invoices/${invoiceId}/discount`);
    return response.data;
  },

  /** Chủ cơ sở phê duyệt giảm giá */
  approveDiscount: async (invoiceId: number | string): Promise<DiscountResponse> => {
    const response = await api.post<DiscountResponse>(`/invoices/${invoiceId}/discount/approve`);
    return response.data;
  },

  /** Chủ cơ sở từ chối giảm giá */
  rejectDiscount: async (invoiceId: number | string, payload: { rejectReason: string }): Promise<DiscountResponse> => {
    const response = await api.post<DiscountResponse>(`/invoices/${invoiceId}/discount/reject`, payload);
    return response.data;
  },
};

export default discountApi;
