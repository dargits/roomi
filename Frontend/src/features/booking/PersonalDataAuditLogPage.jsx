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
} from 'react-icons/io5';
import auditLogApi from '../../services/auditLogApi';
import { useToast } from '../../context/ToastContext';

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
  OWNER: 'Chủ cơ sở',
  RECEPTIONIST: 'Lễ tân',
  ACCOUNTANT: 'Kế toán',
  HOUSEKEEPER: 'Nhân viên buồng phòng',
  ADMIN: 'Quản trị viên',
};

// ─── Component chính ─────────────────────────────────────────────────────────

const PersonalDataAuditLogPage = () => {
  const { error: toastError } = useToast();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ from: '', to: '' });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const result = await auditLogApi.getPersonalDataLogs(params);
      setLogs(result);
    } catch (err) {
      toastError(err.response?.data?.message || 'Không thể tải nhật ký dữ liệu cá nhân.');
    } finally {
      setLoading(false);
    }
  }, [filters, toastError]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLogs();
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
            onClick={fetchLogs}
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
          <div className="flex items-center justify-center py-16 text-on-surface-variant">
            <IoRefreshOutline className="mr-2 animate-spin" size={20} />
            <span>Đang tải nhật ký...</span>
          </div>
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
                  const actionCfg = ACTION_CONFIG[log.action] || {
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
                          {ROLE_LABELS[log.actorRole] || log.actorRole}
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
            <div className="border-t border-border-grey px-4 py-3 text-sm text-on-surface-variant">
              Tổng: <strong>{logs.length}</strong> bản ghi
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalDataAuditLogPage;
