import React, { useState } from 'react';
import api from '../utils/api';
import { User, Shield, Phone, Calendar, Key, CheckCircle, Eye, EyeOff } from 'lucide-react';

function Profile({ user, showNotification, onProfileUpdate }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!password.trim()) {
      showNotification('Vui lòng nhập mật khẩu mới', 'error');
      return;
    }

    if (password.length < 6) {
      showNotification('Mật khẩu mới phải có ít nhất 6 ký tự', 'error');
      setPassword('');
      setConfirmPassword('');
      return;
    }

    if (password !== confirmPassword) {
      showNotification('Mật khẩu xác nhận không trùng khớp', 'error');
      setPassword('');
      setConfirmPassword('');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/changepass', { password });
      showNotification(res.data?.mess || 'Đổi mật khẩu thành công!');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      showNotification(err.message || 'Không thể đổi mật khẩu. Vui lòng thử lại.', 'error');
      setPassword('');
      setConfirmPassword('');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Chưa có thông tin';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Hồ sơ cá nhân</h1>
          <p className="page-subtitle">Thông tin chi tiết tài khoản của bạn</p>
        </div>
      </div>

      <div className="grid-2">
        {/* Profile Card */}
        <div className="card">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '20px',
            marginBottom: '20px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)'
            }}>
              <User size={32} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px' }}>{user.fullName}</h2>
              <span className="badge badge-confirmed" style={{ marginTop: '4px' }}>
                {user.role}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Shield size={18} color="var(--text-secondary)" />
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Tên đăng nhập</span>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>{user.username}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Phone size={18} color="var(--text-secondary)" />
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Số điện thoại</span>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>{user.phone || 'Chưa cập nhật'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle size={18} color={user.active ? 'var(--color-available)' : 'var(--color-maintenance)'} />
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Trạng thái tài khoản</span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: user.active ? 'var(--color-available)' : 'var(--color-maintenance)'
                }}>
                  {user.active ? 'Đang hoạt động' : 'Đang khóa'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Calendar size={18} color="var(--text-secondary)" />
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Ngày tham gia</span>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>{formatDate(user.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="card">
          <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={20} color="var(--primary)" />
            Đổi mật khẩu
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
            Để bảo mật tài khoản, vui lòng thiết lập mật khẩu mới có độ dài từ 6 ký tự trở lên.
          </p>

          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label>Mật khẩu mới</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: '38px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '10px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label>Xác nhận mật khẩu mới</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ paddingRight: '38px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '10px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ alignSelf: 'flex-start', marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;
