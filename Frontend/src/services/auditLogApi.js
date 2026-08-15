import api from './api';

const auditLogApi = {
  /**
   * Lấy lịch sử hoạt động
   * GET /api/v1/audit-logs
   * Role: OWNER / ADMIN
   * @param {Object} params - { entity, actorId, from, to }
   */
  getLogs: async (params = {}) => {
    const response = await api.get('/audit-logs', { params });
    return response.data;
  }
};

export default auditLogApi;
