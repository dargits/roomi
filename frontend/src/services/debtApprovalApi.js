import api from './api';

export const debtApprovalApi = {
  // Lễ tân gửi yêu cầu trả phòng còn nợ
  requestDebtCheckout: async (data) => {
    const response = await api.post('/debt-approvals/request', data);
    return response.data;
  },

  // Chủ cơ sở phê duyệt
  approveDebtCheckout: async (id) => {
    const response = await api.put(`/debt-approvals/${id}/approve`);
    return response.data;
  },

  // Chủ cơ sở từ chối
  rejectDebtCheckout: async (id, rejectReason) => {
    const response = await api.put(`/debt-approvals/${id}/reject`, { rejectReason });
    return response.data;
  },

  // Danh sách công nợ chờ thu (sắp xếp theo ngày quá hạn giảm dần)
  getActiveDebts: async () => {
    const response = await api.get('/debt-approvals/debts');
    return response.data;
  },

  // Danh sách yêu cầu chờ duyệt
  getPendingRequests: async () => {
    const response = await api.get('/debt-approvals/pending');
    return response.data;
  },

  // Tất cả yêu cầu
  getAllRequests: async () => {
    const response = await api.get('/debt-approvals/all');
    return response.data;
  },
};
