import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import PageLoader from '../components/PageLoader';
import { 
  Plus, 
  Edit, 
  X, 
  Layers, 
  Tv, 
  Info,
  Sliders,
  Home,
  ToggleLeft,
  ToggleRight,
  Image,
  EyeOff,
  Eye
} from 'lucide-react';

function Rooms({ user, showNotification }) {
  const isAuthorized = user?.role === 'OWNER' || user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState('rooms'); // 'rooms' | 'types'
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  
  // Selected targets for editing
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedType, setSelectedType] = useState(null);

  // Form states
  const [roomForm, setRoomForm] = useState({
    roomTypeId: '',
    roomNumber: '',
    floor: '1',
    status: 'AVAILABLE',
    note: ''
  });

  const [typeForm, setTypeForm] = useState({
    name: '',
    capacity: 2,
    amenities: '',
    basePrice: 500000,
    roomTypeImg: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [roomsRes, typesRes] = await Promise.all([
        api.get('/rooms'),
        api.get('/room-types')
      ]);

      if (roomsRes.data && roomsRes.data.data) {
        setRooms(roomsRes.data.data);
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
    fetchData();
  }, []);

  // ─── Room handlers ──────────────────────────────────────────────────────────

  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...roomForm,
        roomTypeId: parseInt(roomForm.roomTypeId)
      };

      if (modalMode === 'create') {
        await api.post('/rooms', payload);
        showNotification('Tạo phòng mới thành công');
      } else {
        await api.put(`/rooms/${selectedRoom.id}`, payload);
        showNotification('Cập nhật thông tin phòng thành công');
      }
      setShowRoomModal(false);
      fetchData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleToggleRoomActive = async (room) => {
    const isInactive = room.note && room.note.includes('[INACTIVE]');
    let newNote = room.note || '';
    if (isInactive) {
      newNote = newNote.replace('[INACTIVE]', '').trim();
    } else {
      newNote = (newNote ? newNote + ' [INACTIVE]' : '[INACTIVE]').trim();
    }

    try {
      const payload = {
        roomTypeId: room.roomType.id,
        roomNumber: room.roomNumber,
        floor: room.floor,
        status: room.status,
        note: newNote
      };
      await api.put(`/rooms/${room.id}`, payload);
      showNotification(isInactive ? `Đã mở hoạt động lại phòng ${room.roomNumber}` : `Đã tắt hoạt động phòng ${room.roomNumber}`);
      fetchData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const openCreateRoom = () => {
    setModalMode('create');
    setRoomForm({
      roomTypeId: roomTypes.length > 0 ? roomTypes[0].id.toString() : '',
      roomNumber: '',
      floor: '1',
      status: 'AVAILABLE',
      note: ''
    });
    setShowRoomModal(true);
  };

  const openEditRoom = (room) => {
    setModalMode('edit');
    setSelectedRoom(room);
    setRoomForm({
      roomTypeId: room.roomType.id.toString(),
      roomNumber: room.roomNumber,
      floor: room.floor,
      status: room.status,
      note: room.note || ''
    });
    setShowRoomModal(true);
  };

  // ─── Room Type handlers ──────────────────────────────────────────────────────

  const handleTypeSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...typeForm,
        capacity: parseInt(typeForm.capacity),
        basePrice: parseInt(typeForm.basePrice)
      };

      if (modalMode === 'create') {
        await api.post('/room-types', payload);
        showNotification('Tạo loại phòng mới thành công');
      } else {
        await api.put(`/room-types/${selectedType.id}`, payload);
        showNotification('Cập nhật loại phòng thành công');
      }
      setShowTypeModal(false);
      fetchData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  /**
   * Toggle ẩn/hiện danh mục phòng.
   * Dùng cờ [HIDDEN] trong trường amenities để đánh dấu — không cần thêm cột DB.
   * Danh mục bị ẩn vẫn tồn tại, chỉ không hiển thị trong dropdown khi tạo booking.
   */
  const handleToggleTypeVisible = async (type) => {
    const isHidden = type.amenities && type.amenities.includes('[HIDDEN]');
    let newAmenities = type.amenities || '';
    if (isHidden) {
      newAmenities = newAmenities.replace('[HIDDEN]', '').trim();
    } else {
      newAmenities = (newAmenities ? newAmenities + ' [HIDDEN]' : '[HIDDEN]').trim();
    }

    try {
      const payload = {
        name: type.name,
        capacity: type.capacity,
        amenities: newAmenities,
        basePrice: type.basePrice,
        roomTypeImg: type.roomTypeImg || ''
      };
      await api.put(`/room-types/${type.id}`, payload);
      showNotification(
        isHidden
          ? `Đã hiển thị lại danh mục "${type.name}"`
          : `Đã ẩn danh mục "${type.name}" — sẽ không xuất hiện khi tạo đặt phòng mới`
      );
      fetchData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const openCreateType = () => {
    setModalMode('create');
    setTypeForm({
      name: '',
      capacity: 2,
      amenities: '',
      basePrice: 500000,
      roomTypeImg: ''
    });
    setShowTypeModal(true);
  };

  const openEditType = (type) => {
    setModalMode('edit');
    setSelectedType(type);
    setTypeForm({
      name: type.name,
      capacity: type.capacity,
      // Loại bỏ cờ [HIDDEN] khi hiển thị form sửa — không hiện cho user thấy
      amenities: (type.amenities || '').replace('[HIDDEN]', '').trim(),
      basePrice: type.basePrice,
      roomTypeImg: type.roomTypeImg || ''
    });
    setShowTypeModal(true);
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'AVAILABLE': return 'Sẵn sàng';
      case 'OCCUPIED': return 'Đang có khách';
      case 'NEEDS_CLEANING': return 'Cần dọn dẹp';
      case 'MAINTENANCE': return 'Bảo trì';
      default: return status;
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
        <Info size={48} color="var(--color-maintenance)" />
        <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Từ chối truy cập</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', fontSize: '14px' }}>
          Tài khoản của bạn không có đủ thẩm quyền để truy cập trang quản lý phòng.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý phòng khách sạn</h1>
          <p className="page-subtitle">Quản lý danh sách phòng, sơ đồ tầng và thiết lập danh mục loại phòng</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          {activeTab === 'rooms' ? (
            <button onClick={openCreateRoom} className="btn btn-primary">
              <Plus size={18} />
              Thêm phòng mới
            </button>
          ) : (
            <button onClick={openCreateType} className="btn btn-primary">
              <Plus size={18} />
              Thêm loại phòng
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '24px',
        gap: '24px'
      }}>
        <button
          onClick={() => setActiveTab('rooms')}
          style={{
            background: 'none',
            border: 'none',
            padding: '12px 4px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            color: activeTab === 'rooms' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'rooms' ? '2px solid var(--primary)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'var(--transition-fast)'
          }}
        >
          <Home size={16} />
          Danh sách Phòng
        </button>
        <button
          onClick={() => setActiveTab('types')}
          style={{
            background: 'none',
            border: 'none',
            padding: '12px 4px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            color: activeTab === 'types' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'types' ? '2px solid var(--primary)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'var(--transition-fast)'
          }}
        >
          <Sliders size={16} />
          Danh mục Loại phòng
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : activeTab === 'rooms' ? (
        /* ══════════════════ ROOMS LIST TAB ══════════════════ */
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Số phòng</th>
                <th>Tầng</th>
                <th>Loại phòng</th>
                <th>Trạng thái</th>
                <th>Ghi chú</th>
                <th style={{ textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {rooms.length > 0 ? (
                rooms.map(room => (
                  <tr key={room.id}>
                    <td><strong>Phòng {room.roomNumber}</strong></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Layers size={14} color="var(--text-secondary)" />
                        <span>Tầng {room.floor}</span>
                      </div>
                    </td>
                    <td>
                      <div><strong>{room.roomType?.name}</strong></div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Sức chứa: {room.roomType?.capacity} khách | {room.roomType?.basePrice?.toLocaleString()} đ
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${room.status.toLowerCase()}`}>
                        {getStatusLabel(room.status)}
                      </span>
                    </td>
                    <td>
                      {room.note && room.note.includes('[INACTIVE]') && (
                        <span className="badge badge-cancelled" style={{ marginRight: '6px', fontSize: '10px' }}>Tạm ngưng</span>
                      )}
                      <span style={{ fontSize: '13px', color: room.note ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {room.note ? room.note.replace('[INACTIVE]', '').trim() || 'Không có ghi chú' : 'Không có ghi chú'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {/* Toggle tắt/bật hoạt động phòng */}
                        <button 
                          onClick={() => handleToggleRoomActive(room)} 
                          className="btn btn-secondary btn-sm" 
                          style={{ color: room.note && room.note.includes('[INACTIVE]') ? 'var(--text-muted)' : 'var(--color-available)' }}
                          title={room.note && room.note.includes('[INACTIVE]') ? "Mở hoạt động" : "Tắt hoạt động"}
                        >
                          {room.note && room.note.includes('[INACTIVE]') ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
                        </button>
                        {/* Sửa thông tin phòng */}
                        <button onClick={() => openEditRoom(room)} className="btn btn-secondary btn-sm" title="Sửa thông tin">
                          <Edit size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px' }}>Chưa có phòng nào được tạo.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* ══════════════════ ROOM TYPES TAB ══════════════════ */
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Hình ảnh</th>
                <th>Tên loại phòng</th>
                <th>Sức chứa tối đa</th>
                <th>Giá mặc định (VND)</th>
                <th>Tiện nghi kèm theo</th>
                <th>Hiển thị</th>
                <th style={{ textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {roomTypes.length > 0 ? (
                roomTypes.map(type => {
                  const isHidden = type.amenities && type.amenities.includes('[HIDDEN]');
                  return (
                    <tr key={type.id} style={{ opacity: isHidden ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                      <td>
                        <div style={{
                          width: '54px',
                          height: '40px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {type.roomTypeImg ? (
                            <img
                              src={type.roomTypeImg}
                              alt={type.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                            />
                          ) : null}
                          <div style={{ display: type.roomTypeImg ? 'none' : 'flex', color: 'var(--text-muted)' }}>
                            <Image size={18} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>{type.name}</strong>
                        {isHidden && (
                          <span className="badge badge-cancelled" style={{ marginLeft: '8px', fontSize: '10px' }}>Đang ẩn</span>
                        )}
                      </td>
                      <td>{type.capacity} khách</td>
                      <td style={{ fontWeight: '600', color: 'var(--primary)' }}>
                        {type.basePrice?.toLocaleString('vi-VN')} đ / đêm
                      </td>
                      <td>
                        {type.amenities && type.amenities.replace('[HIDDEN]', '').trim() ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                            <Tv size={14} color="var(--text-secondary)" />
                            <span>{type.amenities.replace('[HIDDEN]', '').trim()}</span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Chưa thiết lập tiện nghi</span>
                        )}
                      </td>
                      <td>
                        {/* Toggle ẩn/hiện danh mục */}
                        <button
                          onClick={() => handleToggleTypeVisible(type)}
                          className="btn btn-secondary btn-sm"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: isHidden ? 'var(--text-muted)' : 'var(--color-available)',
                            fontSize: '12px'
                          }}
                          title={isHidden ? 'Hiển thị danh mục này' : 'Ẩn danh mục này'}
                        >
                          {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                          {isHidden ? 'Đang ẩn' : 'Đang hiện'}
                        </button>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {/* Sửa loại phòng */}
                          <button onClick={() => openEditType(type)} className="btn btn-secondary btn-sm" title="Sửa loại phòng">
                            <Edit size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px' }}>Chưa có loại phòng nào được thiết lập.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════ MODAL: TẠO / SỬA PHÒNG ══════ */}
      {showRoomModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', margin: 0 }}>
                {modalMode === 'create' ? 'Thêm phòng mới' : `Chỉnh sửa phòng ${selectedRoom?.roomNumber}`}
              </h2>
              <button onClick={() => setShowRoomModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleRoomSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label>Số phòng *</label>
                  <input
                    type="text"
                    placeholder="VD: 101, 205..."
                    value={roomForm.roomNumber}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, roomNumber: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label>Tầng *</label>
                  <input
                    type="text"
                    placeholder="VD: 1, 2..."
                    value={roomForm.floor}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, floor: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label>Loại phòng *</label>
                  <select
                    value={roomForm.roomTypeId}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, roomTypeId: e.target.value }))}
                    required
                  >
                    <option value="">-- Chọn Loại phòng --</option>
                    {roomTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.basePrice.toLocaleString()} đ)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Trạng thái ban đầu</label>
                  <select
                    value={roomForm.status}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="AVAILABLE">Sẵn sàng đón khách</option>
                    <option value="NEEDS_CLEANING">Cần dọn dẹp</option>
                    <option value="MAINTENANCE">Đang bảo trì</option>
                  </select>
                </div>

                <div>
                  <label>Ghi chú</label>
                  <input
                    type="text"
                    placeholder="VD: View biển, phòng góc yên tĩnh..."
                    value={roomForm.note}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, note: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowRoomModal(false)} className="btn btn-secondary btn-sm">Hủy</button>
                <button type="submit" className="btn btn-primary btn-sm">
                  {modalMode === 'create' ? 'Tạo phòng' : 'Lưu cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════ MODAL: TẠO / SỬA DANH MỤC PHÒNG ══════ */}
      {showTypeModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', margin: 0 }}>
                {modalMode === 'create' ? 'Tạo loại phòng mới' : `Chỉnh sửa loại phòng ${selectedType?.name}`}
              </h2>
              <button onClick={() => setShowTypeModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleTypeSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label>Tên loại phòng *</label>
                  <input
                    type="text"
                    placeholder="VD: Phòng Deluxe, Phòng VIP..."
                    value={typeForm.name}
                    onChange={(e) => setTypeForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label>Sức chứa tối đa (người) *</label>
                  <input
                    type="number"
                    min="1"
                    value={typeForm.capacity}
                    onChange={(e) => setTypeForm(prev => ({ ...prev, capacity: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label>Giá phòng mặc định (VND/đêm) *</label>
                  <input
                    type="number"
                    min="0"
                    value={typeForm.basePrice}
                    onChange={(e) => setTypeForm(prev => ({ ...prev, basePrice: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label>Mô tả Tiện nghi kèm theo</label>
                  <input
                    type="text"
                    placeholder="VD: Smart TV, Tủ lạnh mini, Điều hòa, Bồn tắm..."
                    value={typeForm.amenities}
                    onChange={(e) => setTypeForm(prev => ({ ...prev, amenities: e.target.value }))}
                  />
                </div>

                <div>
                  <label>URL Hình ảnh đại diện (Link ảnh)</label>
                  <input
                    type="url"
                    placeholder="VD: https://images.unsplash.com/photo-..."
                    value={typeForm.roomTypeImg}
                    onChange={(e) => setTypeForm(prev => ({ ...prev, roomTypeImg: e.target.value }))}
                  />
                  {typeForm.roomTypeImg && (
                    <div style={{ marginTop: '8px', borderRadius: '8px', overflow: 'hidden', height: '120px', border: '1px solid var(--border-color)', position: 'relative' }}>
                      <img
                        src={typeForm.roomTypeImg}
                        alt="Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      />
                      <div style={{ display: 'none', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-secondary)', color: 'var(--color-maintenance)', fontSize: '12px' }}>
                        URL ảnh không hợp lệ hoặc không tải được
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowTypeModal(false)} className="btn btn-secondary btn-sm">Hủy</button>
                <button type="submit" className="btn btn-primary btn-sm">
                  {modalMode === 'create' ? 'Tạo loại phòng' : 'Lưu cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Rooms;
