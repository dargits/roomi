import api from './api';

export const cashierShiftApi = {
  open: async (payload) => (await api.post('/shifts', payload)).data,
  getCurrent: async () => (await api.get('/shifts/current')).data,
  getHistory: async () => (await api.get('/shifts/history')).data,
  preview: async (shiftId) => (await api.get(`/shifts/${shiftId}/preview`)).data,
  close: async (shiftId, payload) => (await api.post(`/shifts/${shiftId}/close`, payload)).data,
  reopen: async (shiftId, payload) => (await api.post(`/shifts/${shiftId}/reopen`, payload)).data,
  list: async (params) => (await api.get('/shifts', { params })).data,
};

export default cashierShiftApi;