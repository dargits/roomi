import api from './api';
import { GroupBookingResponse, GroupInvoiceResponse, MessageResponse } from '../types';

const groupBookingApi = {
  getAll: async (): Promise<GroupBookingResponse[]> => {
    const response = await api.get<GroupBookingResponse[]>('/group-bookings');
    return response.data;
  },

  getById: async (id: number | string): Promise<GroupBookingResponse> => {
    const response = await api.get<GroupBookingResponse>(`/group-bookings/${id}`);
    return response.data;
  },

  create: async (data: any): Promise<GroupBookingResponse> => {
    const response = await api.post<GroupBookingResponse>('/group-bookings', data);
    return response.data;
  },

  getAssignmentSuggestion: async (id: number | string): Promise<any> => {
    const response = await api.get(`/group-bookings/${id}/assignment-suggestion`);
    return response.data;
  },

  assignRooms: async (id: number | string, assignments: any): Promise<any> => {
    const response = await api.put(`/group-bookings/${id}/assign-rooms`, { assignments });
    return response.data;
  },

  getInvoices: async (id: number | string): Promise<GroupInvoiceResponse> => {
    const response = await api.get(`/group-bookings/${id}/invoices`);
    return response.data;
  },

  createInvoices: async (id: number | string, data: any): Promise<any> => {
    const response = await api.post(`/group-bookings/${id}/invoices`, data);
    return response.data;
  },

  /** NCL-13-CN-004: Hủy một phần số phòng trong hồ sơ đoàn */
  cancelPartial: async (id: number | string, bookingIds: number[]): Promise<any> => {
    const response = await api.post(`/group-bookings/${id}/cancel-partial`, { bookingIds });
    return response.data;
  },

  /** Preview tính phí hủy một phần theo thời gian thực */
  previewCancelPartial: async (id: number | string, bookingIds: number[]): Promise<any> => {
    const response = await api.post(`/group-bookings/${id}/cancel-partial/preview`, { bookingIds });
    return response.data;
  },

  /** Lấy danh sách các khoản cọc của đoàn */
  getDeposits: async (id: number | string): Promise<any[]> => {
    const response = await api.get(`/group-bookings/${id}/deposits`);
    return response.data;
  },

  /** Ghi nhận thu tiền cọc đoàn */
  createDeposit: async (id: number | string, data: any): Promise<any> => {
    const response = await api.post(`/group-bookings/${id}/deposits`, data);
    return response.data;
  },

  /** NCL-13-CN-006: Lấy tóm tắt chi tiết các phòng trước khi trả phòng đoàn */
  getBulkCheckOutSummary: async (id: number | string): Promise<any> => {
    const response = await api.get(`/group-bookings/${id}/bulk-checkout-summary`);
    return response.data;
  },

  /** NCL-13-CN-006: Trả phòng hàng loạt cho đoàn - checkout các phòng được chọn */
  bulkCheckOut: async (id: number | string, data?: { bookingIds?: number[] }): Promise<any> => {
    const response = await api.post(`/group-bookings/${id}/bulk-checkout`, data || {});
    return response.data;
  },
};

export default groupBookingApi;
