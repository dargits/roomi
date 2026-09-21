import api from './api';
import {
  RevenueReportResponse,
  OccupancyReportResponse,
  DashboardStatsResponse,
  AdrRevparReportResponse,
  ChannelReportResponse
} from '../types';

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
   * Báo cáo Giá bán trung bình (ADR) và Doanh thu trên mỗi phòng (RevPAR)
   * GET /api/v1/reports/adr-revpar?from=&to=&groupBy=
   * Role: OWNER / ACCOUNTANT / ADMIN
   */
  getAdrRevparReport: async (from?: string, to?: string, groupBy = 'day'): Promise<AdrRevparReportResponse> => {
    const response = await api.get<AdrRevparReportResponse>('/reports/adr-revpar', { params: { from, to, groupBy } });
    return response.data;
  },

  /**
   * Báo cáo cơ cấu đặt phòng theo kênh (Channel Structure)
   * GET /api/v1/reports/channels?from=&to=
   * Role: OWNER / ACCOUNTANT / ADMIN
   */
  getChannelReport: async (from?: string, to?: string): Promise<ChannelReportResponse> => {
    const response = await api.get<ChannelReportResponse>('/reports/channels', { params: { from, to } });
    return response.data;
  },

  /**
   * Xuất báo cáo cơ cấu kênh ra file CSV (UTF-8 BOM hỗ trợ Excel tiếng Việt)
   * GET /api/v1/reports/export?type=channels&from=&to=
   * Role: OWNER / ACCOUNTANT / ADMIN
   */
  exportChannelReport: async (from?: string, to?: string): Promise<Blob> => {
    const response = await api.get('/reports/export', {
      params: { type: 'channels', from, to },
      responseType: 'blob'
    });
    return response.data;
  },

  /**
   * Báo cáo So sánh chỉ số với kỳ trước (CLTSN3-431)
   * GET /api/v1/reports/period-comparison?from=&to=&periodType=&compareTarget=
   * Role: OWNER / ACCOUNTANT / ADMIN
   */
  getPeriodComparison: async (
    from: string,
    to: string,
    periodType: 'month' | 'quarter' | 'year' | 'custom' = 'month',
    compareTarget: 'both' | 'previous_period' | 'same_period_last_year' = 'both'
  ): Promise<import('../types').PeriodComparisonReportResponse> => {
    const response = await api.get<import('../types').PeriodComparisonReportResponse>('/reports/period-comparison', {
      params: { from, to, periodType, compareTarget }
    });
    return response.data;
  },

  /**
   * Xuất báo cáo so sánh chỉ số với kỳ trước ra file CSV UTF-8 BOM
   * GET /api/v1/reports/export?type=period_comparison&from=&to=&periodType=
   * Role: OWNER / ACCOUNTANT / ADMIN
   */
  exportPeriodComparison: async (
    from: string,
    to: string,
    periodType: 'month' | 'quarter' | 'year' | 'custom' = 'month'
  ): Promise<Blob> => {
    const response = await api.get('/reports/export', {
      params: { type: 'period_comparison', from, to, periodType },
      responseType: 'blob'
    });
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
