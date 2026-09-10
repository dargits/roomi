import api from './api';

const dataApi = {
  /**
   * Export dữ liệu / Sao lưu hệ thống ra file CSV
   * @param type - 'bookings' | 'guests' | 'rooms' | 'room-types' | 'extra-services' | 'invoices'
   */
  exportData: async (type: string): Promise<any> => {
    const response = await api.get('/data/export', {
      params: { type },
      responseType: 'blob'
    });
    return response.data;
  },

  /**
   * Import dữ liệu từ file CSV
   * @param type - 'rooms' | 'guests' | 'room-types' | 'extra-services'
   * @param file
   */
  importData: async (type: string, file: File): Promise<any> => {
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
