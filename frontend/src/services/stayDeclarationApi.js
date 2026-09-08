import api from './api';

/**
 * API service cho module Khai báo lưu trú (NCL-12).
 * Tất cả response có số giấy tờ đã được mask theo vai trò người dùng (QTN-24).
 */
const stayDeclarationApi = {
  /**
   * NCL-12-CN-002: Lấy danh sách khai báo hôm nay.
   * Số giấy tờ được mask tự động theo role của token đang dùng.
   */
  getToday: async () => {
    const response = await api.get('/stay-declarations/today');
    return response.data;
  },

  /**
   * NCL-12-CN-002: Lấy danh sách khai báo theo ngày cụ thể.
   * @param {string} date - Ngày theo format YYYY-MM-DD
   */
  getByDate: async (date) => {
    const params = date ? { date } : {};
    const response = await api.get('/stay-declarations', { params });
    return response.data;
  },

  /**
   * NCL-12-CN-003: Kết xuất Excel danh sách khai báo lưu trú.
   * File Excel cũng áp dụng mask số giấy tờ theo vai trò người kết xuất.
   * @param {string} date - Ngày theo format YYYY-MM-DD
   * @returns {Blob} File Excel
   */
  exportExcel: async (date) => {
    const params = date ? { date } : {};
    const response = await api.get('/stay-declarations/export', {
      params,
      responseType: 'blob',
    });
    return response;
  },

  /**
   * Đánh dấu đã hoàn tất khai báo lưu trú cho một booking.
   * @param {number} bookingId
   */
  complete: async (bookingId) => {
    const response = await api.put(`/stay-declarations/${bookingId}/complete`);
    return response.data;
  },

  /**
   * Lấy lịch sử lưu trú theo khoảng thời gian và bộ lọc.
   * @param {Object} params - { fromDate, toDate, keyword, declarationStatus, documentStatus }
   */
  getHistory: async (params = {}) => {
    const response = await api.get('/stay-declarations/history', { params });
    return response.data;
  },

  /**
   * Kết xuất Excel lịch sử lưu trú.
   * @param {Object} params - { fromDate, toDate, keyword, declarationStatus, documentStatus }
   * @returns {Blob} File Excel
   */
  exportHistoryExcel: async (params = {}) => {
    const response = await api.get('/stay-declarations/history/export', {
      params,
      responseType: 'blob',
    });
    return response;
  },
};

export default stayDeclarationApi;
