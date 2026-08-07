import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import PageLoader from '../components/PageLoader';
import { formatDateTimeFull, formatEntityLabel } from '../utils/formatters';
import { ROLE_LABELS } from '../utils/role';
import { 
  ClipboardList, 
  Search, 
  RefreshCw, 
  User, 
  Clock, 
  ShieldAlert, 
  Activity,
  Layers
} from 'lucide-react';


function ActivityLogs({ user, showNotification }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/activity-logs');
      if (res.data && res.data.data) {
        setLogs(res.data.data);
      }
    } catch (err) {
      showNotification(err.message || 'Lỗi tải nhật ký hoạt động', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtered logs calculation
  const filteredLogs = logs.filter(log => {
    const matchSearch = searchQuery === '' || 
      (log.userFullName && log.userFullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.action && log.action.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.detail && log.detail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.entityName && log.entityName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchRole = roleFilter === 'ALL' || log.userRole === roleFilter;
    const matchEntity = entityFilter === 'ALL' || (log.entityName && log.entityName.toUpperCase() === entityFilter.toUpperCase());

    return matchSearch && matchRole && matchEntity;
  });

  // Extract unique entities for filter dropdown
  const entityTypes = Array.from(new Set(logs.map(l => l.entityName).filter(Boolean)));

  // Guard Clause for Access Control (ADMIN & OWNER)
  if (user.role !== 'ADMIN' && user.role !== 'OWNER') {
    return (
      <div className="card" style={{
        padding: '40px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        marginTop: '40px'
      }}>
        <ShieldAlert size={48} color="var(--color-maintenance)" />
        <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Từ chối truy cập</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', fontSize: '14px' }}>
          Chỉ Quản trị viên và Chủ cơ sở mới có quyền truy cập nhật ký hoạt động hệ thống.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ClipboardList size={24} color="var(--primary)" />
            <span>Nhật ký hoạt động hệ thống</span>
          </h1>
          <p className="page-subtitle">Theo dõi & giám sát mọi thao tác, lịch sử tác nghiệp của nhân viên trên hệ thống</p>
        </div>

        <button 
          onClick={fetchLogs} 
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      {/* Stats Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: '#e0f2fe',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Activity size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Tổng nhật ký ghi nhận</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>{logs.length} bản ghi</div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: '#e8f5e9',
            color: '#2e7d32',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <User size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Tài khoản hoạt động</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>
              {new Set(logs.map(l => l.userId).filter(Boolean)).size} người dùng
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: '#fff7ed',
            color: '#ea580c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Đối tượng tác động</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>{entityTypes.length} danh mục</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Tìm kiếm nội dung</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Nhập tên nhân viên, thao tác..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '34px' }}
              />
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Lọc theo vai trò</label>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="ALL">Tất cả vai trò</option>
              <option value="ADMIN">Quản trị viên</option>
              <option value="OWNER">Chủ cơ sở</option>
              <option value="RECEPTIONIST">Lễ tân</option>
              <option value="HOUSEKEEPER">Buồng phòng</option>
              <option value="ACCOUNTANT">Kế toán</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Lọc theo đối tượng</label>
            <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
              <option value="ALL">Tất cả đối tượng</option>
              {entityTypes.map(type => (
                <option key={type} value={type}>{formatEntityLabel(type)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Activity Log Table */}
      {loading ? (
        <PageLoader />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '180px' }}>Thời gian</th>
                <th>Người thực hiện</th>
                <th>Thao tác</th>
                <th>Đối tượng</th>
                <th>Chi tiết nhật ký</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map(log => (
                  <tr key={log.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        <Clock size={13} color="var(--text-muted)" />
                        <span>{formatDateTimeFull(log.createdAt)}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>
                        {log.userFullName || 'Hệ thống'}
                      </div>
                      {log.userRole && (
                        <span className="badge" style={{ fontSize: '10px', marginTop: '2px', display: 'inline-block' }}>
                          {ROLE_LABELS[log.userRole] || log.userRole}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-assigned" style={{ fontSize: '12px', fontWeight: '600' }}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      {log.entityName ? (
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)' }}>
                          {formatEntityLabel(log.entityName)} {log.entityId && `#${log.entityId}`}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      {log.detail || 'Không có mô tả chi tiết'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>Chưa ghi nhận nhật ký nào</div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                      Các thao tác đổi vai trò, khóa tài khoản, tạo đặt phòng, thanh toán... sẽ tự động xuất hiện tại đây.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ActivityLogs;
