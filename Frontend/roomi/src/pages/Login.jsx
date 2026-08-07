import React, { useState } from 'react';
import api from '../utils/api';
import { LogIn, Shield, Key, Eye, EyeOff } from 'lucide-react';

function Login({ onLoginSuccess, showNotification, onGoToPortal }) {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!username.trim() || !password.trim()) {
      showNotification('Vui lòng điền đầy đủ Tên đăng nhập và Mật khẩu', 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/auth/login', { username, password });
      if (response.data && response.data.token) {
        onLoginSuccess(response.data.token);
      } else {
        showNotification('Đăng nhập thất bại, không tìm thấy token', 'error');
        setPassword('');
      }
    } catch (err) {
      showNotification(err.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.', 'error');
      setPassword('');
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
      backgroundColor: 'var(--bg-primary)',
      padding: '20px'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '36px 32px',
        backgroundColor: 'var(--bg-card)',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header Title */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '32px',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
            Hệ thống Quản lý Khách sạn Roomi
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Hệ thống Quản lý Khách sạn & Homestay
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Username */}
          <div>
            <label style={{ fontWeight: '600', marginBottom: '6px' }}>Tên đăng nhập</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Nhập tên đăng nhập..."
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
            <label style={{ fontWeight: '600', marginBottom: '6px' }}>Mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '38px', paddingRight: '38px' }}
                autoComplete="current-password"
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

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '8px', fontSize: '15px', fontWeight: '700' }}
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
            ) : (
              <>
                <LogIn size={16} /> Đăng nhập hệ thống
              </>
            )}
          </button>
        </form>

        {/* Guest Booking Portal Link */}
        <div style={{
          marginTop: '28px',
          textAlign: 'center',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '16px'
        }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Dành cho khách hàng: </span>
          <button
            type="button"
            onClick={onGoToPortal}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '0 4px'
            }}
          >
            Cổng đặt phòng trực tiếp
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
