import api from './api';
import { UserPermissionOverviewResponse, MessageResponse } from '../types';

export const userPermissionApi = {
  // Xem tổng quan phân quyền tài khoản (mặc định vs bổ sung)
  getUserPermissions: async (userId: number | string): Promise<UserPermissionOverviewResponse> => {
    const response = await api.get<UserPermissionOverviewResponse>(`/admin/users/${userId}/permissions`);
    return response.data;
  },

  // Cấp thêm quyền xem có kiểm soát
  grantPermission: async (userId: number | string, data: any): Promise<any> => {
    const response = await api.post(`/admin/users/${userId}/permissions`, data);
    return response.data;
  },

  // Thu hồi quyền xem bổ sung
  revokePermission: async (userId: number | string, permissionId: number | string, reason?: string): Promise<MessageResponse> => {
    const response = await api.delete<MessageResponse>(`/admin/users/${userId}/permissions/${permissionId}`, {
      data: { reason }
    });
    return response.data;
  },
};

export default userPermissionApi;
