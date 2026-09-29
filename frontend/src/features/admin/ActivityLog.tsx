import React, { useState, useEffect } from 'react';
import { 
  IoCalendarOutline, IoPersonOutline, IoRefreshOutline, IoSearchOutline, 
  IoServerOutline, IoShieldOutline, IoChevronBackOutline, IoChevronForwardOutline 
} from 'react-icons/io5';
import auditLogApi from '../../services/auditLogApi';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import { AuditLogResponse } from '../../types';

const ENTITY_OPTIONS = [
  { value: '', label: 'Tất cả đối tượng' },
  { value: 'Booking', label: 'Đặt phòng' },
  { value: 'Room', label: 'Phòng' },
  { value: 'Guest', label: 'Khách hàng' },
  { value: 'Invoice', label: 'Hóa đơn' },
  { value: 'User', label: 'Tài khoản' },
  { value: 'RoomType', label: 'Loại phòng' },
  { value: 'ExtraService', label: 'Dịch vụ' },
  { value: 'SystemBackup', label: 'Sao lưu hệ thống' },
  { value: 'CorporateClient', label: 'Khách hàng B2B' },
  { value: 'GroupBooking', label: 'Đoàn khách' },
  { value: 'HotelSetting', label: 'Cài đặt hệ thống' }
];

const ENTITY_LABELS: Record<string, string> = {
  Booking: 'Đặt phòng',
  Room: 'Phòng',
  Guest: 'Khách hàng',
  Invoice: 'Hóa đơn',
  User: 'Tài khoản',
  RoomType: 'Loại phòng',
  ExtraService: 'Dịch vụ',
  SystemBackup: 'Sao lưu CSDL',
  HotelSetting: 'Cấu hình hệ thống',
  CorporateClient: 'Khách B2B',
  GroupBooking: 'Đoàn khách',
  InvoiceDiscount: 'Chiết khấu',
  NegotiatedPriceAgreement: 'Hợp đồng giá B2B',
  BookingRequest: 'Yêu cầu đặt phòng'
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Chủ cơ sở',
  ADMIN: 'Quản trị viên',
  RECEPTIONIST: 'Lễ tân',
  ACCOUNTANT: 'Kế toán',
  HOUSEKEEPER: 'Buồng phòng'
};

const ACTION_MAP: Record<string, { label: string; colorClass: string }> = {
  // Authentication & Security
  REQUEST_PASSWORD_RESET: { label: 'Yêu cầu đặt lại MK', colorClass: 'bg-amber-50 text-amber-800 border border-amber-300' },
  RESET_PASSWORD: { label: 'Đặt lại mật khẩu', colorClass: 'bg-purple-50 text-purple-800 border border-purple-300' },
  CHANGE_PASSWORD: { label: 'Đổi mật khẩu', colorClass: 'bg-purple-50 text-purple-800 border border-purple-300' },
  FORCE_PASSWORD_CHANGE: { label: 'Bắt buộc đổi MK', colorClass: 'bg-orange-50 text-orange-800 border border-orange-300' },
  LOGIN: { label: 'Đăng nhập', colorClass: 'bg-indigo-50 text-indigo-800 border border-indigo-300' },
  LOGOUT: { label: 'Đăng xuất', colorClass: 'bg-slate-100 text-slate-700 border border-slate-300' },
  SESSION_REVOKED: { label: 'Thu hồi phiên', colorClass: 'bg-rose-50 text-rose-800 border border-rose-300' },

  // Backup & Restore
  CREATE_BACKUP: { label: 'Tạo bản sao lưu', colorClass: 'bg-emerald-50 text-emerald-800 border border-emerald-300' },
  DELETE_BACKUP: { label: 'Xóa bản sao lưu', colorClass: 'bg-rose-50 text-rose-800 border border-rose-300' },
  RESTORE_DATABASE: { label: 'Khôi phục CSDL', colorClass: 'bg-red-50 text-red-800 border border-red-300' },
  INSTANT_DOWNLOAD: { label: 'Tải bản sao lưu', colorClass: 'bg-blue-50 text-blue-800 border border-blue-300' },
  UPDATE_BACKUP_CONFIG: { label: 'Cập nhật cấu hình sao lưu', colorClass: 'bg-sky-50 text-sky-800 border border-sky-300' },

  // Debt Management
  REQUEST_DEBT_CHECKOUT: { label: 'Yêu cầu trả phòng nợ', colorClass: 'bg-amber-50 text-amber-800 border border-amber-300' },
  APPROVE_DEBT_CHECKOUT: { label: 'Duyệt trả phòng nợ', colorClass: 'bg-emerald-50 text-emerald-800 border border-emerald-300' },
  REJECT_DEBT_CHECKOUT: { label: 'Từ chối trả phòng nợ', colorClass: 'bg-rose-50 text-rose-800 border border-rose-300' },
  SEND_ACKNOWLEDGEMENT_EMAIL: { label: 'Gửi email biên nhận nợ', colorClass: 'bg-sky-50 text-sky-800 border border-sky-300' },
  COLLECT_DEBT: { label: 'Thu hồi công nợ', colorClass: 'bg-emerald-50 text-emerald-800 border border-emerald-300' },

  // Housekeeping & Cleaning
  START_CLEANING: { label: 'Bắt đầu dọn phòng', colorClass: 'bg-blue-50 text-blue-800 border border-blue-300' },
  FINISH_CLEANING: { label: 'Dọn phòng hoàn tất', colorClass: 'bg-teal-50 text-teal-800 border border-teal-300' },
  SUBMIT_INSPECTION: { label: 'Gửi duyệt buồng phòng', colorClass: 'bg-violet-50 text-violet-800 border border-violet-300' },
  MARK_CLEAN: { label: 'Nghiệm thu đạt (Sạch)', colorClass: 'bg-emerald-50 text-emerald-800 border border-emerald-300' },
  MARK_INSPECTED: { label: 'Đã nghiệm thu', colorClass: 'bg-emerald-50 text-emerald-800 border border-emerald-300' },
  REJECT_CLEANING: { label: 'Yêu cầu dọn lại', colorClass: 'bg-amber-50 text-amber-800 border border-amber-300' },
  ASSIGN_HOUSEKEEPER: { label: 'Chỉ định người dọn', colorClass: 'bg-indigo-50 text-indigo-800 border border-indigo-300' },

  // Cashier & Daily Shift
  SHIFT_OPENED: { label: 'Mở ca làm việc', colorClass: 'bg-emerald-50 text-emerald-800 border border-emerald-300' },
  SHIFT_CLOSED: { label: 'Đóng ca làm việc', colorClass: 'bg-slate-100 text-slate-800 border border-slate-300' },
  SHIFT_REOPENED: { label: 'Mở lại ca làm việc', colorClass: 'bg-amber-50 text-amber-800 border border-amber-300' },
  DAILY_LEDGER_CLOSED: { label: 'Khóa sổ quỹ ngày', colorClass: 'bg-indigo-50 text-indigo-800 border border-indigo-300' },
  DAILY_LEDGER_REOPENED: { label: 'Mở lại sổ quỹ ngày', colorClass: 'bg-amber-50 text-amber-800 border border-amber-300' },

  // Booking & Check-in / Check-out
  CREATE: { label: 'Tạo mới', colorClass: 'bg-emerald-50 text-emerald-800 border border-emerald-300' },
  UPDATE: { label: 'Cập nhật', colorClass: 'bg-blue-50 text-blue-800 border border-blue-300' },
  DELETE: { label: 'Xóa', colorClass: 'bg-rose-50 text-rose-800 border border-rose-300' },
  CONFIRM: { label: 'Xác nhận đặt phòng', colorClass: 'bg-teal-50 text-teal-800 border border-teal-300' },
  CHECK_IN: { label: 'Nhận phòng (Check-in)', colorClass: 'bg-blue-50 text-blue-800 border border-blue-300' },
  CHECK_OUT: { label: 'Trả phòng (Check-out)', colorClass: 'bg-purple-50 text-purple-800 border border-purple-300' },
  BULK_CHECK_IN: { label: 'Check-in hàng loạt', colorClass: 'bg-blue-50 text-blue-800 border border-blue-300' },
  BULK_CHECK_OUT: { label: 'Check-out hàng loạt', colorClass: 'bg-purple-50 text-purple-800 border border-purple-300' },
  CANCEL: { label: 'Hủy đặt phòng', colorClass: 'bg-rose-50 text-rose-800 border border-rose-300' },
  NO_SHOW: { label: 'Khách không đến', colorClass: 'bg-slate-100 text-slate-700 border border-slate-300' },
  ASSIGN_ROOM: { label: 'Xếp phòng', colorClass: 'bg-indigo-50 text-indigo-800 border border-indigo-300' },
  ASSIGN_ROOMS: { label: 'Xếp phòng đoàn', colorClass: 'bg-indigo-50 text-indigo-800 border border-indigo-300' },
  CHANGE_ROOM: { label: 'Đổi phòng', colorClass: 'bg-amber-50 text-amber-800 border border-amber-300' },
  UPGRADE_ROOM: { label: 'Nâng hạng phòng', colorClass: 'bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-300' },
  EXTEND_STAY: { label: 'Gia hạn lưu trú', colorClass: 'bg-sky-50 text-sky-800 border border-sky-300' },
  RESCHEDULE: { label: 'Đổi ngày lưu trú', colorClass: 'bg-cyan-50 text-cyan-800 border border-cyan-300' },
  EARLY_CHECKOUT: { label: 'Trả phòng sớm', colorClass: 'bg-violet-50 text-violet-800 border border-violet-300' },
  IMPORT_LEGACY: { label: 'Nhập dữ liệu cũ', colorClass: 'bg-slate-100 text-slate-700 border border-slate-300' },
  SEND_CHECKIN_REMINDER: { label: 'Nhắc check-in tự động', colorClass: 'bg-sky-50 text-sky-800 border border-sky-300' },
  SEND_CHECKIN_REMINDER_MANUAL: { label: 'Gửi nhắc check-in', colorClass: 'bg-sky-50 text-sky-800 border border-sky-300' },
  SEND_CONFIRMATION: { label: 'Gửi email xác nhận', colorClass: 'bg-teal-50 text-teal-800 border border-teal-300' },

  // Services & Invoices
  ADD_SERVICE: { label: 'Thêm dịch vụ', colorClass: 'bg-emerald-50 text-emerald-800 border border-emerald-300' },
  REMOVE_SERVICE: { label: 'Hủy dịch vụ', colorClass: 'bg-rose-50 text-rose-800 border border-rose-300' },
  DEDUCT_FOR_SERVICE: { label: 'Xuất kho dịch vụ', colorClass: 'bg-amber-50 text-amber-800 border border-amber-300' },
  RESTORE_FOR_SERVICE: { label: 'Hoàn kho dịch vụ', colorClass: 'bg-teal-50 text-teal-800 border border-teal-300' },
  APPLY_DISCOUNT: { label: 'Áp dụng giảm giá', colorClass: 'bg-blue-50 text-blue-800 border border-blue-300' },
  REMOVE_DISCOUNT: { label: 'Hủy giảm giá', colorClass: 'bg-rose-50 text-rose-800 border border-rose-300' },
  APPROVE_DISCOUNT: { label: 'Duyệt giảm giá', colorClass: 'bg-emerald-50 text-emerald-800 border border-emerald-300' },
  REJECT_DISCOUNT: { label: 'Từ chối giảm giá', colorClass: 'bg-rose-50 text-rose-800 border border-rose-300' },
  COLLECT_DEPOSIT: { label: 'Thu tiền cọc', colorClass: 'bg-emerald-50 text-emerald-800 border border-emerald-300' },
  REFUND_DEPOSIT: { label: 'Hoàn tiền cọc', colorClass: 'bg-amber-50 text-amber-800 border border-amber-300' },
  FORFEIT_DEPOSIT: { label: 'Tịch thu tiền cọc', colorClass: 'bg-rose-50 text-rose-800 border border-rose-300' },
  CANCEL_PARTIAL_ROOMS: { label: 'Hủy bớt phòng đoàn', colorClass: 'bg-rose-50 text-rose-800 border border-rose-300' },
  CREATE_INVOICES: { label: 'Tạo hóa đơn đoàn', colorClass: 'bg-emerald-50 text-emerald-800 border border-emerald-300' },
  CANCEL_DRAFT: { label: 'Hủy hóa đơn nháp', colorClass: 'bg-slate-100 text-slate-700 border border-slate-300' },
  ADJUST: { label: 'Điều chỉnh hóa đơn', colorClass: 'bg-amber-50 text-amber-800 border border-amber-300' },

  // Privacy & Declaration
  EXPORT_STAY_DECLARATION: { label: 'Xuất khai báo tạm trú', colorClass: 'bg-blue-50 text-blue-800 border border-blue-300' },
  DELETE_PERSONAL_DATA: { label: 'Xóa dữ liệu cá nhân', colorClass: 'bg-rose-50 text-rose-800 border border-rose-300' },
  VIEW_GUEST_DETAIL: { label: 'Xem chi tiết khách', colorClass: 'bg-slate-100 text-slate-700 border border-slate-300' },
  COMPLETE_DECLARATION: { label: 'Hoàn tất khai báo', colorClass: 'bg-emerald-50 text-emerald-800 border border-emerald-300' },
  VIEW_PUBLIC_INVOICE: { label: 'Xem hóa đơn online', colorClass: 'bg-sky-50 text-sky-800 border border-sky-300' },

  // B2B & Policies
  DEACTIVATE: { label: 'Ngừng kích hoạt', colorClass: 'bg-slate-100 text-slate-700 border border-slate-300' }
};

const getActionDisplay = (action?: string): { label: string; colorClass: string } => {
  if (!action) return { label: '—', colorClass: 'bg-slate-100 text-slate-600 border border-slate-200' };
  const upper = action.toUpperCase();
  if (ACTION_MAP[upper]) {
    return ACTION_MAP[upper];
  }
  let color = 'bg-slate-100 text-slate-700 border border-slate-300';
  if (upper.includes('CREATE') || upper.includes('ADD') || upper.includes('APPROVE')) color = 'bg-emerald-50 text-emerald-800 border border-emerald-300';
  else if (upper.includes('UPDATE') || upper.includes('EDIT')) color = 'bg-blue-50 text-blue-800 border border-blue-300';
  else if (upper.includes('DELETE') || upper.includes('REJECT') || upper.includes('CANCEL')) color = 'bg-rose-50 text-rose-800 border border-rose-300';
  else if (upper.includes('LOCK') || upper.includes('RESET') || upper.includes('REQUEST')) color = 'bg-amber-50 text-amber-800 border border-amber-300';

  const label = upper
    .split('_')
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');

  return { label, colorClass: color };
};

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('vi-VN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
};

/**
 * Lịch sử hoạt động hệ thống — OWNER / ADMIN
 */
const ActivityLog: React.FC = () => {
  const { user } = useAuth();

  const today = new Date().toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [filters, setFilters] = useState({
    entity: '',
    actorId: '',
    from: monthAgo,
    to: today
  });
  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Pagination states
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const hasAccess = ['OWNER', 'ADMIN'].includes(user?.role || '');

  if (!hasAccess) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-error rounded-lg font-body-md">
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  const handleSearch = async (targetPage = 0, targetSize = size) => {
    setError(null);
    setLoading(true);
    setHasSearched(true);
    setPage(targetPage);
    try {
      const params: any = { page: targetPage, size: targetSize };
      if (filters.entity) params.entity = filters.entity;
      if (filters.actorId) params.actorId = filters.actorId;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;

      const data: any = await auditLogApi.getLogs(params);
      if (data && data.content) {
        setLogs(data.content);
        setTotalPages(data.totalPages || 0);
        setTotalElements(data.totalElements || 0);
      } else {
        const arr = Array.isArray(data) ? data : data?.data || [];
        setLogs(arr);
        setTotalPages(Math.ceil(arr.length / targetSize) || 1);
        setTotalElements(arr.length);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tải lịch sử hoạt động.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Tự động load trang đầu tiên
    handleSearch(0, size);
  }, []);

  const handleFilterChange = (key: string, val: string) => {
    setFilters(prev => ({ ...prev, [key]: val }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={IoServerOutline}
        title="Lịch Sử Hoạt Động Hệ Thống"
        subtitle="Theo dõi và kiểm toán toàn bộ thao tác của nhân viên và người dùng"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSearch(page, size)}
            disabled={loading}
            className="flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all"
          >
            <IoRefreshOutline size={15} className={loading ? 'animate-spin text-primary' : ''} />
            <span>Làm mới</span>
          </Button>
        }
      />

      {/* Filter */}
      <div className="bg-surface-container-lowest border border-border-grey rounded-2xl p-5 shadow-2xs">
        <h3 className="font-title-lg text-on-surface mb-4 font-bold text-sm">Điều kiện lọc</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block font-label-md text-on-surface-variant mb-1.5 text-xs font-semibold">Đối tượng</label>
            <select
              value={filters.entity}
              onChange={(e) => handleFilterChange('entity', e.target.value)}
              className="w-full px-3 py-2 border border-border-grey rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body-md text-on-surface bg-white text-xs"
            >
              {ENTITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <Input
            label="ID người thực hiện"
            type="number"
            value={filters.actorId}
            onChange={(e) => handleFilterChange('actorId', e.target.value)}
            placeholder="Ví dụ: 1"
          />
          <Input
            label="Từ ngày"
            type="date"
            value={filters.from}
            onChange={(e) => handleFilterChange('from', e.target.value)}
          />
          <Input
            label="Đến ngày"
            type="date"
            value={filters.to}
            onChange={(e) => handleFilterChange('to', e.target.value)}
          />
        </div>
        <div className="mt-4 flex gap-3">
          <Button onClick={() => handleSearch(0, size)} isLoading={loading} icon={IoSearchOutline} size="sm">
            Tìm kiếm
          </Button>
          <button
            onClick={() => {
              setFilters({ entity: '', actorId: '', from: monthAgo, to: today });
              setLogs([]);
              setHasSearched(false);
            }}
            className="px-4 py-1.5 rounded-xl border border-border-grey text-on-surface-variant hover:bg-surface-container-low transition-colors font-body-md text-xs font-semibold cursor-pointer shadow-2xs"
          >
            Đặt lại
          </button>
        </div>
      </div>

      {/* Kết quả */}
      {hasSearched && (
        <div className="bg-surface-container-lowest border border-border-grey rounded-2xl overflow-hidden shadow-2xs">
          {loading ? (
            <div className="py-16 text-center text-on-surface-variant">
              <LoadingScreen />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-error font-body-md">
              <p>{error}</p>
              <button
                onClick={() => handleSearch(page, size)}
                className="mt-3 text-primary text-xs underline cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-on-surface-variant font-body-md">
              <IoServerOutline size={40} className="mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-slate-700">Không có hoạt động nào trong khoảng thời gian này.</p>
              <p className="text-xs text-slate-400 mt-1">Thử điều chỉnh lại bộ lọc đối tượng hoặc ngày tìm kiếm.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-border-grey text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 min-w-[150px]">Thời gian</th>
                    <th className="py-3.5 px-4 min-w-[160px]">Người thực hiện</th>
                    <th className="py-3.5 px-4 min-w-[170px]">Hành động</th>
                    <th className="py-3.5 px-4 min-w-[130px]">Đối tượng</th>
                    <th className="py-3.5 px-4 min-w-[240px]">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-grey text-xs">
                  {logs.map((log: any, idx) => {
                    const actionInfo = getActionDisplay(log.action || log.actionType);
                    const roleName = ROLE_LABELS[log.actorRole] || log.actorRole;
                    const entityName = ENTITY_LABELS[log.entity || log.entityType] || log.entity || log.entityType;

                    return (
                      <tr key={log.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        {/* Thời gian */}
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-medium">
                            <IoCalendarOutline size={13} className="text-slate-400 shrink-0" />
                            <span>{formatDateTime(log.createdAt || log.timestamp || log.actionTime)}</span>
                          </div>
                        </td>

                        {/* Người thực hiện */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <IoPersonOutline size={14} />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-xs">
                                {log.actorName || log.userName || `#${log.actorId}`}
                              </p>
                              {roleName && (
                                <p className="text-[11px] text-slate-500 font-medium">{roleName}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Hành động (Tiếng Việt) */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shadow-2xs ${actionInfo.colorClass}`}>
                            {actionInfo.label}
                          </span>
                        </td>

                        {/* Đối tượng */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-slate-800 text-xs">{entityName || 'Hệ thống'}</span>
                            {log.entityId && (
                              <span className="text-[11px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                                #{log.entityId}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Chi tiết */}
                        <td className="py-3.5 px-4 text-slate-600 max-w-sm">
                          <p className="truncate text-xs font-normal" title={log.description || log.detail || log.message || ''}>
                            {log.description || log.detail || log.message || '—'}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Phân trang */}
            {!loading && totalElements > 0 && (
              <div className="px-4 py-3 border-t border-border-grey bg-surface-container-lowest flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-variant">
                <div>
                  Hiển thị <strong>{page * size + 1}</strong> - <strong>{Math.min((page + 1) * size, totalElements)}</strong> trong tổng số <strong>{totalElements.toLocaleString()}</strong> hoạt động
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span>Hiển thị:</span>
                    <select
                      value={size}
                      onChange={(e) => {
                        const newSize = Number(e.target.value);
                        setSize(newSize);
                        handleSearch(0, newSize);
                      }}
                      className="px-2 py-1 border border-border-grey rounded-md bg-white text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                    >
                      <option value={10}>10 / trang</option>
                      <option value={20}>20 / trang</option>
                      <option value={50}>50 / trang</option>
                      <option value={100}>100 / trang</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={page === 0}
                      onClick={() => handleSearch(Math.max(0, page - 1), size)}
                      className="p-1.5 rounded-md border border-border-grey disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container-low text-on-surface transition-colors cursor-pointer"
                      title="Trang trước"
                    >
                      <IoChevronBackOutline size={14} />
                    </button>
                    <span className="px-3 py-1 font-semibold text-on-surface">
                      Trang {page + 1} / {totalPages || 1}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages - 1}
                      onClick={() => handleSearch(page + 1, size)}
                      className="p-1.5 rounded-md border border-border-grey disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container-low text-on-surface transition-colors cursor-pointer"
                      title="Trang sau"
                    >
                      <IoChevronForwardOutline size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
            </>
          )}
        </div>
      )}

      {!hasSearched && (
        <div className="py-16 text-center border border-dashed border-border-grey rounded-2xl bg-surface-container-lowest">
          <IoShieldOutline size={40} className="text-on-surface-variant/30 mx-auto mb-3" />
          <p className="font-body-md text-on-surface-variant text-sm">Nhấn "Tìm kiếm" để xem lịch sử hoạt động.</p>
        </div>
      )}
    </div>
  );
};

export default ActivityLog;
