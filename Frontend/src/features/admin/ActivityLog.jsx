import React, { useState, useEffect } from 'react';
import { IoCalendarOutline, IoPersonOutline, IoRefreshOutline, IoSearchOutline, IoServerOutline, IoShieldOutline } from 'react-icons/io5';
import auditLogApi from '../../services/auditLogApi';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';

const ENTITY_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'Booking', label: 'Đặt phòng' },
  { value: 'Room', label: 'Phòng' },
  { value: 'Guest', label: 'Khách hàng' },
  { value: 'Invoice', label: 'Hóa đơn' },
  { value: 'User', label: 'Tài khoản' },
  { value: 'RoomType', label: 'Loại phòng' },
  { value: 'ExtraService', label: 'Dịch vụ' }
];

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('vi-VN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
};

const getActionColor = (action) => {
  if (!action) return 'bg-gray-100 text-gray-700';
  const a = action.toUpperCase();
  if (a.includes('CREATE') || a.includes('REGISTER')) return 'bg-green-100 text-green-800';
  if (a.includes('UPDATE') || a.includes('EDIT')) return 'bg-blue-100 text-blue-800';
  if (a.includes('DELETE')) return 'bg-red-100 text-red-800';
  if (a.includes('LOCK') || a.includes('CANCEL')) return 'bg-orange-100 text-orange-800';
  if (a.includes('LOGIN')) return 'bg-purple-100 text-purple-800';
  return 'bg-gray-100 text-gray-700';
};

/**
 * Lịch sử hoạt động hệ thống — OWNER / ADMIN
 */
const ActivityLog = () => {
  const { user } = useAuth();

  const today = new Date().toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [filters, setFilters] = useState({
    entity: '',
    actorId: '',
    from: monthAgo,
    to: today
  });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const hasAccess = ['OWNER', 'ADMIN'].includes(user?.role);

  if (!hasAccess) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-error rounded-lg font-body-md">
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  const handleSearch = async () => {
    setError(null);
    setLoading(true);
    setHasSearched(true);
    try {
      const params = {};
      if (filters.entity) params.entity = filters.entity;
      if (filters.actorId) params.actorId = filters.actorId;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;

      const data = await auditLogApi.getLogs(params);
      setLogs(Array.isArray(data) ? data : data?.content || data?.data || []);
    } catch (err) {
      setError('Không thể tải lịch sử hoạt động.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        icon={IoShieldOutline}
        title="Lịch sử Hoạt động"
        subtitle="Theo dõi toàn bộ thao tác trong hệ thống"
      />

      {/* Filter */}
      <div className="bg-surface-container-lowest border border-border-grey rounded-lg p-5">
        <h3 className="font-title-lg text-on-surface mb-4">Điều kiện lọc</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block font-label-md text-on-surface-variant mb-1.5">Đối tượng</label>
            <select
              value={filters.entity}
              onChange={(e) => handleFilterChange('entity', e.target.value)}
              className="w-full px-3 py-2 border border-border-grey rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-body-md text-on-surface bg-white"
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
          <Button onClick={handleSearch} isLoading={loading} icon={IoSearchOutline}>
            Tìm kiếm
          </Button>
          <button
            onClick={() => {
              setFilters({ entity: '', actorId: '', from: monthAgo, to: today });
              setLogs([]);
              setHasSearched(false);
            }}
            className="px-4 py-2 rounded border border-border-grey text-on-surface-variant hover:bg-surface-container-low transition-colors font-body-md text-sm"
          >
            Đặt lại
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-error">{error}</p>}
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-12 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
          <p className="font-body-md text-on-surface-variant">Đang tải dữ liệu...</p>
        </div>
      )}

      {/* Results */}
      {!loading && hasSearched && (
        <div className="bg-surface-container-lowest border border-border-grey rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border-grey flex items-center justify-between">
            <h3 className="font-title-lg text-on-surface">Kết quả</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-on-surface-variant">{logs.length} bản ghi</span>
              <button
                onClick={handleSearch}
                className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                <IoRefreshOutline size={13} /> Làm mới
              </button>
            </div>
          </div>

          {logs.length === 0 ? (
            <div className="py-12 text-center">
              <IoServerOutline size={40} className="text-on-surface-variant/30 mx-auto mb-3" />
              <p className="font-body-md text-on-surface-variant">Không tìm thấy bản ghi nào trong khoảng thời gian này.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low border-b border-border-grey">
                    <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">Thời gian</th>
                    <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">Người thực hiện</th>
                    <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">Hành động</th>
                    <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">Đối tượng</th>
                    <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => (
                    <tr key={log.id || idx} className="border-b border-border-grey hover:bg-surface-container-low transition-colors">
                      <td className="p-4 font-body-md text-on-surface-variant whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <IoCalendarOutline size={13} />
                          {formatDateTime(log.createdAt || log.timestamp || log.actionTime)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 font-body-md text-on-surface">
                          <IoPersonOutline size={13} className="text-on-surface-variant" />
                          <div>
                            <p>{log.actorName || log.userName || `#${log.actorId}`}</p>
                            {log.actorRole && (
                              <p className="text-xs text-on-surface-variant">{log.actorRole}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${getActionColor(log.action || log.actionType)}`}>
                          {log.action || log.actionType || 'ACTION'}
                        </span>
                      </td>
                      <td className="p-4 font-body-md text-on-surface">
                        <span className="font-medium">{log.entity || log.entityType}</span>
                        {log.entityId && (
                          <span className="text-on-surface-variant ml-1">#{log.entityId}</span>
                        )}
                      </td>
                      <td className="p-4 font-body-md text-on-surface-variant max-w-xs">
                        <p className="truncate" title={log.description || log.detail || log.message || ''}>
                          {log.description || log.detail || log.message || '—'}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!hasSearched && (
        <div className="py-16 text-center border border-dashed border-border-grey rounded-lg bg-surface-container-lowest">
          <IoShieldOutline size={40} className="text-on-surface-variant/30 mx-auto mb-3" />
          <p className="font-body-md text-on-surface-variant">Nhấn "Tìm kiếm" để xem lịch sử hoạt động.</p>
        </div>
      )}
    </div>
  );
};

export default ActivityLog;
