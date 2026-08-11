import React, { useState } from 'react';
import api from '../utils/api';
import { LogIn, Shield, Key, Eye, EyeOff, Sparkles, ChevronUp, ChevronDown } from 'lucide-react';

function Login({ onLoginSuccess, showNotification, onGoToPortal }) {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(true);
  const [selectedRoleCode, setSelectedRoleCode] = useState('');

  const demoAccounts = [
    {
      code: 'VT-01',
      title: 'Chủ cơ sở',
      username: 'chusohuu',
      password: '123456',
      desc: 'Toàn quyền: quản lý nhân viên, danh mục, hóa đơn, báo cáo',
      badgeBg: '#dbeafe',
      badgeColor: '#1d4ed8',
      badgeBorder: '#bfdbfe'
    },
    {
      code: 'VT-02',
      title: 'Lễ tân',
      username: 'letan1',
      password: '123456',
      desc: 'Tạo đơn, tính tiền, phát hành và gửi hóa đơn cho khách',
      badgeBg: '#dcfce7',
      badgeColor: '#15803d',
      badgeBorder: '#bbf7d0'
    },
    {
      code: 'VT-03',
      title: 'Kế toán',
      username: 'ketoan1',
      password: '123456',
      desc: 'Tra cứu hóa đơn, lập hóa đơn điều chỉnh, xem và xuất báo cáo',
      badgeBg: '#fef9c3',
      badgeColor: '#a16207',
      badgeBorder: '#fef08a'
    },
    {
      code: 'VT-04',
      title: 'Quản trị viên',
      username: 'admin',
      password: '123456',
      desc: 'Quản lý tài khoản hộ, gói dịch vụ và nhật ký hệ thống',
      badgeBg: '#f3e8ff',
      badgeColor: '#7e22ce',
      badgeBorder: '#e9d5ff'
    },
    {
      code: 'VT-05',
      title: 'Nhân viên buồng phòng',
      username: 'buongphong1',
      password: '123456',
      desc: 'Cập nhật trạng thái dọn dẹp, kiểm tra trang thiết bị phòng',
      badgeBg: '#ffe4e6',
      badgeColor: '#be123c',
      badgeBorder: '#fecdd3'
    }
  ];

  const handleSelectDemo = (acc) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setSelectedRoleCode(acc.code);
    if (showNotification) {
      showNotification(`Đã tự động điền tài khoản: ${acc.title} (${acc.username})`, 'info');
    }
  };

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
      padding: '24px 16px'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '32px 28px',
        backgroundColor: 'var(--bg-card)',
        boxShadow: 'var(--shadow-lg)',
        borderRadius: '16px'
      }}>
        {/* Header Title */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '28px',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
            Hệ thống Quản lý Khách sạn Roomi
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Đăng nhập hệ thống quản lý Khách sạn & Homestay
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Username */}
          <div>
            <label style={{ fontWeight: '600', marginBottom: '6px', display: 'block', fontSize: '14px' }}>Tên đăng nhập:</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Tên tài khoản hoặc email"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setSelectedRoleCode('');
                }}
                style={{ paddingLeft: '38px', borderRadius: '8px', height: '42px', width: '100%' }}
                autoComplete="username"
                required
              />
              <Shield size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ fontWeight: '600', marginBottom: '6px', display: 'block', fontSize: '14px' }}>Mật khẩu:</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Mật khẩu tài khoản"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '38px', paddingRight: '38px', borderRadius: '8px', height: '42px', width: '100%' }}
                autoComplete="current-password"
                required
              />
              <Key size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '11px',
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
            style={{
              width: '100%',
              padding: '12px',
              marginTop: '6px',
              fontSize: '15px',
              fontWeight: '700',
              borderRadius: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
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
                <LogIn size={18} /> ĐĂNG NHẬP HỆ THỐNG
              </>
            )}
          </button>
        </form>

        {/* Demo Accounts Quick Login Section */}
        <div style={{
          marginTop: '20px',
          borderRadius: '12px',
          border: '1px dashed #93c5fd',
          backgroundColor: '#f0f7ff',
          overflow: 'hidden'
        }}>
          {/* Section Header */}
          <div
            onClick={() => setShowDemoAccounts(!showDemoAccounts)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e40af', fontWeight: '700', fontSize: '13px' }}>
              <Sparkles size={15} style={{ color: '#2563eb' }} />
              <span>Tài khoản Demo (môi trường phát triển)</span>
            </div>
            {showDemoAccounts ? (
              <ChevronUp size={16} style={{ color: '#2563eb' }} />
            ) : (
              <ChevronDown size={16} style={{ color: '#2563eb' }} />
            )}
          </div>

          {/* Section Body */}
          {showDemoAccounts && (
            <div style={{ padding: '0 12px 12px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {demoAccounts.map((acc) => {
                const isSelected = selectedRoleCode === acc.code || username === acc.username;
                return (
                  <div
                    key={acc.code}
                    onClick={() => handleSelectDemo(acc)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '10px 12px',
                      backgroundColor: isSelected ? '#ffffff' : '#ffffff',
                      border: isSelected ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 8px rgba(37, 99, 235, 0.15)' : '0 1px 2px rgba(0,0,0,0.03)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#93c5fd';
                        e.currentTarget.style.backgroundColor = '#fafafa';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.backgroundColor = '#ffffff';
                      }
                    }}
                  >
                    {/* Badge */}
                    <div style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '700',
                      backgroundColor: acc.badgeBg,
                      color: acc.badgeColor,
                      border: `1px solid ${acc.badgeBorder}`,
                      whiteSpace: 'nowrap',
                      marginTop: '2px'
                    }}>
                      {acc.code}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                          {acc.title}
                        </span>
                        <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#64748b' }}>
                          {acc.username}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.3' }}>
                        {acc.desc}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div style={{ textAlign: 'center', paddingTop: '4px', fontSize: '11px', color: '#64748b' }}>
                Click vào tài khoản để tự động điền vào form
              </div>
            </div>
          )}
        </div>

        {/* Guest Booking Portal Link */}
        <div style={{
          marginTop: '24px',
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
