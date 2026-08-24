import api from './api';

export const guestApi = {
  // Tim kiem theo ten/SDT/CCCD
  searchGuests: async (keyword = '') => {
    const url = keyword ? `/guests?search=${encodeURIComponent(keyword)}` : '/guests';
    const response = await api.get(url);
    return response.data;
  },

  getGuestById: async (id) => {
    const response = await api.get(`/guests/${id}`);
    return response.data;
  },

  getGuestByIdNumber: async (idNumber) => {
    const response = await api.get(`/guests/by-id-number/${idNumber}`);
    return response.data;
  },

  getGuestHistory: async (id) => {
    const response = await api.get(`/guests/${id}/history`);
    return response.data;
  },

  getGuestLoyalty: async (id) => {
    const response = await api.get(`/guests/${id}/loyalty`);
    return response.data;
  },

  createGuest: async (guestData) => {
    const response = await api.post('/guests', guestData);
    return response.data;
  },

  updateGuest: async (id, guestData) => {
    const response = await api.put(`/guests/${id}`, guestData);
    return response.data;
  },

  // Lấy toàn bộ danh sách (alias của searchGuests không từ khóa)
  getGuests: async () => {
    const response = await api.get('/guests');
    return response.data;
  },

  addIdentityDocument: async (id, docData) => {
    const response = await api.post(`/guests/${id}/documents`, docData);
    return response.data;
  },

  deleteIdentityDocument: async (guestId, docId) => {
    const response = await api.delete(`/guests/${guestId}/documents/${docId}`);
    return response.data;
  },

  /**
   * NCL-12-CN-005: Xóa (anonymize) dữ liệu cá nhân của khách.
   * Chỉ ADMIN được gọi. Kiểm tra không còn hóa đơn PENDING trước khi xóa.
   */
  deletePersonalData: async (id) => {
    const response = await api.delete(`/guests/${id}/personal-data`);
    return response.data;
  },
};

export default guestApi;
