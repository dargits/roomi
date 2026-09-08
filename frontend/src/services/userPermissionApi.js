import api from './api';

export const userPermissionApi = {
  // Xem tổng quan phân quyền tài khoản (mặc định vs bổ sung)
  getUserPermissions: async (userId) => {
    const response = await api.get(`/admin/users/${userId}/permissions`);
    return response.data;
  },

  // Cấp thêm quyền xem có kiểm soát
  grantPermission: async (userId, data) => {
    const response = await api.post(`/admin/users/${userId}/permissions`, data);
    return response.data;
  },

  // Thu hồi quyền xem bổ sung
  revokePermission: async (userId, permissionId, reason) => {
    const response = await api.delete(`/admin/users/${userId}/permissions/${permissionId}`, {
      data: { reason }
    });
    return response.data;
  },
};
