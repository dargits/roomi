import React, { useState, useEffect } from 'react';
import {
  IoCloudUploadOutline,
  IoDownloadOutline,
  IoAlertCircleOutline,
  IoCheckmarkCircleOutline,
  IoTimeOutline,
  IoRefreshOutline,
  IoCloseOutline,
  IoDocumentTextOutline,
  IoWarningOutline,
  IoArchiveOutline
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import bookingImportApi, {
  LegacyBookingImportPreviewResponse,
  BookingImportLogResponse
} from '../../services/bookingImportApi';

interface LegacyBookingImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const LegacyBookingImportModal: React.FC<LegacyBookingImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { toastSuccess, toastError } = useToast();

  const [activeTab, setActiveTab] = useState<'import' | 'history'>('import');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [previewResult, setPreviewResult] = useState<LegacyBookingImportPreviewResponse | null>(null);
  const [historyLogs, setHistoryLogs] = useState<BookingImportLogResponse[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showConfirmCommit, setShowConfirmCommit] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      fetchHistory();
    }
  }, [isOpen, activeTab]);

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloadingTemplate(true);
      const blob = await bookingImportApi.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Mau_Nhap_Dat_Phong_Cu.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toastSuccess('Đã tải tệp mẫu bảng tính thành công.');
    } catch (error) {
      console.error('Download template failed', error);
      toastError('Không thể tải tệp mẫu. Vui lòng thử lại.');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewResult(null); // Reset kết quả kiểm tra trước
    }
  };

  const handlePreview = async () => {
    if (!selectedFile) {
      toastError('Vui lòng chọn tệp bảng tính trước.');
      return;
    }

    try {
      setIsValidating(true);
      const res = await bookingImportApi.previewImport(selectedFile);
      setPreviewResult(res);
      if (res.errorCount > 0) {
        toastError(`Phát hiện ${res.errorCount} dòng dữ liệu lỗi. Vui lòng kiểm tra chi tiết bảng bên dưới.`);
      } else {
        toastSuccess(`Dữ liệu hợp lệ! Toàn bộ ${res.validCount} dòng sẵn sàng nhập.`);
      }
    } catch (error: any) {
      console.error('Preview import failed', error);
      toastError(error.response?.data?.message || 'Lỗi khi phân tích tệp bảng tính.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleCommit = async () => {
    if (!selectedFile) return;
    if (previewResult && previewResult.errorCount > 0) {
      toastError('Tệp còn dòng lỗi. Hệ thống chỉ ghi khi toàn bộ các dòng đều hợp lệ theo nguyên tắc trọn vẹn hoặc không gì cả.');
      return;
    }

    try {
      setIsCommitting(true);
      const res = await bookingImportApi.commitImport(selectedFile);
      toastSuccess(res.message || `Đã nhập thành công ${res.successCount} đặt phòng cũ!`);
      setShowConfirmCommit(false);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Commit import failed', error);
      toastError(error.response?.data?.message || 'Nhập dữ liệu thất bại.');
    } finally {
      setIsCommitting(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const logs = await bookingImportApi.getImportHistory();
      setHistoryLogs(logs || []);
    } catch (error) {
      console.error('Load history failed', error);
      toastError('Không thể tải lịch sử nhập dữ liệu.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (val?: number) => {
    if (val == null) return '0 đ';
    return Number(val).toLocaleString('vi-VN') + ' đ';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nhập dữ liệu đặt phòng cũ từ tệp bảng tính"
      maxWidth="max-w-5xl"
    >
      <div className="flex flex-col gap-5">
        {/* Tabs Header */}
        <div className="flex border-b border-border-grey bg-surface-container-low p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'import'
                ? 'bg-white text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <IoCloudUploadOutline size={18} />
            <span>Tải lên & Kiểm tra</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <IoTimeOutline size={18} />
            <span>Lịch sử các lần nhập</span>
          </button>
        </div>

        {/* ── TAB 1: IMPORT MỚI ── */}
        {activeTab === 'import' && (
          <div className="flex flex-col gap-4">
            {/* Step 1 & 2 Card */}
            <div className="p-4 bg-[#F8FAF6] border border-[#E2E8D8] rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <IoDocumentTextOutline size={22} />
                </div>
                <div>
                  <h4 className="font-title-md font-bold text-on-surface text-sm">
                    Tải mẫu tệp bảng tính chuẩn hóa
                  </h4>
                  <p className="text-xs text-on-surface-variant mt-0.5 max-w-xl leading-relaxed">
                    Tệp mẫu đã cấu hình sẵn các cột bắt buộc: <strong>Tên khách, Liên hệ, Số phòng, Ngày nhận, Ngày trả, Giá tiền, Tình trạng thanh toán</strong>.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                isLoading={isDownloadingTemplate}
                icon={IoDownloadOutline}
                className="shrink-0"
              >
                Tải file mẫu Excel (.xlsx)
              </Button>
            </div>

            {/* Upload Area */}
            <div className="border-2 border-dashed border-border-grey hover:border-primary rounded-2xl p-6 transition-colors bg-surface-container-lowest flex flex-col items-center justify-center text-center relative group">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <IoCloudUploadOutline size={26} />
              </div>
              <p className="font-title-md font-bold text-sm text-on-surface">
                {selectedFile ? selectedFile.name : 'Kéo thả tệp bảng tính vào đây hoặc bấm để chọn'}
              </p>
              <p className="text-xs text-on-surface-variant mt-1">
                Hỗ trợ các định dạng <strong>.xlsx, .xls, .csv</strong> (Kích thước tối đa 10MB)
              </p>
              {selectedFile && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 bg-primary/15 text-primary rounded-lg">
                    Đã chọn: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="text-xs text-on-surface-variant flex items-center gap-1.5">
                <IoArchiveOutline size={16} className="text-primary" />
                <span>Quy tắc: <strong>Trọn vẹn hoặc không gì cả</strong> — Gắn nhãn nguồn <strong>Nhập dữ liệu cũ</strong>.</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handlePreview}
                  disabled={!selectedFile || isValidating}
                  isLoading={isValidating}
                  icon={IoCheckmarkCircleOutline}
                >
                  Kiểm tra trước dữ liệu
                </Button>
              </div>
            </div>

            {/* ── KẾT QUẢ KIỂM TRA TRƯỚC (DRY-RUN RESULTS) ── */}
            {previewResult && (
              <div className="flex flex-col gap-4 mt-2 animate-fade-in">
                {/* Stats Summary Bar */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 bg-surface-container-low rounded-xl border border-border-grey text-center">
                    <span className="text-xs text-on-surface-variant block font-medium">Tổng số dòng</span>
                    <span className="text-xl font-bold text-on-surface">{previewResult.totalRows}</span>
                  </div>
                  <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                    <span className="text-xs text-emerald-700 block font-medium">Dòng hợp lệ</span>
                    <span className="text-xl font-bold text-emerald-700">{previewResult.validCount}</span>
                  </div>
                  <div className={`p-3.5 rounded-xl border text-center ${previewResult.errorCount > 0 ? 'bg-red-50 border-red-200' : 'bg-surface-container-low border-border-grey'}`}>
                    <span className={`text-xs block font-medium ${previewResult.errorCount > 0 ? 'text-red-700' : 'text-on-surface-variant'}`}>
                      Dòng có lỗi
                    </span>
                    <span className={`text-xl font-bold ${previewResult.errorCount > 0 ? 'text-red-700' : 'text-on-surface'}`}>
                      {previewResult.errorCount}
                    </span>
                  </div>
                </div>

                {/* Status Alert Banner */}
                {previewResult.errorCount > 0 ? (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-start gap-2.5">
                    <IoAlertCircleOutline size={20} className="text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-sm font-bold text-red-900 mb-0.5">
                        Không thể nhập dữ liệu do phát hiện {previewResult.errorCount} dòng lỗi
                      </strong>
                      Hệ thống tuân thủ nguyên tắc <strong>trọn vẹn hoặc không gì cả</strong> để tránh tình trạng nhập dở dang một nửa. Vui lòng sửa lại các dòng lỗi trong file theo bảng kê dưới đây rồi tải lên lại.
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2.5">
                    <IoCheckmarkCircleOutline size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-sm font-bold text-emerald-900 mb-0.5">
                        Tất cả {previewResult.validCount} dòng dữ liệu đều hợp lệ!
                      </strong>
                      Không phát hiện xung đột phòng, sai lệch ngày hay lỗi định dạng. Bạn có thể an tâm bấm nút <strong>Xác nhận nhập</strong> phía dưới.
                    </div>
                  </div>
                )}

                {/* ── ERROR LIST TABLE ── */}
                {previewResult.errorCount > 0 && (
                  <div className="border border-red-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="bg-red-100/60 px-4 py-2.5 border-b border-red-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-red-900 flex items-center gap-1.5 uppercase tracking-wide">
                        <IoWarningOutline size={16} /> Danh sách chi tiết các dòng bị lỗi ({previewResult.errorCount})
                      </span>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-surface-container-low text-on-surface-variant font-bold border-b border-border-grey sticky top-0 z-10">
                          <tr>
                            <th className="py-2.5 px-3 w-16 text-center">Dòng</th>
                            <th className="py-2.5 px-3">Khách hàng</th>
                            <th className="py-2.5 px-3 w-20 text-center">Phòng</th>
                            <th className="py-2.5 px-3">Thời gian</th>
                            <th className="py-2.5 px-3 text-red-700">Chi tiết lý do lỗi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-grey bg-white">
                          {previewResult.errors.map((err, idx) => (
                            <tr key={idx} className="hover:bg-red-50/40 transition-colors">
                              <td className="py-2.5 px-3 text-center font-bold text-red-600">
                                Dòng {err.rowNumber}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-on-surface">
                                {err.guestName}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-primary">
                                {err.roomNumber}
                              </td>
                              <td className="py-2.5 px-3 text-on-surface-variant text-[11px]">
                                {err.checkInDate} → {err.checkOutDate}
                              </td>
                              <td className="py-2.5 px-3 text-red-700 font-semibold">
                                {err.reason}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── VALID ROWS PREVIEW TABLE ── */}
                {previewResult.validCount > 0 && (
                  <div className="border border-border-grey rounded-xl overflow-hidden shadow-xs">
                    <div className="bg-surface-container-low px-4 py-2.5 border-b border-border-grey flex items-center justify-between">
                      <span className="text-xs font-bold text-on-surface uppercase tracking-wide">
                        Xem trước danh sách dữ liệu hợp lệ ({previewResult.validCount} dòng)
                      </span>
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-surface-container-low text-on-surface-variant font-bold border-b border-border-grey sticky top-0 z-10">
                          <tr>
                            <th className="py-2 px-3 w-16 text-center">Dòng</th>
                            <th className="py-2 px-3">Khách hàng</th>
                            <th className="py-2 px-3">Liên hệ</th>
                            <th className="py-2 px-3 w-20 text-center">Phòng</th>
                            <th className="py-2 px-3">Nhận phòng</th>
                            <th className="py-2 px-3">Trả phòng</th>
                            <th className="py-2 px-3 text-right">Giá tiền</th>
                            <th className="py-2 px-3 text-center">Thanh toán</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-grey bg-white">
                          {previewResult.previewRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-surface-container-low/40 transition-colors">
                              <td className="py-2 px-3 text-center text-on-surface-variant">
                                #{row.rowNumber}
                              </td>
                              <td className="py-2 px-3 font-semibold text-on-surface">
                                {row.guestName}
                              </td>
                              <td className="py-2 px-3 text-on-surface-variant font-mono text-[11px]">
                                {row.contact}
                              </td>
                              <td className="py-2 px-3 text-center font-bold text-primary">
                                {row.roomNumber}
                              </td>
                              <td className="py-2 px-3 text-on-surface-variant">
                                {row.checkInDate}
                              </td>
                              <td className="py-2 px-3 text-on-surface-variant">
                                {row.checkOutDate}
                              </td>
                              <td className="py-2 px-3 text-right font-semibold text-primary">
                                {formatCurrency(row.price)}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  row.paymentStatus?.toLowerCase().includes('đã') || row.paymentStatus?.toLowerCase().includes('paid')
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {row.paymentStatus || 'Chưa thanh toán'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Confirm Import Button Box */}
                <div className="p-4 bg-surface-container-lowest border border-border-grey rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-on-surface-variant">
                    {previewResult.errorCount > 0 ? (
                      <span className="text-red-700 font-semibold">
                        Vui lòng sửa hết {previewResult.errorCount} lỗi để kích hoạt nút ghi.
                      </span>
                    ) : (
                      <span>
                        Sẵn sàng ghi <strong>{previewResult.validCount}</strong> bản ghi vào hệ thống.
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="md" onClick={onClose}>
                      Hủy bỏ
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      disabled={previewResult.errorCount > 0 || previewResult.validCount === 0 || isCommitting}
                      isLoading={isCommitting}
                      onClick={() => setShowConfirmCommit(true)}
                      icon={IoCloudUploadOutline}
                    >
                      Xác nhận nhập dữ liệu
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: LỊCH SỬ NHẬP ── */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-on-surface-variant">
                Lịch sử ghi nhận tất cả các lần Quản trị viên nhập dữ liệu đặt phòng cũ.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchHistory}
                isLoading={isLoadingHistory}
                icon={IoRefreshOutline}
              >
                Làm mới
              </Button>
            </div>

            <div className="border border-border-grey rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-surface-container-low text-on-surface-variant font-bold border-b border-border-grey">
                  <tr>
                    <th className="py-2.5 px-3">Thời gian</th>
                    <th className="py-2.5 px-3">Tên tệp</th>
                    <th className="py-2.5 px-3">Người thực hiện</th>
                    <th className="py-2.5 px-3 text-center">Thành công</th>
                    <th className="py-2.5 px-3 text-center">Lỗi</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    <th className="py-2.5 px-3">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-grey bg-white">
                  {isLoadingHistory ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-on-surface-variant">
                        Đang tải lịch sử...
                      </td>
                    </tr>
                  ) : historyLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-on-surface-variant">
                        Chưa có lần nhập dữ liệu nào được ghi nhận.
                      </td>
                    </tr>
                  ) : (
                    historyLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-surface-container-low/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-on-surface">
                          {formatDateTime(log.importedAt)}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-primary truncate max-w-[160px]" title={log.fileName}>
                          {log.fileName}
                        </td>
                        <td className="py-2.5 px-3 text-on-surface font-medium">
                          {log.importedByName}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                          {log.successCount}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-red-600">
                          {log.errorCount}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {log.status === 'SUCCESS' ? 'Thành công' : 'Bị từ chối'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-on-surface-variant truncate max-w-[200px]" title={log.notes}>
                          {log.notes || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Submodal */}
      {showConfirmCommit && (
        <Modal
          isOpen={showConfirmCommit}
          onClose={() => setShowConfirmCommit(false)}
          title="Xác nhận ghi dữ liệu đặt phòng cũ"
          maxWidth="max-w-md"
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-on-surface leading-relaxed">
              Bạn có chắc chắn muốn nhập <strong>{previewResult?.validCount} đặt phòng cũ</strong> vào hệ thống?
            </p>
            <div className="p-3 bg-primary/10 rounded-xl text-xs text-primary space-y-1">
              <div>✓ Các đặt phòng sẽ mang nhãn nguồn <strong>Nhập dữ liệu cũ</strong>.</div>
              <div>✓ <strong>Không</strong> sinh email/SMS thông báo cho khách hàng.</div>
              <div>✓ <strong>Không</strong> phát sinh yêu cầu thu cọc.</div>
              <div>✓ Áp dụng nguyên tắc <strong>trọn vẹn hoặc không gì cả</strong>.</div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="md" onClick={() => setShowConfirmCommit(false)}>
                Xem lại
              </Button>
              <Button
                variant="primary"
                size="md"
                isLoading={isCommitting}
                onClick={handleCommit}
              >
                Đồng ý ghi dữ liệu
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};

export default LegacyBookingImportModal;
