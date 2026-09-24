import React, { useState, useEffect, useCallback } from 'react';
import {
  IoShieldCheckmarkOutline,
  IoFilterOutline,
  IoRefreshOutline,
  IoSearchOutline,
  IoAlertCircleOutline,
  IoDocumentTextOutline,
  IoTrashOutline,
  IoEyeOutline,
  IoCloseCircleOutline,
  IoChevronBackOutline,
  IoChevronForwardOutline,
} from 'react-icons/io5';
import auditLogApi from '../../services/auditLogApi';
import { useToast } from '../../context/ToastContext';
import LoadingScreen from '../../components/common/LoadingScreen';

// ─── Cấu hình action labels & icons ─────────────────────────────────────────

const ACTION_CONFIG = {
  EXPORT_STAY_DECLARATION: {
    label: 'Kết xuất danh sách khai báo',
    cls: 'bg-blue-100 text-blue-800',
    icon: IoDocumentTextOutline,
  },
  DELETE_PERSONAL_DATA: {
    label: 'Xóa dữ liệu cá nhân',
    cls: 'bg-red-100 text-red-800',
    icon: IoTrashOutline,
  },
  VIEW_GUEST_DETAIL: {
    label: 'Xem hồ sơ khách',
    cls: 'bg-surface-container text-on-surface-variant',
    icon: IoEyeOutline,
  },
  COMPLETE_DECLARATION: {
    label: 'Hoàn tất khai báo',
    cls: 'bg-emerald-100 text-emerald-800',
    icon: IoShieldCheckmarkOutline,
  },
};

const ROLE_LABELS = {
  OWNER: 'Chủ sở hữu',
  RECEPTIONIST: 'Lễ tân',
  ACCOUNTANT: 'Kế toán',
  HOUSEKEEPER: 'Buồng phòng',
  ADMIN: 'Quản trị viên',
};

// ─── Component chính ─────────────────────────────────────────────────────────

const PersonalDataAuditLogPage: React.FC = () => {
  const { error: toastError } = useToast();

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const fetchLogs = useCallback(async (targetPage = page, targetSize = size) => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: targetPage, size: targetSize };
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const result = await auditLogApi.getPersonalDataLogs(params);
      if (result && 'content' in result) {
        setLogs(result.content);
        setTotalPages(result.totalPages);
        setTotalElements(result.totalElements);
        setPage(result.number);
      } else {
        const arr = Array.isArray(result) ? result : [];
        setLogs(arr);
        setTotalPages(1);
        setTotalElements(arr.length);
        setPage(0);
      }
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Không thể tải nhật ký dữ liệu cá nhân.');
    } finally {
      setLoading(false);
    }
  }, [filters, page, size, toastError]);

  useEffect(() => {
    fetchLogs(0, size);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(0, size);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-headline-md font-bold text-on-surface flex items-center gap-2">
            <IoShieldCheckmarkOutline className="text-primary" size={28} />
            Nhật ký truy cập dữ liệu cá nhân
          </h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Ghi lại mọi hành động liên quan đến dữ liệu cá nhân của khách — tuân thủ QTN-24 và Luật số 91/2025
          </p>
        </div>
      </div>

      {/* Cảnh báo pháp lý */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <IoAlertCircleOutline size={20} className="mt-0.5 flex-shrink-0 text-primary" />
        <p className="text-sm text-primary">
          Nhật ký này theo dõi: <strong>kết xuất danh sách khai báo</strong>,{' '}
          <strong>xóa dữ liệu cá nhân</strong> và <strong>hoàn tất khai báo</strong>.
          Chỉ <strong>Chủ cơ sở</strong> và <strong>Quản trị viên</strong> mới được xem.
        </p>
      </div>

      {/* Bộ lọc */}
      <form onSubmit={handleSearch}>
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border-grey bg-surface-container-lowest p-4">
          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface-variant">Từ ngày</label>
            <input
              id="audit-from-date"
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
              className="rounded-md border border-border-grey bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface-variant">Đến ngày</label>
            <input
              id="audit-to-date"
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
              className="rounded-md border border-border-grey bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2">
            <button
              id="audit-search-btn"
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-md border border-border-grey bg-surface px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low disabled:opacity-50"
            >
              <IoSearchOutline size={16} />
              Tìm kiếm
            </button>
            <button
              id="audit-clear-btn"
              type="button"
              onClick={() => { setFilters({ from: '', to: '' }); }}
              className="flex items-center gap-2 rounded-md border border-border-grey bg-surface px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low"
            >
              <IoCloseCircleOutline size={16} />
              Xóa lọc
            </button>
          </div>
          <button
            id="audit-refresh-btn"
            type="button"
            onClick={() => fetchLogs(0, size)}
            disabled={loading}
            className="flex items-center gap-2 rounded-md border border-border-grey bg-surface px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50"
          >
            <IoRefreshOutline size={16} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>
      </form>

      {/* Bảng nhật ký */}
      <div className="rounded-lg border border-border-grey bg-surface-container-lowest">
        {loading ? (
          <LoadingScreen message="Đang tải nhật ký truy cập dữ liệu cá nhân..." />
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
            <IoShieldCheckmarkOutline size={40} className="mb-3 text-on-surface-variant/40" />
            <p className="font-medium">Không có nhật ký nào trong khoảng thời gian đã chọn</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-border-grey bg-surface-container-low text-xs font-semibold uppercase text-on-surface-variant">
                  <th className="p-4">Thời gian</th>
                  <th className="p-4">Người thực hiện</th>
                  <th className="p-4">Vai trò</th>
                  <th className="p-4 text-center">Hành động</th>
                  <th className="p-4">Đối tượng</th>
                  <th className="p-4">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const actionCfg = (ACTION_CONFIG as Record<string, any>)[log.action] || {
                    label: log.action,
                    cls: 'bg-surface-container text-on-surface-variant',
                    icon: IoFilterOutline,
                  };
                  const ActionIcon = actionCfg.icon;

                  return (
                    <tr
                      key={log.id}
                      className={`border-b border-border-grey transition-colors hover:bg-surface-container-low/50
                        ${log.action === 'DELETE_PERSONAL_DATA' ? 'bg-red-50/30' : ''}`}
                    >
                      <td className="p-4 text-sm text-on-surface-variant whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('vi-VN', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit', second: '2-digit',
                        })}
                      </td>

                      <td className="p-4">
                        <span className="font-semibold text-on-surface">{log.actor}</span>
                      </td>

                      <td className="p-4">
                        <span className="text-sm text-on-surface-variant">
                          {(ROLE_LABELS as Record<string, string>)[log.actorRole] || log.actorRole}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${actionCfg.cls}`}>
                          <ActionIcon size={12} />
                          {actionCfg.label}
                        </span>
                      </td>

                      <td className="p-4 text-sm text-on-surface-variant">
                        {log.entityName}
                        {log.entityId ? ` #${log.entityId}` : ''}
                      </td>

                      <td className="p-4 max-w-xs">
                        <p className="truncate text-sm text-on-surface-variant" title={log.detail}>
                          {log.detail || '—'}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!loading && totalElements > 0 && (
              <div className="px-4 py-3 border-t border-border-grey bg-surface-container-lowest flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-variant">
                <div>
                  Hiển thị <strong>{page * size + 1}</strong> - <strong>{Math.min((page + 1) * size, totalElements)}</strong> trong tổng số <strong>{totalElements.toLocaleString()}</strong> bản ghi
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span>Hiển thị:</span>
                    <select
                      value={size}
                      onChange={(e) => {
                        const newSize = Number(e.target.value);
                        setSize(newSize);
                        fetchLogs(0, newSize);
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
                      onClick={() => fetchLogs(Math.max(0, page - 1), size)}
                      className="p-1.5 rounded-md border border-border-grey disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container-low text-on-surface transition-colors"
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
                      onClick={() => fetchLogs(page + 1, size)}
                      className="p-1.5 rounded-md border border-border-grey disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container-low text-on-surface transition-colors"
                      title="Trang sau"
                    >
                      <IoChevronForwardOutline size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalDataAuditLogPage;
