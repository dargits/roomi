import React, { useState, useEffect, useCallback } from 'react';
import {
  IoDocumentTextOutline,
  IoCheckmarkCircleOutline,
  IoWarningOutline,
  IoAlertCircleOutline,
  IoRefreshOutline,
  IoDownloadOutline,
  IoCalendarOutline,
  IoPeopleOutline,
  IoEyeOutline,
  IoEyeOffOutline,
  IoShieldCheckmarkOutline,
  IoTimeOutline,
  IoImageOutline,
  IoCloudUploadOutline,
  IoSearchOutline,
  IoFilterOutline,
  IoLayersOutline,
  IoCloseOutline
} from 'react-icons/io5';
import stayDeclarationApi from '../../services/stayDeclarationApi';
import { guestApi } from '../../services/guestApi';
import { fileApi } from '../../services/fileApi';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

// ─── Hằng số ──────────────────────────────────────────────────────────────────

const DOC_STATUS_CONFIG = {
  COMPLETE: { label: 'Đủ dữ liệu', cls: 'bg-emerald-100 text-emerald-800' },
  MISSING:  { label: 'Thiếu giấy tờ', cls: 'bg-amber-100 text-amber-800' },
};

const DECL_STATUS_CONFIG = {
  COMPLETED: { label: 'Đã khai báo', cls: 'bg-blue-100 text-blue-800', icon: IoCheckmarkCircleOutline },
  PENDING:   { label: 'Chưa khai báo', cls: 'bg-surface-container text-on-surface-variant', icon: IoTimeOutline },
};

// Vai trò được xem đầy đủ số giấy tờ (QTN-24)
const CAN_VIEW_FULL_ID = ['OWNER', 'RECEPTIONIST'];

const DOC_TYPE_NAMES = {
  NATIONAL_ID_FRONT: 'CCCD / CMND (Mặt trước)',
  NATIONAL_ID_BACK: 'CCCD / CMND (Mặt sau)',
  PASSPORT: 'Hộ chiếu (Passport)',
};

// ─── Summary Card ─────────────────────────────────────────────────────────────

const SummaryCard = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-center gap-4 rounded-xl border border-border-grey bg-surface-container-lowest p-4 transition-all hover:shadow-sm">
    <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg ${color}`}>
      <Icon size={22} className="text-white" />
    </div>
    <div>
      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-on-surface mt-0.5">{value ?? 0}</p>
    </div>
  </div>
);

// ─── Component chính ──────────────────────────────────────────────────────────

const StayDeclarationPage = () => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const hasAccess = ['OWNER', 'RECEPTIONIST', 'ADMIN'].includes(user?.role);
  const canViewFullId = CAN_VIEW_FULL_ID.includes(user?.role);
  const canComplete = ['OWNER', 'RECEPTIONIST', 'ADMIN'].includes(user?.role);

  // Tab State: 'today' | 'history'
  const [activeTab, setActiveTab] = useState('today');

  // ── Tab 1: Khai báo theo ngày ──
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [completingId, setCompletingId] = useState(null);

  // ── Tab 2: Lịch sử lưu trú ──
  const [historyFromDate, setHistoryFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [historyToDate, setHistoryToDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [historyKeyword, setHistoryKeyword] = useState('');
  const [historyDeclStatus, setHistoryDeclStatus] = useState('ALL');
  const [historyDocStatus, setHistoryDocStatus] = useState('ALL');
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyExporting, setHistoryExporting] = useState(false);

  // Modal xác nhận hoàn tất khai báo
  const [confirmModal, setConfirmModal] = useState({ open: false, guest: null });

  // Modal upload giấy tờ
  const [uploadModal, setUploadModal] = useState({ open: false, guest: null });
  const [uploadData, setUploadData] = useState({ documentType: 'NATIONAL_ID_FRONT', documentNumber: '', file: null });
  const [uploading, setUploading] = useState(false);

  // Modal zoom xem trước ảnh CCCD / Giấy tờ
  const [previewModal, setPreviewModal] = useState({ open: false, imageUrl: '', title: '', guestName: '' });

  // ── Fetch data Tab 1 (Theo ngày) ──────────────────────────────────────────
  const fetchData = useCallback(async (date) => {
    if (!hasAccess) return;
    setLoading(true);
    try {
      const result = await stayDeclarationApi.getByDate(date);
      setData(result);
    } catch (err) {
      toastError(err.response?.data?.message || 'Không thể tải danh sách khai báo lưu trú.');
    } finally {
      setLoading(false);
    }
  }, [hasAccess, toastError]);

  useEffect(() => {
    if (hasAccess && activeTab === 'today') {
      fetchData(selectedDate);
    }
  }, [selectedDate, fetchData, hasAccess, activeTab]);

  // ── Fetch data Tab 2 (Lịch sử) ───────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    if (!hasAccess) return;
    setHistoryLoading(true);
    try {
      const result = await stayDeclarationApi.getHistory({
        fromDate: historyFromDate,
        toDate: historyToDate,
        keyword: historyKeyword,
        declarationStatus: historyDeclStatus,
        documentStatus: historyDocStatus,
      });
      setHistoryData(result);
    } catch (err) {
      toastError(err.response?.data?.message || 'Không thể tải lịch sử lưu trú.');
    } finally {
      setHistoryLoading(false);
    }
  }, [hasAccess, historyFromDate, historyToDate, historyKeyword, historyDeclStatus, historyDocStatus, toastError]);

  useEffect(() => {
    if (hasAccess && activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, fetchHistory, hasAccess]);

  // ── Export Excel Tab 1 ────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await stayDeclarationApi.exportExcel(selectedDate);
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `khai_bao_luu_tru_${selectedDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      success('Đã kết xuất file khai báo lưu trú thành công. Nhật ký đã được ghi lại.');
    } catch (err) {
      toastError(err.response?.data?.message || 'Không thể kết xuất file. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  };

  // ── Export Excel Tab 2 (Lịch sử) ───────────────────────────────────────────
  const handleExportHistory = async () => {
    setHistoryExporting(true);
    try {
      const response = await stayDeclarationApi.exportHistoryExcel({
        fromDate: historyFromDate,
        toDate: historyToDate,
        keyword: historyKeyword,
        declarationStatus: historyDeclStatus,
        documentStatus: historyDocStatus,
      });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lich_su_luu_tru_${historyFromDate}_den_${historyToDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      success('Đã kết xuất file lịch sử lưu trú thành công. Nhật ký đã được ghi lại.');
    } catch (err) {
      toastError(err.response?.data?.message || 'Không thể kết xuất file lịch sử. Vui lòng thử lại.');
    } finally {
      setHistoryExporting(false);
    }
  };

  // ── Complete Declaration ──────────────────────────────────────────────────
  const handleComplete = async (guest) => {
    setCompletingId(guest.bookingId);
    setConfirmModal({ open: false, guest: null });
    try {
      await stayDeclarationApi.complete(guest.bookingId);
      success(`Đã đánh dấu khai báo hoàn tất cho khách ${guest.guestName}.`);
      if (activeTab === 'today') {
        await fetchData(selectedDate);
      } else {
        await fetchHistory();
      }
    } catch (err) {
      toastError(err.response?.data?.message || 'Không thể cập nhật trạng thái khai báo.');
    } finally {
      setCompletingId(null);
    }
  };

  // ── Upload Document ───────────────────────────────────────────────────────
  const handleUploadDocument = async () => {
    if (uploadModal.guest?.declarationStatus === 'COMPLETED') {
      toastError('Không thể cập nhật ảnh khi khai báo lưu trú đã hoàn tất.');
      return;
    }
    if (!uploadData.file) {
      toastError('Vui lòng chọn ảnh giấy tờ');
      return;
    }
    setUploading(true);
    try {
      const uploadRes = await fileApi.uploadFile(uploadData.file);
      await guestApi.addIdentityDocument(uploadModal.guest.guestId, {
        documentType: uploadData.documentType,
        documentNumber: uploadData.documentNumber,
        imageUrl: uploadRes.url,
      });
      success('Tải ảnh giấy tờ thành công');
      setUploadModal({ open: false, guest: null });
      setUploadData({ documentType: 'NATIONAL_ID_FRONT', documentNumber: '', file: null });
      if (activeTab === 'today') {
        await fetchData(selectedDate);
      } else {
        await fetchHistory();
      }
    } catch (err) {
      toastError(err.response?.data?.message || err.message || 'Không thể tải ảnh lên');
    } finally {
      setUploading(false);
    }
  };

  // ── Delete Document ───────────────────────────────────────────────────────
  const handleDeleteDocument = async (guestId, docId, isCompleted = false) => {
    if (!guestId || !docId) return;
    if (isCompleted) {
      toastError('Không thể gỡ ảnh khi khai báo lưu trú đã hoàn tất.');
      return;
    }
    if (!window.confirm('Bạn có chắc chắn muốn gỡ bỏ ảnh giấy tờ này?')) return;
    try {
      await guestApi.deleteIdentityDocument(guestId, docId);
      success('Đã gỡ bỏ ảnh giấy tờ thành công');
      if (activeTab === 'today') {
        await fetchData(selectedDate);
      } else {
        await fetchHistory();
      }
    } catch (err) {
      toastError(err.response?.data?.message || 'Không thể xóa ảnh giấy tờ');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!hasAccess) {
    return (
      <div className="p-6 text-alert-red bg-red-50 rounded-md">
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-md font-bold text-on-surface flex items-center gap-2">
            <IoDocumentTextOutline className="text-primary" size={28} />
            Khai báo lưu trú & Lịch sử
          </h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Quản lý khai báo lưu trú theo quy định pháp luật và tra cứu lịch sử khách lưu trú
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-container-low border border-border-grey rounded-xl">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'today'
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <IoCalendarOutline size={16} />
            Khai báo trong ngày
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'history'
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <IoLayersOutline size={16} />
            Lịch sử lưu trú
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: KHAI BÁO TRONG NGÀY */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'today' && (
        <div className="space-y-6">
          {/* Controls bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-surface-container-lowest border border-border-grey rounded-xl">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-on-surface">Ngày khai báo:</label>
              <div className="flex items-center gap-2 rounded-lg border border-border-grey bg-surface px-3 py-2">
                <IoCalendarOutline size={16} className="text-on-surface-variant" />
                <input
                  id="declaration-date-picker"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-sm text-on-surface focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                icon={IoRefreshOutline}
                onClick={() => fetchData(selectedDate)}
                disabled={loading}
              >
                Làm mới
              </Button>

              <Button
                icon={IoDownloadOutline}
                onClick={handleExport}
                isLoading={exporting}
                disabled={loading}
              >
                Kết xuất Excel
              </Button>
            </div>
          </div>

          {/* Cảnh báo gần 23h */}
          {data?.nearDeadlineWarning && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <IoAlertCircleOutline size={22} className="mt-0.5 flex-shrink-0 text-alert-red" />
              <div>
                <p className="font-semibold text-alert-red">Cảnh báo: Sắp hết hạn khai báo!</p>
                <p className="text-sm text-red-700 mt-0.5">
                  Đã qua 22:00 — còn <strong>{data.pendingDeclarations}</strong> khách chưa được khai báo lưu trú.
                  Vui lòng hoàn tất trước mốc 23:00 theo quy định pháp luật.
                </p>
              </div>
            </div>
          )}

          {/* Summary cards */}
          {data && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SummaryCard icon={IoPeopleOutline}            label="Tổng khách"       value={data.totalGuests}            color="bg-primary" />
              <SummaryCard icon={IoCheckmarkCircleOutline}   label="Đủ dữ liệu"      value={data.completeGuests}         color="bg-emerald-500" />
              <SummaryCard icon={IoWarningOutline}           label="Thiếu giấy tờ"   value={data.missingDocumentGuests}  color="bg-amber-500" />
              <SummaryCard icon={IoTimeOutline}              label="Chưa khai báo"   value={data.pendingDeclarations}    color="bg-gray-500" />
            </div>
          )}

          {/* Ghi chú về mask dữ liệu theo QTN-24 */}
          {!canViewFullId && (
            <div className="flex items-center gap-2 rounded-xl border border-border-grey bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
              <IoShieldCheckmarkOutline size={16} className="text-primary flex-shrink-0" />
              <span>
                Số CCCD/hộ chiếu đang được che theo <strong>QTN-24</strong> (Luật Bảo vệ dữ liệu cá nhân số 91/2025) —
                chỉ Lễ tân và Chủ cơ sở xem được đầy đủ.
              </span>
            </div>
          )}

          {/* Bảng danh sách */}
          <div className="rounded-xl border border-border-grey bg-surface-container-lowest overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-on-surface-variant">
                <IoRefreshOutline className="mr-2 animate-spin" size={20} />
                <span>Đang tải danh sách khai báo...</span>
              </div>
            ) : !data || data.guests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
                <IoDocumentTextOutline size={40} className="mb-3 text-on-surface-variant/40" />
                <p className="font-medium">Không có khách nhận phòng trong ngày này</p>
                <p className="text-sm mt-1">Chọn ngày khác hoặc kiểm tra lại lịch nhận phòng</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border-grey bg-surface-container-low text-xs font-semibold uppercase text-on-surface-variant">
                      <th className="p-4">STT</th>
                      <th className="p-4">Họ tên khách</th>
                      <th className="p-4">Số CCCD / Hộ chiếu</th>
                      <th className="p-4">Điện thoại</th>
                      <th className="p-4">Phòng</th>
                      <th className="p-4">Nhận phòng lúc</th>
                      <th className="p-4 text-center">Tình trạng giấy tờ</th>
                      <th className="p-4 text-center">Khai báo</th>
                      <th className="p-4 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.guests.map((guest, index) => {
                      const docCfg = DOC_STATUS_CONFIG[guest.documentStatus] || DOC_STATUS_CONFIG.MISSING;
                      const declCfg = DECL_STATUS_CONFIG[guest.declarationStatus] || DECL_STATUS_CONFIG.PENDING;
                      const DeclIcon = declCfg.icon;
                      const isCompleted = guest.declarationStatus === 'COMPLETED';
                      const isCompleting = completingId === guest.bookingId;

                      return (
                        <tr
                          key={`${guest.bookingId}-${guest.guestId || index}`}
                          className={`border-b border-border-grey transition-colors hover:bg-surface-container-low/50
                            ${guest.documentStatus === 'MISSING' ? 'bg-amber-50/30' : ''}`}
                        >
                          <td className="p-4 text-sm text-on-surface-variant">{index + 1}</td>

                          <td className="p-4">
                            <span className="font-semibold text-on-surface">{guest.guestName || '—'}</span>
                          </td>

                          {/* Số giấy tờ với icon mask (QTN-24) */}
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className={`font-mono text-sm ${guest.idNumberMasked ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                                {guest.idNumber || '—'}
                              </span>
                              {guest.idNumberMasked && (
                                <IoEyeOffOutline size={14} className="text-on-surface-variant" title="Số đã được che theo QTN-24" />
                              )}
                              {!guest.idNumberMasked && guest.idNumber && (
                                <IoEyeOutline size={14} className="text-primary" title="Hiển thị đầy đủ" />
                              )}
                            </div>
                          </td>

                          <td className="p-4 text-sm text-on-surface">{guest.phone || '—'}</td>

                          <td className="p-4">
                            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-sm font-semibold text-primary">
                              {guest.roomNumber || 'Chưa gán'}
                            </span>
                          </td>

                          <td className="p-4 text-sm text-on-surface-variant">
                            {guest.checkedInAt
                              ? new Date(guest.checkedInAt).toLocaleString('vi-VN', {
                                  hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit',
                                })
                              : '—'}
                          </td>

                          <td className="p-4 text-center">
                            <span className={`inline-block rounded-md px-2 py-1 text-xs font-semibold ${docCfg.cls}`}>
                              {docCfg.label}
                            </span>
                            {guest.missingRequirements?.length > 0 && (
                              <p className="mt-1 text-xs text-amber-700">
                                Thiếu: {guest.missingRequirements.join(', ')}
                              </p>
                            )}
                            {guest.documents?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                                {guest.documents.map((doc, i) => (
                                  <div key={doc.id || i} className="group relative inline-block">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPreviewModal({
                                          open: true,
                                          imageUrl: doc.url,
                                          title: DOC_TYPE_NAMES[doc.type] || doc.type || 'Giấy tờ tùy thân',
                                          guestName: guest.guestName,
                                        })
                                      }
                                      className="block focus:outline-none"
                                      title={`Nhấp để phóng to xem (${DOC_TYPE_NAMES[doc.type] || doc.type})`}
                                    >
                                      <img
                                        src={doc.url}
                                        alt={doc.type}
                                        className="h-8 w-12 object-cover rounded border border-border-grey group-hover:opacity-80 group-hover:border-primary transition-all cursor-pointer shadow-xs"
                                      />
                                    </button>
                                    {canComplete && !isCompleted && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleDeleteDocument(guest.guestId, doc.id, isCompleted);
                                        }}
                                        className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 hover:scale-110 transition-all z-10"
                                        title="Gỡ bỏ ảnh này"
                                      >
                                        <IoCloseOutline size={12} />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>

                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${declCfg.cls}`}>
                              <DeclIcon size={12} />
                              {declCfg.label}
                            </span>
                            {isCompleted && guest.declarationCompletedAt && (
                              <p className="mt-1 text-xs text-on-surface-variant">
                                {new Date(guest.declarationCompletedAt).toLocaleString('vi-VN', {
                                  hour: '2-digit', minute: '2-digit',
                                })}
                              </p>
                            )}
                          </td>

                          <td className="p-4 text-center">
                            {canComplete && !isCompleted && (
                              <div className="flex flex-col gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  icon={IoCheckmarkCircleOutline}
                                  isLoading={isCompleting}
                                  disabled={isCompleting}
                                  onClick={() => setConfirmModal({ open: true, guest })}
                                >
                                  Đánh dấu
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  icon={IoImageOutline}
                                  onClick={() => setUploadModal({ open: true, guest })}
                                >
                                  {guest.documents?.length > 0 ? 'Thêm ảnh' : 'Tải ảnh lên'}
                                </Button>
                              </div>
                            )}
                            {isCompleted && (
                              <span className="text-xs text-emerald-600 flex items-center justify-center gap-1">
                                <IoCheckmarkCircleOutline size={14} />
                                Hoàn tất
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: LỊCH SỬ LƯU TRÚ */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Bộ lọc lịch sử */}
          <div className="p-5 bg-surface-container-lowest border border-border-grey rounded-xl space-y-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Từ ngày</label>
                <div className="flex items-center gap-2 rounded-lg border border-border-grey bg-surface px-3 py-2">
                  <IoCalendarOutline size={16} className="text-on-surface-variant" />
                  <input
                    type="date"
                    value={historyFromDate}
                    onChange={(e) => setHistoryFromDate(e.target.value)}
                    className="w-full bg-transparent text-sm text-on-surface focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Đến ngày</label>
                <div className="flex items-center gap-2 rounded-lg border border-border-grey bg-surface px-3 py-2">
                  <IoCalendarOutline size={16} className="text-on-surface-variant" />
                  <input
                    type="date"
                    value={historyToDate}
                    onChange={(e) => setHistoryToDate(e.target.value)}
                    className="w-full bg-transparent text-sm text-on-surface focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Khai báo lưu trú</label>
                <select
                  value={historyDeclStatus}
                  onChange={(e) => setHistoryDeclStatus(e.target.value)}
                  className="w-full rounded-lg border border-border-grey bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="COMPLETED">Đã khai báo</option>
                  <option value="PENDING">Chưa khai báo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Tình trạng giấy tờ</label>
                <select
                  value={historyDocStatus}
                  onChange={(e) => setHistoryDocStatus(e.target.value)}
                  className="w-full rounded-lg border border-border-grey bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                >
                  <option value="ALL">Tất cả</option>
                  <option value="COMPLETE">Đủ dữ liệu</option>
                  <option value="MISSING">Thiếu giấy tờ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Tìm kiếm nhanh</label>
                <div className="flex items-center gap-2 rounded-lg border border-border-grey bg-surface px-3 py-2">
                  <IoSearchOutline size={16} className="text-on-surface-variant" />
                  <input
                    type="text"
                    placeholder="Tên, CCCD, SĐT, phòng..."
                    value={historyKeyword}
                    onChange={(e) => setHistoryKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchHistory()}
                    className="w-full bg-transparent text-sm text-on-surface focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-grey pt-3">
              <div className="text-xs text-on-surface-variant">
                Lịch sử gồm tất cả khách đã nhận phòng và đã trả phòng trong khoảng thời gian đã chọn.
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  icon={IoFilterOutline}
                  onClick={fetchHistory}
                  isLoading={historyLoading}
                >
                  Áp dụng bộ lọc
                </Button>

                <Button
                  icon={IoDownloadOutline}
                  onClick={handleExportHistory}
                  isLoading={historyExporting}
                  disabled={historyLoading}
                >
                  Kết xuất Excel lịch sử
                </Button>
              </div>
            </div>
          </div>

          {/* Summary cards cho lịch sử */}
          {historyData && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SummaryCard icon={IoPeopleOutline}            label="Tổng lượt lưu trú"  value={historyData.totalGuests}            color="bg-primary" />
              <SummaryCard icon={IoCheckmarkCircleOutline}   label="Đủ dữ liệu"         value={historyData.completeGuests}         color="bg-emerald-500" />
              <SummaryCard icon={IoWarningOutline}           label="Thiếu giấy tờ"      value={historyData.missingDocumentGuests}  color="bg-amber-500" />
              <SummaryCard icon={IoTimeOutline}              label="Chưa khai báo"      value={historyData.pendingDeclarations}    color="bg-gray-500" />
            </div>
          )}

          {/* Bảng lịch sử */}
          <div className="rounded-xl border border-border-grey bg-surface-container-lowest overflow-hidden shadow-sm">
            {historyLoading ? (
              <div className="flex items-center justify-center py-16 text-on-surface-variant">
                <IoRefreshOutline className="mr-2 animate-spin" size={20} />
                <span>Đang tải lịch sử lưu trú...</span>
              </div>
            ) : !historyData || historyData.guests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
                <IoLayersOutline size={40} className="mb-3 text-on-surface-variant/40" />
                <p className="font-medium">Không tìm thấy lượt lưu trú nào phù hợp với bộ lọc</p>
                <p className="text-sm mt-1">Hãy thử mở rộng khoảng thời gian hoặc thay đổi từ khóa tìm kiếm</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border-grey bg-surface-container-low text-xs font-semibold uppercase text-on-surface-variant">
                      <th className="p-4">STT</th>
                      <th className="p-4">Họ tên khách</th>
                      <th className="p-4">Số CCCD / Hộ chiếu</th>
                      <th className="p-4">Điện thoại</th>
                      <th className="p-4">Phòng & Trạng thái</th>
                      <th className="p-4">Thời gian lưu trú</th>
                      <th className="p-4 text-center">Tình trạng giấy tờ</th>
                      <th className="p-4 text-center">Khai báo</th>
                      <th className="p-4 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.guests.map((guest, index) => {
                      const docCfg = DOC_STATUS_CONFIG[guest.documentStatus] || DOC_STATUS_CONFIG.MISSING;
                      const declCfg = DECL_STATUS_CONFIG[guest.declarationStatus] || DECL_STATUS_CONFIG.PENDING;
                      const DeclIcon = declCfg.icon;
                      const isCompleted = guest.declarationStatus === 'COMPLETED';
                      const isCompleting = completingId === guest.bookingId;

                      return (
                        <tr
                          key={`history-${guest.bookingId}-${guest.guestId || index}`}
                          className={`border-b border-border-grey transition-colors hover:bg-surface-container-low/50
                            ${guest.documentStatus === 'MISSING' ? 'bg-amber-50/30' : ''}`}
                        >
                          <td className="p-4 text-sm text-on-surface-variant">{index + 1}</td>

                          <td className="p-4">
                            <span className="font-semibold text-on-surface">{guest.guestName || '—'}</span>
                          </td>

                          {/* Số giấy tờ với icon mask (QTN-24) */}
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className={`font-mono text-sm ${guest.idNumberMasked ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                                {guest.idNumber || '—'}
                              </span>
                              {guest.idNumberMasked && (
                                <IoEyeOffOutline size={14} className="text-on-surface-variant" title="Số đã được che theo QTN-24" />
                              )}
                              {!guest.idNumberMasked && guest.idNumber && (
                                <IoEyeOutline size={14} className="text-primary" title="Hiển thị đầy đủ" />
                              )}
                            </div>
                          </td>

                          <td className="p-4 text-sm text-on-surface">{guest.phone || '—'}</td>

                          <td className="p-4">
                            <div className="flex flex-col gap-1 items-start">
                              <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-sm font-semibold text-primary">
                                {guest.roomNumber ? `P. ${guest.roomNumber}` : 'Chưa gán'}
                              </span>
                              {guest.bookingStatus === 'CHECKED_OUT' && (
                                <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-700">
                                  Đã trả phòng
                                </span>
                              )}
                              {guest.bookingStatus === 'CHECKED_IN' && (
                                <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700">
                                  Đang lưu trú
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-4 text-sm text-on-surface-variant">
                            <div className="text-xs space-y-0.5">
                              <div>
                                <span className="text-on-surface-variant font-medium">Nhận:</span>{' '}
                                {guest.checkInDate || '—'}
                                {guest.checkedInAt && (
                                  <span className="text-on-surface-variant/70 ml-1">
                                    ({new Date(guest.checkedInAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})
                                  </span>
                                )}
                              </div>
                              <div>
                                <span className="text-on-surface-variant font-medium">Trả:</span> {guest.checkOutDate || '—'}
                              </div>
                            </div>
                          </td>

                          <td className="p-4 text-center">
                            <span className={`inline-block rounded-md px-2 py-1 text-xs font-semibold ${docCfg.cls}`}>
                              {docCfg.label}
                            </span>
                            {guest.missingRequirements?.length > 0 && (
                              <p className="mt-1 text-xs text-amber-700">
                                Thiếu: {guest.missingRequirements.join(', ')}
                              </p>
                            )}
                            {guest.documents?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                                {guest.documents.map((doc, i) => (
                                  <div key={doc.id || i} className="group relative inline-block">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPreviewModal({
                                          open: true,
                                          imageUrl: doc.url,
                                          title: DOC_TYPE_NAMES[doc.type] || doc.type || 'Giấy tờ tùy thân',
                                          guestName: guest.guestName,
                                        })
                                      }
                                      className="block focus:outline-none"
                                      title={`Nhấp để phóng to xem (${DOC_TYPE_NAMES[doc.type] || doc.type})`}
                                    >
                                      <img
                                        src={doc.url}
                                        alt={doc.type}
                                        className="h-8 w-12 object-cover rounded border border-border-grey group-hover:opacity-80 group-hover:border-primary transition-all cursor-pointer shadow-xs"
                                      />
                                    </button>
                                    {canComplete && !isCompleted && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleDeleteDocument(guest.guestId, doc.id, isCompleted);
                                        }}
                                        className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 hover:scale-110 transition-all z-10"
                                        title="Gỡ bỏ ảnh này"
                                      >
                                        <IoCloseOutline size={12} />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>

                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${declCfg.cls}`}>
                              <DeclIcon size={12} />
                              {declCfg.label}
                            </span>
                            {isCompleted && guest.declarationCompletedAt && (
                              <p className="mt-1 text-xs text-on-surface-variant">
                                {new Date(guest.declarationCompletedAt).toLocaleString('vi-VN', {
                                  hour: '2-digit', minute: '2-digit',
                                })}
                              </p>
                            )}
                          </td>

                          <td className="p-4 text-center">
                            {canComplete && !isCompleted && (
                              <div className="flex flex-col gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  icon={IoCheckmarkCircleOutline}
                                  isLoading={isCompleting}
                                  disabled={isCompleting}
                                  onClick={() => setConfirmModal({ open: true, guest })}
                                >
                                  Đánh dấu
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  icon={IoImageOutline}
                                  onClick={() => setUploadModal({ open: true, guest })}
                                >
                                  {guest.documents?.length > 0 ? 'Thêm ảnh' : 'Tải ảnh lên'}
                                </Button>
                              </div>
                            )}
                            {isCompleted && (
                              <span className="text-xs text-emerald-600 flex items-center justify-center gap-1 font-semibold">
                                <IoCheckmarkCircleOutline size={14} />
                                Hoàn tất
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal xác nhận hoàn tất khai báo */}
      <Modal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, guest: null })}
        title="Xác nhận hoàn tất khai báo lưu trú"
        maxWidth="max-w-md"
      >
        {confirmModal.guest && (
          <div className="space-y-4">
            <p className="text-body-md text-on-surface">
              Bạn xác nhận đã khai báo lưu trú thành công cho khách{' '}
              <strong>{confirmModal.guest.guestName}</strong>
              {confirmModal.guest.roomNumber && (
                <> (phòng <strong>{confirmModal.guest.roomNumber}</strong>)</>
              )}?
            </p>
            {confirmModal.guest.documentStatus === 'MISSING' && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <IoWarningOutline size={16} className="mr-1 inline" />
                Khách này vẫn còn thiếu giấy tờ. Bạn chắc chắn muốn đánh dấu hoàn tất?
              </div>
            )}
            <div className="flex justify-end gap-3 border-t border-border-grey pt-4">
              <Button variant="secondary" onClick={() => setConfirmModal({ open: false, guest: null })}>
                Hủy
              </Button>
              <Button
                icon={IoCheckmarkCircleOutline}
                onClick={() => handleComplete(confirmModal.guest)}
              >
                Xác nhận khai báo
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Tải ảnh giấy tờ */}
      <Modal
        isOpen={uploadModal.open}
        onClose={() => setUploadModal({ open: false, guest: null })}
        title="Tải ảnh giấy tờ tùy thân"
        maxWidth="max-w-md"
      >
        {uploadModal.guest && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-on-surface">Khách hàng</label>
              <input
                type="text"
                disabled
                value={uploadModal.guest.guestName}
                className="w-full rounded-md border border-border-grey bg-surface-container-low px-3 py-2 text-on-surface"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-on-surface">Loại giấy tờ</label>
              <select
                value={uploadData.documentType}
                onChange={(e) => setUploadData({ ...uploadData, documentType: e.target.value })}
                className="w-full rounded-md border border-border-grey bg-transparent px-3 py-2 text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="NATIONAL_ID_FRONT">CCCD/CMND (Mặt trước)</option>
                <option value="NATIONAL_ID_BACK">CCCD/CMND (Mặt sau)</option>
                <option value="PASSPORT">Hộ chiếu</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-on-surface">Số giấy tờ (tùy chọn)</label>
              <input
                type="text"
                placeholder="Nhập số giấy tờ nếu có"
                value={uploadData.documentNumber}
                onChange={(e) => setUploadData({ ...uploadData, documentNumber: e.target.value })}
                className="w-full rounded-md border border-border-grey bg-transparent px-3 py-2 text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-on-surface">Chọn ảnh</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setUploadData({ ...uploadData, file: e.target.files[0] })}
                className="w-full rounded-md border border-border-grey px-3 py-2 text-sm text-on-surface file:mr-4 file:rounded-md file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20"
              />
            </div>
            <div className="flex justify-end gap-3 border-t border-border-grey pt-4 mt-6">
              <Button variant="secondary" onClick={() => setUploadModal({ open: false, guest: null })}>
                Hủy
              </Button>
              <Button
                icon={IoCloudUploadOutline}
                isLoading={uploading}
                disabled={uploading || !uploadData.file}
                onClick={handleUploadDocument}
              >
                Tải lên
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Zoom Xem trước ảnh CCCD / Giấy tờ */}
      <Modal
        isOpen={previewModal.open}
        onClose={() => setPreviewModal({ open: false, imageUrl: '', title: '', guestName: '' })}
        title={`${previewModal.title}${previewModal.guestName ? ` — Khách: ${previewModal.guestName}` : ''}`}
        maxWidth="max-w-2xl"
      >
        <div className="flex flex-col items-center justify-center p-2 space-y-4">
          <div className="max-h-[70vh] overflow-hidden rounded-xl border border-border-grey bg-neutral-900/5 flex items-center justify-center w-full p-2">
            <img
              src={previewModal.imageUrl}
              alt={previewModal.title}
              className="max-h-[60vh] w-auto max-w-full object-contain rounded-lg shadow-md transition-transform hover:scale-105"
            />
          </div>
          <div className="flex w-full justify-between items-center text-xs text-on-surface-variant pt-2 border-t border-border-grey">
            <span className="font-medium">{previewModal.title}</span>
            <div className="flex items-center gap-3">
              <a
                href={previewModal.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline flex items-center gap-1 font-semibold"
              >
                <IoEyeOutline size={14} /> Mở ảnh gốc
              </a>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPreviewModal({ open: false, imageUrl: '', title: '', guestName: '' })}
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StayDeclarationPage;
