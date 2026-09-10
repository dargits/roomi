import api from './api';
import { UserResponse, UserUpdateRequest, Role, MessageResponse } from '../types';

const userApi = {
  /** Lấy thông tin tài khoản đang đăng nhập */
  getProfile: async (): Promise<UserResponse> => {
    const response = await api.get<UserResponse>('/users/me');
    return response.data;
  },

  /** Cập nhật thông tin tài khoản đang đăng nhập */
  updateProfile: async (data: UserUpdateRequest): Promise<UserResponse> => {
    const response = await api.put<UserResponse>('/users/me', data);
    return response.data;
  },

  /** Đổi mật khẩu */
  changePassword: async (
    oldPasswordOrData: string | { oldPassword: string; newPassword: string },
    newPasswordParam?: string
  ): Promise<MessageResponse> => {
    const payload = typeof oldPasswordOrData === 'object'
      ? oldPasswordOrData
      : { oldPassword: oldPasswordOrData, newPassword: newPasswordParam };
    const response = await api.put<MessageResponse>('/users/me/password', payload);
    return response.data;
  },

  /** ADMIN/OWNER/RECEPTIONIST: Lấy danh sách toàn bộ nhân sự */
  getAllUsers: async (): Promise<UserResponse[]> => {
    const response = await api.get<UserResponse[]>('/users');
    return response.data;
  },

  /** Lấy danh sách nhân viên buồng phòng đang hoạt động */
  getHousekeepers: async (): Promise<UserResponse[]> => {
    const response = await api.get<UserResponse[]>('/users/housekeepers');
    return response.data;
  },

  /** ADMIN/OWNER: Cập nhật thông tin nhân viên */
  updateUserByAdmin: async (id: number, data: UserUpdateRequest): Promise<UserResponse> => {
    const response = await api.put<UserResponse>(`/users/${id}`, data);
    return response.data;
  },

  /** ADMIN/OWNER: Đổi vai trò (Role) của nhân viên */
  updateUserRole: async (id: number, role: Role): Promise<UserResponse> => {
    const response = await api.put<UserResponse>(`/users/${id}/role?role=${role}`);
    return response.data;
  },

  /** ADMIN/OWNER: Khóa tài khoản nhân viên */
  lockUser: async (id: number): Promise<MessageResponse> => {
    const response = await api.put<MessageResponse>(`/users/${id}/lock`);
    return response.data;
  },

  /** ADMIN/OWNER: Mở khóa tài khoản nhân viên */
  unlockUser: async (id: number): Promise<MessageResponse> => {
    const response = await api.put<MessageResponse>(`/users/${id}/unlock`);
    return response.data;
  }
};

export default userApi;
