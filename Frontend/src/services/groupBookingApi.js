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
};

export default groupBookingApi;