import api from './api';
import { RevenueReportResponse, OccupancyReportResponse, DashboardStatsResponse } from '../types';

const reportApi = {
  /**
   * Dashboard tổng quan
   * GET /api/v1/reports/dashboard
   * Role: OWNER
   */
  getDashboard: async (): Promise<DashboardStatsResponse> => {
    const response = await api.get<DashboardStatsResponse>('/reports/dashboard');
    return response.data;
  },

  /**
   * Báo cáo doanh thu
   * GET /api/v1/reports/revenue?from=&to=&groupBy=
   * Role: OWNER / ACCOUNTANT
   */
  getRevenueReport: async (from?: string, to?: string, groupBy = 'day'): Promise<RevenueReportResponse> => {
    const response = await api.get<RevenueReportResponse>('/reports/revenue', { params: { from, to, groupBy } });
    return response.data;
  },

  /**
   * Báo cáo công suất phòng
   * GET /api/v1/reports/occupancy?from=&to=
   * Role: OWNER
   */
  getOccupancyReport: async (from?: string, to?: string): Promise<OccupancyReportResponse> => {
    const response = await api.get<OccupancyReportResponse>('/reports/occupancy', { params: { from, to } });
    return response.data;
  },

  /**
   * Lấy danh sách check-in/out hôm nay
   * GET /api/v1/notifications/today-checkinout
   * Role: OWNER / RECEPTIONIST
   */
  getTodayCheckInOut: async (): Promise<any> => {
    const response = await api.get('/notifications/today-checkinout');
    return response.data;
  }
};

export default reportApi;
