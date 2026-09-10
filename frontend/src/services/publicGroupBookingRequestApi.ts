import api from './api';
import { MessageResponse } from '../types';

const publicGroupBookingRequestApi = {
  create: async (data: any): Promise<any> => {
    const response = await api.post('/public/group-booking-requests', data);
    return response.data;
  },

  getAll: async (): Promise<any[]> => {
    const response = await api.get('/public/group-booking-requests');
    return response.data;
  },

  approve: async (id: number | string): Promise<any> => {
    const response = await api.put(`/public/group-booking-requests/${id}/approve`);
    return response.data;
  },

  reject: async (id: number | string, reason?: string): Promise<MessageResponse> => {
    const response = await api.put<MessageResponse>(`/public/group-booking-requests/${id}/reject`, null, { params: { reason } });
    return response.data;
  },
};

export default publicGroupBookingRequestApi;
