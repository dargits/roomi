import api from './api';

const publicGroupBookingRequestApi = {
  create: async (data) => {
    const response = await api.post('/public/group-booking-requests', data);
    return response.data;
  },

  getAll: async () => {
    const response = await api.get('/public/group-booking-requests');
    return response.data;
  },

  approve: async (id) => {
    const response = await api.put(`/public/group-booking-requests/${id}/approve`);
    return response.data;
  },

  reject: async (id, reason) => {
    const response = await api.put(`/public/group-booking-requests/${id}/reject`, null, { params: { reason } });
    return response.data;
  },
};

export default publicGroupBookingRequestApi;