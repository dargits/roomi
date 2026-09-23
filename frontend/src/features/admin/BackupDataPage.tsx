import React, { useState, useEffect } from 'react';
import {
  IoAlertCircleOutline,
  IoArchiveOutline,
  IoBedOutline,
  IoCheckmarkCircleOutline,
  IoCheckmarkDoneOutline,
  IoChevronDownOutline,
  IoChevronUpOutline,
  IoCloseCircleOutline,
  IoCloseOutline,
  IoCloudDownloadOutline,
  IoCloudUploadOutline,
  IoCopyOutline,
  IoDocumentOutline,
  IoDocumentTextOutline,
  IoDownloadOutline,
  IoEyeOutline,
  IoInformationCircleOutline,
  IoLayersOutline,
  IoListOutline,
  IoLogOutOutline,
  IoPeopleOutline,
  IoRefreshOutline,
  IoSaveOutline,
  IoSearchOutline,
  IoServerOutline,
  IoShieldCheckmarkOutline,
  IoSparklesOutline,
  IoStatsChartOutline,
  IoSyncOutline,
  IoTimeOutline,
  IoTimerOutline,
  IoTrashOutline,
  IoWarningOutline
} from 'react-icons/io5';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Tabs from '../../components/ui/Tabs/Tabs';
import Modal from '../../components/ui/Modal';
import dataApi, { BackupConfig, BackupHistoryItem, ImportResult, RestoreSummary } from '../../services/dataApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

// Danh sách các bảng hỗ trợ xuất dữ liệu
const EXPORT_ITEMS = [
  {
    type: 'bookings',
    name: 'Dữ liệu Đặt phòng',
    desc: 'Bao gồm mã booking, thông tin khách, số phòng, ngày nhận/trả, giá tiền và trạng thái',
    icon: IoListOutline,
    color: 'bg-blue-600'
  },
  {
    type: 'guests',
    name: 'Danh sách Khách hàng',
    desc: 'Bao gồm tên khách, số điện thoại, CCCD/CMND, email và điểm tích lũy thành viên',
    icon: IoPeopleOutline,
    color: 'bg-emerald-600'
  },
  {
    type: 'rooms',
    name: 'Danh sách Phòng & Sơ đồ',
    desc: 'Bao gồm số phòng, loại phòng, tầng và trạng thái phòng',
    icon: IoLogOutOutline,
    color: 'bg-amber-600'
  },
  {
    type: 'room-types',
    name: 'Cấu hình Loại phòng',
    desc: 'Bao gồm tên loại phòng, giá cơ bản theo đêm, sức chứa và tiện nghi phòng',
    icon: IoBedOutline,
    color: 'bg-purple-600'
  },
  {
    type: 'extra-services',
    name: 'Dịch vụ Phụ thu',
    desc: 'Bao gồm danh mục dịch vụ, bảng giá và đơn vị tính',
    icon: IoSparklesOutline,
    color: 'bg-rose-600'
  },
  {
    type: 'invoices',
    name: 'Hóa đơn & Doanh thu',
    desc: 'Bao gồm chi tiết tiền phòng, tiền dịch vụ, giảm giá và ngày lập hóa đơn',
    icon: IoDocumentOutline,
    color: 'bg-indigo-600'
  },
  {
    type: 'inventory',
    name: 'Kho Đồ Dùng & Vật Tư',
    desc: 'Bao gồm tên đồ dùng, số lượng tồn kho, đơn vị tính và ngưỡng cảnh báo tồn thấp',
    icon: IoArchiveOutline,
    color: 'bg-teal-600'
  },
  {
    type: 'staff',
    name: 'Danh Sách Nhân Sự',
    desc: 'Bao gồm họ tên nhân viên, tài khoản đăng nhập, số điện thoại, email và phân quyền',
    icon: IoPeopleOutline,
    color: 'bg-sky-600'
  }
];

// Danh sách các loại dữ liệu hỗ trợ nhập nhanh
const IMPORT_TYPES = [
  { value: 'rooms', label: 'Danh sách Phòng (Số phòng, Tên/Mã loại phòng, Tầng)' },
  { value: 'guests', label: 'Khách hàng (Tên, SĐT, CCCD/CMND, Email)' },
  { value: 'room-types', label: 'Loại phòng (Tên, Giá cơ bản, Sức chứa, Tiện nghi)' },
  { value: 'extra-services', label: 'Dịch vụ phụ thu (Tên dịch vụ, Đơn giá, Đơn vị tính)' },
  { value: 'inventory', label: 'Kho đồ dùng (Tên đồ dùng, Đơn vị tính, Số lượng tồn, Ngưỡng cảnh báo)' },
  { value: 'staff', label: 'Danh sách Nhân sự (Họ tên, Tài khoản, SĐT, Email, Vai trò)' }
];

// File CSV mẫu chuẩn hóa thực tế
const SAMPLE_CSV: Record<string, string> = {
  rooms: "Số phòng,Loại phòng hoặc Mã loại phòng,Tầng\n101,Phòng Tiêu Chuẩn,1\n102,Phòng Tiêu Chuẩn,1\n201,Phòng Cao Cấp VIP,2\n202,Phòng Cao Cấp VIP,2\n301,Phòng Gia Đình,3",
  guests: "Tên khách hàng,Số điện thoại,CCCD,Email\nNguyễn Văn An,0912345678,001234567890,an.nguyen@gmail.com\nTrần Thị Bích,0987654321,001987654321,bich.tran@gmail.com\nLê Hoàng Nam,0901234567,001198765432,nam.le@gmail.com",
  'room-types': "Tên loại phòng,Giá cơ bản,Sức chứa,Mô tả tiện nghi\nPhòng Tiêu Chuẩn,500000,2,\"Giường đôi, TV, Điều hòa, Minibar\"\nPhòng Cao Cấp VIP,1200000,4,\"View biển, Ban công, Bồn tắm massage, TV 65 inch\"\nPhòng Gia Đình,950000,4,\"2 giường lớn, Bếp mini, Bàn làm việc\"",
  'extra-services': "Tên dịch vụ,Đơn giá,Đơn vị tính\nNước ngọt lon,15000,Lon\nBia lon Heineken,25000,Lon\nGiặt là lấy ngay,50000,Kg\nThuê xe máy tay ga,150000,Ngày\nĂn sáng buffet phụ thu,80000,Người",
  inventory: "Tên đồ dùng,Đơn vị tính,Số lượng tồn,Ngưỡng cảnh báo\nKhăn tắm lớn trắng,Cái,60,15\nKhăn mặt,Cái,100,20\nBàn chải & Kem đánh răng,Bộ,150,30\nDầu gội sữa tắm mini,Chai,200,40\nNước khoáng đóng chai 500ml,Chai,120,24",
  staff: "Họ và tên,Tài khoản,Số điện thoại,Email,Vai trò\nTrần Văn Hoàng,staff_hoang,0912888999,hoang.tran@stayaway.vn,RECEPTIONIST\nLê Thị Mai,staff_mai,0987111222,mai.le@stayaway.vn,HOUSEKEEPING\nPhạm Quốc Cường,staff_cuong,0903444555,cuong.pham@stayaway.vn,ACCOUNTANT"
};

// Parser CSV chuẩn RFC-4180 cho client-side preview
function parseClientCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  const cleanLine = line.startsWith('\uFEFF') ? line.substring(1) : line;

  for (let i = 0; i < cleanLine.length; i++) {
    const c = cleanLine[i];
    if (c === '"') {
      if (inQuotes && cleanLine[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  values.push(current.trim());
  return values;
}

const BackupDataPage: React.FC = () => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();

  const hasAccess = ['OWNER', 'ADMIN'].includes(user?.role || '');
  const isOwner = hasAccess; // Cho phép cả OWNER và ADMIN quản lý, khôi phục hệ thống

  // Tab State
  const [activeTab, setActiveTab] = useState<'full_backup' | 'export' | 'import'>('full_backup');

  // Full Backup State
  const [backups, setBackups] = useState<BackupHistoryItem[]>([]);
  const [config, setConfig] = useState<BackupConfig | null>(null);
  const [loadingBackups, setLoadingBackups] = useState<boolean>(false);
  const [creatingBackup, setCreatingBackup] = useState<boolean>(false);
  const [instantDownloading, setInstantDownloading] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Config Form State
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(false);
  const [autoEnabled, setAutoEnabled] = useState<boolean>(true);
  const [autoTime, setAutoTime] = useState<string>('02:00');
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);

  // Restore Modal State
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState<boolean>(false);
  const [restoreSource, setRestoreSource] = useState<'server' | 'upload'>('server');
  const [selectedBackupId, setSelectedBackupId] = useState<number | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [confirmPhrase, setConfirmPhrase] = useState<string>('');
  const [restoring, setRestoring] = useState<boolean>(false);
  const [restoreResult, setRestoreResult] = useState<RestoreSummary | null>(null);

  // Export State
  const [exportingType, setExportingType] = useState<string | null>(null);
  const [exportSearch, setExportSearch] = useState<string>('');
  const [exportProgress, setExportProgress] = useState<{
    active: boolean;
    targetName: string;
    targetType: string;
    stage: 'query' | 'format' | 'download' | 'done';
    percent: number;
    statusMessage: string;
    fileName?: string;
  } | null>(null);

  // Import State
  const [importType, setImportType] = useState('rooms');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [filePreview, setFilePreview] = useState<{ headers: string[]; rows: string[][]; totalRows: number } | null>(null);
  const [importProgress, setImportProgress] = useState<{
    active: boolean;
    stageIndex: number;
    stageName: string;
    percent: number;
    statusMessage: string;
    subMessage: string;
  } | null>(null);

  // Load Initial Full Backup Data
  useEffect(() => {
    if (hasAccess && activeTab === 'full_backup') {
      fetchBackupsAndConfig();
    }
  }, [hasAccess, activeTab]);

  const fetchBackupsAndConfig = async () => {
    setLoadingBackups(true);
    try {
      const [listRes, configRes] = await Promise.all([
        dataApi.getFullBackupHistory(),
        dataApi.getBackupConfig()
      ]);
      setBackups(listRes || []);
      setConfig(configRes);
      if (configRes) {
        setAutoEnabled(configRes.autoBackupEnabled);
        setAutoTime(configRes.autoBackupTime || '02:00');
        setRetentionDays(configRes.backupRetentionDays || 30);
      }
    } catch (err: any) {
      toastError('Không thể tải lịch sử sao lưu: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingBackups(false);
    }
  };

  if (!hasAccess) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-error rounded-xl text-sm font-medium">
        Chỉ Chủ cơ sở (OWNER) hoặc Quản trị viên (ADMIN) mới có quyền truy cập trung tâm sao lưu hệ thống.
      </div>
    );
  }

  // ==========================================
  // XỬ LÝ SAO LƯU TOÀN BỘ (FULL BACKUP ACTIONS)
  // ==========================================

  const handleCreateServerBackup = async (type: 'FULL_ZIP' | 'DATABASE_SQL' = 'FULL_ZIP') => {
    setCreatingBackup(true);
    try {
      const created = await dataApi.createFullBackup(type);
      toastSuccess(`Tạo bản sao lưu ${created.fileName} thành công!`);
      fetchBackupsAndConfig();
    } catch (err: any) {
      toastError('Lỗi tạo sao lưu: ' + (err.response?.data?.message || err.message));
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleInstantDownload = async () => {
    setInstantDownloading(true);
    setExportProgress({
      active: true,
      targetName: 'Gói Sao Lưu Toàn Bộ Hệ Thống (.ZIP)',
      targetType: 'full_zip',
      stage: 'query',
      percent: 15,
      statusMessage: 'Đang kết xuất lược đồ cấu trúc & dữ liệu 15 bảng CSDL...'
    });

    const timer1 = setTimeout(() => {
      setExportProgress((prev) =>
        prev && prev.targetType === 'full_zip'
          ? {
              ...prev,
              stage: 'format',
              percent: 50,
              statusMessage: 'Đang tạo database_dump.sql và đóng gói 15 tệp CSV...'
            }
          : prev
      );
    }, 400);

    const timer2 = setTimeout(() => {
      setExportProgress((prev) =>
        prev && prev.targetType === 'full_zip'
          ? {
              ...prev,
              stage: 'format',
              percent: 75,
              statusMessage: 'Đang nén luồng ZIP và tạo chữ ký xác thực SHA-256...'
            }
          : prev
      );
    }, 900);

    try {
      const blob = await dataApi.instantDownloadBackup((percent) => {
        setExportProgress((prev) =>
          prev && prev.targetType === 'full_zip'
            ? {
                ...prev,
                stage: 'download',
                percent: Math.max(80, Math.min(98, percent)),
                statusMessage: `Đang tải gói ZIP về máy khách (${percent}%)...`
              }
            : prev
        );
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      const fileName = `stayaway_full_backup_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.zip`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setExportProgress({
        active: true,
        targetName: 'Gói Sao Lưu Toàn Bộ Hệ Thống (.ZIP)',
        targetType: 'full_zip',
        stage: 'done',
        percent: 100,
        statusMessage: `Đã nén và tải về thành công tệp ${fileName}`,
        fileName
      });
      toastSuccess('Đã tải gói sao lưu toàn bộ hệ thống (.ZIP) thành công!');

      setTimeout(() => {
        setExportProgress((prev) => (prev && prev.targetType === 'full_zip' && prev.stage === 'done' ? null : prev));
      }, 3500);
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setExportProgress(null);
      toastError('Lỗi tải trực tiếp: ' + (err.response?.data?.message || err.message));
    } finally {
      setInstantDownloading(false);
    }
  };

  const handleDownloadSavedBackup = async (item: BackupHistoryItem) => {
    setDownloadingId(item.id);
    setExportProgress({
      active: true,
      targetName: item.fileName,
      targetType: `backup_${item.id}`,
      stage: 'download',
      percent: 25,
      statusMessage: `Đang truyền tệp ${item.fileName} từ máy chủ (${item.formattedSize})...`
    });

    try {
      const blob = await dataApi.downloadBackupFile(item.id, (percent) => {
        setExportProgress((prev) =>
          prev && prev.targetType === `backup_${item.id}`
            ? {
                ...prev,
                percent: Math.max(25, percent),
                statusMessage: `Đang tải xuống (${percent}%)...`
              }
            : prev
        );
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', item.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setExportProgress({
        active: true,
        targetName: item.fileName,
        targetType: `backup_${item.id}`,
        stage: 'done',
        percent: 100,
        statusMessage: `Tải về hoàn tất: ${item.fileName}`,
        fileName: item.fileName
      });
      toastSuccess(`Tải tệp ${item.fileName} thành công!`);

      setTimeout(() => {
        setExportProgress((prev) => (prev && prev.targetType === `backup_${item.id}` && prev.stage === 'done' ? null : prev));
      }, 3000);
    } catch (err: any) {
      setExportProgress(null);
      toastError('Lỗi tải tệp sao lưu: ' + (err.response?.data?.message || err.message));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteBackup = async (item: BackupHistoryItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bản sao lưu "${item.fileName}" khỏi máy chủ không?`)) {
      return;
    }
    setDeletingId(item.id);
    try {
      await dataApi.deleteBackup(item.id);
      toastSuccess(`Đã xóa bản sao lưu ${item.fileName}`);
      setBackups((prev) => prev.filter((b) => b.id !== item.id));
    } catch (err: any) {
      toastError('Lỗi xóa bản sao lưu: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      toastWarning('Chỉ Chủ cơ sở (OWNER) mới có quyền chỉnh sửa cấu hình sao lưu');
      return;
    }
    setSavingConfig(true);
    try {
      const updated = await dataApi.updateBackupConfig({
        autoBackupEnabled: autoEnabled,
        autoBackupTime: autoTime,
        backupRetentionDays: Number(retentionDays)
      });
      setConfig(updated);
      toastSuccess('Đã lưu cấu hình tự động sao lưu thành công!');
      setShowConfigPanel(false);
    } catch (err: any) {
      toastError('Lỗi lưu cấu hình: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingConfig(false);
    }
  };

  const handleOpenRestoreModal = (preselectedBackupId?: number) => {
    if (!isOwner) {
      toastWarning('Chỉ Chủ cơ sở (OWNER) mới có quyền khôi phục toàn bộ hệ thống');
      return;
    }
    setSelectedBackupId(preselectedBackupId || (backups.length > 0 ? backups[0].id : null));
    setRestoreSource('server');
    setConfirmPhrase('');
    setRestoreResult(null);
    setIsRestoreModalOpen(true);
  };

  const handleExecuteRestore = async () => {
    if (confirmPhrase.trim().toUpperCase() !== 'RESTORE') {
      toastWarning('Vui lòng gõ chính xác chữ RESTORE để xác nhận');
      return;
    }

    setRestoring(true);
    setRestoreResult(null);
    try {
      let res: RestoreSummary;
      if (restoreSource === 'server') {
        if (!selectedBackupId) {
          toastWarning('Vui lòng chọn một bản sao lưu trên máy chủ');
          setRestoring(false);
          return;
        }
        res = await dataApi.restoreBackup(selectedBackupId, 'RESTORE');
      } else {
        if (!uploadFile) {
          toastWarning('Vui lòng chọn tệp tin .sql hoặc .zip từ máy tính');
          setRestoring(false);
          return;
        }
        res = await dataApi.restoreBackupFromUpload(uploadFile, 'RESTORE');
      }

      setRestoreResult(res);
      toastSuccess(`Khôi phục thành công! Đã thực thi ${res.statementsExecuted} câu lệnh.`);
      fetchBackupsAndConfig();
    } catch (err: any) {
      toastError('Lỗi khôi phục cơ sở dữ liệu: ' + (err.response?.data?.message || err.message));
    } finally {
      setRestoring(false);
    }
  };

  const handleCopyChecksum = (checksum: string) => {
    navigator.clipboard.writeText(checksum);
    toastSuccess('Đã sao chép mã SHA-256 vào clipboard');
  };

  // ==========================================
  // XỬ LÝ XUẤT CSV
  // ==========================================
  const handleExportCsv = async (type: string, name?: string) => {
    setExportingType(type);
    const targetLabel = name || type;
    setExportProgress({
      active: true,
      targetName: targetLabel,
      targetType: type,
      stage: 'query',
      percent: 20,
      statusMessage: `Đang kết nối CSDL và trích xuất dữ liệu bảng ${targetLabel}...`
    });

    const timer = setTimeout(() => {
      setExportProgress((prev) =>
        prev && prev.targetType === type
          ? {
              ...prev,
              stage: 'format',
              percent: 60,
              statusMessage: 'Đang chuyển đổi bản ghi sang định dạng CSV (chuẩn UTF-8 BOM)...'
            }
          : prev
      );
    }, 200);

    try {
      const blob = await dataApi.exportData(type, (percent) => {
        setExportProgress((prev) =>
          prev && prev.targetType === type
            ? {
                ...prev,
                stage: 'download',
                percent: Math.max(65, Math.min(95, percent)),
                statusMessage: `Đang truyền tải tệp (${percent}%)...`
              }
            : prev
        );
      });

      clearTimeout(timer);
      const fileName = `stayaway_${type}_${new Date().toISOString().split('T')[0]}.csv`;
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setExportProgress({
        active: true,
        targetName: targetLabel,
        targetType: type,
        stage: 'done',
        percent: 100,
        statusMessage: `Đã tải xuống thành công tệp ${fileName}`,
        fileName
      });
      toastSuccess(`Xuất dữ liệu bảng ${targetLabel} thành công!`);

      setTimeout(() => {
        setExportProgress((prev) => (prev && prev.targetType === type && prev.stage === 'done' ? null : prev));
      }, 3000);
    } catch (err: any) {
      clearTimeout(timer);
      setExportProgress(null);
      toastError('Lỗi xuất dữ liệu: ' + (err.response?.data?.message || err.message));
    } finally {
      setExportingType(null);
    }
  };

  const filteredExportItems = EXPORT_ITEMS.filter((item) =>
    item.name.toLowerCase().includes(exportSearch.toLowerCase()) ||
    item.type.toLowerCase().includes(exportSearch.toLowerCase()) ||
    item.desc.toLowerCase().includes(exportSearch.toLowerCase())
  );

  // ==========================================
  // XỬ LÝ NHẬP CSV (PREVIEW & SUBMIT)
  // ==========================================
  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    setImportResult(null);
    setImportProgress(null);
    if (!file) {
      setFilePreview(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length > 0) {
        const headers = parseClientCsvLine(lines[0]);
        const previewRows = lines.slice(1, 5).map((l) => parseClientCsvLine(l));
        setFilePreview({
          headers,
          rows: previewRows,
          totalRows: Math.max(0, lines.length - 1)
        });
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDownloadSample = () => {
    const content = SAMPLE_CSV[importType] || '';
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sample_template_${importType}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    toastSuccess(`Đã tải xuống file mẫu ${importType}.csv thành công!`);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toastWarning('Vui lòng chọn hoặc kéo thả file CSV để nhập dữ liệu.', 'Chưa chọn file');
      return;
    }
    setImporting(true);
    setImportResult(null);
    setShowDetails(false);

    const typeLabel = IMPORT_TYPES.find((t) => t.value === importType)?.label.split('(')[0].trim() || importType;

    // Giai đoạn 1: Đọc & Phân tích cú pháp tệp CSV
    setImportProgress({
      active: true,
      stageIndex: 1,
      stageName: 'Đọc & Kiểm tra cú pháp CSV',
      percent: 20,
      statusMessage: 'Đang kiểm tra mã hóa UTF-8 và phân tích cú pháp RFC-4180...',
      subMessage: `Tệp: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`
    });

    await new Promise((r) => setTimeout(r, 150));

    // Giai đoạn 2: Tải lên máy chủ an toàn
    setImportProgress({
      active: true,
      stageIndex: 2,
      stageName: 'Tải lên máy chủ an toàn',
      percent: 45,
      statusMessage: 'Đang truyền dữ liệu an toàn tới máy chủ PMS...',
      subMessage: `Danh mục: ${typeLabel}`
    });

    // Ticker giả lập mượt mà cho Giai đoạn 3 (Xử lý & Ghi CSDL)
    let currentPct = 50;
    const ticker = setInterval(() => {
      if (currentPct < 90) {
        currentPct += Math.floor(Math.random() * 4) + 2;
        if (currentPct > 90) currentPct = 90;
        setImportProgress((prev) =>
          prev
            ? {
                ...prev,
                stageIndex: 3,
                stageName: 'Xử lý bản ghi & Ghi CSDL',
                percent: currentPct,
                statusMessage: 'Đang kiểm tra trùng lặp bản ghi và lưu trữ vào CSDL...'
              }
            : null
        );
      }
    }, 120);

    try {
      const res = await dataApi.importData(importType, selectedFile, (uploadPct) => {
        if (uploadPct < 100) {
          const mapped = Math.round(25 + uploadPct * 0.25);
          setImportProgress((prev) =>
            prev
              ? {
                  ...prev,
                  percent: mapped,
                  statusMessage: `Đang tải tệp lên máy chủ (${uploadPct}%)...`
                }
              : null
          );
        }
      });

      clearInterval(ticker);

      // Giai đoạn 4: Hoàn tất & đối soát kết quả
      setImportProgress({
        active: true,
        stageIndex: 4,
        stageName: 'Đối soát & Hoàn tất kết quả',
        percent: 100,
        statusMessage: 'Đã hoàn tất quá trình nạp dữ liệu!',
        subMessage: `Xử lý thành công trong ${res.durationMs || 0} ms`
      });

      // Dừng ngắn để người dùng cảm nhận trạng thái hoàn tất 100%
      await new Promise((r) => setTimeout(r, 400));

      setImportResult(res);

      if (res.importedCount > 0) {
        toastSuccess(res.message);
      } else if (res.skippedCount > 0) {
        toastWarning(res.message, 'Dữ liệu trùng lặp');
      } else {
        toastError(res.message || 'Không có bản ghi nào được nhập');
      }
    } catch (err: any) {
      clearInterval(ticker);
      setImportProgress(null);
      const errMsg = err.response?.data?.message || 'Có lỗi xảy ra khi xử lý file CSV.';
      setImportResult({
        success: false,
        message: errMsg,
        totalRows: 0,
        importedCount: 0,
        skippedCount: 0,
        errorCount: 1,
        details: [errMsg]
      });
      toastError(errMsg);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={IoServerOutline}
        title="Trung Tâm Sao Lưu & Phục Hồi Dữ Liệu"
        subtitle="Quản lý an toàn 100% cơ sở dữ liệu hệ thống, khôi phục thảm họa, đóng gói file ZIP và tự động hóa định kỳ"
      />

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'full_backup', label: 'Sao Lưu Toàn Bộ Hệ Thống (ZIP / SQL)', icon: IoShieldCheckmarkOutline },
          { id: 'export', label: 'Xuất Bảng Dữ Liệu (CSV)', icon: IoDownloadOutline },
          { id: 'import', label: 'Nhập Dữ Liệu Nhanh (CSV)', icon: IoCloudUploadOutline }
        ]}
        value={activeTab}
        onChange={(tabId) => setActiveTab(tabId as any)}
        variant="pill"
        className="mb-2"
      />

      {/* ══════════════════════════════════════════════ */}
      {/* TAB 1: SAO LƯU TOÀN BỘ HỆ THỐNG (FULL BACKUP) */}
      {/* ══════════════════════════════════════════════ */}
      {activeTab === 'full_backup' && (
        <div className="space-y-6">
          {/* Top Info Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Last Backup Status */}
            <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-4 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">Sao Lưu Gần Nhất</span>
                <span className="text-sm font-bold text-on-surface mt-1 block">
                  {config?.lastBackupAt ? new Date(config.lastBackupAt).toLocaleString('vi-VN') : 'Chưa có bản sao lưu'}
                </span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-medium mt-1 ${config?.lastBackupStatus === 'SUCCESS' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {config?.lastBackupStatus === 'SUCCESS' ? '● Hoàn tất thành công' : '● Chưa ghi nhận lỗi'}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <IoShieldCheckmarkOutline size={22} />
              </div>
            </div>

            {/* Card 2: Total Backups & Storage */}
            <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-4 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">Lưu Trữ Máy Chủ</span>
                <span className="text-sm font-bold text-on-surface mt-1 block">
                  {config?.totalBackups || 0} bản sao lưu
                </span>
                <span className="text-[11px] text-on-surface-variant mt-1 block">
                  Tổng dung lượng: <strong>{config?.formattedTotalStorage || '0 KB'}</strong>
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <IoServerOutline size={22} />
              </div>
            </div>

            {/* Card 3: Auto Backup Schedule */}
            <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-4 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">Lập Lịch Tự Động</span>
                <span className="text-sm font-bold text-on-surface mt-1 block">
                  {config?.autoBackupEnabled ? `${config.autoBackupTime} hàng ngày` : 'Đang tạm dừng'}
                </span>
                <span className={`text-[11px] font-medium mt-1 block ${config?.autoBackupEnabled ? 'text-emerald-700' : 'text-zinc-500'}`}>
                  {config?.autoBackupEnabled ? '● Đang kích hoạt 24/7' : '○ Tắt sao lưu định kỳ'}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <IoTimeOutline size={22} />
              </div>
            </div>

            {/* Card 4: Retention Policy */}
            <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-4 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">Thời Hạn Lưu Trữ</span>
                <span className="text-sm font-bold text-on-surface mt-1 block">
                  {config?.backupRetentionDays || 30} ngày
                </span>
                <span className="text-[11px] text-on-surface-variant mt-1 block">
                  Tự động dọn dẹp file cũ
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <IoTrashOutline size={20} />
              </div>
            </div>
          </div>

          {/* Action Hero Bar */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#1C2612] via-[#2A381E] to-[#151E0E] text-white rounded-3xl p-6 md:p-7 shadow-lg border border-[#3E502B]">
            {/* Ambient Decorative Glows */}
            <div className="absolute -top-16 -right-16 w-60 h-60 bg-lodgify-lime/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-60 h-60 bg-primary/30 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lodgify-lime/20 border border-lodgify-lime/30 text-xs font-semibold text-lodgify-lime">
                  <IoShieldCheckmarkOutline size={15} />
                  <span>Bảo vệ toàn diện • Độc lập JDBC (Zero mysqldump)</span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  Sao Lưu Toàn Bộ Cơ Sở Dữ Liệu & Tài Liệu
                </h3>
                <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
                  Đóng gói trọn vẹn tệp mã nguồn SQL DDL/DML, file kiểm toán manifest JSON và toàn bộ bảng dữ liệu định dạng CSV chuẩn UTF-8 trong một tệp nén duy nhất.
                </p>
              </div>

              <div className="relative z-10 flex flex-wrap items-center gap-3">
                {/* Nút 1: Tải trực tiếp ZIP */}
                <button
                  type="button"
                  onClick={handleInstantDownload}
                  disabled={instantDownloading}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-lodgify-lime hover:bg-lodgify-lime-dark text-lodgify-dark font-bold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <IoCloudDownloadOutline size={18} className={instantDownloading ? 'animate-bounce' : ''} />
                  <span>{instantDownloading ? 'Đang đóng gói ZIP...' : 'Tải Toàn Bộ Ngay (.ZIP)'}</span>
                </button>

                {/* Nút 2: Tạo lưu trên server */}
                <button
                  type="button"
                  onClick={() => handleCreateServerBackup('FULL_ZIP')}
                  disabled={creatingBackup}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 backdrop-blur-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <IoSaveOutline size={16} className={creatingBackup ? 'animate-spin' : ''} />
                  <span>{creatingBackup ? 'Đang tạo...' : 'Tạo Bản Sao Lưu Server'}</span>
                </button>

                {/* Nút 3: Khôi phục */}
                <button
                  type="button"
                  onClick={() => handleOpenRestoreModal()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 backdrop-blur-sm transition-all cursor-pointer shadow-xs"
                  title="Khôi phục toàn bộ hệ thống từ file hoặc bản sao lưu máy chủ"
                >
                  <IoRefreshOutline size={16} />
                  <span>Khôi Phục Dữ Liệu</span>
                </button>

                {/* Nút 4: Toggle Config */}
                <button
                  type="button"
                  onClick={() => setShowConfigPanel(!showConfigPanel)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white font-medium text-xs border border-white/15 transition-all cursor-pointer"
                  title="Cấu hình tự động sao lưu"
                >
                  <IoTimeOutline size={16} />
                  <span className="hidden sm:inline">Cài đặt lịch</span>
                </button>
              </div>
            </div>
          </div>

          {/* Collapsible Auto Backup Config Panel */}
          {showConfigPanel && (
            <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-6 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between border-b border-border-grey pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary flex items-center justify-center">
                    <IoTimeOutline size={18} />
                  </div>
                  <div>
                    <h4 className="font-title-md font-bold text-on-surface">Cấu Hình Lập Lịch Sao Lưu Tự Động Định Kỳ</h4>
                    <p className="text-xs text-on-surface-variant">Hệ thống tự động kết xuất dữ liệu hàng đêm mà không làm ảnh hưởng đến hiệu năng phục vụ khách</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfigPanel(false)}
                  className="text-xs text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  Đóng ✕
                </button>
              </div>

              <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-2">1. Trạng thái tự động sao lưu</label>
                  <label className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl border border-border-grey cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoEnabled}
                      onChange={(e) => setAutoEnabled(e.target.checked)}
                      className="w-4 h-4 text-primary rounded-sm border-zinc-300 focus:ring-primary"
                    />
                    <span className="text-xs font-medium text-on-surface">
                      {autoEnabled ? 'Đang BẬT tự động sao lưu hàng ngày' : 'Đang TẮT tự động sao lưu'}
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-2">2. Khung giờ chạy sao lưu hàng ngày</label>
                  <input
                    type="time"
                    value={autoTime}
                    onChange={(e) => setAutoTime(e.target.value)}
                    disabled={!autoEnabled}
                    className="w-full text-xs font-mono font-medium p-2.5 rounded-xl border border-border-grey bg-white text-on-surface disabled:bg-zinc-100 disabled:cursor-not-allowed"
                    required
                  />
                  <span className="text-[11px] text-on-surface-variant mt-1 block">Khuyến nghị: 02:00 hoặc 03:00 sáng khi ít giao dịch</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-2">3. Thời gian lưu trữ bản sao lưu</label>
                  <div className={!autoEnabled ? "opacity-50 pointer-events-none" : ""}>
                    <Select
                      value={String(retentionDays)}
                      onChange={(e) => setRetentionDays(Number(e.target.value))}
                      options={[
                        { value: '7', label: '7 ngày gần nhất' },
                        { value: '14', label: '14 ngày gần nhất' },
                        { value: '30', label: '30 ngày (Khuyến nghị)' },
                        { value: '60', label: '60 ngày (2 tháng)' },
                        { value: '90', label: '90 ngày (Quý)' }
                      ]}
                    />
                  </div>
                  <span className="text-[11px] text-on-surface-variant mt-1 block">Tự động xóa các file sao lưu cũ hơn thời hạn này</span>
                </div>

                <div className="md:col-span-3 flex justify-end gap-3 pt-4 border-t border-border-grey">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowConfigPanel(false)}
                    className="text-xs"
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    type="submit"
                    isLoading={savingConfig}
                    icon={IoSaveOutline}
                    className="text-xs font-semibold"
                  >
                    Lưu Cấu Hình Lịch
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Backup History Table */}
          <div className="bg-surface-container-lowest border border-border-grey rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-border-grey flex items-center justify-between">
              <div>
                <h4 className="font-title-md font-bold text-on-surface flex items-center gap-2">
                  <IoServerOutline size={18} className="text-primary" />
                  Danh Sách Các Bản Sao Lưu Trên Máy Chủ
                </h4>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Các tệp sao lưu được lưu trữ an toàn tại thư mục server. Bạn có thể tải về máy hoặc khôi phục trực tiếp bất kỳ lúc nào.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchBackupsAndConfig}
                disabled={loadingBackups}
                className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors cursor-pointer p-1.5 rounded-lg border border-border-grey bg-white"
                title="Làm mới danh sách"
              >
                <IoRefreshOutline size={15} className={loadingBackups ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
            </div>

            {loadingBackups ? (
              <div className="p-12 text-center text-xs text-on-surface-variant">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-primary border-t-transparent mb-3" />
                <p>Đang tải danh sách các bản sao lưu từ máy chủ...</p>
              </div>
            ) : backups.length === 0 ? (
              <div className="p-12 text-center text-xs text-on-surface-variant">
                <IoShieldCheckmarkOutline size={36} className="mx-auto text-zinc-300 mb-2" />
                <p className="font-semibold text-on-surface">Chưa có bản sao lưu nào được lưu trên máy chủ.</p>
                <p className="text-zinc-500 mt-1">Bấm nút "Tạo Bản Sao Lưu Server" ở trên hoặc bấm nút dưới đây để tạo bản sao lưu đầu tiên ngay bây giờ.</p>
                <button
                  type="button"
                  onClick={() => handleCreateServerBackup('FULL_ZIP')}
                  disabled={creatingBackup}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
                >
                  <IoSaveOutline size={15} className={creatingBackup ? 'animate-spin' : ''} />
                  <span>{creatingBackup ? 'Đang tạo...' : 'Tạo Bản Sao Lưu Đầu Tiên'}</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low text-on-surface-variant font-semibold border-b border-border-grey">
                    <tr>
                      <th className="py-3 px-4">Tên Bản Sao Lưu</th>
                      <th className="py-3 px-4">Định Dạng</th>
                      <th className="py-3 px-4">Dung Lượng</th>
                      <th className="py-3 px-4">Cơ Sở Dữ Liệu</th>
                      <th className="py-3 px-4">Thời Gian Tạo</th>
                      <th className="py-3 px-4">Người Thực Hiện</th>
                      <th className="py-3 px-4 text-center">Toàn Vẹn (SHA-256)</th>
                      <th className="py-3 px-4 text-center">Trạng Thái</th>
                      <th className="py-3 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-grey">
                    {backups.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-on-surface">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded bg-zinc-100 text-zinc-600">
                              {item.backupType === 'DATABASE_SQL' ? 'SQL' : 'ZIP'}
                            </span>
                            <span>{item.fileName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {item.backupType === 'DATABASE_SQL' ? 'SQL Dump' : 'Full ZIP Archive'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-on-surface">
                          {item.formattedSize}
                        </td>
                        <td className="py-3 px-4 text-zinc-600">
                          {item.tableCount || 0} bảng ({Number(item.recordCount || 0).toLocaleString()} bản ghi)
                        </td>
                        <td className="py-3 px-4 text-zinc-600 whitespace-nowrap">
                          {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '-'}
                        </td>
                        <td className="py-3 px-4 text-zinc-600">
                          {item.createdByName || 'Tự động hệ thống'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.checksum ? (
                            <button
                              type="button"
                              onClick={() => handleCopyChecksum(item.checksum)}
                              className="inline-flex items-center gap-1 font-mono text-[10px] text-zinc-500 hover:text-primary cursor-pointer bg-zinc-50 px-2 py-0.5 rounded border border-zinc-200"
                              title={`SHA-256: ${item.checksum} (Bấm để chép)`}
                            >
                              <span>{item.checksum.substring(0, 8)}...</span>
                              <IoCopyOutline size={11} />
                            </button>
                          ) : (
                            <span className="text-zinc-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === 'SUCCESS'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {item.status === 'SUCCESS' ? 'Thành công' : 'Thất bại'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Tải về */}
                            <button
                              type="button"
                              onClick={() => handleDownloadSavedBackup(item)}
                              disabled={downloadingId === item.id}
                              className="p-1.5 rounded-lg text-primary hover:bg-primary-50 transition-colors cursor-pointer border border-transparent hover:border-primary/20"
                              title="Tải về máy tính"
                            >
                              <IoDownloadOutline size={16} className={downloadingId === item.id ? 'animate-bounce' : ''} />
                            </button>

                            {/* Khôi phục */}
                            <button
                              type="button"
                              onClick={() => handleOpenRestoreModal(item.id)}
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 hover:text-amber-800 transition-colors cursor-pointer border border-transparent hover:border-amber-200"
                              title="Khôi phục hệ thống từ bản này"
                            >
                              <IoRefreshOutline size={16} />
                            </button>

                            {/* Xóa */}
                            <button
                              type="button"
                              onClick={() => handleDeleteBackup(item)}
                              disabled={deletingId === item.id}
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors cursor-pointer border border-transparent hover:border-red-200"
                              title="Xóa bản sao lưu này"
                            >
                              <IoTrashOutline size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* TAB 2: XUẤT BẢNG DỮ LIỆU (CSV EXPORT)         */}
      {/* ══════════════════════════════════════════════ */}
      {activeTab === 'export' && (
        <div className="space-y-5">
          {/* Top Export Banner & Search */}
          <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <IoDownloadOutline size={22} />
              </div>
              <div>
                <h4 className="font-title-md font-bold text-on-surface">Xuất Dữ Liệu Từng Bảng Sang Tệp CSV</h4>
                <p className="text-xs text-on-surface-variant">Tất cả tệp CSV đều được tạo với chuẩn mã hóa <strong>UTF-8 BOM</strong>, tự động mở đúng tiếng Việt trên Excel.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Ô tìm kiếm bảng */}
              <div className="relative flex-1 md:w-64">
                <IoSearchOutline size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={exportSearch}
                  onChange={(e) => setExportSearch(e.target.value)}
                  placeholder="Tìm bảng dữ liệu..."
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-border-grey bg-white text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Xuất trọn gói ZIP */}
              <button
                type="button"
                onClick={handleInstantDownload}
                disabled={instantDownloading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary-hover transition-colors shadow-xs cursor-pointer flex-shrink-0"
              >
                <IoCloudDownloadOutline size={16} className={instantDownloading ? 'animate-bounce' : ''} />
                <span>{instantDownloading ? 'Đang tải...' : 'Tải Trọn Gói (.ZIP)'}</span>
              </button>
            </div>
          </div>

          {/* Grid Export Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredExportItems.map((item) => {
              const Icon = item.icon;
              const isDownloading = exportingType === item.type;
              return (
                <div
                  key={item.type}
                  className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition-all group"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white ${item.color} shadow-xs`}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <h4 className="font-title-sm text-on-surface font-bold">{item.name}</h4>
                        <span className="text-[11px] font-mono text-on-surface-variant/70 uppercase">table: {item.type}</span>
                      </div>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed mb-4 min-h-[36px]">
                      {item.desc}
                    </p>
                  </div>

                  <Button
                    onClick={() => handleExportCsv(item.type, item.name)}
                    isLoading={isDownloading}
                    icon={IoDownloadOutline}
                    className="w-full justify-center text-xs py-2"
                  >
                    Xuất CSV
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* TAB 3: NHẬP DỮ LIỆU NHANH (CSV IMPORT)        */}
      {/* ══════════════════════════════════════════════ */}
      {activeTab === 'import' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Cột Trái: Form Nhập & Kéo Thả File */}
          <div className="lg:col-span-7 bg-surface-container-lowest border border-border-grey rounded-2xl p-6 shadow-xs space-y-5">
            <div className="border-b border-border-grey pb-4">
              <h3 className="font-headline-sm text-on-surface flex items-center gap-2">
                <IoCloudUploadOutline size={20} className="text-primary" />
                Nhập Dữ Liệu Hàng Loạt Từ File CSV
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Tự động nhận diện dữ liệu chuẩn RFC-4180. Hỗ trợ nhập theo Tên hoặc ID loại phòng, tự động bỏ qua bản ghi trùng lặp an toàn.
              </p>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              {/* Bước 1: Chọn bảng */}
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1.5">
                  1. Chọn danh mục dữ liệu cần nhập
                </label>
                <Select
                  value={importType}
                  onChange={(e) => {
                    setImportType(e.target.value);
                    setImportResult(null);
                    setFilePreview(null);
                    setSelectedFile(null);
                  }}
                  options={IMPORT_TYPES}
                />
              </div>

              {/* Tải file mẫu */}
              <div className="flex justify-between items-center p-3 bg-surface-container-low rounded-xl border border-border-grey">
                <div className="text-xs text-on-surface-variant">
                  <span>Chưa có mẫu cấu trúc chuẩn? Tải file mẫu cấu trúc sẵn:</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer bg-transparent border-none p-0"
                >
                  <IoDownloadOutline size={14} />
                  Tải file mẫu ({importType}.csv)
                </button>
              </div>

              {/* Bước 2: Kéo thả file CSV */}
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1.5">
                  2. Chọn hoặc Kéo thả file CSV từ máy tính
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file && (file.name.endsWith('.csv') || file.type.includes('csv'))) {
                      handleFileSelect(file);
                    } else {
                      toastWarning('Vui lòng chỉ tải lên tệp định dạng .csv');
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                    isDragging
                      ? 'border-primary bg-primary-50/40'
                      : selectedFile
                      ? 'border-emerald-400 bg-emerald-50/20'
                      : 'border-border-grey bg-surface-container-low/50 hover:bg-surface-container-low'
                  }`}
                  onClick={() => document.getElementById('csv-file-input')?.click()}
                >
                  <input
                    id="csv-file-input"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                    className="hidden"
                  />

                  {selectedFile ? (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                        <IoCheckmarkCircleOutline size={26} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-on-surface">{selectedFile.name}</p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          Dung lượng: <strong>{(selectedFile.size / 1024).toFixed(1)} KB</strong> • Sẵn sàng nhập
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileSelect(null);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:underline cursor-pointer mt-1"
                      >
                        <IoCloseCircleOutline size={14} />
                        Chọn tệp khác
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-full bg-primary-50 text-primary flex items-center justify-center mx-auto">
                        <IoCloudUploadOutline size={26} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-on-surface">Kéo thả tệp CSV vào đây hoặc bấm để chọn tệp</p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">Hỗ trợ tệp CSV mã hóa UTF-8 với dấu phẩy hoặc ngoặc kép</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* TIẾN TRÌNH NHẬP DỮ LIỆU TINH GỌN & THÂN THIỆN */}
              {importProgress && importProgress.active && (
                <div className="p-4 rounded-xl bg-surface-container-low border border-border-grey space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IoSyncOutline size={16} className={`text-primary ${importProgress.percent === 100 ? '' : 'animate-spin'}`} />
                      <span className="text-xs font-semibold text-on-surface">
                        {importProgress.statusMessage}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-primary">
                      {importProgress.percent}%
                    </span>
                  </div>

                  {/* Thanh tiến độ đơn sắc, nhẹ nhàng */}
                  <div className="w-full h-1.5 bg-zinc-200/80 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${importProgress.percent}%` }}
                    />
                  </div>

                  {/* Dòng trạng thái các bước tinh gọn */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-0.5">
                    {[
                      { idx: 1, label: 'Đọc tệp' },
                      { idx: 2, label: 'Tải lên' },
                      { idx: 3, label: 'Ghi CSDL' },
                      { idx: 4, label: 'Hoàn tất' }
                    ].map((step, sIdx, arr) => {
                      const isDone = importProgress.stageIndex > step.idx || importProgress.percent === 100;
                      const isCurrent = importProgress.stageIndex === step.idx && importProgress.percent < 100;
                      return (
                        <React.Fragment key={step.idx}>
                          <span
                            className={`flex items-center gap-1 ${
                              isDone
                                ? 'text-emerald-700 font-semibold'
                                : isCurrent
                                ? 'text-primary font-bold'
                                : 'text-zinc-400'
                            }`}
                          >
                            {isDone ? (
                              <IoCheckmarkCircleOutline size={13} className="text-emerald-600" />
                            ) : isCurrent ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                            ) : null}
                            {step.label}
                          </span>
                          {sIdx < arr.length - 1 && <span className="text-zinc-300">→</span>}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Nút hành động */}
              <div className="pt-2">
                <Button
                  type="submit"
                  isLoading={importing}
                  disabled={!selectedFile}
                  icon={IoCloudUploadOutline}
                  className="w-full justify-center text-xs py-2.5 font-bold"
                >
                  {importing ? 'Đang Xử Lý & Nhập Dữ Liệu...' : 'Bắt Đầu Nhập Dữ Liệu'}
                </Button>
              </div>
            </form>
          </div>

          {/* Cột Phải: Xem Trước Dữ Liệu (File Preview) hoặc Kết Quả Nhập */}
          <div className="lg:col-span-5 space-y-5">
            {/* Kết Quả Nhập (Nếu có) */}
            {importResult && (
              <div
                className={`p-5 rounded-2xl border shadow-xs space-y-4 animate-in fade-in duration-200 ${
                  importResult.success || (importResult.importedCount > 0)
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-red-50/50 border-red-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {importResult.importedCount > 0 ? (
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <IoCheckmarkCircleOutline size={22} />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <IoAlertCircleOutline size={22} />
                    </div>
                  )}
                  <div>
                    <h4 className="font-title-sm font-bold text-on-surface">
                      {importResult.importedCount > 0 ? 'Hoàn Tất Nhập Dữ Liệu' : 'Có Lỗi Xử Lý Tệp'}
                    </h4>
                    <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                      {importResult.message}
                    </p>
                  </div>
                </div>

                {/* Thẻ thống kê 3 màu */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-200/70">
                  <div className="bg-white p-2.5 rounded-xl border border-zinc-200 text-center">
                    <span className="text-[10px] text-zinc-500 font-semibold block uppercase">Thành công</span>
                    <span className="text-sm font-bold text-emerald-600 block mt-0.5">{importResult.importedCount}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-zinc-200 text-center">
                    <span className="text-[10px] text-zinc-500 font-semibold block uppercase">Bỏ qua</span>
                    <span className="text-sm font-bold text-amber-600 block mt-0.5">{importResult.skippedCount}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-zinc-200 text-center">
                    <span className="text-[10px] text-zinc-500 font-semibold block uppercase">Lỗi dữ liệu</span>
                    <span className="text-sm font-bold text-red-600 block mt-0.5">{importResult.errorCount}</span>
                  </div>
                </div>

                {/* Đoạn hiển thị thời gian & nút thao tác nhanh */}
                <div className="flex items-center justify-between pt-1 border-t border-zinc-200/60">
                  <span className="text-[11px] text-zinc-500 flex items-center gap-1 font-mono">
                    <IoTimerOutline size={14} className="text-primary" />
                    <span>Thời gian xử lý: <strong>{importResult.durationMs ? `${importResult.durationMs} ms` : 'Nhanh chóng'}</strong></span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setFilePreview(null);
                      setImportResult(null);
                      setImportProgress(null);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer bg-transparent border-none p-0"
                  >
                    <IoRefreshOutline size={13} />
                    <span>Nhập tiếp tệp khác</span>
                  </button>
                </div>

                {/* Chi tiết từng dòng nếu có */}
                {importResult.details && importResult.details.length > 0 && (
                  <div className="pt-2 border-t border-zinc-200/60">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShowDetails(!showDetails)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
                      >
                        <span>{showDetails ? 'Thu gọn chi tiết' : `Xem chi tiết (${importResult.details.length} dòng)`}</span>
                        {showDetails ? <IoChevronUpOutline size={14} /> : <IoChevronDownOutline size={14} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(importResult.details?.join('\n') || '');
                          toastSuccess('Đã sao chép danh sách chi tiết lỗi vào clipboard');
                        }}
                        className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-primary cursor-pointer"
                        title="Sao chép toàn bộ dòng lỗi/bỏ qua"
                      >
                        <IoCopyOutline size={12} />
                        <span>Sao chép chi tiết</span>
                      </button>
                    </div>

                    {showDetails && (
                      <div className="mt-2.5 p-3 rounded-xl bg-white border border-zinc-200 max-h-48 overflow-y-auto space-y-1.5 text-[11px] font-mono">
                        {importResult.details.map((detail, idx) => (
                          <div
                            key={idx}
                            className={`p-1.5 rounded ${
                              detail.includes('Lỗi')
                                ? 'bg-red-50 text-red-800'
                                : 'bg-amber-50 text-amber-800'
                            }`}
                          >
                            {detail}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Xem trước tệp CSV (Client Preview) */}
            {filePreview ? (
              <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-border-grey pb-3">
                  <div className="flex items-center gap-2">
                    <IoEyeOutline size={18} className="text-primary" />
                    <h4 className="font-title-sm font-bold text-on-surface">Xem Trước Dữ Liệu Tệp</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-50 text-primary border border-primary/20">
                    {filePreview.totalRows} dòng dữ liệu
                  </span>
                </div>

                <div className="overflow-x-auto border border-border-grey rounded-xl">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-surface-container-low font-semibold text-on-surface-variant border-b border-border-grey">
                      <tr>
                        {filePreview.headers.map((h, i) => (
                          <th key={i} className="py-2 px-3 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-grey">
                      {filePreview.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-surface-container-low/50">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="py-2 px-3 text-zinc-700 whitespace-nowrap max-w-[140px] truncate" title={cell}>
                              {cell || <span className="text-zinc-300 italic">null</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-[11px] text-on-surface-variant flex items-center gap-1.5">
                  <IoInformationCircleOutline size={14} className="text-primary flex-shrink-0" />
                  <span>Hiển thị tối đa 4 dòng đầu để kiểm tra cấu trúc cột trước khi nạp vào hệ thống.</span>
                </p>
              </div>
            ) : (
              /* Trạng thái hướng dẫn khi chưa chọn file */
              <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-6 shadow-xs text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-surface-container-low text-primary flex items-center justify-center mx-auto">
                  <IoDocumentTextOutline size={24} />
                </div>
                <div>
                  <h4 className="font-title-sm font-bold text-on-surface">Chưa Chọn Tệp Dữ Liệu</h4>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Sau khi chọn file CSV ở bên trái, hệ thống sẽ tự động quét và hiển thị bản xem trước 4 dòng đầu tại đây để bạn kiểm tra tính chính xác của các cột.
                  </p>
                </div>
                <div className="pt-2 text-left bg-surface-container-low p-3.5 rounded-xl border border-border-grey space-y-1.5 text-[11px] text-on-surface-variant">
                  <p className="font-semibold text-on-surface">💡 Mẹo chuẩn hóa file:</p>
                  <p>• Dòng đầu tiên phải là tiêu đề các cột.</p>
                  <p>• Nếu số phòng hoặc tên khách có dấu phẩy, hãy bao quanh bằng dấu ngoặc kép.</p>
                  <p>• Bấm "Tải file mẫu" ở bên trái để có sẵn file mẫu đúng định dạng 100%.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* MODAL KHÔI PHỤC TOÀN BỘ HỆ THỐNG AN TOÀN       */}
      {/* ══════════════════════════════════════════════ */}
      <Modal
        isOpen={isRestoreModalOpen}
        onClose={() => !restoring && setIsRestoreModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-red-600">
            <IoWarningOutline size={22} />
            <span>Khôi Phục Cơ Sở Dữ Liệu Toàn Bộ Hệ Thống</span>
          </div>
        }
        maxWidth="max-w-xl"
      >
        <div className="space-y-4 pt-2">
          {/* Danger Warning Banner */}
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-800 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-red-900 text-sm">
              <IoAlertCircleOutline size={18} />
              CẢNH BÁO NGUY HIỂM: HÀNH ĐỘNG GHI ĐÈ TOÀN BỘ DỮ LIỆU
            </div>
            <p className="leading-relaxed">
              Quá trình khôi phục sẽ <strong>xóa và thay thế toàn bộ dữ liệu hiện tại</strong> bằng dữ liệu từ bản sao lưu được chọn.
              Các giao dịch đặt phòng hoặc sửa đổi mới hơn thời điểm của bản sao lưu sẽ bị mất vĩnh viễn.
            </p>
            <p className="font-semibold text-red-900">
              Khuyến nghị: Hãy tải về một bản sao lưu hiện tại trước khi thực hiện khôi phục!
            </p>
          </div>

          {/* Result Banner if already completed */}
          {restoreResult && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1">
              <div className="font-bold text-sm flex items-center gap-1.5 text-emerald-900">
                <IoCheckmarkCircleOutline size={18} />
                Khôi phục thành công!
              </div>
              <p>Tệp nguồn: <strong>{restoreResult.fileName}</strong></p>
              <p>Số câu lệnh SQL thực thi: <strong>{restoreResult.statementsExecuted}</strong></p>
              <p>Thời gian thực thi: <strong>{restoreResult.durationMs} ms</strong></p>
            </div>
          )}

          {/* Step 1: Chọn Nguồn Sao Lưu */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-2">1. Chọn Nguồn Bản Sao Lưu</label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                type="button"
                onClick={() => setRestoreSource('server')}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  restoreSource === 'server'
                    ? 'border-primary bg-primary-50/50 text-primary'
                    : 'border-border-grey bg-white text-on-surface-variant hover:bg-zinc-50'
                }`}
              >
                <IoServerOutline size={16} />
                <span>Bản sao lưu trên Server</span>
              </button>

              <button
                type="button"
                onClick={() => setRestoreSource('upload')}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  restoreSource === 'upload'
                    ? 'border-primary bg-primary-50/50 text-primary'
                    : 'border-border-grey bg-white text-on-surface-variant hover:bg-zinc-50'
                }`}
              >
                <IoCloudUploadOutline size={16} />
                <span>Tải file từ máy tính</span>
              </button>
            </div>

            {restoreSource === 'server' ? (
              <div>
                <Select
                  value={selectedBackupId ? String(selectedBackupId) : ''}
                  onChange={(e) => setSelectedBackupId(Number(e.target.value))}
                  options={backups.map((b) => ({
                    value: String(b.id),
                    label: `${b.fileName} (${b.formattedSize} - ${new Date(b.createdAt).toLocaleDateString('vi-VN')})`
                  }))}
                />
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept=".sql,.zip"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-on-surface file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer border border-border-grey rounded-xl p-2 bg-white"
                />
                <span className="text-[11px] text-on-surface-variant mt-1 block">Hỗ trợ tệp .sql hoặc file đóng gói .zip của hệ thống</span>
              </div>
            )}
          </div>

          {/* Step 2: Nhập mã xác nhận RESTORE */}
          <div>
            <label className="block text-xs font-bold text-red-700 mb-1.5">
              2. Nhập từ khóa xác nhận: Gõ <span className="font-mono bg-red-100 text-red-900 px-1 py-0.5 rounded">RESTORE</span> để mở khóa
            </label>
            <input
              type="text"
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              placeholder="Gõ chữ RESTORE vào đây..."
              className="w-full text-sm font-mono tracking-wider p-2.5 rounded-xl border border-red-300 bg-white text-on-surface focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
          </div>

          {/* Modal Action Buttons */}
          <div className="pt-4 border-t border-border-grey flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setIsRestoreModalOpen(false)}
              disabled={restoring}
              className="text-xs"
            >
              Hủy Bỏ
            </Button>
            <Button
              onClick={handleExecuteRestore}
              isLoading={restoring}
              disabled={confirmPhrase.trim().toUpperCase() !== 'RESTORE'}
              className="bg-red-600 hover:bg-red-700 text-white border-transparent text-xs font-bold px-4 disabled:bg-zinc-300 disabled:cursor-not-allowed"
            >
              Xác Nhận Khôi Phục Hệ Thống
            </Button>
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════ */}
      {/* THÔNG BÁO TIẾN TRÌNH XUẤT TỆP THÂN THIỆN       */}
      {/* ══════════════════════════════════════════════ */}
      {exportProgress && exportProgress.active && (
        <div className="fixed bottom-5 right-5 z-50 w-80 max-w-[calc(100vw-2rem)] bg-white border border-border-grey shadow-lg rounded-xl p-3.5 text-on-surface animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              {exportProgress.stage === 'done' ? (
                <IoCheckmarkCircleOutline size={18} className="text-emerald-600 flex-shrink-0" />
              ) : (
                <IoSyncOutline size={16} className="text-primary animate-spin flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-on-surface truncate">
                  {exportProgress.stage === 'done' ? 'Xuất tệp thành công' : 'Đang xuất dữ liệu'}
                </p>
                <p className="text-[11px] text-on-surface-variant truncate">
                  {exportProgress.targetName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setExportProgress(null)}
              className="text-zinc-400 hover:text-zinc-600 p-1 rounded-md hover:bg-zinc-100 transition-colors cursor-pointer flex-shrink-0"
              title="Đóng thông báo"
            >
              <IoCloseOutline size={16} />
            </button>
          </div>

          {/* Thanh tiến độ mảnh & thanh thoát */}
          <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out ${
                exportProgress.stage === 'done' ? 'bg-emerald-600' : 'bg-primary'
              }`}
              style={{ width: `${exportProgress.percent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1.5">
            <span className="truncate pr-2">{exportProgress.statusMessage}</span>
            <span className="font-mono font-bold text-primary flex-shrink-0">{exportProgress.percent}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupDataPage;
