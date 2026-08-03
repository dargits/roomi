import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import PageLoader from '../components/PageLoader';
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
  Search,
  Plus,
  User,
  Key
} from 'lucide-react';

const roleInfo = {
  ADMIN: { label: 'Quản trị viên', color: 'var(--color-maintenance)', bg: 'var(--color-maintenance-bg)' },
  OWNER: { label: 'Chủ sở hữu', color: 'var(--color-new)', bg: 'var(--color-new-bg)' },
  RECEPTIONIST: { label: 'Lễ tân', color: 'var(--color-available)', bg: 'var(--color-available-bg)' },
  HOUSEKEEPER: { label: 'Buồng phòng', color: 'var(--color-cleaning)', bg: 'var(--color-cleaning-bg)' },
  ACCOUNTANT: { label: 'Kế toán', color: 'var(--color-occupied)', bg: 'var(--color-occupied-bg)' }
};

function Users({ user, showNotification }) {
  const isAuthorized = user?.role === 'ADMIN';

  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleConfirm, setRoleConfirm] = useState({
    show: false,
    userId: null,
    targetRole: '',
    userName: '',
    currentRoleLabel: '',
    targetRoleLabel: ''
  });

  // Create User Modal State (Admin only)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    username: '',
    password: '',
    phone: '',
    role: 'RECEPTIONIST'
  });
  const [submitting, setSubmitting] = useState(false);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!createForm.fullName.trim() || !createForm.username.trim() || !createForm.password.trim() || !createForm.phone.trim()) {
      showNotification('Vui lòng điền đầy đủ các thông tin bắt buộc', 'error');
      return;
    }
    if (createForm.password.length < 6) {
      showNotification('Mật khẩu phải có ít nhất 6 ký tự', 'error');
      return;
    }
    const phoneRegex = /^[0-9]{9,11}$/;
    if (!phoneRegex.test(createForm.phone.trim())) {
      showNotification('Số điện thoại không hợp lệ (phải từ 9 - 11 chữ số)', 'error');
      return;
    }
    try {
      setSubmitting(true);
      const res = await api.post('/auth/register', {
        fullName: createForm.fullName.trim(),
        username: createForm.username.trim(),
        password: createForm.password,
        phone: createForm.phone.trim() ? createForm.phone.trim() : undefined,
        role: createForm.role
      });

      showNotification(`Tạo tài khoản nhân viên ${createForm.fullName} thành công!`);
      setShowCreateModal(false);
      setCreateForm({ fullName: '', username: '', password: '', phone: '', role: 'RECEPTIONIST' });
      fetchUsers();
    } catch (err) {
      showNotification(err.message || 'Tạo tài khoản thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  };

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

  const handleChangeRole = (userId, targetRole) => {
    const targetUser = usersList.find(u => u.id === userId);
    const targetUserName = targetUser ? targetUser.fullName : 'nhân viên';
    const currentRoleLabel = targetUser ? (roleInfo[targetUser.role]?.label || targetUser.role) : '';
    const targetRoleLabel = roleInfo[targetRole]?.label || targetRole;

    setRoleConfirm({
      show: true,
      userId,
      targetRole,
      userName: targetUserName,
      currentRoleLabel,
      targetRoleLabel
    });
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

  if (!isAuthorized) {
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
          Chỉ Quản trị viên hệ thống (ADMIN) mới có quyền truy cập trang quản lý nhân viên và phân quyền.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý nhân viên</h1>
          <p className="page-subtitle">Quản trị viên khởi tạo tài khoản, phân quyền vai trò và quản lý trạng thái nhân viên</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)} 
          className="btn btn-primary"
        >
          <Plus size={16} /> Thêm tài khoản nhân viên
        </button>
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
        <PageLoader />
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

      {/* ROLE CHANGE CONFIRMATION MODAL */}
      {roleConfirm.show && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '17px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)'
                }}>
                  <ShieldAlert size={18} />
                </div>
                <span>Xác nhận phân quyền</span>
              </h2>
              <button 
                onClick={() => {
                  setRoleConfirm(prev => ({ ...prev, show: false }));
                  fetchUsers();
                }} 
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-primary)' }}>
              <p style={{ margin: 0 }}>Bạn có chắc chắn muốn thay đổi chức vụ của nhân viên <strong>{roleConfirm.userName}</strong>?</p>
              <div style={{ marginTop: '14px', padding: '14px 16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '13px' }}>Chức vụ hiện tại: <span className="badge" style={{ fontSize: '12px', marginLeft: '6px', color: roleInfo[usersList.find(u => u.id === roleConfirm.userId)?.role]?.color, backgroundColor: roleInfo[usersList.find(u => u.id === roleConfirm.userId)?.role]?.bg }}>{roleConfirm.currentRoleLabel}</span></div>
                <div style={{ fontSize: '13px' }}>Chức vụ mới: <span className="badge" style={{ fontSize: '12px', marginLeft: '6px', color: roleInfo[roleConfirm.targetRole]?.color, backgroundColor: roleInfo[roleConfirm.targetRole]?.bg }}>{roleConfirm.targetRoleLabel}</span></div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                onClick={() => {
                  setRoleConfirm(prev => ({ ...prev, show: false }));
                  fetchUsers();
                }} 
                className="btn btn-secondary btn-sm"
              >
                Hủy bỏ
              </button>
              <button 
                type="button" 
                onClick={async () => {
                  const { userId, targetRole } = roleConfirm;
                  setRoleConfirm(prev => ({ ...prev, show: false }));
                  try {
                    const res = await api.put(`/users/role/${userId}`, { role: targetRole });
                    showNotification(res.data.mess || 'Cập nhật phân quyền thành công');
                    fetchUsers();
                  } catch (err) {
                    showNotification(err.message, 'error');
                    fetchUsers();
                  }
                }} 
                className="btn btn-primary btn-sm"
              >
                Xác nhận phân quyền
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL (ADMIN ONLY) */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '17px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  backgroundColor: '#e0f2fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)'
                }}>
                  <User size={18} />
                </div>
                <span>Thêm tài khoản nhân viên mới</span>
              </h2>
              <button onClick={() => setShowCreateModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                    Họ và tên <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Nguyễn Văn An"
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, fullName: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                    Tên đăng nhập <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: letan01"
                    value={createForm.username}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, username: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                    Mật khẩu khởi tạo <span style={{ color: '#ef4444' }}>*</span> <span style={{ fontSize: '12px', fontWeight: '400', color: 'var(--text-muted)' }}>(tối thiểu 6 ký tự)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="••••••"
                    value={createForm.password}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                    Số điện thoại <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="Ví dụ: 0901234567"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                    Chức vụ / Vai trò ban đầu <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value }))}
                  >
                    <option value="RECEPTIONIST">Lễ tân (RECEPTIONIST)</option>
                    <option value="HOUSEKEEPER">Buồng phòng (HOUSEKEEPER)</option>
                    <option value="ACCOUNTANT">Kế toán (ACCOUNTANT)</option>
                    <option value="OWNER">Chủ cơ sở (OWNER)</option>
                    <option value="ADMIN">Quản trị viên (ADMIN)</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary btn-sm">
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                  {submitting ? 'Đang khởi tạo...' : 'Khởi tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;
