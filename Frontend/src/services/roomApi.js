import api from './api';

export const roomApi = {
  // GET: Lấy danh sách phòng (tất cả hoặc theo status)
  getAllRooms: async (status = null) => {
    const url = status ? `/rooms?status=${status}` : '/rooms';
    const response = await api.get(url);
    return response.data;
  },

  getRoomsByStatus: async (status) => {
    return roomApi.getAllRooms(status);
  },

  getRoomById: async (id) => {
    const response = await api.get(`/rooms/${id}`);
    return response.data;
  },

  // POST/PUT/DELETE: Yêu cầu OWNER
  createRoom: async (roomData) => {
    const response = await api.post('/rooms', roomData);
    return response.data;
  },

  updateRoom: async (id, roomData) => {
    const response = await api.put(`/rooms/${id}`, roomData);
    return response.data;
  },

  deleteRoom: async (id) => {
    const response = await api.delete(`/rooms/${id}`);
    return response.data;
  },

  // Đánh dấu phòng đã dọn sạch (Chỉ khi phòng DIRTY -> AVAILABLE)
  markRoomClean: async (id) => {
    const response = await api.put(`/rooms/${id}/mark-clean`);
    return response.data;
  },

  // Đánh dấu phòng cần dọn dẹp (AVAILABLE -> DIRTY)
  markRoomDirty: async (id) => {
    const response = await api.put(`/rooms/${id}/mark-dirty`);
    return response.data;
  },

  // Khóa phòng bảo trì (OWNER)
  markRoomMaintenance: async (id) => {
    const response = await api.put(`/rooms/${id}/maintenance`);
    return response.data;
  }
};

export default roomApi;

