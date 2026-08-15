import React, { useState } from 'react';
import { IoAlertCircleOutline, IoBedOutline, IoCheckmarkCircleOutline, IoCloudUploadOutline, IoDocumentOutline, IoDownloadOutline, IoLayersOutline, IoListOutline, IoLogOutOutline, IoPeopleOutline, IoRefreshOutline, IoServerOutline, IoSparklesOutline } from 'react-icons/io5';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import dataApi from '../../services/dataApi';
import { useAuth } from '../../context/AuthContext';

const EXPORT_ITEMS = [
  {
    type: 'bookings',
    name: 'Dữ liệu Đặt phòng',
    desc: 'Bao gồm mã booking, thông tin khách, số phòng, ngày nhận/trả, giá tiền và trạng thái',
    icon: IoListOutline,
    color: 'bg-blue-500'
  },
  {
    type: 'guests',
    name: 'Danh sách Khách hàng',
    desc: 'Bao gồm tên khách, số điện thoại, CCCD/CMND, email và điểm tích lũy thành viên',
    icon: IoPeopleOutline,
    color: 'bg-emerald-500'
  },
  {
    type: 'rooms',
    name: 'Danh sách Phòng & Sơ đồ',
    desc: 'Bao gồm số phòng, loại phòng, tầng và trạng thái phòng',
    icon: IoLogOutOutline,
    color: 'bg-amber-500'
  },
  {
    type: 'room-types',
    name: 'Cấu hình Loại phòng',
    desc: 'Bao gồm tên loại phòng, giá cơ bản theo đêm, sức chứa và tiện nghi',
    icon: IoBedOutline,
    color: 'bg-purple-500'
  },
  {
    type: 'extra-services',
    name: 'Dịch vụ Phụ thu',
    desc: 'Bao gồm danh mục dịch vụ, bảng giá và đơn vị tính',
    icon: IoSparklesOutline,
    color: 'bg-rose-500'
  },
  {
    type: 'invoices',
    name: 'Hóa đơn & Doanh thu',
    desc: 'Bao gồm chi tiết tiền phòng, tiền dịch vụ, giảm giá và ngày lập',
    icon: IoDocumentOutline,
    color: 'bg-indigo-500'
  }
];

const IMPORT_TYPES = [
  { value: 'rooms', label: 'Danh sách Phòng (roomNumber, roomTypeId, floor)' },
  { value: 'guests', label: 'Khách hàng (name, phone, idNumber, email)' },
  { value: 'room-types', label: 'Loại phòng (name, basePrice, maxCapacity, amenitiesDescription)' },
  { value: 'extra-services', label: 'Dịch vụ phụ thu (name, price, unit)' }
];

const SAMPLE_CSV = {
  rooms: "Số phòng,Mã loại phòng,Tầng\n101,1,1\n102,1,1\n201,2,2\n202,2,2",
  guests: "Tên khách hàng,Số điện thoại,CCCD,Email\nNguyễn Văn An,0912345678,001234567890,an.nguyen@gmail.com\nTrần Thị Bích,0987654321,001987654321,bich.tran@gmail.com",
  'room-types': "Tên loại phòng,Giá cơ bản,Sức chứa,Mô tả tiện nghi\nPhòng Standard,500000,2,Giường đôi TV Điều hòa\nPhòng Deluxe VIP,1200000,4,View biển Ban công Bồn tắm",
  'extra-services': "Tên dịch vụ,Đơn giá,Đơn vị tính\nNước ngọt lon,15000,Lon\nGiặt là nhanh,50000,Kg\nThuê xe máy,150000,Ngày"
};

const BackupDataPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('export'); // 'export' | 'import'

  // Export State
  const [exportingType, setExportingType] = useState(null);

  // Import State
  const [importType, setImportType] = useState('rooms');
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const hasAccess = ['OWNER', 'ADMIN'].includes(user?.role);
  if (!hasAccess) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-error rounded-xl text-sm font-medium">
        Chỉ Chủ cơ sở hoặc Quản trị viên mới có quyền sao lưu và nhập/xuất dữ liệu hệ thống.
      </div>
    );
  }

  // Xử lý download file CSV từ API
  const handleExport = async (type, name) => {
    setExportingType(type);
    try {
      const blob = await dataApi.exportData(type);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `staygo_backup_${type}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Lỗi xuất dữ liệu: ' + (err.response?.data?.message || err.message));
    } finally {
      setExportingType(null);
    }
  };

  // Tải file template mẫu
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
  };

  // Xử lý Import file CSV
  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Vui lòng chọn file CSV để nhập dữ liệu.');
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const res = await dataApi.importData(importType, selectedFile);
      setImportResult({ type: 'success', message: res.message || 'Nhập dữ liệu thành công!' });
      setSelectedFile(null);
    } catch (err) {
      setImportResult({
        type: 'error',
        message: err.response?.data?.message || 'Có lỗi xảy ra khi xử lý file CSV.'
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={IoServerOutline}
        title="Sao Lưu & Nhập / Xuất Dữ Liệu"
        subtitle="Quản lý sao lưu an toàn toàn bộ dữ liệu hệ thống dưới định dạng file CSV tiêu chuẩn"
      />

      {/* Tabs */}
      <div className="flex bg-surface-container-low rounded-xl p-1 border border-border-grey w-fit">
        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-label-md text-sm transition-colors ${
            activeTab === 'export'
              ? 'bg-white shadow-xs text-primary font-bold'
              : 'text-on-surface-variant hover:text-on-surface font-medium'
          }`}
        >
          <IoDownloadOutline size={16} />
          Xuất Sao Lưu (Export CSV)
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-label-md text-sm transition-colors ${
            activeTab === 'import'
              ? 'bg-white shadow-xs text-primary font-bold'
              : 'text-on-surface-variant hover:text-on-surface font-medium'
          }`}
        >
          <IoCloudUploadOutline size={16} />
          Nhập Dữ Liệu (Import CSV)
        </button>
      </div>

      {/* ── TAB 1: EXPORT CSV ── */}
      {activeTab === 'export' && (
        <div className="space-y-4">
          <div className="bg-surface-blue-light/50 border border-primary/20 rounded-2xl p-4 text-xs text-primary flex items-center justify-between">
            <span>💡 File CSV được tạo với mã hóa <strong>UTF-8 BOM</strong>, tự động mở chuẩn font tiếng Việt trên Microsoft Excel và Google Sheets.</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {EXPORT_ITEMS.map((item) => {
              const Icon = item.icon;
              const isDownloading = exportingType === item.type;
              return (
                <div
                  key={item.type}
                  className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition-all group"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white ${item.color} shadow-xs`}>
                        <Icon size={22} />
                      </div>
                      <div>
                        <h4 className="font-title-md text-on-surface font-bold">{item.name}</h4>
                        <span className="text-[11px] font-mono text-on-surface-variant/70 uppercase">table: {item.type}</span>
                      </div>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
                      {item.desc}
                    </p>
                  </div>

                  <Button
                    onClick={() => handleExport(item.type, item.name)}
                    isLoading={isDownloading}
                    icon={IoDownloadOutline}
                    className="w-full justify-center text-xs py-2"
                  >
                    Xuất file CSV
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 2: IMPORT CSV ── */}
      {activeTab === 'import' && (
        <div className="max-w-2xl bg-surface-container-lowest border border-border-grey rounded-2xl p-6 shadow-xs space-y-5">
          <div className="border-b border-border-grey pb-4">
            <h3 className="font-headline-sm text-on-surface flex items-center gap-2">
              <IoCloudUploadOutline size={20} className="text-primary" />
              Nhập Dữ Liệu Nhanh từ File CSV
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              Thêm mới hàng loạt bản ghi vào cơ sở dữ liệu. Dữ liệu trùng lặp (ví dụ SĐT khách hoặc số phòng) sẽ tự động được bỏ qua an toàn.
            </p>
          </div>

          {importResult && (
            <div
              className={`p-4 rounded-xl flex items-start gap-3 text-sm ${
                importResult.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-error border border-red-200'
              }`}
            >
              {importResult.type === 'success' ? (
                <IoCheckmarkCircleOutline size={20} className="flex-shrink-0 mt-0.5 text-green-600" />
              ) : (
                <IoAlertCircleOutline size={20} className="flex-shrink-0 mt-0.5 text-error" />
              )}
              <div className="font-medium">{importResult.message}</div>
            </div>
          )}

          <form onSubmit={handleImportSubmit} className="space-y-4">
            <div>
              <label className="block font-label-md text-on-surface mb-1.5 text-xs font-semibold">1. Chọn loại dữ liệu cần nhập</label>
              <Select
                value={importType}
                onChange={(e) => {
                  setImportType(e.target.value);
                  setImportResult(null);
                }}
                options={IMPORT_TYPES}
              />
            </div>

            <div className="flex justify-between items-center p-3 bg-surface-container-low rounded-xl border border-border-grey">
              <div className="text-xs text-on-surface-variant">
                <span>Chưa có mẫu chuẩn? Tải file mẫu cấu trúc sẵn:</span>
              </div>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer bg-transparent border-none p-0"
              >
                <IoDownloadOutline size={13} />
                Tải file mẫu ({importType}.csv)
              </button>
            </div>

            <div>
              <label className="block font-label-md text-on-surface mb-1.5 text-xs font-semibold">2. Chọn file CSV từ máy tính</label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  setSelectedFile(e.target.files[0] || null);
                  setImportResult(null);
                }}
                className="w-full text-xs text-on-surface file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer border border-border-grey rounded-xl p-2 bg-white"
                required
              />
              {selectedFile && (
                <p className="text-[11px] text-green-700 mt-1.5 font-medium">
                  Đã chọn: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-border-grey flex gap-3">
              <Button type="submit" isLoading={importing} icon={IoCloudUploadOutline} className="w-full justify-center">
                Bắt đầu Nhập Dữ Liệu
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default BackupDataPage;
