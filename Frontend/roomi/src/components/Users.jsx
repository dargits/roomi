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
  UserCheck
} from 'lucide-react';

function Users({ user, showNotification }) {
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý nhân viên</h1>
          <p className="page-subtitle">Quản trị viên quản lý danh sách tài khoản, phân quyền vai trò và khóa mở khóa nhân viên</p>
        </div>
      </div>

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
              {usersList.length > 0 ? (
                usersList.map(u => {
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
                          <span className="badge badge-confirmed" style={{ fontSize: '12px' }}>{u.role}</span>
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) => handleChangeRole(u.id, e.target.value)}
                            style={{ width: '150px', padding: '4px 8px', fontSize: '13px' }}
                            disabled={isAdmin} // Disable role changes for other admins
                          >
                            {availableRoles.map(role => (
                              <option key={role} value={role}>{role}</option>
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
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px' }}>Không có nhân viên nào khác.</td>
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
