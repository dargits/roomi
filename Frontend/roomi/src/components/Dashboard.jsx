import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  Grid, 
  Calendar, 
  Layers, 
  User, 
  Clock, 
  Plus, 
  AlertCircle, 
  Wrench, 
  Sparkles, 
  DollarSign, 
  ArrowLeftRight,
  ClipboardList,
  Coffee,
  Check,
  X
} from 'lucide-react';

function Dashboard({ user, showNotification }) {
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'calendar'
  const [roomsCalendar, setRoomsCalendar] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null); // Selected room for drawer/modal
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  
  // Date range for calendar (14 days starting from today)
  const [startDate, setStartDate] = useState(new Date());
  const [dateHeaders, setDateHeaders] = useState([]);

  // Modal States
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Service Usage / Invoice States
  const [servicesList, setServicesList] = useState([]);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [surchargeInput, setSurchargeInput] = useState({ surchargeServiceId: '', quantity: 1, note: '' });
  const [newStatus, setNewStatus] = useState('');

  // Assign Room States
  const [unassignedBookings, setUnassignedBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper to format date
  const formatDateString = (date) => {
    return date.toISOString().split('T')[0];
  };

  const getDatesArray = (start, days) => {
    const arr = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      arr.push({
        dateStr: formatDateString(d),
        label: d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' }),
        dayName: d.toLocaleDateString('vi-VN', { weekday: 'short' }),
        isToday: formatDateString(d) === todayStr
      });
    }
    return arr;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const start = new Date();
      const end = new Date();
      end.setDate(start.getDate() + 14);

      const checkIn = formatDateString(start);
      const checkOut = formatDateString(end);
      
      setDateHeaders(getDatesArray(start, 14));

      // Fetch Room types
      const typesRes = await api.get('/room-types');
      if (typesRes.data && typesRes.data.data) {
        setRoomTypes(typesRes.data.data);
      }

      // Fetch Calendar containing rooms and their bookings
      const calRes = await api.get('/calendar/rooms', {
        params: { checkIn, checkOut }
      });
      if (calRes.data && calRes.data.data) {
        setRoomsCalendar(calRes.data.data);
        
        // Update selectedRoom detail if it was open
        if (selectedRoom) {
          const updated = calRes.data.data.find(r => r.roomId === selectedRoom.roomId);
          if (updated) {
            setSelectedRoom(updated);
          }
        }
      }

      // Fetch active unassigned bookings
      const bookingsRes = await api.get('/bookings/status/NEW');
      if (bookingsRes.data && bookingsRes.data.data) {
        setUnassignedBookings(bookingsRes.data.data);
      }
    } catch (err) {
      showNotification(err.message || 'Lỗi tải dữ liệu sơ đồ phòng', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [viewMode]);

  // Fetch surcharge services catalog
  const fetchServicesCatalog = async () => {
    try {
      const res = await api.get('/surcharge-services?activeOnly=true');
      if (res.data && res.data.data) {
        setServicesList(res.data.data);
        if (res.data.data.length > 0) {
          setSurchargeInput(prev => ({ ...prev, surchargeServiceId: res.data.data[0].id }));
        }
      }
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Get active booking in the room (for today)
  const getTodayBooking = (room) => {
    if (!room.bookings) return null;
    return room.bookings.find(b => {
      const checkIn = b.checkInDate;
      const checkOut = b.checkOutDate;
      return todayStr >= checkIn && todayStr < checkOut && b.status !== 'CANCELLED';
    });
  };

  // Update room profile details / status
  const handleUpdateRoomStatus = async () => {
    if (!selectedRoom || !newStatus) return;
    try {
      // Find room in database and update it
      const roomDetailsRes = await api.get(`/rooms/${selectedRoom.roomId}`);
      const currentRoom = roomDetailsRes.data.data;
      
      const payload = {
        roomTypeId: currentRoom.roomType.id,
        roomNumber: currentRoom.roomNumber,
        floor: currentRoom.floor,
        status: newStatus,
        note: currentRoom.note
      };

      await api.put(`/rooms/${selectedRoom.roomId}`, payload);
      showNotification(`Đã chuyển phòng ${selectedRoom.roomNumber} sang trạng thái ${newStatus}`);
      setShowStatusModal(false);
      fetchData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Trigger Booking transitions (Confirm / Check-in / Check-out / Cancel)
  const handleBookingTransition = async (bookingId, transition) => {
    try {
      let endpoint = `/bookings/${bookingId}/${transition}`;
      const res = await api.patch(endpoint);
      showNotification(res.data.mess || 'Cập nhật trạng thái thành công');
      fetchData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Add surcharge usage
  const handleAddSurcharge = async (e) => {
    e.preventDefault();
    const activeBooking = getTodayBooking(selectedRoom);
    if (!activeBooking) return;
    
    try {
      await api.post(`/bookings/${activeBooking.bookingId}/service-usages`, {
        surchargeServiceId: parseInt(surchargeInput.surchargeServiceId),
        quantity: parseInt(surchargeInput.quantity),
        note: surchargeInput.note
      });
      showNotification('Đã thêm dịch vụ phụ thu thành công');
      setSurchargeInput(prev => ({ ...prev, quantity: 1, note: '' }));
      setShowServiceModal(false);
      // Refresh invoice modal if it's open
      if (showInvoiceModal) {
        handleViewInvoice();
      }
      fetchData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // View Invoice detail
  const handleViewInvoice = async () => {
    const activeBooking = getTodayBooking(selectedRoom);
    if (!activeBooking) return;
    try {
      const res = await api.get(`/bookings/${activeBooking.bookingId}/invoice`);
      if (res.data && res.data.data) {
        setActiveInvoice(res.data.data);
        setShowInvoiceModal(true);
      }
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Quick assign booking
  const handleAssignBooking = async (e) => {
    e.preventDefault();
    if (!selectedBookingId) {
      showNotification('Vui lòng chọn một booking', 'error');
      return;
    }
    try {
      await api.patch(`/bookings/${selectedBookingId}/assign-room`, null, {
        params: { roomId: selectedRoom.roomId }
      });
      showNotification('Gán phòng thành công!');
      setShowAssignModal(false);
      setSelectedBookingId('');
      fetchData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Delete surcharge service usage
  const handleDeleteSurchargeUsage = async (usageId) => {
    const activeBooking = getTodayBooking(selectedRoom);
    if (!activeBooking) return;
    try {
      await api.delete(`/bookings/${activeBooking.bookingId}/service-usages/${usageId}`);
      showNotification('Đã xóa ghi nhận dịch vụ');
      handleViewInvoice(); // refresh invoice details
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Group rooms by floors
  const roomsByFloor = roomsCalendar.reduce((acc, room) => {
    const floor = room.floor || 'Tầng trệt';
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(room);
    return acc;
  }, {});

  // Sort floors logically
  const sortedFloors = Object.keys(roomsByFloor).sort((a, b) => {
    return parseInt(a) - parseInt(b);
  });

  // Filters
  const filteredRooms = roomsCalendar.filter(room => {
    const matchType = filterType === 'ALL' || room.roomTypeId === parseInt(filterType);
    const matchStatus = filterStatus === 'ALL' || room.status === filterStatus;
    return matchType && matchStatus;
  });

  const getStatusLabel = (status) => {
    switch (status) {
      case 'AVAILABLE': return 'Sẵn sàng';
      case 'OCCUPIED': return 'Có khách';
      case 'NEEDS_CLEANING': return 'Cần dọn dẹp';
      case 'MAINTENANCE': return 'Bảo trì';
      default: return status;
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Sơ đồ phòng khách sạn</h1>
          <p className="page-subtitle">Quản lý trạng thái phòng và lịch trình thời gian thực</p>
        </div>
        
        {/* Actions bar */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{
            display: 'flex',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '3px'
          }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                border: 'none',
                borderRadius: 'calc(var(--radius-sm) - 2px)',
                cursor: 'pointer',
                backgroundColor: viewMode === 'grid' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'grid' ? 'white' : 'var(--text-secondary)',
                fontWeight: '600'
              }}
            >
              <Grid size={14} />
              Sơ đồ dạng lưới
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                border: 'none',
                borderRadius: 'calc(var(--radius-sm) - 2px)',
                cursor: 'pointer',
                backgroundColor: viewMode === 'calendar' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'calendar' ? 'white' : 'var(--text-secondary)',
                fontWeight: '600'
              }}
            >
              <Calendar size={14} />
              Lịch biểu thời gian
            </button>
          </div>
        </div>
      </div>

      {/* Filter panel */}
      <div className="card" style={{ padding: '16px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
        <div>
          <label style={{ marginBottom: '4px' }}>Loại phòng</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ width: '180px', padding: '6px 12px' }}>
            <option value="ALL">Tất cả loại phòng</option>
            {roomTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ marginBottom: '4px' }}>Trạng thái phòng</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ width: '180px', padding: '6px 12px' }}>
            <option value="ALL">Tất cả trạng thái</option>
            <option value="AVAILABLE">Trống (Sẵn sàng)</option>
            <option value="OCCUPIED">Đang có khách</option>
            <option value="NEEDS_CLEANING">Cần dọn dẹp</option>
            <option value="MAINTENANCE">Bảo trì</option>
          </select>
        </div>

        {/* Legend */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'var(--color-available)' }} />
            <span>Sẵn sàng</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'var(--color-occupied)' }} />
            <span>Có khách</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'var(--color-cleaning)' }} />
            <span>Chưa dọn dẹp</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'var(--color-maintenance)' }} />
            <span>Bảo trì</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
          <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW LAYOUT */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {sortedFloors.map(floorName => {
            // Filter rooms on this floor
            const roomsOnFloor = Object.values(roomsByFloor[floorName]).filter(r => filteredRooms.some(fr => fr.roomId === r.roomId));
            if (roomsOnFloor.length === 0) return null;

            return (
              <div key={floorName} className="card" style={{ padding: '20px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                  <Layers size={16} color="var(--primary)" />
                  Tầng {floorName}
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '16px'
                }}>
                  {roomsOnFloor.map(room => {
                    const activeBooking = getTodayBooking(room);
                    let cardBorder = 'var(--border-color)';
                    let cardBg = 'rgba(255,255,255,0.02)';
                    let glowColor = 'transparent';

                    if (room.status === 'AVAILABLE') {
                      cardBorder = 'rgba(16, 185, 129, 0.3)';
                      glowColor = 'rgba(16, 185, 129, 0.05)';
                    } else if (room.status === 'OCCUPIED') {
                      cardBorder = 'rgba(99, 102, 241, 0.3)';
                      glowColor = 'rgba(99, 102, 241, 0.05)';
                    } else if (room.status === 'NEEDS_CLEANING') {
                      cardBorder = 'rgba(245, 158, 11, 0.3)';
                      glowColor = 'rgba(245, 158, 11, 0.05)';
                    } else if (room.status === 'MAINTENANCE') {
                      cardBorder = 'rgba(239, 68, 68, 0.3)';
                      glowColor = 'rgba(239, 68, 68, 0.05)';
                    }

                    return (
                      <div
                        key={room.roomId}
                        onClick={() => setSelectedRoom(room)}
                        style={{
                          border: `1px solid ${cardBorder}`,
                          backgroundColor: cardBg,
                          boxShadow: selectedRoom?.roomId === room.roomId ? '0 0 0 2px var(--primary)' : 'var(--shadow-sm)',
                          borderRadius: 'var(--radius-md)',
                          padding: '16px 12px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'var(--transition-fast)'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = glowColor; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = cardBg; }}
                      >
                        <h4 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
                          {room.roomNumber}
                        </h4>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', margin: '4px 0 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {room.roomTypeName}
                        </span>

                        <span className={`badge badge-${room.status.toLowerCase()}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                          {getStatusLabel(room.status)}
                        </span>

                        {activeBooking && (
                          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <User size={10} />
                            <span>{activeBooking.guestName}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TIMELINE CALENDAR VIEW */
        <div className="card" style={{ padding: '0', overflowX: 'auto', border: '1px solid var(--border-color)' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '900px' }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, zIndex: 10, background: 'var(--bg-secondary)', width: '160px', borderRight: '1px solid var(--border-color)' }}>
                  Phòng
                </th>
                {dateHeaders.map(day => (
                  <th 
                    key={day.dateStr} 
                    style={{ 
                      textAlign: 'center', 
                      minWidth: '50px', 
                      background: day.isToday ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                      color: day.isToday ? 'var(--primary)' : 'var(--text-secondary)'
                    }}
                  >
                    <div>{day.dayName}</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{day.label}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map(room => (
                <tr key={room.roomId}>
                  <td 
                    onClick={() => setSelectedRoom(room)} 
                    style={{ 
                      position: 'sticky', 
                      left: 0, 
                      zIndex: 9, 
                      background: 'var(--bg-secondary)', 
                      fontWeight: '600', 
                      cursor: 'pointer',
                      borderRight: '1px solid var(--border-color)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span style={{ fontSize: '15px' }}>{room.roomNumber}</span>
                    <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                      {room.roomTypeName}
                    </span>
                  </td>
                  {dateHeaders.map(day => {
                    // Check if this room has a booking covering this date
                    const slot = room.bookings?.find(b => {
                      return day.dateStr >= b.checkInDate && day.dateStr < b.checkOutDate && b.status !== 'CANCELLED';
                    });

                    if (slot) {
                      const isCheckIn = day.dateStr === slot.checkInDate;
                      
                      // Calculate if next day is check-out
                      const checkOutTime = new Date(slot.checkOutDate + 'T00:00:00').getTime();
                      const nextDayTime = new Date(day.dateStr + 'T00:00:00').getTime() + 24 * 60 * 60 * 1000;
                      const isCheckOutLastNight = nextDayTime >= checkOutTime;

                      const cellBg = slot.status === 'CHECKED_IN' ? 'var(--primary)' : 'var(--color-new)';
                      const text = isCheckIn ? slot.guestName : '→';
                      const title = `${slot.guestName} (${slot.checkInDate} đến ${slot.checkOutDate})`;

                      return (
                        <td 
                          key={day.dateStr} 
                          title={title}
                          style={{ 
                            padding: '6px 0', 
                            borderRight: '1px solid rgba(255,255,255,0.02)',
                            borderBottom: '1px solid var(--border-color)',
                            maxWidth: '85px',
                            background: day.isToday ? 'rgba(99, 102, 241, 0.04)' : 'transparent'
                          }}
                        >
                          <div style={{
                            background: cellBg,
                            color: '#ffffff',
                            padding: '6px 4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            textAlign: 'center',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            borderTopLeftRadius: isCheckIn ? '6px' : '0',
                            borderBottomLeftRadius: isCheckIn ? '6px' : '0',
                            borderTopRightRadius: isCheckOutLastNight ? '6px' : '0',
                            borderBottomRightRadius: isCheckOutLastNight ? '6px' : '0',
                            marginLeft: isCheckIn ? '4px' : '0',
                            marginRight: isCheckOutLastNight ? '4px' : '0',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)'
                          }}>
                            {text}
                          </div>
                        </td>
                      );
                    } else {
                      return (
                        <td 
                          key={day.dateStr} 
                          style={{ 
                            textAlign: 'center', 
                            fontSize: '12px', 
                            borderRight: '1px solid var(--border-color)',
                            borderBottom: '1px solid var(--border-color)',
                            padding: '12px 4px',
                            color: 'var(--text-muted)',
                            background: day.isToday ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                          }}
                        >
                          -
                        </td>
                      );
                    }
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ROOM DRAWER / DETAIL PANEL */}
      {selectedRoom && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedRoom(null)} />
          <div className="drawer">
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Phòng {selectedRoom.roomNumber}
                  <span className={`badge badge-${selectedRoom.status.toLowerCase()}`} style={{ fontSize: '11px' }}>
                    {getStatusLabel(selectedRoom.status)}
                  </span>
                </h2>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{selectedRoom.roomTypeName}</span>
              </div>
              <button onClick={() => setSelectedRoom(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Room details */}
              <div className="card" style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>Thông tin phòng</h4>
                <p style={{ fontSize: '14px', marginBottom: '6px' }}><strong>Tầng:</strong> {selectedRoom.floor}</p>
                <p style={{ fontSize: '14px' }}><strong>Ghi chú:</strong> {selectedRoom.note || 'Không có'}</p>
              </div>

              {/* Booking status & control */}
              {getTodayBooking(selectedRoom) ? (
                (() => {
                  const activeBooking = getTodayBooking(selectedRoom);
                  return (
                    <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                        <User size={16} color="var(--primary)" />
                        Khách đang ở / đặt phòng
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', marginBottom: '18px' }}>
                        <p><strong>Khách hàng:</strong> {activeBooking.guestName}</p>
                        <p><strong>Số điện thoại:</strong> {activeBooking.guestPhone || 'Không có'}</p>
                        <p><strong>Khoảng thời gian:</strong> {activeBooking.checkInDate} → {activeBooking.checkOutDate}</p>
                        <p><strong>Số đêm:</strong> {activeBooking.nights} đêm</p>
                        <p>
                          <strong>Trạng thái booking:</strong>{' '}
                          <span className={`badge badge-${activeBooking.status.toLowerCase()}`}>
                            {activeBooking.status}
                          </span>
                        </p>
                      </div>

                      {/* Transition Actions */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {activeBooking.status === 'CONFIRMED' && (
                          <button 
                            onClick={() => handleBookingTransition(activeBooking.bookingId, 'check-in')} 
                            className="btn btn-primary btn-sm"
                            style={{ flex: 1 }}
                          >
                            <Check size={14} /> Nhận phòng (Check-in)
                          </button>
                        )}
                        {activeBooking.status === 'CHECKED_IN' && (
                          <>
                            <button 
                              onClick={handleViewInvoice} 
                              className="btn btn-secondary btn-sm"
                              style={{ flex: '1 0 100%' }}
                            >
                              <DollarSign size={14} /> Thanh toán & Trả phòng (Check-out)
                            </button>
                            <button 
                              onClick={() => { fetchServicesCatalog(); setShowServiceModal(true); }}
                              className="btn btn-primary btn-sm"
                              style={{ flex: 1 }}
                            >
                              <Coffee size={14} /> Ghi nhận Phụ thu
                            </button>
                          </>
                        )}
                        {activeBooking.status !== 'CHECKED_OUT' && activeBooking.status !== 'CANCELLED' && (
                          <button 
                            onClick={() => handleBookingTransition(activeBooking.bookingId, 'cancel')} 
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1, color: 'var(--color-maintenance)' }}
                          >
                            <X size={14} /> Hủy đặt
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                /* Room is vacant */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Status checks */}
                  {selectedRoom.status === 'NEEDS_CLEANING' && (
                    <button 
                      onClick={() => { setNewStatus('AVAILABLE'); handleUpdateRoomStatus(); }}
                      className="btn btn-primary"
                    >
                      <Sparkles size={16} /> Hoàn tất dọn phòng (Sẵn sàng đón khách)
                    </button>
                  )}
                  {selectedRoom.status === 'AVAILABLE' && (
                    <>
                      <button 
                        onClick={() => { setShowAssignModal(true); }}
                        className="btn btn-primary"
                      >
                        <Plus size={16} /> Gán booking chưa có phòng
                      </button>
                      <button 
                        onClick={() => { setNewStatus('MAINTENANCE'); setShowStatusModal(true); }}
                        className="btn btn-secondary"
                        style={{ color: 'var(--color-maintenance)' }}
                      >
                        <Wrench size={16} /> Đưa vào bảo trì
                      </button>
                    </>
                  )}
                  {selectedRoom.status === 'MAINTENANCE' && (
                    <button 
                      onClick={() => { setNewStatus('AVAILABLE'); handleUpdateRoomStatus(); }}
                      className="btn btn-primary"
                    >
                      <Check size={16} /> Hoàn tất bảo trì (Sẵn sàng)
                    </button>
                  )}
                </div>
              )}

              {/* Room timeline booking schedule inside drawer */}
              <div className="card" style={{ padding: '16px' }}>
                <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} />
                  Lịch đặt sắp tới
                </h4>
                {selectedRoom.bookings && selectedRoom.bookings.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedRoom.bookings.filter(b => b.status !== 'CANCELLED').map(b => (
                      <div key={b.bookingId} style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
                        <div>
                          <strong>{b.guestName}</strong>
                          <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {b.checkInDate} → {b.checkOutDate}
                          </span>
                        </div>
                        <span className={`badge badge-${b.status.toLowerCase()}`} style={{ fontSize: '9px', height: 'fit-content' }}>
                          {b.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Chưa có lịch đặt phòng nào.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* STATUS SWITCH MODAL */}
      {showStatusModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', margin: 0 }}>Cập nhật trạng thái phòng</h2>
              <button onClick={() => setShowStatusModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', marginBottom: '16px' }}>
                Chuyển đổi trạng thái phòng <strong>{selectedRoom?.roomNumber}</strong> sang <strong>{getStatusLabel(newStatus)}</strong>?
              </p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowStatusModal(false)} className="btn btn-secondary btn-sm">Hủy</button>
              <button onClick={handleUpdateRoomStatus} className="btn btn-primary btn-sm">Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* SERVICE RECORDING MODAL */}
      {showServiceModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
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
                    {servicesList.map(s => (
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
                    placeholder="VD: 2 lon nước ngọt, 1kg quần áo" 
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

      {/* BILLING / INVOICE VIEW MODAL */}
      {showInvoiceModal && activeInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardList size={18} color="var(--primary)" />
                Chi tiết Hóa đơn thanh toán
              </h2>
              <button onClick={() => setShowInvoiceModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div className="modal-body">
              
              {/* Billing summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                <div>
                  <p><strong>Khách hàng:</strong> {activeInvoice.guestFullName || activeInvoice.guestName || 'Khách vãng lai'}</p>
                  <p><strong>Phòng đặt:</strong> {selectedRoom.roomNumber} ({selectedRoom.roomTypeName})</p>
                </div>
                <div>
                  <p><strong>Số đêm:</strong> {activeInvoice.nights} đêm</p>
                  <p><strong>Trạng thái:</strong> <span className={`badge badge-${activeInvoice.status?.toLowerCase() || 'pending'}`}>{activeInvoice.status || 'PENDING'}</span></p>
                </div>
              </div>

              {/* Itemized summary */}
              <h3 style={{ fontSize: '14px', marginBottom: '8px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Phí thuê phòng</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '14px' }}>
                <span>Tiền phòng ({activeInvoice.nights} đêm)</span>
                <strong>{activeInvoice.roomCharge?.toLocaleString('vi-VN')} VND</strong>
              </div>

              {/* Service usages */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>Dịch vụ & Phụ thu</h3>
                <button 
                  onClick={() => { fetchServicesCatalog(); setShowServiceModal(true); }}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '4px 10px', fontSize: '11px' }}
                >
                  <Plus size={10} /> Thêm phụ thu
                </button>
              </div>

              <div className="table-container" style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px' }}>
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
                    {activeInvoice.usages && activeInvoice.usages.length > 0 ? (
                      activeInvoice.usages.map(u => (
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
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '16px' }}>Chưa ghi nhận dịch vụ phụ thu nào.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>Phí phòng:</span>
                  <span>{activeInvoice.roomCharge?.toLocaleString('vi-VN')} VND</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>Phí dịch vụ:</span>
                  <span>{activeInvoice.serviceCharge?.toLocaleString('vi-VN')} VND</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-maintenance)' }}>
                  <span>Giảm giá (Discount):</span>
                  <span>- {activeInvoice.discount?.toLocaleString('vi-VN') || 0} VND</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px', color: 'var(--primary)' }}>
                  <span>Tổng cộng cần trả:</span>
                  <span>{activeInvoice.totalAmount?.toLocaleString('vi-VN')} VND</span>
                </div>
              </div>

            </div>
            <div className="modal-footer">
              <button onClick={() => setShowInvoiceModal(false)} className="btn btn-secondary btn-sm">Đóng</button>
              {activeInvoice.status !== 'PAID' && (
                <button 
                  onClick={() => { 
                    const activeBooking = getTodayBooking(selectedRoom);
                    handleBookingTransition(activeBooking.bookingId, 'check-out');
                    setShowInvoiceModal(false);
                    setSelectedRoom(null);
                  }} 
                  className="btn btn-primary btn-sm"
                >
                  <Check size={14} /> Xác nhận thanh toán & Trả phòng
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QUICK ASSIGN BOOKING MODAL */}
      {showAssignModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', margin: 0 }}>Gán đặt phòng vào phòng {selectedRoom?.roomNumber}</h2>
              <button onClick={() => setShowAssignModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleAssignBooking}>
              <div className="modal-body">
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Chỉ các booking chưa được gán phòng có cùng loại phòng <strong>{selectedRoom?.roomTypeName}</strong> mới hiển thị dưới đây.
                </p>
                <div>
                  <label>Chọn Booking</label>
                  <select 
                    value={selectedBookingId} 
                    onChange={(e) => setSelectedBookingId(e.target.value)}
                    required
                  >
                    <option value="">-- Chọn Đặt phòng --</option>
                    {unassignedBookings
                      .filter(b => b.roomTypeId === selectedRoom?.roomTypeId)
                      .map(b => (
                        <option key={b.id} value={b.id}>
                          {b.guestName} ({b.checkInDate} → {b.checkOutDate})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAssignModal(false)} className="btn btn-secondary btn-sm">Hủy</button>
                <button type="submit" className="btn btn-primary btn-sm">Xác nhận gán phòng</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Dashboard;
