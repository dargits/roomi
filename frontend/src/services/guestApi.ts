import api from './api';
import { GuestResponse, GuestRequest, MessageResponse, PageResponse } from '../types';

export interface GuestFilterParams {
  page?: number;
  size?: number;
  search?: string;
  sortBy?: string;
  direction?: 'asc' | 'desc';
}

export const guestApi = {
  // Lấy danh sách khách hàng có phân trang và tìm kiếm
  getGuestsPaged: async (params: GuestFilterParams = {}): Promise<PageResponse<GuestResponse>> => {
    const { page = 0, size = 15, search = '', sortBy = 'id', direction = 'desc' } = params;
    const query = new URLSearchParams();
    query.append('page', page.toString());
    query.append('size', size.toString());
    query.append('sortBy', sortBy);
    query.append('direction', direction);
    if (search && search.trim()) {
      query.append('search', search.trim());
    }
    const response = await api.get<PageResponse<GuestResponse>>(`/guests?${query.toString()}`);
    return response.data;
  },

  // Tim kiem theo ten/SDT/CCCD
  searchGuests: async (keyword = ''): Promise<GuestResponse[]> => {
    const url = keyword ? `/guests?search=${encodeURIComponent(keyword)}` : '/guests';
    const response = await api.get<GuestResponse[]>(url);
    return response.data;
  },

  getGuestById: async (id: number | string): Promise<GuestResponse> => {
    const response = await api.get<GuestResponse>(`/guests/${id}`);
    return response.data;
  },

  getGuestByIdNumber: async (idNumber: string): Promise<GuestResponse> => {
    const response = await api.get<GuestResponse>(`/guests/by-id-number/${idNumber}`);
    return response.data;
  },

  getGuestHistory: async (id: number | string): Promise<any[]> => {
    const response = await api.get<any[]>(`/guests/${id}/history`);
    return response.data;
  },

  getGuestLoyalty: async (id: number | string): Promise<any> => {
    const response = await api.get(`/guests/${id}/loyalty`);
    return response.data;
  },

  createGuest: async (guestData: GuestRequest): Promise<GuestResponse> => {
    const response = await api.post<GuestResponse>('/guests', guestData);
    return response.data;
  },

  updateGuest: async (id: number | string, guestData: GuestRequest): Promise<GuestResponse> => {
    const response = await api.put<GuestResponse>(`/guests/${id}`, guestData);
    return response.data;
  },

  // Lấy toàn bộ danh sách (alias của searchGuests không từ khóa)
  getGuests: async (): Promise<GuestResponse[]> => {
    const response = await api.get<GuestResponse[]>('/guests');
    return response.data;
  },

  addIdentityDocument: async (id: number | string, docData: any): Promise<any> => {
    const response = await api.post(`/guests/${id}/documents`, docData);
    return response.data;
  },

  deleteIdentityDocument: async (guestId: number | string, docId: number | string): Promise<MessageResponse> => {
    const response = await api.delete<MessageResponse>(`/guests/${guestId}/documents/${docId}`);
    return response.data;
  },

  /**
   * NCL-12-CN-005: Xóa (anonymize) dữ liệu cá nhân của khách.
   * Chỉ ADMIN được gọi. Kiểm tra không còn hóa đơn PENDING trước khi xóa.
   */
  deletePersonalData: async (id: number | string): Promise<MessageResponse> => {
    const response = await api.delete<MessageResponse>(`/guests/${id}/personal-data`);
    return response.data;
  },
};

export default guestApi;
