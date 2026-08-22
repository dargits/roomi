import api from './api';

const auditLogApi = {
  /**
   * Lấy lịch sử hoạt động chung
   * GET /api/v1/audit-logs
   * Role: OWNER / ADMIN
   * @param {Object} params - { entity, actorId, from, to }
   */
  getLogs: async (params = {}) => {
    const response = await api.get('/audit-logs', { params });
    return response.data;
  },

  /**
   * NCL-12-CN-006: Lấy nhật ký truy cập dữ liệu cá nhân (QTN-24).
   * Lọc: EXPORT_STAY_DECLARATION, DELETE_PERSONAL_DATA, VIEW_GUEST_DETAIL.
   * Role: OWNER / ADMIN
   * @param {Object} params - { actorId, from, to }
   */
  getPersonalDataLogs: async (params = {}) => {
    const response = await api.get('/audit-logs/personal-data', { params });
    return response.data;
  },
};

export default auditLogApi;

