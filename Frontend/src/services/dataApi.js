import api from './api';

const dataApi = {
  /**
   * Export dữ liệu / Sao lưu hệ thống ra file CSV
   * @param {string} type - 'bookings' | 'guests' | 'rooms' | 'room-types' | 'extra-services' | 'invoices'
   */
  exportData: async (type) => {
    const response = await api.get('/data/export', {
      params: { type },
      responseType: 'blob'
    });
    return response.data;
  },

  /**
   * Import dữ liệu từ file CSV
   * @param {string} type - 'rooms' | 'guests' | 'room-types' | 'extra-services'
   * @param {File} file
   */
  importData: async (type, file) => {
    const formData = new FormData();
    formData.append('type', type);
    formData.append('file', file);
    const response = await api.post('/data/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

export default dataApi;
