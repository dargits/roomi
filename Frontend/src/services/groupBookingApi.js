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
};

export default groupBookingApi;