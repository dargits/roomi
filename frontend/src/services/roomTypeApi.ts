import api from './api';
import { RoomTypeResponse, RoomTypeRequest, MessageResponse } from '../types';

export const roomTypeApi = {
  // Public endpoint for Landing Page (returns only active room types)
  getPublicRoomTypes: async (): Promise<RoomTypeResponse[]> => {
    const response = await api.get<RoomTypeResponse[]>('/room-types/public');
    return response.data;
  },

  // Admin endpoints (require OWNER role and auth token)
  getAllRoomTypes: async (): Promise<RoomTypeResponse[]> => {
    const response = await api.get<RoomTypeResponse[]>('/room-types');
    return response.data;
  },

  getRoomTypeById: async (id: number | string): Promise<RoomTypeResponse> => {
    const response = await api.get<RoomTypeResponse>(`/room-types/${id}`);
    return response.data;
  },

  createRoomType: async (roomTypeData: RoomTypeRequest): Promise<RoomTypeResponse> => {
    const response = await api.post<RoomTypeResponse>('/room-types', roomTypeData);
    return response.data;
  },

  updateRoomType: async (id: number | string, roomTypeData: RoomTypeRequest): Promise<RoomTypeResponse> => {
    const response = await api.put<RoomTypeResponse>(`/room-types/${id}`, roomTypeData);
    return response.data;
  },

  deleteRoomType: async (id: number | string): Promise<MessageResponse> => {
    const response = await api.delete<MessageResponse>(`/room-types/${id}`);
    return response.data;
  }
};

export default roomTypeApi;
