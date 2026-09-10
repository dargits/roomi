import api from './api';
import { MessageResponse } from '../types';

export const debtApprovalApi = {
  // Lễ tân gửi yêu cầu trả phòng còn nợ
  requestDebtCheckout: async (data: any): Promise<any> => {
    const response = await api.post('/debt-approvals/request', data);
    return response.data;
  },

  // Chủ cơ sở phê duyệt
  approveDebtCheckout: async (id: number | string): Promise<any> => {
    const response = await api.put(`/debt-approvals/${id}/approve`);
    return response.data;
  },

  // Chủ cơ sở từ chối
  rejectDebtCheckout: async (id: number | string, rejectReason?: string): Promise<any> => {
    const response = await api.put(`/debt-approvals/${id}/reject`, { rejectReason });
    return response.data;
  },

  // Danh sách công nợ chờ thu (sắp xếp theo ngày quá hạn giảm dần)
  getActiveDebts: async (): Promise<any[]> => {
    const response = await api.get('/debt-approvals/debts');
    return response.data;
  },

  // Danh sách yêu cầu chờ duyệt
  getPendingRequests: async (): Promise<any[]> => {
    const response = await api.get('/debt-approvals/pending');
    return response.data;
  },

  // Tất cả yêu cầu
  getAllRequests: async (): Promise<any[]> => {
    const response = await api.get('/debt-approvals/all');
    return response.data;
  },

  getAcknowledgement: async (id: number | string): Promise<any> => {
    const response = await api.get(`/debt-approvals/${id}/acknowledgement`);
    return response.data;
  },

  sendAcknowledgement: async (id: number | string): Promise<MessageResponse> => {
    const response = await api.post<MessageResponse>(`/debt-approvals/${id}/send-acknowledgement`);
    return response.data;
  },

  logDocument: async (id: number | string, actionType = 'PRINT'): Promise<any> => {
    const response = await api.post(`/debt-approvals/${id}/log-document`, null, {
      params: { actionType }
    });
    return response.data;
  },
};

export default debtApprovalApi;
