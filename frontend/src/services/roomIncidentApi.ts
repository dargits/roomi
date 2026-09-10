import api from './api';
import { RoomIncidentResponse, RoomIncidentReportRequest } from '../types';

export const roomIncidentApi = {
  // Báo sự cố phòng
  reportIncident: async (data: RoomIncidentReportRequest): Promise<RoomIncidentResponse> => {
    const response = await api.post<RoomIncidentResponse>('/room-incidents/report', data);
    return response.data;
  },

  // Chủ cơ sở giải quyết sự cố
  resolveIncident: async (id: number | string, resolutionNote?: string): Promise<RoomIncidentResponse> => {
    const response = await api.put<RoomIncidentResponse>(`/room-incidents/${id}/resolve`, { resolutionNote });
    return response.data;
  },

  // Lấy danh sách sự cố
  getIncidents: async (params: any = {}): Promise<RoomIncidentResponse[]> => {
    const response = await api.get<RoomIncidentResponse[]>('/room-incidents', { params });
    return response.data;
  },

  // Lấy chi tiết sự cố
  getIncidentById: async (id: number | string): Promise<RoomIncidentResponse> => {
    const response = await api.get<RoomIncidentResponse>(`/room-incidents/${id}`);
    return response.data;
  },
};

export default roomIncidentApi;
