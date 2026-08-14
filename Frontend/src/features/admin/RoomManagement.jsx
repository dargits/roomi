import React, { useState, useEffect } from 'react';
import { roomApi } from '../../services/roomApi';
import { roomTypeApi } from '../../services/roomTypeApi';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit, Trash2, CheckCircle, AlertTriangle, Wrench, RefreshCw, DoorOpen, Brush } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';

const RoomManagement = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    roomNumber: '',
    roomTypeId: '',
    floor: '',
    status: 'AVAILABLE',
    notes: ''
  });
  const [formError, setFormError] = useState('');

  // Delete confirm state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const data = await roomApi.getAllRooms(filterStatus || null);
      setRooms(data);
    } catch (error) {
      console.error("Failed to fetch rooms", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomTypes = async () => {
    try {
      if (user?.role === 'OWNER') {
        const data = await roomTypeApi.getAllRoomTypes();
        setRoomTypes(data);
      } else {
        const data = await roomTypeApi.getPublicRoomTypes();
        setRoomTypes(data);
      }
    } catch (error) {
      console.error("Failed to fetch room types", error);
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchRoomTypes();
  }, [filterStatus]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openAddModal = () => {
    setFormData({ id: null, roomNumber: '', roomTypeId: roomTypes[0]?.id || '', floor: '', status: 'AVAILABLE', notes: '' });
    setIsEditing(false);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (room) => {
    setFormData({
      id: room.id,
      roomNumber: room.roomNumber,
      roomTypeId: room.roomTypeId || (room.roomType ? room.roomType.id : ''),
      floor: room.floor || '',
      status: room.status,
      notes: room.notes || ''
    });
    setIsEditing(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const payload = {
        ...formData,
        roomTypeId: parseInt(formData.roomTypeId)
      };
      if (isEditing) {
        await roomApi.updateRoom(payload.id, payload);
      } else {
        await roomApi.createRoom(payload);
      }
      setIsModalOpen(false);
      fetchRooms();
    } catch (error) {
      console.error("Form submit error", error);
      setFormError(error.response?.data?.message || "Có lỗi xảy ra khi lưu dữ liệu.");
    }
  };

  const openDeleteModal = (room) => {
    setItemToDelete(room);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await roomApi.deleteRoom(itemToDelete.id);
      setIsDeleteModalOpen(false);
      fetchRooms();
    } catch (error) {
      console.error("Delete error", error);
      alert(error.response?.data?.message || "Lỗi khi xóa phòng.");
    }
  };

  const handleMarkClean = async (id) => {
    try {
      await roomApi.markRoomClean(id);
      fetchRooms();
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi thao tác.");
    }
  };

  const handleMarkMaintenance = async (id) => {
    try {
      await roomApi.markRoomMaintenance(id);
      fetchRooms();
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi thao tác.");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-100 text-green-800 border-green-200';
      case 'OCCUPIED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DIRTY': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MAINTENANCE': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'AVAILABLE': return 'Trống';
      case 'OCCUPIED': return 'Đang ở';
      case 'DIRTY': return 'Chưa dọn';
      case 'MAINTENANCE': return 'Bảo trì';
      default: return status;
    }
  };

  const isOwner = user?.role === 'OWNER';

  const canMarkClean = user?.role === 'OWNER' || user?.role === 'RECEPTIONIST' || user?.role === 'HOUSEKEEPER';

  const roomTypeOptions = roomTypes.map(rt => ({ value: rt.id, label: rt.name }));
  const statusOptions = [
    { value: 'AVAILABLE', label: 'Trống' },
    { value: 'OCCUPIED', label: 'Đang ở' },
    { value: 'DIRTY', label: 'Chưa dọn' },
    { value: 'MAINTENANCE', label: 'Bảo trì' }
  ];

  return (
    <div className="bg-surface rounded-lg shadow-sm border border-border-grey overflow-hidden mb-12">
      <div className="p-6 border-b border-border-grey flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest">
        <div>
          <h2 className="font-headline-md text-on-surface flex items-center gap-2">
            <DoorOpen size={28} className="text-primary" />
            Sơ đồ Phòng
          </h2>
          <p className="text-on-surface-variant font-body-md mt-1">Quản lý danh sách phòng và trạng thái hiện tại</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Select
            options={[{ value: '', label: 'Tất cả trạng thái' }, ...statusOptions]}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            containerClassName="w-full md:w-48"
            className="bg-white"
          />
          {isOwner && (
            <Button onClick={openAddModal} icon={Plus} className="uppercase shrink-0">
              Thêm Phòng
            </Button>
          )}
        </div>
      </div>

      <div className="p-6 bg-surface-container-low/30">
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {rooms.map(room => (
              <div key={room.id} className={`flex flex-col bg-surface rounded-xl border-2 transition-all hover:shadow-md ${getStatusColor(room.status).split(' ')[2]}`}>
                <div className={`p-4 border-b ${getStatusColor(room.status).split(' ')[2]} flex justify-between items-center bg-opacity-50`}>
                  <h3 className="font-title-lg font-bold text-on-surface">{room.roomNumber}</h3>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${getStatusColor(room.status).replace('border-', '')}`}>
                    {getStatusLabel(room.status)}
                  </span>
                </div>
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <div className="text-on-surface-variant font-body-sm flex justify-between">
                    <span>Loại phòng:</span>
                    <span className="font-medium text-on-surface text-right truncate ml-2" title={room.roomTypeName || 'N/A'}>
                      {room.roomTypeName || 'N/A'}
                    </span>
                  </div>
                  <div className="text-on-surface-variant font-body-sm flex justify-between">
                    <span>Tầng:</span>
                    <span className="font-medium text-on-surface">{room.floor || '—'}</span>
                  </div>
                  {room.notes && (
                    <div className="mt-2 text-xs text-on-surface-variant italic p-2 bg-surface-container-lowest rounded border border-border-grey truncate" title={room.notes}>
                      {room.notes}
                    </div>
                  )}
                </div>
                <div className="p-3 border-t border-border-grey/50 bg-surface-container-lowest rounded-b-xl flex justify-between gap-1">
                  <div className="flex gap-1">
                    {room.status === 'DIRTY' && canMarkClean && (
                      <button onClick={() => handleMarkClean(room.id)} className="p-2 rounded bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors tooltip-wrapper" title="Đã dọn sạch">
                        <Brush size={18} />
                      </button>
                    )}
                    {room.status !== 'MAINTENANCE' && room.status !== 'OCCUPIED' && isOwner && (
                      <button onClick={() => handleMarkMaintenance(room.id)} className="p-2 rounded bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface-variant tooltip-wrapper" title="Bảo trì">
                        <Wrench size={18} />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {isOwner && (
                      <>
                        <button onClick={() => openEditModal(room)} className="p-2 rounded hover:bg-surface-blue-light hover:text-primary transition-colors text-on-surface-variant" title="Sửa">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => openDeleteModal(room)} className="p-2 rounded hover:bg-red-50 hover:text-error transition-colors text-on-surface-variant" title="Xóa">
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {rooms.length === 0 && (
              <div className="col-span-full p-12 text-center text-on-surface-variant bg-surface rounded-xl border border-border-grey dashed">
                Không tìm thấy phòng nào.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isOwner && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Cập nhật phòng' : 'Thêm phòng mới'} maxWidth="max-w-md">
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-error rounded-md text-sm">
              {formError}
            </div>
          )}
          <form id="roomForm" onSubmit={handleSubmit} className="space-y-4">
            <Input label="Số phòng" name="roomNumber" required value={formData.roomNumber} onChange={handleInputChange} placeholder="Ví dụ: 101, 201..." />

            <Select label="Loại phòng" name="roomTypeId" value={formData.roomTypeId} onChange={handleInputChange} options={roomTypeOptions} required />

            <Input label="Tầng" name="floor" value={formData.floor} onChange={handleInputChange} placeholder="Ví dụ: Tầng 1" />

            <Select label="Trạng thái" name="status" value={formData.status} onChange={handleInputChange} options={statusOptions} required />

            <div>
              <label className="block font-label-md text-on-surface-variant mb-1.5">Ghi chú</label>
              <textarea name="notes" rows="3" value={formData.notes} onChange={handleInputChange} className="w-full px-3 py-2 border border-border-grey rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-body-md text-on-surface" placeholder="Ghi chú về phòng..."></textarea>
            </div>
          </form>
          <div className="flex justify-end gap-3 pt-6 border-t border-border-grey mt-6">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit" form="roomForm">Lưu dữ liệu</Button>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {isOwner && (
        <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="max-w-md">
          <div className="flex flex-col items-center text-center pb-6">
            <div className="w-14 h-14 rounded-full bg-red-100 text-error flex items-center justify-center mb-5">
              <AlertTriangle size={32} strokeWidth={1.5} />
            </div>
            <h3 className="font-title-lg text-on-surface mb-2">Xóa phòng này?</h3>
            <p className="font-body-md text-on-surface-variant">Bạn có chắc chắn muốn xóa phòng <strong>{itemToDelete?.roomNumber}</strong> không? Hành động này không thể hoàn tác.</p>
          </div>
          <div className="flex gap-3 pt-6 border-t border-border-grey">
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)} className="flex-1">Hủy bỏ</Button>
            <Button variant="danger" onClick={confirmDelete} className="flex-1">Xóa cứng</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default RoomManagement;
