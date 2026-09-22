import api from './api';

export interface LegacyBookingImportError {
  rowNumber: number;
  guestName: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  reason: string;
}

export interface LegacyBookingRow {
  rowNumber: number;
  guestName: string;
  contact: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  price: number;
  paymentStatus: string;
  note?: string;
}

export interface LegacyBookingImportPreviewResponse {
  totalRows: number;
  validCount: number;
  errorCount: number;
  errors: LegacyBookingImportError[];
  previewRows: LegacyBookingRow[];
}

export interface LegacyBookingImportCommitResponse {
  importLogId: number;
  totalRows: number;
  successCount: number;
  errorCount: number;
  message: string;
}

export interface BookingImportLogResponse {
  id: number;
  fileName: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  status: string;
  importedById: number;
  importedByName: string;
  importedAt: string;
  notes?: string;
}

const bookingImportApi = {
  /**
   * Tải file mẫu bảng tính (.xlsx)
   */
  downloadTemplate: async (): Promise<Blob> => {
    const response = await api.get('/bookings/import-legacy/template', {
      responseType: 'blob'
    });
    return response.data;
  },

  /**
   * Kiểm tra trước dữ liệu tệp tải lên (Dry-run validation)
   */
  previewImport: async (file: File): Promise<LegacyBookingImportPreviewResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<LegacyBookingImportPreviewResponse>(
      '/bookings/import-legacy/preview',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  },

  /**
   * Xác nhận ghi toàn bộ dữ liệu vào hệ thống (All-or-nothing)
   */
  commitImport: async (file: File): Promise<LegacyBookingImportCommitResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<LegacyBookingImportCommitResponse>(
      '/bookings/import-legacy/commit',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  },

  /**
   * Lấy danh sách lịch sử các lần nhập
   */
  getImportHistory: async (): Promise<BookingImportLogResponse[]> => {
    const response = await api.get<BookingImportLogResponse[]>('/bookings/import-legacy/history');
    return response.data;
  }
};

export default bookingImportApi;
