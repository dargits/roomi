import api from './api';

export interface BackupHistoryItem {
  id: number;
  fileName: string;
  fileSizeBytes: number;
  formattedSize: string;
  backupType: 'FULL_ZIP' | 'DATABASE_SQL' | string;
  status: 'SUCCESS' | 'FAILED' | string;
  tableCount: number;
  recordCount: number;
  checksum: string;
  createdAt: string;
  createdByName: string;
  note?: string;
}

export interface BackupConfig {
  autoBackupEnabled: boolean;
  autoBackupTime: string; // "HH:mm" e.g. "02:00"
  backupRetentionDays: number;
  lastBackupAt?: string;
  lastBackupStatus?: string;
  totalBackups: number;
  totalStorageBytes: number;
  formattedTotalStorage: string;
}

export interface RestoreSummary {
  success: boolean;
  message: string;
  statementsExecuted: number;
  tablesRestored: number;
  durationMs: number;
  restoredAt: string;
  fileName: string;
}

export interface ImportResult {
  success: boolean;
  message: string;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  durationMs?: number;
  details?: string[];
}

export interface DataTaskItem {
  taskId: string;
  taskType: 'IMPORT' | 'EXPORT' | string;
  dataType: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | string;
  progressPercent: number;
  statusMessage: string;
  subMessage?: string;
  totalRows?: number;
  processedRows?: number;
  importedCount?: number;
  skippedCount?: number;
  errorCount?: number;
  durationMs?: number;
  downloadUrl?: string;
  fileName?: string;
  createdAt?: string;
  completedAt?: string;
  details?: string[];
}

const dataApi = {
  /**
   * Export dữ liệu theo bảng ra file CSV
   */
  exportData: async (type: string, onProgress?: (percent: number) => void): Promise<Blob> => {
    const response = await api.get('/data/export', {
      params: { type },
      responseType: 'blob',
      onDownloadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    });
    return response.data;
  },

  /**
   * Import dữ liệu từ file CSV (Chuẩn RFC-4180)
   */
  importData: async (
    type: string,
    file: File,
    onUploadProgress?: (percent: number) => void
  ): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('type', type);
    formData.append('file', file);
    const response = await api.post('/data/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onUploadProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(percent);
        }
      }
    });
    return response.data;
  },

  /**
   * Đưa tác vụ Import tệp lớn vào hàng đợi xử lý ngầm (Queue)
   */
  importDataAsync: async (type: string, file: File): Promise<DataTaskItem> => {
    const formData = new FormData();
    formData.append('type', type);
    formData.append('file', file);
    const response = await api.post('/data/import/async', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  /**
   * Đưa tác vụ Export bảng dữ liệu lớn vào hàng đợi xử lý ngầm (Queue)
   */
  exportDataAsync: async (type: string): Promise<DataTaskItem> => {
    const response = await api.post('/data/export/async', null, {
      params: { type }
    });
    return response.data;
  },

  /**
   * Tra cứu trạng thái và tiến độ của tác vụ hàng đợi
   */
  getTaskStatus: async (taskId: string): Promise<DataTaskItem> => {
    const response = await api.get(`/data/task/${taskId}`);
    return response.data;
  },

  /**
   * Tải về file CSV kết quả từ tác vụ Export hoàn tất
   */
  downloadTaskExport: async (taskId: string): Promise<Blob> => {
    const response = await api.get(`/data/task/${taskId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // ==========================================
  // SAO LƯU TOÀN BỘ HỆ THỐNG (FULL BACKUP)
  // ==========================================

  /**
   * Tạo bản sao lưu toàn bộ hệ thống ngay trên máy chủ
   */
  createFullBackup: async (type: 'FULL_ZIP' | 'DATABASE_SQL' = 'FULL_ZIP'): Promise<BackupHistoryItem> => {
    const response = await api.post('/backup/create', null, {
      params: { type },
      timeout: 300000
    });
    return response.data;
  },

  /**
   * Lấy danh sách lịch sử các bản sao lưu trên máy chủ
   */
  getFullBackupHistory: async (): Promise<BackupHistoryItem[]> => {
    const response = await api.get('/backup/list');
    return response.data;
  },

  /**
   * Tải về file sao lưu đã lưu trên máy chủ
   */
  downloadBackupFile: async (id: number, onProgress?: (percent: number) => void): Promise<Blob> => {
    const response = await api.get(`/backup/download/${id}`, {
      responseType: 'blob',
      timeout: 300000,
      onDownloadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    });
    return response.data;
  },

  /**
   * Stream tải trực tiếp file sao lưu toàn bộ (.ZIP) về máy khách
   */
  instantDownloadBackup: async (onProgress?: (percent: number) => void): Promise<Blob> => {
    const response = await api.get('/backup/instant-download', {
      responseType: 'blob',
      timeout: 300000,
      onDownloadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    });
    return response.data;
  },

  /**
   * Xóa một bản sao lưu trên máy chủ
   */
  deleteBackup: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/backup/${id}`);
    return response.data;
  },

  /**
   * Khôi phục toàn bộ hệ thống từ bản sao lưu đã có trên máy chủ
   */
  restoreBackup: async (id: number, confirmCode: string): Promise<RestoreSummary> => {
    const response = await api.post(`/backup/restore/${id}`, null, {
      params: { confirmCode },
      timeout: 300000 // 5 phút, tránh lỗi timeout 30s khi khôi phục nhiều bảng
    });
    return response.data;
  },

  /**
   * Khôi phục toàn bộ hệ thống từ file .sql hoặc .zip tải lên
   */
  restoreBackupFromUpload: async (
    file: File,
    confirmCode: string,
    onUploadProgress?: (percent: number) => void
  ): Promise<RestoreSummary> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/backup/restore-upload', formData, {
      params: { confirmCode },
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 300000, // 5 phút, hỗ trợ tải file lớn và khôi phục toàn diện
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onUploadProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(percent);
        }
      }
    });
    return response.data;
  },

  /**
   * Lấy cấu hình tự động sao lưu định kỳ
   */
  getBackupConfig: async (): Promise<BackupConfig> => {
    const response = await api.get('/backup/config');
    return response.data;
  },

  /**
   * Cập nhật cấu hình tự động sao lưu định kỳ (Chỉ OWNER)
   */
  updateBackupConfig: async (config: Partial<BackupConfig>): Promise<BackupConfig> => {
    const response = await api.put('/backup/config', config);
    return response.data;
  }
};

export default dataApi;
