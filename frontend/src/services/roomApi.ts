import api from './api';
import { RoomResponse, RoomRequest, RoomStatus, MessageResponse } from '../types';

export const roomApi = {
  // GET: Lấy danh sách phòng (tất cả hoặc theo status)
  getAllRooms: async (status: RoomStatus | null = null): Promise<RoomResponse[]> => {
    const url = status ? `/rooms?status=${status}` : '/rooms';
    const response = await api.get<RoomResponse[]>(url);
    return response.data;
  },

  getRoomsByStatus: async (status: RoomStatus): Promise<RoomResponse[]> => {
    return roomApi.getAllRooms(status);
  },

  // Lấy phòng trống không bị trùng lịch cho khoảng ngày và loại phòng
  getAvailableRooms: async (roomTypeId?: number | string, checkInDate?: string, checkOutDate?: string): Promise<RoomResponse[]> => {
    const params: Record<string, any> = {};
    if (roomTypeId) params.roomTypeId = roomTypeId;
    if (checkInDate) params.checkInDate = checkInDate;
    if (checkOutDate) params.checkOutDate = checkOutDate;
    const response = await api.get<RoomResponse[]>('/rooms/available', { params });
    return response.data;
  },

  getRoomById: async (id: number | string): Promise<RoomResponse> => {
    const response = await api.get<RoomResponse>(`/rooms/${id}`);
    return response.data;
  },

  // POST/PUT/DELETE: Yêu cầu OWNER
  createRoom: async (roomData: RoomRequest): Promise<RoomResponse> => {
    const response = await api.post<RoomResponse>('/rooms', roomData);
    return response.data;
  },

  updateRoom: async (id: number | string, roomData: RoomRequest): Promise<RoomResponse> => {
    const response = await api.put<RoomResponse>(`/rooms/${id}`, roomData);
    return response.data;
  },

  deleteRoom: async (id: number | string): Promise<MessageResponse> => {
    const response = await api.delete<MessageResponse>(`/rooms/${id}`);
    return response.data;
  },

  // Đánh dấu phòng đã dọn sạch (Chỉ khi phòng DIRTY -> AVAILABLE)
  markRoomClean: async (id: number | string): Promise<RoomResponse> => {
    const response = await api.put<RoomResponse>(`/rooms/${id}/mark-clean`);
    return response.data;
  },

  // Đánh dấu phòng cần dọn dẹp (AVAILABLE -> DIRTY)
  markRoomDirty: async (id: number | string): Promise<RoomResponse> => {
    const response = await api.put<RoomResponse>(`/rooms/${id}/mark-dirty`);
    return response.data;
  },

  // Khóa phòng bảo trì (OWNER)
  markRoomMaintenance: async (id: number | string): Promise<RoomResponse> => {
    const response = await api.put<RoomResponse>(`/rooms/${id}/maintenance`);
    return response.data;
  },

  // NCL-06-CN-NEW: Housekeeper gửi kiểm tra (DIRTY -> INSPECTING)
  submitInspection: async (id: number | string): Promise<RoomResponse> => {
    const response = await api.put<RoomResponse>(`/rooms/${id}/submit-inspection`);
    return response.data;
  },

  // NCL-06-CN-NEW: Supervisor duyệt phòng sạch (INSPECTING -> AVAILABLE)
  approveClean: async (id: number | string): Promise<RoomResponse> => {
    const response = await api.put<RoomResponse>(`/rooms/${id}/approve-clean`);
    return response.data;
  },

  // NCL-06-CN-NEW: Phân công nhân viên dọn phòng
  assignCleaner: async (id: number | string, housekeeperId: number | string): Promise<RoomResponse> => {
    const response = await api.put<RoomResponse>(`/rooms/${id}/assign-cleaner`, null, { params: { housekeeperId } });
    return response.data;
  },

  // NCL-06-CN-NEW: Hủy phân công
  unassignCleaner: async (id: number | string): Promise<RoomResponse> => {
    const response = await api.delete<RoomResponse>(`/rooms/${id}/assign-cleaner`);
    return response.data;
  },
};

export default roomApi;
