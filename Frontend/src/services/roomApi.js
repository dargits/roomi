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

  // Lấy phòng trống không bị trùng lịch cho khoảng ngày và loại phòng
  getAvailableRooms: async (roomTypeId, checkInDate, checkOutDate) => {
    const params = {};
    if (roomTypeId) params.roomTypeId = roomTypeId;
    if (checkInDate) params.checkInDate = checkInDate;
    if (checkOutDate) params.checkOutDate = checkOutDate;
    const response = await api.get('/rooms/available', { params });
    return response.data;
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
  },

  // NCL-06-CN-NEW: Housekeeper gửi kiểm tra (DIRTY -> INSPECTING)
  submitInspection: async (id) => {
    const response = await api.put(`/rooms/${id}/submit-inspection`);
    return response.data;
  },

  // NCL-06-CN-NEW: Supervisor duyệt phòng sạch (INSPECTING -> AVAILABLE)
  approveClean: async (id) => {
    const response = await api.put(`/rooms/${id}/approve-clean`);
    return response.data;
  },

  // NCL-06-CN-NEW: Phân công nhân viên dọn phòng
  assignCleaner: async (id, housekeeperId) => {
    const response = await api.put(`/rooms/${id}/assign-cleaner`, null, { params: { housekeeperId } });
    return response.data;
  },

  // NCL-06-CN-NEW: Hủy phân công
  unassignCleaner: async (id) => {
    const response = await api.delete(`/rooms/${id}/assign-cleaner`);
    return response.data;
  },
};

export default roomApi;

