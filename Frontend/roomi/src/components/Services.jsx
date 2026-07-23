import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  AlertCircle, 
  Check, 
  Coffee, 
  Info,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

function Services({ user, showNotification }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedService, setSelectedService] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unitPrice: 20000,
    active: true
  });

  const fetchServices = async () => {
    try {
      setLoading(true);
      // Fetch all services including inactive ones for management
      const res = await api.get('/surcharge-services', {
        params: { activeOnly: false }
      });
      if (res.data && res.data.data) {
        setServices(res.data.data);
      }
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      showNotification('Bạn không có quyền quản trị danh mục dịch vụ phụ thu (Yêu cầu OWNER)', 'error');
      return;
    }

    try {
      const payload = {
        ...formData,
        unitPrice: parseInt(formData.unitPrice)
      };

      if (modalMode === 'create') {
        await api.post('/surcharge-services', payload);
        showNotification('Tạo dịch vụ mới thành công!');
      } else {
        await api.put(`/surcharge-services/${selectedService.id}`, payload);
        showNotification('Cập nhật dịch vụ thành công!');
      }
      setShowModal(false);
      fetchServices();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const openCreateModal = () => {
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      showNotification('Yêu cầu vai trò OWNER hoặc ADMIN để tạo dịch vụ mới', 'error');
      return;
    }
    setModalMode('create');
    setFormData({
      name: '',
      description: '',
      unitPrice: 20000,
      active: true
    });
    setShowModal(true);
  };

  const openEditModal = (service) => {
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      showNotification('Yêu cầu vai trò OWNER hoặc ADMIN để chỉnh sửa dịch vụ', 'error');
      return;
    }
    setModalMode('edit');
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      unitPrice: service.unitPrice,
      active: service.active
    });
    setShowModal(true);
  };

  const handleToggleActive = async (service) => {
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      showNotification('Yêu cầu vai trò OWNER hoặc ADMIN để bật/tắt dịch vụ', 'error');
      return;
    }
    try {
      let endpoint = `/surcharge-services/${service.id}/${service.active ? 'deactivate' : 'reactivate'}`;
      await api.patch(endpoint);
      showNotification(`Đã ${service.active ? 'ngừng hoạt động' : 'kích hoạt lại'} dịch vụ ${service.name}`);
      fetchServices();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      showNotification('Yêu cầu vai trò OWNER hoặc ADMIN để xóa dịch vụ', 'error');
      return;
    }
    if (!window.confirm('Bạn có chắc chắn muốn xóa dịch vụ này? Chỉ có thể xóa nếu dịch vụ chưa từng phát sinh giao dịch.')) return;
    try {
      await api.delete(`/surcharge-services/${serviceId}`);
      showNotification('Đã xóa dịch vụ thành công');
      fetchServices();
    } catch (err) {
      // Backend usually returns SUR_003 if service usage history exists
      if (err.code === 'SUR_003') {
        showNotification('Không thể xóa do dịch vụ đã được sử dụng. Vui lòng chọn "Ngừng hoạt động" thay thế.', 'error');
      } else {
        showNotification(err.message, 'error');
      }
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Danh mục dịch vụ & Phụ thu</h1>
          <p className="page-subtitle">Quản lý danh sách dịch vụ phát sinh (Giặt là, ăn uống, minibar, thuê xe...) của khách sạn</p>
        </div>
        
        {(user.role === 'OWNER' || user.role === 'ADMIN') && (
          <button onClick={openCreateModal} className="btn btn-primary">
            <Plus size={18} />
            Tạo dịch vụ mới
          </button>
        )}
      </div>

      {/* Role Notice */}
      {user.role !== 'OWNER' && user.role !== 'ADMIN' && (
        <div className="card" style={{ padding: '12px 16px', borderLeft: '4px solid var(--color-cleaning)', display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '24px' }}>
          <AlertCircle size={18} color="var(--color-cleaning)" />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Chỉ vai trò chủ cơ sở **OWNER** mới được phép tạo, chỉnh sửa hoặc ngừng hoạt động dịch vụ trong danh mục này.
          </span>
        </div>
      )}

      {/* Services List Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
          <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tên dịch vụ</th>
                <th>Mô tả / Đơn vị tính</th>
                <th>Đơn giá dịch vụ</th>
                <th>Trạng thái hoạt động</th>
                <th style={{ textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {services.length > 0 ? (
                services.map(s => (
                  <tr key={s.id} style={{ opacity: s.active ? 1 : 0.6 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: s.active ? 'var(--primary-glow)' : 'rgba(255,255,255,0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: s.active ? 'var(--primary)' : 'var(--text-muted)'
                        }}>
                          <Coffee size={16} />
                        </div>
                        <strong>{s.name}</strong>
                      </div>
                    </td>
                    <td>{s.description || <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Chưa thiết lập</span>}</td>
                    <td style={{ fontWeight: '600', color: s.active ? 'var(--color-available)' : 'var(--text-muted)' }}>
                      {s.unitPrice?.toLocaleString('vi-VN')} đ
                    </td>
                    <td>
                      <span className={`badge ${s.active ? 'badge-available' : 'badge-cancelled'}`}>
                        {s.active ? 'Đang hoạt động' : 'Đã dừng bán'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {(user.role === 'OWNER' || user.role === 'ADMIN') ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => handleToggleActive(s)} 
                            className="btn btn-secondary btn-sm"
                            title={s.active ? "Tắt hoạt động" : "Bật hoạt động"}
                          >
                            {s.active ? <ToggleRight size={18} color="var(--color-available)" /> : <ToggleLeft size={18} color="var(--text-muted)" />}
                          </button>
                          <button onClick={() => openEditModal(s)} className="btn btn-secondary btn-sm" title="Sửa thông tin">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleDeleteService(s.id)} className="btn btn-secondary btn-sm" style={{ color: 'var(--color-maintenance)' }} title="Xóa dịch vụ">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Chỉ đọc</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px' }}>Không tìm thấy dịch vụ nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE / EDIT SERVICE MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', margin: 0 }}>
                {modalMode === 'create' ? 'Tạo dịch vụ phụ thu mới' : `Chỉnh sửa dịch vụ ${selectedService?.name}`}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleServiceSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label>Tên dịch vụ *</label>
                  <input
                    type="text"
                    placeholder="VD: Giặt ủi quần áo, Cocacola lon, Thuê xe máy..."
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label>Đơn giá dịch vụ (VND) *</label>
                  <input
                    type="number"
                    min="1"
                    step="1000"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, unitPrice: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label>Mô tả / Đơn vị tính</label>
                  <input
                    type="text"
                    placeholder="VD: Tính theo kg, Tính theo lon, 1 ngày..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <input
                    type="checkbox"
                    id="service-active"
                    checked={formData.active}
                    onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                    style={{ width: 'auto', cursor: 'pointer' }}
                  />
                  <label htmlFor="service-active" style={{ margin: 0, cursor: 'pointer', textTransform: 'none', fontWeight: 'normal', fontSize: '14px' }}>
                    Kích hoạt hoạt động bán dịch vụ
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm">Hủy</button>
                <button type="submit" className="btn btn-primary btn-sm">
                  {modalMode === 'create' ? 'Tạo mới' : 'Lưu cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Services;
