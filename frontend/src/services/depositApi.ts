import api from './api';
import { DepositResponse, MessageResponse } from '../types';

/**
 * API quản lý đặt cọc — NCL-11-CN-001 đến NCL-11-CN-006
 */
export const depositApi = {
  // === Chính sách đặt cọc (NCL-11-CN-001) ===
  getAllPolicies: async (): Promise<any[]> => {
    const res = await api.get('/deposit-policies');
    return res.data;
  },

  createPolicy: async (data: any): Promise<any> => {
    const res = await api.post('/deposit-policies', data);
    return res.data;
  },

  updatePolicy: async (id: number | string, data: any): Promise<any> => {
    const res = await api.put(`/deposit-policies/${id}`, data);
    return res.data;
  },

  deletePolicy: async (id: number | string): Promise<MessageResponse> => {
    const res = await api.delete<MessageResponse>(`/deposit-policies/${id}`);
    return res.data;
  },

  // === Khoản cọc theo booking (NCL-11-CN-002 đến NCL-11-CN-006) ===
  getDepositsByBooking: async (bookingId: number | string): Promise<DepositResponse[]> => {
    const res = await api.get<DepositResponse[]>(`/bookings/${bookingId}/deposit`);
    return res.data;
  },

  getCancellationFee: async (bookingId: number | string): Promise<any> => {
    const res = await api.get(`/bookings/${bookingId}/deposit/fee`);
    return res.data;
  },

  recordDeposit: async (bookingId: number | string, data: any): Promise<DepositResponse> => {
    const res = await api.post<DepositResponse>(`/bookings/${bookingId}/deposit`, data);
    return res.data;
  },

  refundDeposit: async (bookingId: number | string, data?: any): Promise<DepositResponse> => {
    const res = await api.post<DepositResponse>(`/bookings/${bookingId}/deposit/refund`, data);
    return res.data;
  },

  noShowDeposit: async (bookingId: number | string, data?: any): Promise<DepositResponse> => {
    const res = await api.post<DepositResponse>(`/bookings/${bookingId}/deposit/no-show`, data);
    return res.data;
  },

  getUnsettledDeposits: async (): Promise<DepositResponse[]> => {
    const res = await api.get<DepositResponse[]>('/deposits/unsettled');
    return res.data;
  },
};

export default depositApi;
