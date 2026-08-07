import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import PageLoader from '../components/PageLoader';
import { getTierLabel } from '../utils/formatters';
import { 
  Search, 
  Plus, 
  User, 
  Phone, 
  Mail, 
  ClipboardList, 
  Edit, 
  Trash2, 
  X, 
  Calendar,
  History
} from 'lucide-react';


function Guests({ user, showNotification }) {

  const isAuthorized = user?.role === 'RECEPTIONIST' || user?.role === 'ACCOUNTANT' || user?.role === 'ADMIN' || user?.role === 'OWNER';

  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('name'); // 'name' | 'phone'

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [guestHistory, setGuestHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    idNumber: '',
    email: ''
  });

  const fetchGuests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/guests');
      if (res.data && res.data.data) {
        setGuests(res.data.data);
      }
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuests();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchGuests();
      return;
    }
    try {
      setLoading(true);
      if (searchType === 'phone') {
        const res = await api.get(`/guests/phone/${searchQuery.trim()}`);
        if (res.data && res.data.data) {
          setGuests([res.data.data]);
        } else {
          setGuests([]);
        }
      } else {
        const res = await api.get(`/guests/search`, {
          params: { name: searchQuery.trim() }
        });
        if (res.data && res.data.data) {
          setGuests(res.data.data);
        }
      }
    } catch (err) {
      if (searchType === 'phone' && err.message?.includes('404')) {
        setGuests([]);
      } else {
        showNotification(err.message || 'Lỗi tìm kiếm khách hàng', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGuest = async (e) => {
    e.preventDefault();
    try {
      await api.post('/guests', formData);
      showNotification('Tạo thông tin khách hàng thành công');
      setShowAddModal(false);
      setFormData({ fullName: '', phone: '', idNumber: '', email: '' });
      fetchGuests();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const openEditModal = (guest) => {
    setSelectedGuest(guest);
    setFormData({
      fullName: guest.fullName,
      phone: guest.phone,
      idNumber: guest.idNumber,
      email: guest.email || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateGuest = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/guests/${selectedGuest.id}`, formData);
      showNotification('Cập nhật thông tin khách hàng thành công');
      setShowEditModal(false);
      setFormData({ fullName: '', phone: '', idNumber: '', email: '' });
      fetchGuests();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleDeleteGuest = async (guestId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thông tin khách hàng này?')) return;
    try {
      await api.delete(`/guests/${guestId}`);
      showNotification('Đã xóa thông tin khách hàng thành công');
      fetchGuests();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // View booking history
  const openHistoryModal = async (guest) => {
    setSelectedGuest(guest);
    setShowHistoryModal(true);
    try {
      setLoadingHistory(true);
      const res = await api.get(`/bookings/guest/${guest.id}`);
      if (res.data && res.data.data) {
        setGuestHistory(res.data.data);
      }
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

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
        <User size={48} color="var(--color-maintenance)" />
        <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Từ chối truy cập</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', fontSize: '14px' }}>
          Tài khoản của bạn không có đủ thẩm quyền để truy cập trang quản lý khách hàng.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý khách hàng</h1>
          <p className="page-subtitle">Xem thông tin chi tiết, hồ sơ lưu trú và lịch sử giao dịch của khách hàng</p>
        </div>
        {(user.role === 'OWNER' || user.role === 'RECEPTIONIST') && (
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            <Plus size={18} />
            Thêm khách hàng
          </button>
        )}
      </div>

      {/* Search Filter */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
          <div style={{ width: '150px' }}>
            <select
              value={searchType}
              onChange={(e) => {
                setSearchType(e.target.value);
                setSearchQuery('');
                fetchGuests();
              }}
              style={{ height: '100%', padding: '10px' }}
            >
              <option value="name">Tìm theo Tên</option>
              <option value="phone">Tìm theo SĐT</option>
            </select>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder={searchType === 'phone' ? "Nhập số điện thoại khách hàng..." : "Nhập tên khách hàng cần tìm..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
          </div>
          <button type="submit" className="btn btn-primary">Tìm kiếm</button>
          {searchQuery && (
            <button 
              type="button" 
              onClick={() => { setSearchQuery(''); fetchGuests(); }} 
              className="btn btn-secondary"
            >
              Xóa lọc
            </button>
          )}
        </form>
      </div>

      {/* Guest Table */}
      {loading ? (
        <PageLoader />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Họ và tên</th>
                <th>Số điện thoại</th>
                <th>Số CCCD / ID Card</th>
                <th>Email</th>
                <th>Hạng thành viên</th>
                <th>Điểm tích lũy</th>
                <th style={{ textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {guests.length > 0 ? (
                guests.map(g => (
                  <tr key={g.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--primary-glow)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--primary)',
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}>
                          {g.fullName ? g.fullName.charAt(0).toUpperCase() : 'G'}
                        </div>
                        <strong>{g.fullName}</strong>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={14} color="var(--text-secondary)" />
                        <span>{g.phone}</span>
                      </div>
                    </td>
                    <td>{g.idNumber}</td>
                    <td>
                      {g.email ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Mail size={14} color="var(--text-secondary)" />
                          <span>{g.email}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Chưa cập nhật</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-tier-${(g.loyaltyTier || 'MEMBER').toLowerCase()}`} style={{ fontWeight: 'bold' }}>
                        {getTierLabel(g.loyaltyTier)}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--primary)' }}>{g.loyaltyPoints || 0}</strong> Pts
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => openHistoryModal(g)} 
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--primary)' }}
                          title="Lịch sử đặt phòng"
                        >
                          <History size={14} />
                          Lịch sử đặt
                        </button>
                        {(user.role === 'OWNER' || user.role === 'RECEPTIONIST') && (
                          <>
                            <button 
                              onClick={() => openEditModal(g)} 
                              className="btn btn-secondary btn-sm"
                              title="Chỉnh sửa"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteGuest(g.id)} 
                              className="btn btn-secondary btn-sm"
                              style={{ color: 'var(--color-maintenance)' }}
                              title="Xóa"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px' }}>Không có thông tin khách hàng nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD GUEST MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', margin: 0 }}>Thêm khách hàng mới</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateGuest}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label>Họ và tên *</label>
                  <input
                    type="text"
                    placeholder="VD: Nguyễn Văn A"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label>Số điện thoại *</label>
                  <input
                    type="text"
                    placeholder="VD: 0901234567"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label>Số CCCD / ID Card *</label>
                  <input
                    type="text"
                    placeholder="VD: 001200300456"
                    value={formData.idNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, idNumber: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label>Địa chỉ Email</label>
                  <input
                    type="email"
                    placeholder="VD: nguyen@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary btn-sm">Hủy</button>
                <button type="submit" className="btn btn-primary btn-sm">Thêm mới</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT GUEST MODAL */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', margin: 0 }}>Chỉnh sửa thông tin khách hàng</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleUpdateGuest}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label>Họ và tên *</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label>Số điện thoại *</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label>Số CCCD / ID Card *</label>
                  <input
                    type="text"
                    value={formData.idNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, idNumber: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label>Địa chỉ Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary btn-sm">Hủy</button>
                <button type="submit" className="btn btn-primary btn-sm">Lưu cập nhật</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GUEST BOOKING HISTORY MODAL */}
      {showHistoryModal && selectedGuest && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardList size={18} color="var(--primary)" />
                Lịch sử đặt phòng của {selectedGuest.fullName}
              </h2>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Membership Card details */}
              <div className="card" style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', margin: 0 }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Hạng hội viên</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span className={`badge badge-tier-${(selectedGuest.loyaltyTier || 'MEMBER').toLowerCase()}`} style={{ fontSize: '13px', fontWeight: 'bold' }}>
                      {getTierLabel(selectedGuest.loyaltyTier)}
                    </span>
                    {selectedGuest.loyaltyBenefits && selectedGuest.loyaltyBenefits.length > 0 && (
                      <span style={{ fontSize: '12px', color: 'var(--color-available)', fontWeight: '500' }}>
                        ({selectedGuest.loyaltyBenefits.join(', ')})
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Điểm tích lũy</span>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)', marginTop: '4px' }}>
                    {selectedGuest.loyaltyPoints || 0} <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>điểm</span>
                  </div>
                </div>
              </div>

              {loadingHistory ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}>
                  <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : guestHistory.length > 0 ? (
                <div className="table-container" style={{ margin: '0' }}>
                  <table style={{ fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th>Mã đặt</th>
                        <th>Loại phòng</th>
                        <th>Số phòng</th>
                        <th>Thời gian</th>
                        <th>Trạng thái</th>
                        <th>Thanh toán</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guestHistory.map(b => (
                        <tr key={b.id}>
                          <td><strong>{b.id}</strong></td>
                          <td>{b.roomTypeName}</td>
                          <td>{b.roomNumber ? <strong>Phòng {b.roomNumber}</strong> : <span style={{ color: 'var(--text-muted)' }}>Chưa gán</span>}</td>
                          <td>
                            <div>{b.checkInDate}</div>
                            <div>{b.checkOutDate}</div>
                          </td>
                          <td>
                            <span className={`badge badge-${b.status.toLowerCase()}`} style={{ fontSize: '9px', padding: '1px 6px' }}>
                              {b.status}
                            </span>
                          </td>
                          <td style={{ fontWeight: '600' }}>{(b.totalAmount || b.expectedPrice).toLocaleString()} đ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>Khách hàng này chưa từng đặt phòng nào trước đây.</p>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowHistoryModal(false)} className="btn btn-secondary btn-sm">Đóng</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Guests;
