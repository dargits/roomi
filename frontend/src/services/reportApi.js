import api from './api';

const reportApi = {
  /**
   * Dashboard tổng quan
   * GET /api/v1/reports/dashboard
   * Role: OWNER
   */
  getDashboard: async () => {
    const response = await api.get('/reports/dashboard');
    return response.data;
  },

  /**
   * Báo cáo doanh thu
   * GET /api/v1/reports/revenue?from=&to=&groupBy=
   * Role: OWNER / ACCOUNTANT
   * @param {string} from - Ngày bắt đầu (YYYY-MM-DD)
   * @param {string} to   - Ngày kết thúc (YYYY-MM-DD)
   * @param {string} groupBy - 'day' | 'month'
   */
  getRevenueReport: async (from, to, groupBy = 'day') => {
    const response = await api.get('/reports/revenue', { params: { from, to, groupBy } });
    return response.data;
  },

  /**
   * Báo cáo công suất phòng
   * GET /api/v1/reports/occupancy?from=&to=
   * Role: OWNER
   */
  getOccupancyReport: async (from, to) => {
    const response = await api.get('/reports/occupancy', { params: { from, to } });
    return response.data;
  },

  /**
   * Lấy danh sách check-in/out hôm nay
   * GET /api/v1/notifications/today-checkinout
   * Role: OWNER / RECEPTIONIST
   */
  getTodayCheckInOut: async () => {
    const response = await api.get('/notifications/today-checkinout');
    return response.data;
  }
};

export default reportApi;
