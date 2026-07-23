import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Search, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  HelpCircle,
  AlertCircle
} from 'lucide-react';

function Rates({ user, showNotification }) {
  const [rates, setRates] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tra cứu giá phòng (Price Lookup sandbox)
  const [lookupParams, setLookupParams] = useState({ roomTypeId: '', date: new Date().toISOString().split('T')[0] });
  const [lookupResult, setLookupResult] = useState(null);
  const [loadingLookup, setLoadingLookup] = useState(false);

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedRate, setSelectedRate] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    roomTypeId: '',
    startDate: '',
    endDate: '',
    price: 600000
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ratesRes, typesRes] = await Promise.all([
        api.get('/seasonal-rates'),
        api.get('/room-types')
      ]);

      if (ratesRes.data && ratesRes.data.data) {
        setRates(ratesRes.data.data);
      }
      if (typesRes.data && typesRes.data.data) {
        setRoomTypes(typesRes.data.data);
        if (typesRes.data.data.length > 0) {
          setLookupParams(prev => ({ ...prev, roomTypeId: typesRes.data.data[0].id.toString() }));
          setFormData(prev => ({ ...prev, roomTypeId: typesRes.data.data[0].id.toString() }));
        }
      }
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sandbox price checker lookup
  const handlePriceLookup = async (e) => {
    e.preventDefault();
    if (!lookupParams.roomTypeId || !lookupParams.date) return;
    try {
      setLoadingLookup(true);
      const res = await api.get('/seasonal-rates/price-lookup', {
        params: {
          roomTypeId: parseInt(lookupParams.roomTypeId),
          date: lookupParams.date
        }
      });
      if (res.data && res.data.data) {
        setLookupResult(res.data.data);
        showNotification('Tra cứu giá thành công');
      }
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoadingLookup(false);
    }
  };

  // Seasonal rate CUD handlers
  const handleRateSubmit = async (e) => {
    e.preventDefault();
    if (formData.endDate <= formData.startDate) {
      showNotification('Ngày kết thúc phải sau ngày bắt đầu', 'error');
      return;
    }

    // Role verification alert
    if (user.role !== 'ADMIN' && user.role !== 'OWNER') {
      showNotification('Bạn không có quyền quản lý cấu hình giá theo mùa', 'error');
      return;
    }

    try {
      const payload = {
        roomTypeId: parseInt(formData.roomTypeId),
        startDate: formData.startDate,
        endDate: formData.endDate,
        price: parseInt(formData.price)
      };

      if (modalMode === 'create') {
        await api.post('/seasonal-rates', payload);
        showNotification('Tạo cấu hình giá theo mùa thành công');
      } else {
        await api.put(`/seasonal-rates/${selectedRate.id}`, payload);
        showNotification('Cập nhật cấu hình giá thành công');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const openCreateModal = () => {
    if (user.role !== 'ADMIN' && user.role !== 'OWNER') {
      showNotification('Yêu cầu quyền ADMIN hoặc OWNER để thay đổi biểu phí', 'error');
      return;
    }
    setModalMode('create');
    setFormData({
      roomTypeId: roomTypes.length > 0 ? roomTypes[0].id.toString() : '',
      startDate: '',
      endDate: '',
      price: 600000
    });
    setShowModal(true);
  };

  const openEditModal = (rate) => {
    if (user.role !== 'ADMIN' && user.role !== 'OWNER') {
      showNotification('Yêu cầu quyền ADMIN hoặc OWNER để thay đổi biểu phí', 'error');
      return;
    }
    setModalMode('edit');
    setSelectedRate(rate);
    setFormData({
      roomTypeId: rate.roomTypeId.toString(),
      startDate: rate.startDate,
      endDate: rate.endDate,
      price: rate.price
    });
    setShowModal(true);
  };

  const handleDeleteRate = async (rateId) => {
    if (user.role !== 'ADMIN' && user.role !== 'OWNER') {
      showNotification('Yêu cầu quyền ADMIN hoặc OWNER để thay đổi biểu phí', 'error');
      return;
    }
    if (!window.confirm('Bạn có chắc chắn muốn xóa cấu hình giá theo mùa này?')) return;
    try {
      await api.delete(`/seasonal-rates/${rateId}`);
      showNotification('Xóa cấu hình giá thành công');
      fetchData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý giá phòng theo mùa</h1>
          <p className="page-subtitle">Thiết lập các khung giá ưu đãi hoặc phụ thu cao điểm theo thời gian</p>
        </div>
        
        <button onClick={openCreateModal} className="btn btn-primary">
          <Plus size={18} />
          Cấu hình giá mùa mới
        </button>
      </div>

      {/* Grid: 2 sections (Sandbox & Configuration list) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Sandbox: Price Checker */}
        <div className="card" style={{ sticky: 'top', top: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="var(--primary)" />
            Hộp cát Tra cứu giá
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
            Nhập loại phòng và ngày bất kỳ để kiểm tra mức giá thực tế sẽ áp dụng.
          </p>

          <form onSubmit={handlePriceLookup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label>Loại phòng</label>
              <select
                value={lookupParams.roomTypeId}
                onChange={(e) => setLookupParams(prev => ({ ...prev, roomTypeId: e.target.value }))}
                required
              >
                {roomTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Ngày tra cứu</label>
              <input
                type="date"
                value={lookupParams.date}
                onChange={(e) => setLookupParams(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>

            <button type="submit" className="btn btn-secondary" disabled={loadingLookup} style={{ alignSelf: 'flex-start' }}>
              <Search size={14} /> Tra cứu ngay
            </button>
          </form>

          {/* Results dashboard */}
          {lookupResult && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>Kết quả áp dụng</h3>
              
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ngày tra cứu:</span>
                <div style={{ fontSize: '14px', fontWeight: '600' }}>{lookupResult.date}</div>
              </div>

              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Đơn giá phòng:</span>
                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)' }}>
                  {lookupResult.price?.toLocaleString('vi-VN')} VND
                </div>
              </div>

              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block' }}>Nguồn gốc giá:</span>
                <span className={`badge ${lookupResult.isSeasonalRate ? 'badge-new' : 'badge-confirmed'}`}>
                  {lookupResult.priceSource === 'SEASONAL_RATE' ? 'Giá theo mùa cao điểm' : 'Giá phòng cơ bản mặc định'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Configuration list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Permission advice */}
          {user.role !== 'ADMIN' && user.role !== 'OWNER' && (
            <div className="card" style={{ padding: '12px 16px', borderLeft: '4px solid var(--color-cleaning)', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <AlertCircle size={18} color="var(--color-cleaning)" />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Tài khoản của bạn ({user.role}) có quyền đọc. Chỉ quản trị viên **ADMIN** hoặc chủ sở hữu **OWNER** mới có quyền thay đổi bảng phí này.
              </span>
            </div>
          )}

          {/* Config table */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
              <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Loại phòng</th>
                    <th>Ngày bắt đầu</th>
                    <th>Ngày kết thúc</th>
                    <th>Mức giá theo mùa</th>
                    <th style={{ textAlign: 'right' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.length > 0 ? (
                    rates.map(rate => (
                      <tr key={rate.id}>
                        <td><strong>{rate.roomTypeName}</strong></td>
                        <td>{rate.startDate}</td>
                        <td>{rate.endDate}</td>
                        <td style={{ fontWeight: '700', color: 'var(--color-available)' }}>
                          {rate.price?.toLocaleString('vi-VN')} đ
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {(user.role === 'ADMIN' || user.role === 'OWNER') ? (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button onClick={() => openEditModal(rate)} className="btn btn-secondary btn-sm" title="Sửa cấu hình">
                                <Edit size={14} />
                              </button>
                              <button onClick={() => handleDeleteRate(rate.id)} className="btn btn-secondary btn-sm" style={{ color: 'var(--color-maintenance)' }} title="Xóa">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Không có quyền</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px' }}>Chưa có cấu hình giá theo mùa nào được thiết lập.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* CREATE / EDIT SEASONAL RATE MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', margin: 0 }}>
                {modalMode === 'create' ? 'Cấu hình giá phòng theo mùa' : 'Cập nhật cấu hình giá phòng'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleRateSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label>Loại phòng áp dụng *</label>
                  <select
                    value={formData.roomTypeId}
                    onChange={(e) => setFormData(prev => ({ ...prev, roomTypeId: e.target.value }))}
                    required
                  >
                    {roomTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name} (Giá gốc: {t.basePrice.toLocaleString()} đ)</option>
                    ))}
                  </select>
                </div>

                <div className="grid-2">
                  <div>
                    <label>Ngày bắt đầu *</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label>Ngày kết thúc *</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label>Giá áp dụng mới (VND/đêm) *</label>
                  <input
                    type="number"
                    min="1"
                    step="10000"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm">Hủy</button>
                <button type="submit" className="btn btn-primary btn-sm">
                  {modalMode === 'create' ? 'Lưu cấu hình' : 'Lưu cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Rates;
