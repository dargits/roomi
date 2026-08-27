import React, { useState, useEffect } from 'react';
import { roomApi } from '../../services/roomApi';
import { roomTypeApi } from '../../services/roomTypeApi';
import userApi from '../../services/userApi';
import { useAuth } from '../../context/AuthContext';
import { 
  IoAddOutline, 
  IoBedOutline,
  IoBrushOutline, 
  IoCheckmarkCircleOutline, 
  IoConstructOutline, 
  IoLayersOutline,
  IoLogOutOutline, 
  IoPencilOutline, 
  IoRefreshOutline, 
  IoSparklesOutline,
  IoTrashOutline, 
  IoWarningOutline,
  IoPersonAddOutline,
  IoPersonOutline,
  IoPersonRemoveOutline,
  IoFlameOutline,
  IoFlashOutline,
  IoTimeOutline
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';

const RoomManagement = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [housekeepers, setHousekeepers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  // Modal Phân công người dọn (NCL-06-CN-004)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedRoomForAssign, setSelectedRoomForAssign] = useState(null);
  const [selectedHousekeeperId, setSelectedHousekeeperId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

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
      if (user?.role === 'OWNER' || user?.role === 'ADMIN') {
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

  const fetchHousekeepers = async () => {
    try {
      const hkList = await userApi.getHousekeepers();
      setHousekeepers(Array.isArray(hkList) ? hkList : []);
    } catch (e) {
      try {
        const allUsers = await userApi.getAllUsers();
        const hkList = (Array.isArray(allUsers) ? allUsers : []).filter(
          u => (u.role === 'HOUSEKEEPER' || u.role === 'STAFF' || u.role === 'OWNER' || u.role === 'ADMIN') && u.active !== false
        );
        setHousekeepers(hkList);
      } catch (e2) {
        // Ignore if cannot fetch
      }
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchRoomTypes();
    fetchHousekeepers();
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

  const { success: toastSuccess, error: toastError } = useToast();

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
        toastSuccess(`Đã cập nhật Phòng ${formData.roomNumber} thành công!`);
      } else {
        await roomApi.createRoom(payload);
        toastSuccess(`Đã thêm mới Phòng ${formData.roomNumber} thành công!`);
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
      toastSuccess(`Đã xóa Phòng ${itemToDelete.roomNumber} thành công!`);
      setIsDeleteModalOpen(false);
      fetchRooms();
    } catch (error) {
      console.error("Delete error", error);
      toastError(error.response?.data?.message || "Lỗi khi xóa phòng.");
    }
  };

  const handleMarkClean = async (id) => {
    try {
      await roomApi.markRoomClean(id);
      toastSuccess("Đã cập nhật phòng sang trạng thái Sạch sẽ!");
      fetchRooms();
    } catch (error) {
      toastError(error.response?.data?.message || "Lỗi thao tác.");
    }
  };

  const handleMarkMaintenance = async (id) => {
    try {
      await roomApi.markRoomMaintenance(id);
      toastSuccess("Đã chuyển phòng sang trạng thái Bảo trì!");
      fetchRooms();
    } catch (error) {
      toastError(error.response?.data?.message || "Lỗi thao tác.");
    }
  };

  // NCL-06-CN-004: Mở modal chỉ định người dọn
  const openAssignModal = (room) => {
    setSelectedRoomForAssign(room);
    setSelectedHousekeeperId(room.assignedHousekeeperId ? String(room.assignedHousekeeperId) : '');
    setIsAssignModalOpen(true);
  };

  // Lưu phân công dọn phòng
  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!selectedRoomForAssign) return;
    setAssignLoading(true);
    try {
      if (!selectedHousekeeperId) {
        // Gỡ phân công
        await roomApi.unassignCleaner(selectedRoomForAssign.id);
        toastSuccess(`Đã gỡ phân công dọn phòng ${selectedRoomForAssign.roomNumber}`);
      } else {
        // Nếu chuyển giao sang người khác, gỡ người cũ trước
        if (selectedRoomForAssign.assignedHousekeeperId && String(selectedRoomForAssign.assignedHousekeeperId) !== String(selectedHousekeeperId)) {
          await roomApi.unassignCleaner(selectedRoomForAssign.id);
        }
        await roomApi.assignCleaner(selectedRoomForAssign.id, Number(selectedHousekeeperId));
        const targetStaff = housekeepers.find(h => String(h.id) === String(selectedHousekeeperId));
        toastSuccess(`Đã phân công ${targetStaff?.name || 'nhân viên'} dọn phòng ${selectedRoomForAssign.roomNumber}!`);
      }
      setIsAssignModalOpen(false);
      fetchRooms();
    } catch (error) {
      toastError(error.response?.data?.message || "Lỗi khi phân công nhân viên.");
    } finally {
      setAssignLoading(false);
    }
  };

  const handleQuickUnassign = async (roomId, roomNumber) => {
    try {
      await roomApi.unassignCleaner(roomId);
      toastSuccess(`Đã hủy phân công dọn phòng ${roomNumber}`);
      fetchRooms();
    } catch (error) {
      toastError(error.response?.data?.message || "Lỗi khi hủy phân công.");
    }
  };

  const STATUS_MAP = {
    AVAILABLE: {
      label: 'Trống',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      accentBg: 'bg-emerald-500',
      cardBorder: 'border-emerald-200 hover:border-emerald-400',
      icon: IoCheckmarkCircleOutline
    },
    OCCUPIED: {
      label: 'Đang ở',
      badge: 'bg-blue-50 text-blue-700 border-blue-300',
      accentBg: 'bg-blue-600',
      cardBorder: 'border-blue-200 hover:border-blue-400',
      icon: IoBedOutline
    },
    DIRTY: {
      label: 'Chưa dọn',
      badge: 'bg-amber-50 text-amber-700 border-amber-300',
      accentBg: 'bg-amber-500',
      cardBorder: 'border-amber-200 hover:border-amber-400',
      icon: IoBrushOutline
    },
    INSPECTING: {
      label: 'Chờ duyệt',
      badge: 'bg-purple-50 text-purple-700 border-purple-300',
      accentBg: 'bg-purple-600',
      cardBorder: 'border-purple-200 hover:border-purple-400',
      icon: IoSparklesOutline
    },
    MAINTENANCE: {
      label: 'Bảo trì',
      badge: 'bg-rose-50 text-rose-700 border-rose-300',
      accentBg: 'bg-rose-600',
      cardBorder: 'border-rose-200 hover:border-rose-400',
      icon: IoConstructOutline
    }
  };

  const isOwner = user?.role === 'OWNER';
  const canMarkClean = user?.role === 'OWNER' || user?.role === 'HOUSEKEEPER';

  const roomTypeOptions = roomTypes.map(rt => ({ value: rt.id, label: rt.name }));
  const statusOptions = [
    { value: 'AVAILABLE', label: 'Trống' },
    { value: 'OCCUPIED', label: 'Đang ở' },
    { value: 'DIRTY', label: 'Chưa dọn' },
    { value: 'INSPECTING', label: 'Chờ duyệt' },
    { value: 'MAINTENANCE', label: 'Bảo trì' }
  ];

  // Tính số lượng theo trạng thái
  const counts = rooms.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  // Nhóm phòng theo tầng
  const roomsByFloor = rooms.reduce((acc, r) => {
    const floorKey = r.floor ? (r.floor.startsWith('Tầng') ? r.floor : `Tầng ${r.floor}`) : 'Chưa phân tầng';
    if (!acc[floorKey]) acc[floorKey] = [];
    acc[floorKey].push(r);
    return acc;
  }, {});

  return (
    <div className="bg-surface rounded-none shadow-sm border border-border-grey overflow-hidden mb-8">
      {/* Header Bar */}
      <div className="px-4 py-3 border-b border-border-grey flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-surface-container-lowest">
        <div className="flex items-center gap-2 shrink-0">
          <IoLogOutOutline size={22} className="text-primary" />
          <h2 className="font-title-lg text-on-surface font-bold text-base sm:text-lg">
            Sơ đồ Phòng
          </h2>
        </div>

        {/* Action button */}
        {isOwner && (
          <Button size="sm" onClick={openAddModal} icon={IoAddOutline} className="shrink-0">
            Thêm Phòng
          </Button>
        )}
      </div>

      {/* Quick Status Filter Bar */}
      <div className="px-4 py-2.5 bg-surface-container-low border-b border-border-grey flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setFilterStatus('')}
          className={`px-3 py-1.5 text-xs font-semibold border transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
            filterStatus === ''
              ? 'bg-primary text-white border-primary shadow-xs'
              : 'bg-white text-on-surface-variant border-border-grey hover:border-primary/50'
          }`}
        >
          <span>Tất cả</span>
          <span className={`px-1.5 py-0.2 text-[11px] font-bold ${filterStatus === '' ? 'bg-white/20 text-white' : 'bg-surface-container text-on-surface'}`}>
            {rooms.length}
          </span>
        </button>

        {Object.entries(STATUS_MAP).map(([statusKey, cfg]) => {
          const count = counts[statusKey] || 0;
          const isActive = filterStatus === statusKey;
          const Icon = cfg.icon;

          return (
            <button
              key={statusKey}
              onClick={() => setFilterStatus(filterStatus === statusKey ? '' : statusKey)}
              className={`px-3 py-1.5 text-xs font-semibold border transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-white text-on-surface-variant border-border-grey hover:border-primary/50'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-white' : cfg.accentBg.replace('bg-', 'text-')} />
              <span>{cfg.label}</span>
              <span className={`px-1.5 py-0.2 text-[11px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-surface-container text-on-surface'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="p-5 bg-surface-container-low/20 space-y-6">
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-none h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : Object.keys(roomsByFloor).length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant bg-white border border-border-grey">
            Không tìm thấy phòng nào phù hợp với bộ lọc.
          </div>
        ) : (
          Object.entries(roomsByFloor).map(([floorName, floorRooms]) => (
            <div key={floorName} className="space-y-3">
              {/* Floor Header */}
              <div className="flex items-center gap-2 pb-1.5 border-b border-border-grey/70">
                <span className="font-bold text-sm text-on-surface tracking-wide uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-primary"></span>
                  {floorName}
                </span>
                <span className="text-xs text-on-surface-variant font-medium">
                  ({floorRooms.length} phòng)
                </span>
              </div>

              {/* Floor Rooms Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                {floorRooms.map(room => {
                  const cfg = STATUS_MAP[room.status] || STATUS_MAP.AVAILABLE;
                  const Icon = cfg.icon;

                  return (
                    <div
                      key={room.id}
                      className={`bg-white border transition-all duration-150 hover:shadow-md flex flex-col justify-between relative group ${cfg.cardBorder}`}
                    >
                      {/* Top Accent Strip */}
                      <div className={`h-1 w-full ${cfg.accentBg}`} />

                      {/* Card Body */}
                      <div className="p-3.5 space-y-2.5">
                        {/* Room Number & Status Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-title-lg font-bold text-xl text-on-surface tracking-tight">
                            {room.roomNumber}
                          </div>
                          <span className={`px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider border flex items-center gap-1 shrink-0 ${cfg.badge}`}>
                            <Icon size={12} />
                            {cfg.label}
                          </span>
                        </div>

                        {/* Room Type */}
                        <div className="text-xs text-on-surface-variant flex items-center gap-1.5 truncate" title={room.roomTypeName || 'N/A'}>
                          <IoBedOutline size={14} className="text-primary shrink-0" />
                          <span className="font-medium text-on-surface truncate">
                            {room.roomTypeName || 'N/A'}
                          </span>
                        </div>

                        {/* NCL-06-CN-004: Phân công & Ưu tiên dọn dẹp cho phòng DIRTY / INSPECTING */}
                        {(room.status === 'DIRTY' || room.status === 'INSPECTING') && (
                          <div className="pt-1.5 border-t border-border-grey/60 space-y-1.5">
                            {/* Mức ưu tiên đón khách */}
                            {room.priorityLevel === 'URGENT' && (
                              <div className="text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 border border-red-200 flex items-center gap-1">
                                <IoFlameOutline size={12} className="text-red-600 animate-pulse shrink-0" />
                                <span className="truncate">🔥 Khách đến hôm nay ({room.nextCheckInDate})</span>
                              </div>
                            )}
                            {room.priorityLevel === 'HIGH' && (
                              <div className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 border border-amber-200 flex items-center gap-1">
                                <IoFlashOutline size={12} className="text-amber-600 shrink-0" />
                                <span className="truncate">⚡ Khách đến ngày mai ({room.nextCheckInDate})</span>
                              </div>
                            )}

                            {/* Trạng thái phân công & Nút chỉ định người dọn */}
                            {room.assignedHousekeeperName ? (
                              <div className="flex items-center justify-between gap-1 text-[11px] text-blue-900 bg-blue-50/90 px-2 py-1 border border-blue-200">
                                <span className="flex items-center gap-1 truncate font-semibold">
                                  <IoPersonOutline size={12} className="text-blue-600 shrink-0" />
                                  <span className="truncate">Dọn: {room.assignedHousekeeperName}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openAssignModal(room)}
                                  className="text-[10px] text-blue-700 hover:text-blue-900 font-bold hover:underline shrink-0 cursor-pointer"
                                  title="Đổi nhân viên dọn phòng"
                                >
                                  Đổi
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openAssignModal(room)}
                                className="w-full flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-colors cursor-pointer"
                              >
                                <IoPersonAddOutline size={12} className="text-amber-700" />
                                <span>Chỉ định người dọn</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Notes */}
                        {room.notes && (
                          <div className="text-[11px] text-on-surface-variant italic p-1.5 bg-surface-container-low border border-border-grey/60 truncate" title={room.notes}>
                            {room.notes}
                          </div>
                        )}
                      </div>

                      {/* Card Bottom Actions */}
                      <div className="px-3 py-2 border-t border-border-grey/60 bg-surface-container-lowest flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          {room.status === 'DIRTY' && canMarkClean && (
                            <button
                              onClick={() => handleMarkClean(room.id)}
                              className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              title="Chuyển sang sạch sẽ"
                            >
                              <IoBrushOutline size={14} />
                              <span className="text-[10px]">Đã dọn</span>
                            </button>
                          )}
                          {room.status !== 'MAINTENANCE' && room.status !== 'OCCUPIED' && isOwner && (
                            <button
                              onClick={() => handleMarkMaintenance(room.id)}
                              className="p-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors border border-border-grey/80 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              title="Chuyển sang bảo trì"
                            >
                              <IoConstructOutline size={14} />
                              <span className="text-[10px]">Bảo trì</span>
                            </button>
                          )}
                        </div>

                        {isOwner && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(room)}
                              className="p-1.5 hover:bg-surface-blue-light hover:text-primary transition-colors text-on-surface-variant border border-transparent hover:border-primary/20 cursor-pointer"
                              title="Chỉnh sửa"
                            >
                              <IoPencilOutline size={14} />
                            </button>
                            <button
                              onClick={() => openDeleteModal(room)}
                              className="p-1.5 hover:bg-red-50 hover:text-error transition-colors text-on-surface-variant border border-transparent hover:border-red-200 cursor-pointer"
                              title="Xóa phòng"
                            >
                              <IoTrashOutline size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
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
              <IoWarningOutline size={32} strokeWidth={1.5} />
            </div>
            <h3 className="font-title-lg text-on-surface mb-2">Xóa phòng này?</h3>
            <p className="font-body-md text-on-surface-variant">
              Bạn có chắc chắn muốn xóa phòng <strong>{itemToDelete?.roomNumber}</strong> không? Hành động này không thể hoàn tác.
            </p>
          </div>
          <div className="flex gap-3 pt-6 border-t border-border-grey">
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)} className="flex-1">Hủy bỏ</Button>
            <Button variant="danger" onClick={confirmDelete} className="flex-1">Xóa cứng</Button>
          </div>
        </Modal>
      )}

      {/* Modal Chỉ định người dọn phòng (NCL-06-CN-004) */}
      <Modal 
        isOpen={isAssignModalOpen} 
        onClose={() => setIsAssignModalOpen(false)} 
        title={`Chỉ định người dọn - Phòng ${selectedRoomForAssign?.roomNumber || ''}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveAssignment} className="space-y-4">
          {/* Thông tin phòng & mức ưu tiên */}
          <div className="p-3 bg-surface-container-low border border-border-grey space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-on-surface-variant">Hạng phòng:</span>
              <strong className="text-on-surface">{selectedRoomForAssign?.roomTypeName || 'Tiêu chuẩn'}</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-on-surface-variant">Tầng:</span>
              <span className="font-semibold">{selectedRoomForAssign?.floor || '—'}</span>
            </div>

            {selectedRoomForAssign?.priorityLevel === 'URGENT' && (
              <div className="p-2 bg-red-100 border border-red-300 text-red-900 font-bold flex items-center gap-1.5 mt-1">
                <IoFlameOutline size={16} className="text-red-600 animate-pulse shrink-0" />
                <span>🔥 Phòng cần dọn gấp: Có khách nhận phòng hôm nay! ({selectedRoomForAssign?.nextCheckInDate})</span>
              </div>
            )}
            {selectedRoomForAssign?.priorityLevel === 'HIGH' && (
              <div className="p-2 bg-amber-100 border border-amber-300 text-amber-900 font-bold flex items-center gap-1.5 mt-1">
                <IoFlashOutline size={16} className="text-amber-600 shrink-0" />
                <span>⚡ Khách nhận phòng ngày mai ({selectedRoomForAssign?.nextCheckInDate})</span>
              </div>
            )}
          </div>

          {/* Chọn nhân viên buồng phòng */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5">
              Chọn nhân viên buồng phòng phụ trách:
            </label>
            <select
              value={selectedHousekeeperId}
              onChange={(e) => setSelectedHousekeeperId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-border-grey text-on-surface font-medium focus:outline-none focus:border-primary"
            >
              <option value="">— Chưa phân công (Bỏ trống) —</option>
              {housekeepers.map(hk => {
                const assignedCount = rooms.filter(r => (r.status === 'DIRTY' || r.status === 'INSPECTING') && String(r.assignedHousekeeperId) === String(hk.id)).length;
                return (
                  <option key={hk.id} value={hk.id}>
                    {hk.name} ({hk.phone || 'NV'}) — Đang phụ trách {assignedCount} phòng
                  </option>
                );
              })}
            </select>
            <p className="text-[11px] text-on-surface-variant mt-1 italic">
              * Nhân viên buồng phòng khi đăng nhập sẽ chỉ nhìn thấy các phòng được giao cho mình và phòng chưa ai nhận.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center gap-2 pt-4 border-t border-border-grey mt-4">
            {selectedRoomForAssign?.assignedHousekeeperId ? (
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setSelectedHousekeeperId('');
                }}
                className="text-xs text-red-600 border-red-300 hover:bg-red-50"
              >
                <IoPersonRemoveOutline size={14} className="mr-1" />
                Gỡ phân công
              </Button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <Button variant="ghost" type="button" onClick={() => setIsAssignModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" isLoading={assignLoading}>
                Lưu phân công
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RoomManagement;
