import api from './api';

export const roomTypeApi = {
  // Public endpoint for Landing Page (returns only active room types)
  getPublicRoomTypes: async () => {
    const response = await api.get('/room-types/public');
    return response.data;
  },

  // Admin endpoints (require OWNER role and auth token)
  getAllRoomTypes: async () => {
    const response = await api.get('/room-types');
    return response.data;
  },

  getRoomTypeById: async (id) => {
    const response = await api.get(`/room-types/${id}`);
    return response.data;
  },

  createRoomType: async (roomTypeData) => {
    const response = await api.post('/room-types', roomTypeData);
    return response.data;
  },

  updateRoomType: async (id, roomTypeData) => {
    const response = await api.put(`/room-types/${id}`, roomTypeData);
    return response.data;
  },

  deleteRoomType: async (id) => {
    const response = await api.delete(`/room-types/${id}`);
    return response.data;
  }
};
