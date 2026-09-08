import api from './api';

export const roomIncidentApi = {
  // Báo sự cố phòng
  reportIncident: async (data) => {
    const response = await api.post('/room-incidents/report', data);
    return response.data;
  },

  // Chủ cơ sở giải quyết sự cố
  resolveIncident: async (id, resolutionNote) => {
    const response = await api.put(`/room-incidents/${id}/resolve`, { resolutionNote });
    return response.data;
  },

  // Lấy danh sách sự cố
  getIncidents: async (params = {}) => {
    const response = await api.get('/room-incidents', { params });
    return response.data;
  },

  // Lấy chi tiết sự cố
  getIncidentById: async (id) => {
    const response = await api.get(`/room-incidents/${id}`);
    return response.data;
  },
};
