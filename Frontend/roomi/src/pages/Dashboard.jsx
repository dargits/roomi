import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import PageLoader from '../components/PageLoader';
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
  CheckCircle,
  X,
  Bell
} from 'lucide-react';

function Dashboard({ user, showNotification, readOnly = false }) {
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'calendar'
  const [roomsCalendar, setRoomsCalendar] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null); // Selected room for drawer/modal
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState(user?.role === 'HOUSEKEEPER' ? 'NEEDS_CLEANING' : 'ALL');
  
  // States and refs for housekeeping notifications
  const [cleaningNotifications, setCleaningNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const roomsListRef = React.useRef([]);

  // Date range for calendar (14 days starting from today)
  const [startDate, setStartDate] = useState(new Date());
  const [dateHeaders, setDateHeaders] = useState([]);

  // Play programmatic notification beep chimes
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Beep 1 (D5)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.12);
      
      // Beep 2 (A5)
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime);
        gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.22);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.22);
      }, 120);
    } catch (e) {
      console.warn("Could not play notification sound:", e);
    }
  };

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
  const [drawerUsages, setDrawerUsages] = useState([]);
  const [loadingUsages, setLoadingUsages] = useState(false);

  // Assign Room States
  const [unassignedBookings, setUnassignedBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState('');

  // Helper to format date in local timezone (YYYY-MM-DD)
  const formatDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatDateString(new Date());

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

      // Đồng bộ trạng thái phòng trước khi lấy dữ liệu
      // (xử lý trường hợp phòng có CHECKED_IN booking nhưng status vẫn AVAILABLE)
      await api.post('/rooms/sync-status').catch(() => { /* không chặn nếu sync lỗi */ });

      const start = new Date();
      const end = new Date();
      end.setDate(start.getDate() + 14);

      const checkIn = formatDateString(start);
      const checkOut = formatDateString(end);

      // Fetch Calendar, unassigned bookings and actual rooms list with notes
      const [calRes, bookingsRes, roomsRes] = await Promise.all([
        api.get('/calendar/rooms', { params: { checkIn, checkOut } }),
        api.get('/bookings/status/NEW').catch(() => ({ data: { data: [] } })),
        api.get('/rooms')
      ]);

      setDateHeaders(getDatesArray(start, 14));

      // Fetch Room types
      const typesRes = await api.get('/room-types');
      if (typesRes.data && typesRes.data.data) {
        setRoomTypes(typesRes.data.data);
      }

      if (calRes.data && calRes.data.data && roomsRes.data && roomsRes.data.data) {
        const roomsMap = {};
        roomsRes.data.data.forEach(r => {
          roomsMap[r.id] = r.note;
        });
        const enriched = calRes.data.data.map(r => ({
          ...r,
          note: roomsMap[r.roomId] || ''
        }));

        // Detect room state changes to NEEDS_CLEANING for Housekeeper
        if (user?.role === 'HOUSEKEEPER') {
          if (roomsListRef.current.length === 0) {
            // First load: initialize notifications with all current NEEDS_CLEANING rooms
            const initialCleaningRooms = enriched.filter(r => r.status === 'NEEDS_CLEANING');
            if (initialCleaningRooms.length > 0) {
              const initialNotifs = initialCleaningRooms.map(r => ({
                id: Date.now() + Math.random(),
                roomNumber: r.roomNumber,
                roomId: r.roomId,
                message: `Phòng ${r.roomNumber} đang cần dọn dẹp!`
              }));
              setCleaningNotifications(initialNotifs);
            }
          } else {
            // Subsequent loads: detect transitions to NEEDS_CLEANING
            const newCleaningRooms = [];
            enriched.forEach(newRoom => {
              const oldRoom = roomsListRef.current.find(o => o.roomId === newRoom.roomId);
              if (oldRoom) {
                if (oldRoom.status !== 'NEEDS_CLEANING' && newRoom.status === 'NEEDS_CLEANING') {
                  newCleaningRooms.push(newRoom);
                }
              }
            });

            // Find rooms that were cleaned (no longer NEEDS_CLEANING)
            const cleanRoomIds = enriched
              .filter(r => r.status !== 'NEEDS_CLEANING')
              .map(r => r.roomId);

            setCleaningNotifications(prev => {
              // 1. Filter out rooms that are already clean
              let updated = prev.filter(notif => !cleanRoomIds.includes(notif.roomId));
              
              // 2. Append new notifications
              if (newCleaningRooms.length > 0) {
                const newNotifs = newCleaningRooms.map(r => ({
                  id: Date.now() + Math.random(),
                  roomNumber: r.roomNumber,
                  roomId: r.roomId,
                  message: `Phòng ${r.roomNumber} vừa chuyển sang trạng thái cần dọn dẹp!`
                }));
                // Check for duplicates
                const filteredNew = newNotifs.filter(nn => !updated.some(u => u.roomId === nn.roomId));
                updated = [...filteredNew, ...updated];
              }
              return updated;
            });

            if (newCleaningRooms.length > 0) {
              playNotificationSound();
              newCleaningRooms.forEach(r => {
                showNotification(`Phòng ${r.roomNumber} đang cần dọn dẹp!`, 'warning');
              });
            }
          }
        }

        setRoomsCalendar(enriched);
        roomsListRef.current = enriched;
        
        // Update selectedRoom detail if it was open
        if (selectedRoom) {
          const updated = enriched.find(r => r.roomId === selectedRoom.roomId);
          if (updated) {
            setSelectedRoom(updated);
          }
        }
      }

      // Fetch active unassigned bookings
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

  // Keep reference to latest fetchData to prevent stale closure in interval
  const fetchDataRef = React.useRef(fetchData);
  useEffect(() => {
    fetchDataRef.current = fetchData;
  });

  // Polling mechanism every 10 seconds for real-time notifications (Housekeeper only)
  useEffect(() => {
    if (user?.role !== 'HOUSEKEEPER') return;
    const intervalId = setInterval(() => {
      fetchDataRef.current();
    }, 10000);
    return () => clearInterval(intervalId);
  }, [user]);

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

  const fetchDrawerUsages = async (bookingId) => {
    try {
      setLoadingUsages(true);
      const res = await api.get(`/bookings/${bookingId}/service-usages`);
      if (res.data && res.data.data) {
        setDrawerUsages(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching usages for drawer:', err);
    } finally {
      setLoadingUsages(false);
    }
  };

  useEffect(() => {
    if (selectedRoom) {
      const activeBooking = getTodayBooking(selectedRoom);
      if (activeBooking) {
        fetchDrawerUsages(activeBooking.bookingId);
      } else {
        setDrawerUsages([]);
      }
    } else {
      setDrawerUsages([]);
    }
  }, [selectedRoom]);

  // Get active booking in the room (for today)
  const getTodayBooking = (room) => {
    if (!room || !room.bookings) return null;
    return room.bookings.find(b => {
      const checkIn = b.checkInDate;
      const checkOut = b.checkOutDate;
      return todayStr >= checkIn && todayStr < checkOut && 
             b.status !== 'CANCELLED' && 
             b.status !== 'NO_SHOW' && 
             b.status !== 'CHECKED_OUT';
    });
  };

  // Update room status (Housekeeper / Owner / Receptionist)
  const handleUpdateRoomStatus = async (statusOverride) => {
    const targetStatus = typeof statusOverride === 'string' ? statusOverride : newStatus;
    if (!selectedRoom || !targetStatus) return;
    try {
      await api.patch(`/rooms/${selectedRoom.roomId}/status`, null, {
        params: { status: targetStatus }
      });
      const statusText = targetStatus === 'AVAILABLE' ? 'Sẵn sàng' : targetStatus === 'MAINTENANCE' ? 'Bảo trì' : targetStatus;
      showNotification(`Đã chuyển phòng ${selectedRoom.roomNumber} sang trạng thái ${statusText}!`, 'success');
      setShowStatusModal(false);
      setSelectedRoom(null);
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
      fetchDrawerUsages(activeBooking.bookingId);
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
      if (showInvoiceModal) {
        handleViewInvoice();
      }
      fetchDrawerUsages(activeBooking.bookingId);
      fetchData();
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

  // Filters & Priority Sorting for Housekeeper
  const getUpcomingCheckInDays = (room) => {
    if (!room.bookings || room.bookings.length === 0) return 999;
    const upcoming = room.bookings
      .filter(b => b.checkInDate >= todayStr && b.status !== 'CANCELLED' && b.status !== 'NO_SHOW')
      .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));
    if (upcoming.length > 0) {
      if (upcoming[0].checkInDate === todayStr) return 0; // Hôm nay
      return 1; // Tương lai
    }
    return 999;
  };

  const filteredRooms = roomsCalendar.filter(room => {
    const matchType = filterType === 'ALL' || room.roomTypeId === parseInt(filterType);
    const matchStatus = filterStatus === 'ALL' || room.status === filterStatus;
    return matchType && matchStatus;
  }).sort((a, b) => {
    if (user.role === 'HOUSEKEEPER' || filterStatus === 'NEEDS_CLEANING') {
      const priorityA = getUpcomingCheckInDays(a);
      const priorityB = getUpcomingCheckInDays(b);
      if (priorityA !== priorityB) {
        return priorityA - priorityB; // Ưu tiên phòng có khách sắp nhận phòng lên đầu
      }
    }
    return 0;
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
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {user?.role === 'HOUSEKEEPER' && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: showNotifDropdown ? 'var(--primary-glow)' : 'var(--bg-secondary)',
                  color: cleaningNotifications.length > 0 ? '#b45309' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'var(--transition-fast)'
                }}
                title="Chuông thông báo phòng cần dọn"
              >
                <Bell size={18} className={cleaningNotifications.length > 0 ? "animate-bounce" : ""} />
                {cleaningNotifications.length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--bg-secondary)'
                  }}>
                    {cleaningNotifications.length}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '46px',
                  right: '0',
                  width: '320px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 1000,
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--border-color)',
                    paddingBottom: '8px',
                    marginBottom: '4px'
                  }}>
                    <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>
                      Thông báo dọn phòng ({cleaningNotifications.length})
                    </span>
                    {cleaningNotifications.length > 0 && (
                      <button 
                        onClick={() => setCleaningNotifications([])}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        Xóa tất cả
                      </button>
                    )}
                  </div>
                  
                  {cleaningNotifications.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                      Không có thông báo mới nào
                    </div>
                  ) : (
                    <div style={{ 
                      maxHeight: '240px', 
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      {cleaningNotifications.map(notif => (
                        <div 
                          key={notif.id}
                          style={{
                            padding: '8px 10px',
                            backgroundColor: '#fffbeb',
                            borderLeft: '3px solid var(--color-cleaning)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <span style={{ color: '#b45309', fontWeight: '500' }}>{notif.message}</span>
                          <button
                            onClick={() => setCleaningNotifications(prev => prev.filter(n => n.id !== notif.id))}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#b45309',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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

      {/* KiotViet Style Summary KPI Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div 
          onClick={() => setFilterStatus('ALL')}
          className="card" 
          style={{ 
            padding: '14px 16px', 
            cursor: 'pointer', 
            borderLeft: '4px solid var(--primary)',
            backgroundColor: filterStatus === 'ALL' ? 'var(--primary-glow)' : undefined,
            transition: 'var(--transition-fast)'
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TỔNG SỐ PHÒNG</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>{roomsCalendar.length}</div>
        </div>

        <div 
          onClick={() => setFilterStatus('AVAILABLE')}
          className="card" 
          style={{ 
            padding: '14px 16px', 
            cursor: 'pointer', 
            borderLeft: '4px solid var(--color-available)',
            backgroundColor: filterStatus === 'AVAILABLE' ? 'var(--color-available-bg)' : undefined,
            transition: 'var(--transition-fast)'
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--color-available)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SẮN SÀNG</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-available)', marginTop: '2px' }}>
            {roomsCalendar.filter(r => r.status === 'AVAILABLE').length}
          </div>
        </div>

        <div 
          onClick={() => setFilterStatus('OCCUPIED')}
          className="card" 
          style={{ 
            padding: '14px 16px', 
            cursor: 'pointer', 
            borderLeft: '4px solid var(--color-occupied)',
            backgroundColor: filterStatus === 'OCCUPIED' ? 'var(--color-occupied-bg)' : undefined,
            transition: 'var(--transition-fast)'
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--color-occupied)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ĐANG CÓ KHÁCH</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-occupied)', marginTop: '2px' }}>
            {roomsCalendar.filter(r => r.status === 'OCCUPIED').length}
          </div>
        </div>

        <div 
          onClick={() => setFilterStatus('NEEDS_CLEANING')}
          className="card" 
          style={{ 
            padding: '14px 16px', 
            cursor: 'pointer', 
            borderLeft: '4px solid var(--color-cleaning)',
            backgroundColor: filterStatus === 'NEEDS_CLEANING' ? 'var(--color-cleaning-bg)' : undefined,
            transition: 'var(--transition-fast)'
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--color-cleaning)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CẦN DỌN DẸP</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-cleaning)', marginTop: '2px' }}>
            {roomsCalendar.filter(r => r.status === 'NEEDS_CLEANING').length}
          </div>
        </div>

        <div 
          onClick={() => setFilterStatus('MAINTENANCE')}
          className="card" 
          style={{ 
            padding: '14px 16px', 
            cursor: 'pointer', 
            borderLeft: '4px solid var(--color-maintenance)',
            backgroundColor: filterStatus === 'MAINTENANCE' ? 'var(--color-maintenance-bg)' : undefined,
            transition: 'var(--transition-fast)'
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--color-maintenance)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>BẢO TRÌ</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-maintenance)', marginTop: '2px' }}>
            {roomsCalendar.filter(r => r.status === 'MAINTENANCE').length}
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
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)} 
            style={{ width: '180px', padding: '6px 12px' }}
          >
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

      {user.role === 'HOUSEKEEPER' && (
        <div className="card" style={{ padding: '14px 20px', marginBottom: '20px', borderLeft: '4px solid var(--color-cleaning)', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
          <Sparkles size={20} color="var(--color-cleaning)" />
          <div>
            <strong>Giao diện Buồng phòng:</strong> Tự động hiển thị danh sách phòng <strong>Cần dọn dẹp</strong>. 
            Các phòng có khách sắp nhận trong ngày được tự động ưu tiên xếp lên đầu.
          </div>
        </div>
      )}

      {user.role === 'HOUSEKEEPER' && cleaningNotifications.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {cleaningNotifications.map(notif => (
            <div 
              key={notif.id} 
              className="card" 
              style={{ 
                padding: '12px 20px', 
                backgroundColor: '#fffbeb', 
                border: '1px solid #fde68a',
                borderLeft: '4px solid var(--color-cleaning)', 
                borderRadius: '8px',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                gap: '12px', 
                fontSize: '13px',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309' }}>
                <AlertCircle size={18} />
                <span><strong>Thông báo mới:</strong> {notif.message}</span>
              </div>
              <button 
                onClick={() => {
                  setCleaningNotifications(prev => prev.filter(n => n.id !== notif.id));
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#b45309',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Đóng thông báo"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <PageLoader />
      ) : filteredRooms.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: '#ffffff' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#e8f5e9',
            color: '#2e7d32',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <CheckCircle size={32} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px' }}>
            {filterStatus === 'NEEDS_CLEANING' 
              ? 'Tất cả các phòng đã được dọn dẹp sạch sẽ!' 
              : 'Không tìm thấy phòng nào phù hợp với bộ lọc.'}
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 20px' }}>
            {filterStatus === 'NEEDS_CLEANING'
              ? 'Hiện không còn phòng nào cần làm vệ sinh. Bạn có thể chọn "Tất cả trạng thái" để xem sơ đồ toàn bộ phòng.'
              : 'Vui lòng thay đổi lựa chọn loại phòng hoặc trạng thái phòng trên bộ lọc.'}
          </p>
          {filterStatus !== 'ALL' && (
            <button 
              onClick={() => { setFilterStatus('ALL'); setFilterType('ALL'); }}
              className="btn btn-primary btn-sm"
            >
              Xem tất cả phòng
            </button>
          )}
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
                    const isInactive = room.note && room.note.includes('[INACTIVE]');

                    // Tính trạng thái hiển thị: nếu phòng đang CẦN DỌN DẸP hoặc BẢO TRÌ, giữ nguyên trạng thái đó!
                    // Chỉ khi phòng SẴN SÀNG và có booking CHECKED_IN hôm nay thì hiển thị OCCUPIED.
                    const hasCheckedInToday = room.bookings?.some(b =>
                      todayStr >= b.checkInDate &&
                      todayStr < b.checkOutDate &&
                      b.status === 'CHECKED_IN'
                    );
                    const displayStatus = (room.status === 'NEEDS_CLEANING' || room.status === 'MAINTENANCE')
                      ? room.status
                      : (hasCheckedInToday ? 'OCCUPIED' : room.status);

                    let cardBorder = 'var(--border-color)';
                    let cardBg = 'rgba(255,255,255,0.02)';
                    let glowColor = 'transparent';

                    if (isInactive) {
                      cardBorder = '#cbd5e1';
                      cardBg = '#f1f5f9';
                      glowColor = '#e2e8f0';
                    } else if (displayStatus === 'AVAILABLE') {
                      cardBorder = '#2e7d32';
                      cardBg = '#ffffff';
                      glowColor = '#f4fbf7';
                    } else if (displayStatus === 'OCCUPIED') {
                      cardBorder = '#1565c0';
                      cardBg = '#ffffff';
                      glowColor = '#f0f7ff';
                    } else if (displayStatus === 'NEEDS_CLEANING') {
                      cardBorder = '#ed6c02';
                      cardBg = '#ffffff';
                      glowColor = '#fffbf5';
                    } else if (displayStatus === 'MAINTENANCE') {
                      cardBorder = '#c62828';
                      cardBg = '#ffffff';
                      glowColor = '#fff5f5';
                    }

                    return (
                      <div
                        key={room.roomId}
                        onClick={() => {
                          if (isInactive) {
                            showNotification('Phòng đang tạm ngưng hoạt động, không thể thực hiện giao dịch.', 'error');
                            return;
                          }
                          setSelectedRoom(room);
                        }}
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

                        <span className={isInactive ? "badge badge-cancelled" : `badge badge-${displayStatus.toLowerCase()}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                          {isInactive ? 'Tạm ngưng' : getStatusLabel(displayStatus)}
                        </span>

                        {activeBooking && user.role !== 'HOUSEKEEPER' && (
                          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <User size={10} />
                            <span>{activeBooking.guestName}</span>
                          </div>
                        )}
                        {activeBooking && user.role === 'HOUSEKEEPER' && (
                          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <span>Có khách</span>
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
                    onClick={() => {
                      const isInactive = room.note && room.note.includes('[INACTIVE]');
                      if (isInactive) {
                        showNotification('Phòng đang tạm ngưng hoạt động, không thể thực hiện giao dịch.', 'error');
                        return;
                      }
                      if (room.status === 'NEEDS_CLEANING' && user.role !== 'HOUSEKEEPER') {
                        showNotification('Từ chối truy cập: Chỉ nhân viên buồng phòng mới có quyền cập nhật phòng cần dọn.', 'error');
                        return;
                      }
                      setSelectedRoom(room);
                    }} 
                    className={room.note && room.note.includes('[INACTIVE]') ? "inactive-row" : ""}
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
                    <span style={{ fontSize: '15px', color: room.note && room.note.includes('[INACTIVE]') ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                      {room.roomNumber} {room.note && room.note.includes('[INACTIVE]') && '(Tạm ngưng)'}
                    </span>
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
                      const text = user.role === 'HOUSEKEEPER' ? (isCheckIn ? 'Có khách' : '→') : (isCheckIn ? slot.guestName : '→');
                      const title = user.role === 'HOUSEKEEPER' ? `Đang bận (${slot.checkInDate} đến ${slot.checkOutDate})` : `${slot.guestName} (${slot.checkInDate} đến ${slot.checkOutDate})`;

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
                      const isInactive = room.note && room.note.includes('[INACTIVE]');
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
                            background: isInactive ? 'rgba(255, 255, 255, 0.01)' : (day.isToday ? 'rgba(99, 102, 241, 0.05)' : 'transparent')
                          }}
                        >
                          {isInactive ? 'x' : '-'}
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
              {getTodayBooking(selectedRoom) && user.role !== 'HOUSEKEEPER' ? (
                (() => {
                  const activeBooking = getTodayBooking(selectedRoom);
                  const isReceptionist = (user.role === 'RECEPTIONIST' || user.role === 'ADMIN') && !readOnly;
                  const isAccountant = user.role === 'ACCOUNTANT' || readOnly;
                  return (
                    <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                        <User size={16} color="var(--primary)" />
                        Khách đang ở / đặt phòng
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', marginBottom: '18px' }}>
                        <p><strong>Khách hàng:</strong> {activeBooking.guestName}</p>
                        <p><strong>Số điện thoại:</strong> {activeBooking.guestPhone || 'Không có'}</p>
                        <p><strong>CCCD / ID:</strong> {activeBooking.guestIdNumber || 'Không có'}</p>
                        <p><strong>Khoảng thời gian:</strong> {activeBooking.checkInDate} → {activeBooking.checkOutDate}</p>
                        <p><strong>Số đêm:</strong> {activeBooking.nights} đêm</p>
                        <p>
                          <strong>Trạng thái booking:</strong>{' '}
                          <span className={`badge badge-${activeBooking.status.toLowerCase()}`}>
                            {activeBooking.status}
                          </span>
                        </p>
                      </div>

                      {/* Surcharge services details list inside the drawer */}
                      <div style={{ marginTop: '16px', borderTop: '1px dashed var(--border-color)', paddingTop: '16px', marginBottom: '18px' }}>
                        <h5 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Dịch vụ & Phụ thu đã dùng</span>
                          <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 'bold' }}>
                            Tổng: {drawerUsages.reduce((sum, u) => sum + (u.lineTotal || 0), 0).toLocaleString('vi-VN')} đ
                          </span>
                        </h5>
                        {loadingUsages ? (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Đang tải...</div>
                        ) : drawerUsages.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                            {drawerUsages.map(u => (
                              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', backgroundColor: 'rgba(255,255,255,0.01)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                <div>
                                  <strong>{u.serviceName}</strong> <span style={{ color: 'var(--text-muted)' }}>x{u.quantity}</span>
                                  {u.note && <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{u.note}</div>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span>{(u.lineTotal || 0).toLocaleString('vi-VN')} đ</span>
                                  {activeBooking.status !== 'CHECKED_OUT' && isReceptionist && (
                                    <button 
                                      onClick={() => handleDeleteSurchargeUsage(u.id)}
                                      style={{ background: 'none', border: 'none', color: 'var(--color-maintenance)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                                      title="Xóa phụ thu"
                                    >
                                      <X size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Chưa dùng dịch vụ phụ thu nào.</div>
                        )}
                      </div>

                      {/* Transition Actions */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {(activeBooking.status === 'CONFIRMED' || activeBooking.status === 'NEW') && isReceptionist && (
                          <>
                            <button 
                              onClick={() => {
                                if (selectedRoom.status === 'NEEDS_CLEANING') {
                                  showNotification('Từ chối nhận phòng: Phòng đang CẦN DỌN DẸP. Nhân viên buồng phòng phải dọn dẹp xong trước khi check-in!', 'error');
                                  return;
                                }
                                if (selectedRoom.status === 'MAINTENANCE') {
                                  showNotification('Từ chối nhận phòng: Phòng đang BẢO TRÌ.', 'error');
                                  return;
                                }
                                handleBookingTransition(activeBooking.bookingId, 'check-in');
                              }} 
                              className="btn btn-primary btn-sm"
                              style={{ flex: 1, opacity: (selectedRoom.status === 'NEEDS_CLEANING' || selectedRoom.status === 'MAINTENANCE') ? 0.6 : 1 }}
                              title={selectedRoom.status === 'NEEDS_CLEANING' ? 'Phòng chưa sẵn sàng (đang cần dọn dẹp)' : 'Nhận phòng'}
                            >
                              <Check size={14} /> Nhận phòng (Check-in)
                            </button>
                            <button 
                              onClick={() => {
                                if (window.confirm('Xác nhận khách không đến (No-show)? Trạng thái đặt phòng sẽ chuyển sang NO_SHOW và giải phóng phòng.')) {
                                  handleBookingTransition(activeBooking.bookingId, 'no-show');
                                  setSelectedRoom(null);
                                }
                              }} 
                              className="btn btn-secondary btn-sm"
                              style={{ flex: 1, color: 'var(--color-maintenance)' }}
                            >
                              <X size={14} /> No-show
                            </button>
                          </>
                        )}
                        {activeBooking.status === 'CHECKED_IN' && (
                          <>
                            {isReceptionist && (
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
                            {isAccountant && (
                              <button 
                                onClick={handleViewInvoice} 
                                className="btn btn-secondary btn-sm"
                                style={{ flex: '1 0 100%' }}
                              >
                                <DollarSign size={14} /> Xem hóa đơn thanh toán
                              </button>
                            )}
                          </>
                        )}
                        {activeBooking.status !== 'CHECKED_OUT' && activeBooking.status !== 'CANCELLED' && activeBooking.status !== 'CHECKED_IN' && isReceptionist && (
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
              ) : selectedRoom.status === 'NEEDS_CLEANING' ? (
                <div className="card" style={{ borderLeft: '4px solid var(--color-cleaning)', padding: '18px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--color-cleaning)' }}>
                    <Sparkles size={16} />
                    Phòng cần dọn dẹp (Chưa sẵn sàng)
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Phòng vừa làm thủ tục Check-out hoặc đang chờ làm vệ sinh trước khi đón khách tiếp theo.
                  </p>
                  {user.role === 'HOUSEKEEPER' && !readOnly && (
                    <button 
                      onClick={() => handleUpdateRoomStatus('AVAILABLE')}
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                    >
                      <Sparkles size={16} /> Hoàn tất dọn phòng (Đánh dấu Sẵn sàng)
                    </button>
                  )}
                </div>
              ) : selectedRoom.status === 'MAINTENANCE' ? (
                <div className="card" style={{ borderLeft: '4px solid var(--color-maintenance)', padding: '18px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--color-maintenance)' }}>
                    <Wrench size={16} />
                    Phòng đang bảo trì
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Phòng đang tạm ngưng đón khách để sửa chữa thiết bị hoặc bảo trì phòng.
                  </p>
                  {(user.role === 'OWNER' || user.role === 'ADMIN') && !readOnly && (
                    <button 
                      onClick={() => handleUpdateRoomStatus('AVAILABLE')}
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                    >
                      <Check size={16} /> Hoàn tất bảo trì (Sẵn sàng)
                    </button>
                  )}
                </div>
              ) : getTodayBooking(selectedRoom) && user.role === 'HOUSEKEEPER' ? (
                <div className="card" style={{ borderLeft: '4px solid var(--color-occupied)', padding: '18px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--color-occupied)' }}>
                    <User size={16} />
                    Phòng đang có khách lưu trú
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                    Khách đang sử dụng phòng. Buồng phòng không cần dọn dẹp vào lúc này.
                  </p>
                </div>
              ) : (
                /* Room is AVAILABLE vacant */
                <div className="card" style={{ borderLeft: '4px solid var(--color-available)', padding: '18px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--color-available)' }}>
                    <CheckCircle size={16} />
                    Phòng trống (Sẵn sàng đón khách)
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Phòng đã được làm vệ sinh sạch sẽ và sẵn sàng đón lượt khách mới.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(user.role === 'RECEPTIONIST' || user.role === 'ADMIN') && !readOnly && (
                      <button 
                        onClick={() => { setShowAssignModal(true); }}
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                      >
                        <Plus size={16} /> Gán booking chưa có phòng
                      </button>
                    )}
                    {(user.role === 'OWNER' || user.role === 'ADMIN') && !readOnly && (
                      <button 
                        onClick={() => { setNewStatus('MAINTENANCE'); setShowStatusModal(true); }}
                        className="btn btn-secondary"
                        style={{ width: '100%', color: 'var(--color-maintenance)' }}
                      >
                        <Wrench size={16} /> Đưa vào bảo trì
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Room timeline booking schedule inside drawer */}
              {user.role !== 'HOUSEKEEPER' && (
                <div className="card" style={{ padding: '16px' }}>
                  <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} />
                    Lịch đặt sắp tới
                  </h4>
                  {selectedRoom.bookings && selectedRoom.bookings.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {selectedRoom.bookings.filter(b => b.status !== 'CANCELLED').map(b => (
                        <div key={b.bookingId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '13px' }}>
                            <div>
                              <strong>{b.guestName}</strong>
                              <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {b.checkInDate} → {b.checkOutDate}
                              </span>
                            </div>
                            <span className={`badge badge-${b.status.toLowerCase()}`} style={{ fontSize: '9px', height: 'fit-content' }}>
                              {b.status}
                            </span>
                          </div>
                          {(b.status === 'CONFIRMED' || b.status === 'NEW') && (user.role === 'OWNER' || user.role === 'RECEPTIONIST' || user.role === 'ADMIN') && !readOnly && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                              <button 
                                onClick={() => handleBookingTransition(b.bookingId, 'check-in')} 
                                className="btn btn-primary btn-sm"
                                style={{ padding: '2px 8px', fontSize: '11px', height: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Check size={10} /> Nhận phòng
                              </button>
                              <button 
                                onClick={() => {
                                  if (window.confirm('Xác nhận khách không đến (No-show)? Trạng thái đặt phòng sẽ chuyển sang NO_SHOW và giải phóng phòng.')) {
                                    handleBookingTransition(b.bookingId, 'no-show');
                                    setSelectedRoom(null);
                                  }
                                }}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '2px 8px', fontSize: '11px', height: 'auto', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-maintenance)' }}
                              >
                                <X size={10} /> No-show
                              </button>
                              <button 
                                onClick={() => handleBookingTransition(b.bookingId, 'cancel')} 
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '2px 8px', fontSize: '11px', height: 'auto', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-maintenance)' }}
                              >
                                <X size={10} /> Hủy đặt
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Chưa có lịch đặt phòng nào.</p>
                  )}
                </div>
              )}
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
                  {selectedRoom && getTodayBooking(selectedRoom) && (
                    <>
                      <p><strong>Số điện thoại:</strong> {getTodayBooking(selectedRoom).guestPhone || 'Không có'}</p>
                      <p><strong>CCCD / ID:</strong> {getTodayBooking(selectedRoom).guestIdNumber || 'Không có'}</p>
                    </>
                  )}
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
                {(user.role === 'OWNER' || user.role === 'RECEPTIONIST' || user.role === 'ADMIN') && (
                  <button 
                    onClick={() => { fetchServicesCatalog(); setShowServiceModal(true); }}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                  >
                    <Plus size={10} /> Thêm phụ thu
                  </button>
                )}
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
                            {activeInvoice.status !== 'PAID' && (user.role === 'OWNER' || user.role === 'RECEPTIONIST' || user.role === 'ADMIN') && (
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
              {activeInvoice.status !== 'PAID' && (user.role === 'OWNER' || user.role === 'RECEPTIONIST') && (
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
