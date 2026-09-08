import api from './api';

const groupBookingApi = {
  getAll: async () => {
    const response = await api.get('/group-bookings');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/group-bookings/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/group-bookings', data);
    return response.data;
  },

  getAssignmentSuggestion: async (id) => {
    const response = await api.get(`/group-bookings/${id}/assignment-suggestion`);
    return response.data;
  },

  assignRooms: async (id, assignments) => {
    const response = await api.put(`/group-bookings/${id}/assign-rooms`, { assignments });
    return response.data;
  },

  getInvoices: async (id) => {
    const response = await api.get(`/group-bookings/${id}/invoices`);
    return response.data;
  },

  createInvoices: async (id, data) => {
    const response = await api.post(`/group-bookings/${id}/invoices`, data);
    return response.data;
  },

  /**
   * NCL-13-CN-004: Hủy một phần số phòng trong hồ sơ đoàn.
   * @param {number} id - ID hồ sơ đoàn
   * @param {number[]} bookingIds - Danh sách ID booking cần hủy
   */
  cancelPartial: async (id, bookingIds) => {
    const response = await api.post(`/group-bookings/${id}/cancel-partial`, { bookingIds });
    return response.data;
  },

  /**
   * P1.4: Preview tính phí hủy một phần theo thời gian thực.
   */
  previewCancelPartial: async (id, bookingIds) => {
    const response = await api.post(`/group-bookings/${id}/cancel-partial/preview`, { bookingIds });
    return response.data;
  },

  /**
   * P0: Lấy danh sách các khoản cọc của đoàn.
   */
  getDeposits: async (id) => {
    const response = await api.get(`/group-bookings/${id}/deposits`);
    return response.data;
  },

  /**
   * P0: Ghi nhận thu tiền cọc đoàn.
   */
  createDeposit: async (id, data) => {
    const response = await api.post(`/group-bookings/${id}/deposits`, data);
    return response.data;
  },

  /**
   * NCL-13-CN-006: Lấy tóm tắt chi tiết các phòng trước khi trả phòng đoàn.
   */
  getBulkCheckOutSummary: async (id) => {
    const response = await api.get(`/group-bookings/${id}/bulk-checkout-summary`);
    return response.data;
  },

  /**
   * NCL-13-CN-006: Trả phòng hàng loạt cho đoàn - checkout các phòng được chọn.
   * @param {number} id - ID hồ sơ đoàn
   * @param {object} [data] - { bookingIds: [...] }
   */
  bulkCheckOut: async (id, data) => {
    const response = await api.post(`/group-bookings/${id}/bulk-checkout`, data || {});
    return response.data;
  },
};

export default groupBookingApi;
