import api from './api';

/**
 * API calls cho tính năng giảm giá hóa đơn.
 * Tất cả endpoints đều nằm dưới: /api/v1/invoices/{invoiceId}/discount
 */
export const discountApi = {
  /**
   * Lấy khoản giảm giá đang hiệu lực của hóa đơn.
   * Trả về null nếu không có giảm giá.
   */
  getActiveDiscount: async (invoiceId) => {
    const response = await api.get(`/invoices/${invoiceId}/discount`);
    return response.data;
  },

  /**
   * Lễ tân áp dụng giảm giá.
   * @param {number} invoiceId
   * @param {{ discountType: 'PERCENTAGE'|'FIXED_AMOUNT', discountValue: number, reason: string }} payload
   */
  applyDiscount: async (invoiceId, payload) => {
    const response = await api.post(`/invoices/${invoiceId}/discount`, payload);
    return response.data;
  },

  /**
   * Xóa khoản giảm giá hiện tại khỏi hóa đơn.
   */
  removeDiscount: async (invoiceId) => {
    const response = await api.delete(`/invoices/${invoiceId}/discount`);
    return response.data;
  },

  /**
   * Chủ cơ sở phê duyệt giảm giá.
   */
  approveDiscount: async (invoiceId) => {
    const response = await api.post(`/invoices/${invoiceId}/discount/approve`);
    return response.data;
  },

  /**
   * Chủ cơ sở từ chối giảm giá.
   * @param {number} invoiceId
   * @param {{ rejectReason: string }} payload
   */
  rejectDiscount: async (invoiceId, payload) => {
    const response = await api.post(`/invoices/${invoiceId}/discount/reject`, payload);
    return response.data;
  },
};

export default discountApi;
