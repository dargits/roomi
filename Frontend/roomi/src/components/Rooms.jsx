import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Layers, 
  Tv, 
  DollarSign, 
  Info,
  Sliders,
  Home
} from 'lucide-react';

function Rooms({ user, showNotification }) {
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
    basePrice: 500000
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

  // Room CRUD handlers
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

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phòng này?')) return;
    try {
      await api.delete(`/rooms/${roomId}`);
      showNotification('Đã xóa phòng thành công');
      fetchData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Room Type CRUD handlers
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

  const openCreateType = () => {
    setModalMode('create');
    setTypeForm({
      name: '',
      capacity: 2,
      amenities: '',
      basePrice: 500000
    });
    setShowTypeModal(true);
  };

  const openEditType = (type) => {
    setModalMode('edit');
    setSelectedType(type);
    setTypeForm({
      name: type.name,
      capacity: type.capacity,
      amenities: type.amenities || '',
      basePrice: type.basePrice
    });
    setShowTypeModal(true);
  };

  const handleDeleteType = async (typeId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa loại phòng này? LƯU Ý: Xóa loại phòng sẽ xóa tất cả phòng thuộc loại này!')) return;
    try {
      await api.delete(`/room-types/${typeId}`);
      showNotification('Đã xóa loại phòng thành công');
      fetchData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
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

      {/* Tabs switches */}
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
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
          <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : activeTab === 'rooms' ? (
        /* ROOMS LIST TAB */
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
                      <span style={{ fontSize: '13px', color: room.note ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {room.note || 'Không có ghi chú'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => openEditRoom(room)} className="btn btn-secondary btn-sm" title="Sửa thông tin">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => handleDeleteRoom(room.id)} className="btn btn-secondary btn-sm" style={{ color: 'var(--color-maintenance)' }} title="Xóa phòng">
                          <Trash2 size={14} />
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
        /* ROOM TYPES TAB */
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tên loại phòng</th>
                <th>Sức chứa tối đa</th>
                <th>Giá mặc định (VND)</th>
                <th>Tiện nghi kèm theo</th>
                <th style={{ textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {roomTypes.length > 0 ? (
                roomTypes.map(type => (
                  <tr key={type.id}>
                    <td><strong>{type.name}</strong></td>
                    <td>{type.capacity} khách</td>
                    <td style={{ fontWeight: '600', color: 'var(--primary)' }}>
                      {type.basePrice?.toLocaleString('vi-VN')} đ / đêm
                    </td>
                    <td>
                      {type.amenities ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                          <Tv size={14} color="var(--text-secondary)" />
                          <span>{type.amenities}</span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Chưa thiết lập tiện nghi</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => openEditType(type)} className="btn btn-secondary btn-sm" title="Sửa loại phòng">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => handleDeleteType(type.id)} className="btn btn-secondary btn-sm" style={{ color: 'var(--color-maintenance)' }} title="Xóa loại phòng">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px' }}>Chưa có loại phòng nào được thiết lập.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE / EDIT ROOM MODAL */}
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
                    <option value="AVAILABLE">Sẵn sàng đón khách (AVAILABLE)</option>
                    <option value="NEEDS_CLEANING">Cần dọn dẹp (NEEDS_CLEANING)</option>
                    <option value="MAINTENANCE">Đang bảo trì (MAINTENANCE)</option>
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

      {/* CREATE / EDIT TYPE MODAL */}
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
                    step="5000"
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
