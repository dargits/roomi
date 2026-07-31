import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import PageLoader from '../components/PageLoader';
import { Building2, Save, MapPin, Phone, Clock, AlertCircle } from 'lucide-react';

function Settings({ user, showNotification }) {
  const [settings, setSettings] = useState({
    propertyName: '',
    address: '',
    phone: '',
    defaultCheckinTime: '14:00',
    defaultCheckoutTime: '12:00',
    freeCancelHours: 24,
    cancelFeePercent: 0
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      if (res.data && res.data.data) {
        const data = res.data.data;
        setSettings({
          propertyName: data.propertyName || '',
          address: data.address || '',
          phone: data.phone || '',
          defaultCheckinTime: data.defaultCheckinTime || '14:00',
          defaultCheckoutTime: data.defaultCheckoutTime || '12:00',
          freeCancelHours: data.freeCancelHours !== undefined ? data.freeCancelHours : 24,
          cancelFeePercent: data.cancelFeePercent !== undefined ? data.cancelFeePercent : 0
        });
      }
    } catch (err) {
      showNotification(err.message || 'Lỗi khi tải cấu hình cơ sở', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put('/settings', settings);
      showNotification('Cập nhật thiết lập cơ sở thành công!', 'success');
      fetchSettings();
    } catch (err) {
      showNotification(err.message || 'Cập nhật thất bại', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Guard Clause for Access Control (OWNER & ADMIN)
  if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
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
        <AlertCircle size={48} color="var(--color-maintenance)" />
        <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Từ chối truy cập</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', fontSize: '14px' }}>
          Tài khoản của bạn không có đủ thẩm quyền để truy cập trang cấu hình thiết lập cơ sở.
        </p>
      </div>
    );
  }

  if (loading) {
    return <PageLoader message="Đang tải thiết lập cơ sở..." />;
  }

  const isEditable = user.role === 'OWNER' || user.role === 'ADMIN';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Thiết lập cơ sở lưu trú</h1>
          <p className="page-subtitle">Cấu hình thông tin khách sạn, giờ nhận/trả phòng và chính sách hủy phòng</p>
        </div>
      </div>

      <div style={{ maxWidth: '800px' }}>
        <form onSubmit={handleSubmit} className="card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <Building2 size={24} color="var(--primary)" />
            <h2 style={{ fontSize: '18px', margin: 0 }}>Thông tin khách sạn / Cơ sở</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontWeight: '600' }}>
                <Building2 size={16} /> Tên cơ sở / Khách sạn *
              </label>
              <input
                type="text"
                value={settings.propertyName}
                onChange={(e) => setSettings(prev => ({ ...prev, propertyName: e.target.value }))}
                required
                disabled={!isEditable}
                placeholder="VD: Roomi Grand Hotel & Spa"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontWeight: '600' }}>
                  <MapPin size={16} /> Địa chỉ
                </label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => setSettings(prev => ({ ...prev, address: e.target.value }))}
                  disabled={!isEditable}
                  placeholder="VD: 123 Đường Trần Phú, Quận 1, TP.HCM"
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontWeight: '600' }}>
                  <Phone size={16} /> Số điện thoại liên hệ
                </label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings(prev => ({ ...prev, phone: e.target.value }))}
                  disabled={!isEditable}
                  placeholder="VD: 028 3822 1234"
                />
              </div>
            </div>

            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
              <Clock size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '16px', margin: 0 }}>Quy định Giờ giấc & Chính sách Hủy</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ marginBottom: '6px', fontWeight: '600' }}>Giờ nhận phòng mặc định (Check-in)</label>
                <input
                  type="text"
                  value={settings.defaultCheckinTime}
                  onChange={(e) => setSettings(prev => ({ ...prev, defaultCheckinTime: e.target.value }))}
                  disabled={!isEditable}
                  placeholder="14:00"
                />
              </div>

              <div>
                <label style={{ marginBottom: '6px', fontWeight: '600' }}>Giờ trả phòng mặc định (Check-out)</label>
                <input
                  type="text"
                  value={settings.defaultCheckoutTime}
                  onChange={(e) => setSettings(prev => ({ ...prev, defaultCheckoutTime: e.target.value }))}
                  disabled={!isEditable}
                  placeholder="12:00"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ marginBottom: '6px', fontWeight: '600' }}>Hạn hủy phòng miễn phí (Giờ trước check-in)</label>
                <input
                  type="number"
                  min="0"
                  value={settings.freeCancelHours}
                  onChange={(e) => setSettings(prev => ({ ...prev, freeCancelHours: parseInt(e.target.value) || 0 }))}
                  disabled={!isEditable}
                />
              </div>

              <div>
                <label style={{ marginBottom: '6px', fontWeight: '600' }}>Phí hủy trễ (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.cancelFeePercent}
                  onChange={(e) => setSettings(prev => ({ ...prev, cancelFeePercent: parseFloat(e.target.value) || 0 }))}
                  disabled={!isEditable}
                />
              </div>
            </div>

            {isEditable ? (
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={18} />
                  {saving ? 'Đang lưu...' : 'Lưu thiết lập'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px', marginTop: '12px' }}>
                <AlertCircle size={16} />
                Chỉ Chủ cơ sở (OWNER) hoặc Quản trị viên (ADMIN) mới có quyền chỉnh sửa cấu hình này.
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default Settings;
