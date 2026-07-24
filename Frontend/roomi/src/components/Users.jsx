import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  Users as UsersIcon, 
  Lock, 
  Unlock, 
  ShieldAlert, 
  Check, 
  X, 
  Phone, 
  Calendar,
  UserCheck,
  Search
} from 'lucide-react';

const roleInfo = {
  ADMIN: { label: 'Quản trị viên', color: 'var(--color-maintenance)', bg: 'var(--color-maintenance-bg)' },
  OWNER: { label: 'Chủ sở hữu', color: 'var(--color-new)', bg: 'var(--color-new-bg)' },
  RECEPTIONIST: { label: 'Lễ tân', color: 'var(--color-available)', bg: 'var(--color-available-bg)' },
  HOUSEKEEPER: { label: 'Buồng phòng', color: 'var(--color-cleaning)', bg: 'var(--color-cleaning-bg)' },
  ACCOUNTANT: { label: 'Kế toán', color: 'var(--color-occupied)', bg: 'var(--color-occupied-bg)' }
};

function Users({ user, showNotification }) {
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users/');
      if (res.data && res.data.data) {
        setUsersList(res.data.data);
      }
    } catch (err) {
      showNotification(err.message || 'Không thể tải danh sách nhân viên', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.role === 'ADMIN') {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleChangeRole = async (userId, targetRole) => {
    try {
      const res = await api.put(`/users/role/${userId}`, { role: targetRole });
      showNotification(res.data.mess || 'Cập nhật phân quyền thành công');
      fetchUsers();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleToggleLock = async (targetUser) => {
    if (targetUser.role === 'ADMIN') {
      showNotification('Không thể khóa tài khoản của quản trị viên khác', 'error');
      return;
    }
    if (targetUser.id === user.id) {
      showNotification('Bạn không thể tự khóa tài khoản của chính mình', 'error');
      return;
    }

    try {
      let endpoint = `/users/${targetUser.active ? 'lock' : 'unlock'}/${targetUser.id}`;
      const res = await api.put(endpoint);
      showNotification(res.data.mess || 'Thay đổi trạng thái tài khoản thành công');
      fetchUsers();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Chưa có thông tin';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Guard Clause for Access Control
  if (user.role !== 'ADMIN') {
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
          Trang quản lý nhân viên chỉ dành riêng cho Quản trị viên hệ thống (**ADMIN**). Tài khoản của bạn không có đủ thẩm quyền.
        </p>
      </div>
    );
  }

  const availableRoles = ['OWNER', 'RECEPTIONIST', 'HOUSEKEEPER', 'ACCOUNTANT', 'ADMIN'];

  // Filtering logic
  const filteredUsers = usersList.filter(u => {
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    
    const matchStatus = statusFilter === 'ALL' || 
      (statusFilter === 'ACTIVE' && u.active) || 
      (statusFilter === 'LOCKED' && !u.active);
      
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const matchSearch = !normalizedQuery || 
      u.fullName?.toLowerCase().includes(normalizedQuery) ||
      u.username?.toLowerCase().includes(normalizedQuery) ||
      u.phone?.toLowerCase().includes(normalizedQuery);
      
    return matchRole && matchStatus && matchSearch;
  });

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý nhân viên</h1>
          <p className="page-subtitle">Quản trị viên quản lý danh sách tài khoản, phân quyền vai trò và khóa mở khóa nhân viên</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Total Employees */}
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: 'var(--primary-glow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)'
          }}>
            <UsersIcon size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Tổng nhân viên</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
              {usersList.length} <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-muted)' }}>người</span>
            </div>
          </div>
        </div>

        {/* Role count statistics breakdown */}
        {availableRoles.map(role => {
          const count = usersList.filter(u => u.role === role).length;
          const info = roleInfo[role] || { label: role, color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.05)' };
          return (
            <div key={role} className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: info.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: info.color
              }}>
                <UserCheck size={24} />
              </div>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>{info.label}</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
                  {count} <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-muted)' }}>người</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter and Search Panel */}
      <div className="card" style={{
        padding: '20px',
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center'
      }}>
        <div style={{ flex: 2, minWidth: '280px' }}>
          <label style={{ marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Tìm kiếm nhân viên</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Nhập họ tên, tên đăng nhập hoặc số điện thoại..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '38px', height: '42px', width: '100%' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-muted)' }} />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '9px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '180px' }}>
          <label style={{ marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Lọc theo chức vụ</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ height: '42px', width: '100%' }}
          >
            <option value="ALL">Tất cả chức vụ ({usersList.length})</option>
            {availableRoles.map(role => (
              <option key={role} value={role}>
                {roleInfo[role]?.label || role} ({usersList.filter(u => u.role === role).length})
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: '180px' }}>
          <label style={{ marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Trạng thái tài khoản</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ height: '42px', width: '100%' }}
          >
            <option value="ALL">Tất cả trạng thái ({usersList.length})</option>
            <option value="ACTIVE">Đang hoạt động ({usersList.filter(u => u.active).length})</option>
            <option value="LOCKED">Đã khóa ({usersList.filter(u => !u.active).length})</option>
          </select>
        </div>

        {(roleFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery !== '') && (
          <div style={{ alignSelf: 'flex-end', height: '42px', display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => {
                setRoleFilter('ALL');
                setStatusFilter('ALL');
                setSearchQuery('');
              }}
              className="btn btn-secondary"
              style={{ height: '42px', padding: '0 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <X size={14} /> Xóa bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* Results summary counter when filtering is active */}
      {(roleFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery !== '') && (
        <div style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-secondary)', paddingLeft: '4px' }}>
          Tìm thấy <strong>{filteredUsers.length}</strong> nhân viên phù hợp với bộ lọc hiện tại.
        </div>
      )}

      {/* Users table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
          <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Họ và tên</th>
                <th>Tên đăng nhập</th>
                <th>Số điện thoại</th>
                <th>Chức vụ / Vai trò</th>
                <th>Trạng thái hoạt động</th>
                <th>Ngày gia nhập</th>
                <th style={{ textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map(u => {
                  const isSelf = u.id === user.id;
                  const isAdmin = u.role === 'ADMIN';

                  return (
                    <tr key={u.id} style={{ opacity: u.active ? 1 : 0.6 }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: isSelf ? 'var(--primary-glow)' : 'rgba(255,255,255,0.03)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isSelf ? 'var(--primary)' : 'var(--text-secondary)',
                            fontWeight: 'bold',
                            border: isSelf ? '1px solid var(--primary)' : '1px solid var(--border-color)'
                          }}>
                            {u.fullName?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong>{u.fullName}</strong> {isSelf && <span style={{ fontSize: '10px', color: 'var(--primary)', fontStyle: 'italic' }}>(Tôi)</span>}
                          </div>
                        </div>
                      </td>
                      <td>{u.username}</td>
                      <td>
                        {u.phone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                            <Phone size={12} color="var(--text-secondary)" />
                            <span>{u.phone}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Chưa thiết lập</span>
                        )}
                      </td>
                      <td>
                        {isSelf ? (
                          <span className="badge" style={{ fontSize: '12px', color: roleInfo[u.role]?.color, backgroundColor: roleInfo[u.role]?.bg }}>
                            {roleInfo[u.role]?.label || u.role}
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) => handleChangeRole(u.id, e.target.value)}
                            style={{ 
                              width: '180px', 
                              padding: '6px 12px', 
                              fontSize: '13px',
                              backgroundColor: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--text-primary)'
                            }}
                            disabled={isAdmin} // Disable role changes for other admins
                          >
                            {availableRoles.map(role => (
                              <option key={role} value={role} style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                                {roleInfo[role]?.label || role}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${u.active ? 'badge-available' : 'badge-cancelled'}`}>
                          {u.active ? 'Đang hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={12} color="var(--text-secondary)" />
                          <span>{formatDate(u.createdAt)}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {!isSelf && !isAdmin ? (
                          <button
                            onClick={() => handleToggleLock(u)}
                            className="btn btn-secondary btn-sm"
                            style={{
                              color: u.active ? 'var(--color-maintenance)' : 'var(--color-available)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            {u.active ? (
                              <>
                                <Lock size={12} /> Khóa tài khoản
                              </>
                            ) : (
                              <>
                                <Unlock size={12} /> Mở khóa
                              </>
                            )}
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mặc định</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px' }}>
                    {usersList.length === 0 ? 'Không có nhân viên nào.' : 'Không tìm thấy nhân viên phù hợp với bộ lọc.'}
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

export default Users;
