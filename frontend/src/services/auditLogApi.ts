import api from './api';
import { AuditLog } from '../types';

const auditLogApi = {
  /**
   * Lấy lịch sử hoạt động chung
   * GET /api/v1/audit-logs
   * Role: OWNER / ADMIN
   */
  getLogs: async (params: any = {}): Promise<AuditLog[]> => {
    const response = await api.get<AuditLog[]>('/audit-logs', { params });
    return response.data;
  },

  /**
   * NCL-12-CN-006: Lấy nhật ký truy cập dữ liệu cá nhân (QTN-24).
   * Lọc: EXPORT_STAY_DECLARATION, DELETE_PERSONAL_DATA, VIEW_GUEST_DETAIL.
   * Role: OWNER / ADMIN
   */
  getPersonalDataLogs: async (params: any = {}): Promise<AuditLog[]> => {
    const response = await api.get<AuditLog[]>('/audit-logs/personal-data', { params });
    return response.data;
  },
};

export default auditLogApi;
