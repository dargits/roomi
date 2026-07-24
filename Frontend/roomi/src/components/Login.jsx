import React, { useState } from 'react';
import api from '../utils/api';
import { LogIn, UserPlus, Shield, Phone, Key, User, Eye, EyeOff } from 'lucide-react';

function Login({ onLoginSuccess, showNotification }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!username.trim() || !password.trim()) {
      showNotification('Vui lòng điền đầy đủ Tên đăng nhập và Mật khẩu', 'error');
      return;
    }

    if (!isLogin && !fullName.trim()) {
      showNotification('Vui lòng nhập Họ và tên để đăng ký', 'error');
      return;
    }

    if (password.length < 6) {
      showNotification('Mật khẩu phải có độ dài ít nhất 6 ký tự', 'error');
      setPassword('');
      setConfirmPassword('');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      showNotification('Xác nhận mật khẩu không trùng khớp', 'error');
      setPassword('');
      setConfirmPassword('');
      return;
    }

    try {
      setLoading(true);
      if (isLogin) {
        // Login flow
        const response = await api.post('/auth/login', { username, password });
        if (response.data && response.data.token) {
          onLoginSuccess(response.data.token);
        } else {
          showNotification('Đăng nhập thất bại, không tìm thấy token', 'error');
          setPassword('');
        }
      } else {
        // Register flow
        const payload = {
          fullName,
          username,
          password,
          phone: phone.trim() ? phone : undefined
        };
        const response = await api.post('/auth/register', payload);
        showNotification(response.data.mess || 'Đăng ký tài khoản thành công!');
        // Automatically switch to login tab and prefill username
        setIsLogin(true);
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      showNotification(err.message || 'Thao tác thất bại. Vui lòng kiểm tra lại.', 'error');
      setPassword('');
      setConfirmPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.15) 0%, rgba(10, 11, 16, 1) 60%)',
      padding: '20px'
    }}>
      <div className="card glow-card" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '40px 32px',
        backgroundColor: 'var(--bg-glass)',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header Logo */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '32px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '24px',
            boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)'
          }}>
            R
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
            {isLogin ? 'Chào mừng trở lại' : 'Tạo tài khoản Roomi'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {isLogin ? 'Hệ thống Quản lý Khách sạn Thông minh' : 'Đăng ký tài khoản nhân viên mới'}
          </p>
        </div>

        {/* Tab Selection */}
        <div style={{
          display: 'flex',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px',
          marginBottom: '24px'
        }}>
          <button
            onClick={() => { setIsLogin(true); }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 'calc(var(--radius-sm) - 2px)',
              backgroundColor: isLogin ? 'var(--primary)' : 'transparent',
              color: isLogin ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'var(--transition-fast)'
            }}
          >
            <LogIn size={14} />
            Đăng nhập
          </button>
          <button
            onClick={() => { setIsLogin(false); }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 'calc(var(--radius-sm) - 2px)',
              backgroundColor: !isLogin ? 'var(--primary)' : 'transparent',
              color: !isLogin ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'var(--transition-fast)'
            }}
          >
            <UserPlus size={14} />
            Đăng ký
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Full Name (Register only) */}
          {!isLogin && (
            <div>
              <label>Họ và tên</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                  required
                />
                <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              </div>
            </div>
          )}

          {/* Username */}
          <div>
            <label>Tên đăng nhập</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="username123"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ paddingLeft: '38px' }}
                autoComplete="username"
                required
              />
              <Shield size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* Password */}
          <div>
            <label>Mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '38px', paddingRight: '38px' }}
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
              />
              <Key size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
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

          {/* Confirm Password (Register only) */}
          {!isLogin && (
            <div>
              <label>Nhập lại mật khẩu</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ paddingLeft: '38px', paddingRight: '38px' }}
                  autoComplete="new-password"
                  required
                />
                <Key size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
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
          )}

          {/* Phone (Register only) */}
          {!isLogin && (
            <div>
              <label>Số điện thoại (tùy chọn)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="tel"
                  placeholder="0123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                />
                <Phone size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? (
              <div style={{
                border: '2px solid rgba(255,255,255,0.2)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                animation: 'spin 1s linear infinite'
              }} />
            ) : isLogin ? (
              'Đăng nhập ngay'
            ) : (
              'Tạo tài khoản'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
