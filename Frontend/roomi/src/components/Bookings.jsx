import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  Search, 
  Plus, 
  Calendar, 
  User, 
  Phone, 
  Layers, 
  Clipboard, 
  Tag, 
  X, 
  Check, 
  AlertCircle,
  HelpCircle,
  TrendingUp,
  DollarSign,
  Coffee,
  Bookmark,
  RefreshCw
} from 'lucide-react';

function Bookings({ user, showNotification }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomTypes, setRoomTypes] = useState([]);

  // Search Fields
  const [searchParams, setSearchParams] = useState({
    guestName: '',
    phone: '',
    idNumber: '',
    roomTypeId: '',
    fromDate: '',
    toDate: ''
  });

  // Modal / Drawer States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showChangeRoomModal, setShowChangeRoomModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Create Booking Form State
  const [newBooking, setNewBooking] = useState({
    fullName: '',
    phone: '',
    idNumber: '',
    email: '',
    roomTypeId: '',
    roomId: '',
    checkInDate: '',
    checkOutDate: '',
    source: 'WALK_IN',
    note: ''
  });

  // Assign & Change Room States
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [filterRoomTypeId, setFilterRoomTypeId] = useState('');
  const [changeReason, setChangeReason] = useState('');

  // Invoice & Surcharge states
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [servicesCatalog, setServicesCatalog] = useState([]);
  const [surchargeInput, setSurchargeInput] = useState({ surchargeServiceId: '', quantity: 1, note: '' });

  // Fetch initial data
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [bookingsRes, typesRes] = await Promise.all([
        api.get('/bookings'),
        api.get('/room-types')
      ]);

      if (bookingsRes.data && bookingsRes.data.data) {
        setBookings(bookingsRes.data.data);
      }
      if (typesRes.data && typesRes.data.data) {
        setRoomTypes(typesRes.data.data);
      }
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Search bookings
  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const params = {};
      Object.keys(searchParams).forEach(key => {
        if (searchParams[key]) {
          params[key] = searchParams[key];
        }
      });

      const res = await api.get('/bookings/search', { params });
      if (res.data && res.data.data) {
        setBookings(res.data.data);
        showNotification('Tìm kiếm hoàn tất!');
      }
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSearch = () => {
    setSearchParams({
      guestName: '',
      phone: '',
      idNumber: '',
      roomTypeId: '',
      fromDate: '',
      toDate: ''
    });
    fetchInitialData();
  };

  // Fetch available rooms for checkin-checkout dates and type
  const fetchAvailableRooms = async (typeId, checkIn, checkOut) => {
    if (!checkIn || !checkOut) return;
    try {
      setLoadingRooms(true);
      const params = { checkIn, checkOut };
      if (typeId) {
        params.roomTypeId = typeId;
      }
      const res = await api.get('/calendar/available-rooms', { params });
      if (res.data && res.data.data) {
        setAvailableRooms(res.data.data);
      }
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoadingRooms(false);
    }
  };

  // Trigger loading available rooms when creating booking
  useEffect(() => {
    if (newBooking.roomTypeId && newBooking.checkInDate && newBooking.checkOutDate) {
      fetchAvailableRooms(newBooking.roomTypeId, newBooking.checkInDate, newBooking.checkOutDate);
    } else {
      setAvailableRooms([]);
    }
  }, [newBooking.roomTypeId, newBooking.checkInDate, newBooking.checkOutDate]);

  // Create booking submit
  const handleCreateBooking = async (e) => {
    e.preventDefault();
    if (newBooking.checkOutDate <= newBooking.checkInDate) {
      showNotification('Ngày trả phòng phải sau ngày nhận phòng', 'error');
      return;
    }

    try {
      const payload = { ...newBooking };
      if (!payload.roomId) {
        delete payload.roomId; // clean field if empty
      } else {
        payload.roomId = parseInt(payload.roomId);
      }
      payload.roomTypeId = parseInt(payload.roomTypeId);

      await api.post('/bookings', payload);
      showNotification('Đặt phòng thành công!');
      setShowCreateModal(false);
      // Reset form
      setNewBooking({
        fullName: '',
        phone: '',
        idNumber: '',
        email: '',
        roomTypeId: '',
        roomId: '',
        checkInDate: '',
        checkOutDate: '',
        source: 'WALK_IN',
        note: ''
      });
      fetchInitialData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Assign room dialog trigger
  const openAssignModal = (booking) => {
    setSelectedBooking(booking);
    setSelectedRoomId('');
    setFilterRoomTypeId(booking.roomTypeId || '');
    setShowAssignModal(true);
    fetchAvailableRooms(booking.roomTypeId, booking.checkInDate, booking.checkOutDate);
  };

  const handleAssignRoom = async (e) => {
    e.preventDefault();
    if (!selectedRoomId) return;
    try {
      const selectedRoom = availableRooms.find(r => r.roomId === parseInt(selectedRoomId));
      if (selectedRoom && selectedRoom.roomTypeId !== selectedBooking.roomTypeId) {
        // Cập nhật loại phòng trước khi gán
        const updatePayload = {
          fullName: selectedBooking.guestFullName || selectedBooking.guestName,
          phone: selectedBooking.guestPhone,
          idNumber: selectedBooking.guestIdNumber,
          email: selectedBooking.guestEmail,
          roomTypeId: selectedRoom.roomTypeId,
          roomId: null,
          checkInDate: selectedBooking.checkInDate,
          checkOutDate: selectedBooking.checkOutDate,
          source: selectedBooking.source,
          note: selectedBooking.note
        };
        await api.put(`/bookings/${selectedBooking.id}`, updatePayload);
      }

      await api.patch(`/bookings/${selectedBooking.id}/assign-room`, null, {
        params: { roomId: parseInt(selectedRoomId) }
      });
      showNotification('Gán phòng thành công');
      setShowAssignModal(false);
      fetchInitialData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Change room trigger
  const openChangeRoomModal = (booking) => {
    setSelectedBooking(booking);
    setSelectedRoomId('');
    setChangeReason('');
    setShowChangeRoomModal(true);
    fetchAvailableRooms(booking.roomTypeId, booking.checkInDate, booking.checkOutDate);
  };

  const handleChangeRoomSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRoomId) return;
    try {
      const selectedRoom = availableRooms.find(r => r.roomId === parseInt(selectedRoomId));
      
      if (selectedRoom && selectedRoom.roomTypeId !== selectedBooking.roomTypeId) {
        // Cập nhật loại phòng trước. Khi đổi loại phòng ở Backend, phòng cũ sẽ được set = null.
        const updatePayload = {
          fullName: selectedBooking.guestFullName || selectedBooking.guestName,
          phone: selectedBooking.guestPhone,
          idNumber: selectedBooking.guestIdNumber,
          email: selectedBooking.guestEmail,
          roomTypeId: selectedRoom.roomTypeId,
          roomId: selectedBooking.roomId,
          checkInDate: selectedBooking.checkInDate,
          checkOutDate: selectedBooking.checkOutDate,
          source: selectedBooking.source,
          note: selectedBooking.note
        };
        await api.put(`/bookings/${selectedBooking.id}`, updatePayload);
        
        // Vì phòng cũ bị chuyển về null, ta gọi assign-room thay vì change-room
        await api.patch(`/bookings/${selectedBooking.id}/assign-room`, null, {
          params: { roomId: parseInt(selectedRoomId) }
        });
      } else {
        await api.patch(`/bookings/${selectedBooking.id}/change-room`, {
          roomId: parseInt(selectedRoomId),
          reason: changeReason
        });
      }

      showNotification('Đổi phòng thành công');
      setShowChangeRoomModal(false);
      fetchInitialData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Booking action workflow transitions
  const handleTransition = async (bookingId, transition) => {
    try {
      await api.patch(`/bookings/${bookingId}/${transition}`);
      showNotification('Cập nhật trạng thái thành công');
      fetchInitialData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đặt phòng này?')) return;
    try {
      await api.delete(`/bookings/${bookingId}`);
      showNotification('Đã xóa đặt phòng thành công');
      fetchInitialData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Fetch surcharge catalog
  const fetchServices = async () => {
    try {
      const res = await api.get('/surcharge-services?activeOnly=true');
      if (res.data && res.data.data) {
        setServicesCatalog(res.data.data);
        if (res.data.data.length > 0) {
          setSurchargeInput(prev => ({ ...prev, surchargeServiceId: res.data.data[0].id }));
        }
      }
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Invoice management
  const openInvoiceModal = async (booking) => {
    setSelectedBooking(booking);
    try {
      const res = await api.get(`/bookings/${booking.id}/invoice`);
      if (res.data && res.data.data) {
        setActiveInvoice(res.data.data);
        setShowInvoiceModal(true);
      }
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleAddSurcharge = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/bookings/${selectedBooking.id}/service-usages`, {
        surchargeServiceId: parseInt(surchargeInput.surchargeServiceId),
        quantity: parseInt(surchargeInput.quantity),
        note: surchargeInput.note
      });
      showNotification('Đã thêm dịch vụ phát sinh');
      setSurchargeInput(prev => ({ ...prev, quantity: 1, note: '' }));
      setShowServiceModal(false);
      // reload invoice
      openInvoiceModal(selectedBooking);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleDeleteSurchargeUsage = async (usageId) => {
    try {
      await api.delete(`/bookings/${selectedBooking.id}/service-usages/${usageId}`);
      showNotification('Đã xóa dịch vụ');
      openInvoiceModal(selectedBooking);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const getSourceLabel = (src) => {
    switch (src) {
      case 'WALK_IN': return 'Trực tiếp (Walk-in)';
      case 'PHONE': return 'Qua điện thoại';
      case 'EXTERNAL_CHANNEL': return 'Kênh bên ngoài';
      case 'BOOKING_PORTAL': return 'Cổng Booking';
      default: return src;
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý đặt phòng</h1>
          <p className="page-subtitle">Quản lý đặt chỗ, gán phòng, nhận phòng và thanh toán hóa đơn</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          <Plus size={18} />
          Đặt phòng mới
        </button>
      </div>

      {/* Search Panel */}
      <form onSubmit={handleSearch} className="card" style={{ marginBottom: '24px', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
          <div>
            <label>Tên khách hàng</label>
            <input 
              type="text" 
              placeholder="VD: Nguyễn Văn A"
              value={searchParams.guestName}
              onChange={(e) => setSearchParams(prev => ({ ...prev, guestName: e.target.value }))}
            />
          </div>
          <div>
            <label>Số điện thoại</label>
            <input 
              type="text" 
              placeholder="VD: 0901234567"
              value={searchParams.phone}
              onChange={(e) => setSearchParams(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>
          <div>
            <label>CCCD / Identity</label>
            <input 
              type="text" 
              placeholder="VD: 0012003..."
              value={searchParams.idNumber}
              onChange={(e) => setSearchParams(prev => ({ ...prev, idNumber: e.target.value }))}
            />
          </div>
          <div>
            <label>Loại phòng</label>
            <select
              value={searchParams.roomTypeId}
              onChange={(e) => setSearchParams(prev => ({ ...prev, roomTypeId: e.target.value }))}
            >
              <option value="">Tất cả loại phòng</option>
              {roomTypes.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Từ ngày</label>
            <input 
              type="date"
              value={searchParams.fromDate}
              onChange={(e) => setSearchParams(prev => ({ ...prev, fromDate: e.target.value }))}
            />
          </div>
          <div>
            <label>Đến ngày</label>
            <input 
              type="date"
              value={searchParams.toDate}
              onChange={(e) => setSearchParams(prev => ({ ...prev, toDate: e.target.value }))}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button type="button" onClick={handleResetSearch} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} /> Reset
          </button>
          <button type="submit" className="btn btn-primary btn-sm">
            <Search size={14} /> Tìm kiếm
          </button>
        </div>
      </form>

      {/* Bookings List Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
          <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Mã đặt</th>
                <th>Khách hàng</th>
                <th>Thông tin phòng</th>
                <th>Ngày ở</th>
                <th>Đêm</th>
                <th>Nguồn đặt</th>
                <th>Trạng thái</th>
                <th>Tổng thanh toán</th>
                <th style={{ textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length > 0 ? (
                bookings.map(b => (
                  <tr key={b.id}>
                    <td><strong>{b.id}</strong></td>
                    <td>
                      <div><strong>{b.guestName}</strong></div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{b.guestPhone}</div>
                      {b.guestIdNumber && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>CCCD: {b.guestIdNumber}</div>
                      )}
                    </td>
                    <td>
                      <div><strong>{b.roomTypeName}</strong></div>
                      {b.roomNumber ? (
                        <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '600' }}>Phòng {b.roomNumber}</div>
                      ) : (
                        <span className="badge badge-new" style={{ fontSize: '10px', padding: '1px 6px', marginTop: '4px' }}>Chưa gán phòng</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '13px' }}>{b.checkInDate} <span style={{ color: 'var(--text-muted)' }}>tới</span></div>
                      <div style={{ fontSize: '13px' }}>{b.checkOutDate}</div>
                    </td>
                    <td>{b.nights}</td>
                    <td style={{ fontSize: '12px' }}>{getSourceLabel(b.source)}</td>
                    <td>
                      <span className={`badge badge-${b.status.toLowerCase()}`}>
                        {b.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: '600' }}>
                      {(b.totalAmount || b.expectedPrice)?.toLocaleString('vi-VN')} đ
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        
                        {/* Status transition actions */}
                        {b.status === 'NEW' && (
                          b.roomNumber ? (
                            <button onClick={() => handleTransition(b.id, 'check-in')} className="btn btn-primary btn-sm" title="Nhận phòng (Check-in)">
                              Nhận phòng
                            </button>
                          ) : (
                            <button onClick={() => openAssignModal(b)} className="btn btn-primary btn-sm" title="Gán phòng">
                              Gán phòng
                            </button>
                          )
                        )}

                        {b.status === 'CONFIRMED' && (
                          <>
                            <button onClick={() => handleTransition(b.id, 'check-in')} className="btn btn-primary btn-sm" title="Nhận phòng (Check-in)">
                              Nhận phòng
                            </button>
                            <button onClick={() => openChangeRoomModal(b)} className="btn btn-secondary btn-sm" title="Đổi phòng">
                              Đổi phòng
                            </button>
                          </>
                        )}

                        {b.status === 'CHECKED_IN' && (
                          <>
                            <button onClick={() => openInvoiceModal(b)} className="btn btn-secondary btn-sm" style={{ color: 'var(--color-available)', fontWeight: '600' }} title="Thanh toán & Trả phòng (Check-out)">
                              Trả phòng
                            </button>
                            <button onClick={() => openChangeRoomModal(b)} className="btn btn-secondary btn-sm" title="Đổi phòng">
                              Đổi phòng
                            </button>
                          </>
                        )}

                        {(b.status === 'CHECKED_OUT' || b.status === 'CANCELLED') && (
                          <button onClick={() => openInvoiceModal(b)} className="btn btn-secondary btn-sm" title="Xem hóa đơn">
                            Hóa đơn
                          </button>
                        )}

                        {/* Admin/Owner cancel action */}
                        {b.status !== 'CHECKED_OUT' && b.status !== 'CANCELLED' && (
                          <button onClick={() => handleTransition(b.id, 'cancel')} className="btn btn-secondary btn-sm" style={{ color: 'var(--color-maintenance)' }} title="Hủy đặt phòng">
                            Hủy
                          </button>
                        )}

                        {/* Admin delete action */}
                        {user.role === 'ADMIN' && (
                          <button onClick={() => handleDeleteBooking(b.id)} className="btn btn-secondary btn-sm" style={{ color: 'var(--color-maintenance)', padding: '6px 10px' }} title="Xóa vĩnh viễn">
                            Xóa
                          </button>
                        )}

                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px' }}>Không tìm thấy lịch đặt phòng nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE BOOKING MODAL */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', margin: 0 }}>Tạo Đặt Phòng Mới</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateBooking}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Guest Info section */}
                <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Thông tin khách hàng</h3>
                <div className="grid-2">
                  <div>
                    <label>Họ và tên *</label>
                    <input 
                      type="text" 
                      placeholder="Nguyễn Văn A" 
                      value={newBooking.fullName}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, fullName: e.target.value }))}
                      required 
                    />
                  </div>
                  <div>
                    <label>Số điện thoại *</label>
                    <input 
                      type="tel" 
                      placeholder="0901234567" 
                      value={newBooking.phone}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, phone: e.target.value }))}
                      required 
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div>
                    <label>CCCD / ID Số định danh *</label>
                    <input 
                      type="text" 
                      placeholder="Số định danh" 
                      value={newBooking.idNumber}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, idNumber: e.target.value }))}
                      required 
                    />
                  </div>
                  <div>
                    <label>Email (tùy chọn)</label>
                    <input 
                      type="email" 
                      placeholder="nguyen@email.com" 
                      value={newBooking.email}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Booking Info section */}
                <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginTop: '10px' }}>Thông tin đặt phòng</h3>
                
                <div className="grid-2">
                  <div>
                    <label>Ngày nhận phòng (Check-in) *</label>
                    <input 
                      type="date" 
                      value={newBooking.checkInDate}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, checkInDate: e.target.value }))}
                      required 
                    />
                  </div>
                  <div>
                    <label>Ngày trả phòng (Check-out) *</label>
                    <input 
                      type="date" 
                      value={newBooking.checkOutDate}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, checkOutDate: e.target.value }))}
                      required 
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div>
                    <label>Loại phòng *</label>
                    <select
                      value={newBooking.roomTypeId}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, roomTypeId: e.target.value, roomId: '' }))}
                      required
                    >
                      <option value="">-- Chọn Loại phòng --</option>
                      {roomTypes.map(t => (
                        <option key={t.id} value={t.id}>{t.name} (Giá mặc định: {t.basePrice.toLocaleString()} đ)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Gán phòng trống (Không bắt buộc)</label>
                    <select
                      value={newBooking.roomId}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, roomId: e.target.value }))}
                      disabled={loadingRooms || availableRooms.length === 0}
                    >
                      {loadingRooms ? (
                        <option>Đang quét phòng trống...</option>
                      ) : availableRooms.length > 0 ? (
                        <>
                          <option value="">-- Để gán phòng sau --</option>
                          {availableRooms.map(r => (
                            <option key={r.roomId} value={r.roomId}>Phòng {r.roomNumber} (Tầng {r.floor})</option>
                          ))}
                        </>
                      ) : (
                        <option value="">-- Vui lòng chọn Ngày & Loại phòng để quét --</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid-2">
                  <div>
                    <label>Nguồn đặt phòng</label>
                    <select
                      value={newBooking.source}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, source: e.target.value }))}
                    >
                      <option value="WALK_IN">Trực tiếp (Walk-in)</option>
                      <option value="PHONE">Qua điện thoại</option>
                      <option value="EXTERNAL_CHANNEL">Kênh bên ngoài</option>
                      <option value="BOOKING_PORTAL">Cổng Booking</option>
                    </select>
                  </div>
                  <div>
                    <label>Ghi chú</label>
                    <input 
                      type="text" 
                      placeholder="Yêu cầu đặc biệt..." 
                      value={newBooking.note}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, note: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Estimate Price banner */}
                {availableRooms.length > 0 && (
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: 'var(--primary-glow)',
                    border: '1px solid var(--primary)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '8px'
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Giá ước tính ({availableRooms[0].nights} đêm):</span>
                    <strong style={{ fontSize: '16px', color: 'var(--primary)' }}>
                      {availableRooms[0].expectedPrice?.toLocaleString()} VND
                    </strong>
                  </div>
                )}

              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary btn-sm">Hủy</button>
                <button type="submit" className="btn btn-primary btn-sm">Tạo booking</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN ROOM MODAL */}
      {showAssignModal && selectedBooking && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', margin: 0 }}>Gán phòng cho {selectedBooking.id}</h2>
              <button onClick={() => setShowAssignModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleAssignRoom}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '14px' }}>
                  Khách hàng: <strong>{selectedBooking.guestName}</strong> <br />
                  Loại phòng yêu cầu: <strong>{selectedBooking.roomTypeName}</strong> <br />
                  Thời gian: <strong>{selectedBooking.checkInDate} → {selectedBooking.checkOutDate}</strong>
                </p>

                <div>
                  <label>Lọc theo loại phòng</label>
                  <select
                    value={filterRoomTypeId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFilterRoomTypeId(val);
                      fetchAvailableRooms(val ? parseInt(val) : null, selectedBooking.checkInDate, selectedBooking.checkOutDate);
                    }}
                  >
                    <option value="">-- Tất cả loại phòng --</option>
                    {roomTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Chọn phòng trống phù hợp *</label>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    required
                    disabled={loadingRooms}
                  >
                    {loadingRooms ? (
                      <option>Đang tìm phòng trống...</option>
                    ) : availableRooms.length > 0 ? (
                      <>
                        <option value="">-- Chọn phòng --</option>
                        {availableRooms.map(r => (
                          <option key={r.roomId} value={r.roomId}>Phòng {r.roomNumber} - {r.roomTypeName} (Tầng {r.floor})</option>
                        ))}
                      </>
                    ) : (
                      <option value="">Không có phòng trống nào trong thời gian này!</option>
                    )}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAssignModal(false)} className="btn btn-secondary btn-sm">Hủy</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={!selectedRoomId}>Gán phòng</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE ROOM MODAL */}
      {showChangeRoomModal && selectedBooking && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', margin: 0 }}>Đổi phòng cho {selectedBooking.id}</h2>
              <button onClick={() => setShowChangeRoomModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleChangeRoomSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '13px' }}>
                  Phòng hiện tại: <strong>Phòng {selectedBooking.roomNumber}</strong> ({selectedBooking.roomTypeName}) <br />
                  Thời gian: <strong>{selectedBooking.checkInDate} → {selectedBooking.checkOutDate}</strong>
                </p>

                <div>
                  <label>Chọn phòng mới trong cùng loại *</label>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    required
                    disabled={loadingRooms}
                  >
                    {loadingRooms ? (
                      <option>Đang tìm phòng trống...</option>
                    ) : availableRooms.length > 0 ? (
                      <>
                        <option value="">-- Chọn phòng muốn đổi sang --</option>
                        {availableRooms.filter(r => r.roomId !== selectedBooking.roomId).map(r => (
                          <option key={r.roomId} value={r.roomId}>Phòng {r.roomNumber} (Tầng {r.floor})</option>
                        ))}
                      </>
                    ) : (
                      <option value="">Không có phòng khác trống trong thời gian này!</option>
                    )}
                  </select>
                </div>

                <div>
                  <label>Lý do đổi phòng</label>
                  <input 
                    type="text" 
                    placeholder="Khách muốn tầng cao hơn, sự cố kĩ thuật..." 
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowChangeRoomModal(false)} className="btn btn-secondary btn-sm">Hủy</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={!selectedRoomId}>Đổi phòng</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BILLING / INVOICE VIEW MODAL */}
      {showInvoiceModal && activeInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clipboard size={18} color="var(--primary)" />
                Chi tiết Hóa đơn thanh toán
              </h2>
              <button onClick={() => setShowInvoiceModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div className="modal-body">
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                <div>
                  <p><strong>Khách hàng:</strong> {activeInvoice.guestFullName || selectedBooking.guestName}</p>
                  <p><strong>Số điện thoại:</strong> {selectedBooking.guestPhone || 'Không có'}</p>
                  <p><strong>CCCD / ID:</strong> {selectedBooking.guestIdNumber || 'Không có'}</p>
                  <p><strong>Phòng đặt:</strong> {selectedBooking.roomNumber ? `Phòng ${selectedBooking.roomNumber}` : 'Chưa gán'} ({selectedBooking.roomTypeName})</p>
                </div>
                <div>
                  <p><strong>Số đêm:</strong> {activeInvoice.nights} đêm</p>
                  <p><strong>Trạng thái hóa đơn:</strong> <span className={`badge badge-${activeInvoice.status?.toLowerCase() || 'pending'}`}>{activeInvoice.status || 'PENDING'}</span></p>
                </div>
              </div>

              <h3 style={{ fontSize: '13px', marginBottom: '8px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Phí thuê phòng</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '14px' }}>
                <span>Tiền phòng ({activeInvoice.nights} đêm)</span>
                <strong>{activeInvoice.roomCharge?.toLocaleString('vi-VN')} VND</strong>
              </div>

              {/* Service usages list */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>Dịch vụ phụ thu</h3>
                {activeInvoice.status !== 'PAID' && (
                  <button 
                    onClick={() => { fetchServices(); setShowServiceModal(true); }}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                  >
                    <Plus size={10} /> Thêm phụ thu
                  </button>
                )}
              </div>

              <div className="table-container" style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '20px' }}>
                <table style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Dịch vụ</th>
                      <th>Đơn giá</th>
                      <th>SL</th>
                      <th style={{ textAlign: 'right' }}>Thành tiền</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeInvoice.serviceUsages && activeInvoice.serviceUsages.length > 0 ? (
                      activeInvoice.serviceUsages.map(u => (
                        <tr key={u.id}>
                          <td>
                            <div><strong>{u.serviceName}</strong></div>
                            {u.note && <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{u.note}</div>}
                          </td>
                          <td>{u.unitPrice?.toLocaleString('vi-VN')}</td>
                          <td>{u.quantity}</td>
                          <td style={{ textAlign: 'right', fontWeight: '600' }}>{u.lineTotal?.toLocaleString('vi-VN')}</td>
                          <td>
                            {activeInvoice.status !== 'PAID' && (
                              <button 
                                onClick={() => handleDeleteSurchargeUsage(u.id)}
                                style={{ background: 'none', border: 'none', color: 'var(--color-maintenance)', cursor: 'pointer' }}
                              >
                                <X size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '16px' }}>Không có dịch vụ phát sinh.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Invoice breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>Tiền thuê phòng:</span>
                  <span>{activeInvoice.roomCharge?.toLocaleString('vi-VN')} VND</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>Tiền dịch vụ phụ thu:</span>
                  <span>{activeInvoice.serviceCharge?.toLocaleString('vi-VN')} VND</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-maintenance)' }}>
                  <span>Giảm giá (Discount):</span>
                  <span>- {activeInvoice.discount?.toLocaleString('vi-VN') || 0} VND</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px', color: 'var(--primary)' }}>
                  <span>Tổng tiền thanh toán:</span>
                  <span>{activeInvoice.totalAmount?.toLocaleString('vi-VN')} VND</span>
                </div>
              </div>

            </div>
            <div className="modal-footer">
              <button onClick={() => setShowInvoiceModal(false)} className="btn btn-secondary btn-sm">Đóng</button>
              {activeInvoice.status !== 'PAID' && selectedBooking.status === 'CHECKED_IN' && (
                <button 
                  onClick={() => { 
                    handleTransition(selectedBooking.id, 'check-out');
                    setShowInvoiceModal(false);
                  }} 
                  className="btn btn-primary btn-sm"
                >
                  <Check size={14} /> Xác nhận thanh toán & Trả phòng (Check-out)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SURCHARGE ADD MODAL */}
      {showServiceModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', margin: 0 }}>Ghi nhận dịch vụ phát sinh</h2>
              <button onClick={() => setShowServiceModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleAddSurcharge}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label>Chọn dịch vụ</label>
                  <select 
                    value={surchargeInput.surchargeServiceId} 
                    onChange={(e) => setSurchargeInput(prev => ({ ...prev, surchargeServiceId: e.target.value }))}
                    required
                  >
                    {servicesCatalog.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.unitPrice.toLocaleString('vi-VN')} đ/{s.description || 'lượt'})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Số lượng</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={surchargeInput.quantity} 
                    onChange={(e) => setSurchargeInput(prev => ({ ...prev, quantity: e.target.value }))}
                    required 
                  />
                </div>
                <div>
                  <label>Ghi chú</label>
                  <input 
                    type="text" 
                    placeholder="Ghi chú chi tiết dịch vụ..." 
                    value={surchargeInput.note} 
                    onChange={(e) => setSurchargeInput(prev => ({ ...prev, note: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowServiceModal(false)} className="btn btn-secondary btn-sm">Hủy</button>
                <button type="submit" className="btn btn-primary btn-sm">Ghi nhận</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Bookings;
