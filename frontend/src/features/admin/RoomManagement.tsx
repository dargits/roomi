import React, { useState, useEffect } from 'react';
import { roomApi } from '../../services/roomApi';
import { roomTypeApi } from '../../services/roomTypeApi';
import userApi from '../../services/userApi';
import bookingApi from '../../services/bookingApi';
import { useAuth } from '../../context/AuthContext';
import { 
  IoAddOutline, 
  IoBedOutline,
  IoBrushOutline, 
  IoCheckmarkCircleOutline, 
  IoConstructOutline, 
  IoLogOutOutline, 
  IoPencilOutline, 
  IoSparklesOutline, 
  IoTrashOutline, 
  IoWarningOutline,
  IoPersonAddOutline,
  IoPersonOutline,
  IoPersonRemoveOutline,
  IoFlameOutline,
  IoFlashOutline,
  IoCalendarOutline,
  IoSearchOutline,
  IoTimeOutline
} from 'react-icons/io5';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import BookingForm from '../booking/BookingForm';
import { useToast } from '../../context/ToastContext';
import LoadingScreen from '../../components/common/LoadingScreen';
import { RoomResponse, RoomTypeResponse, RoomStatus } from '../../types';
import { UserResponse } from '../../types/auth';

interface StatusConfig {
  label: string;
  badge: string;
  accentBg: string;
  cardBorder: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const RoomManagement: React.FC = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomTypeResponse[]>([]);
  const [housekeepers, setHousekeepers] = useState<UserResponse[]>([]);
  const [activeBookings, setActiveBookings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Quick Booking modal
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);

  // Modal Phân công người dọn (NCL-06-CN-004)CN-004)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [selectedRoomForAssign, setSelectedRoomForAssign] = useState<RoomResponse | null>(null);
  const [selectedHousekeeperId, setSelectedHousekeeperId] = useState<string>('');
  const [assignLoading, setAssignLoading] = useState<boolean>(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    id: null as number | null,
    roomNumber: '',
    roomTypeId: '' as string | number,
    floor: '',
    status: 'AVAILABLE' as RoomStatus,
    notes: ''
  });
  const [formError, setFormError] = useState<string>('');

  // Delete confirm state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<RoomResponse | null>(null);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const [roomsData, bookingsData] = await Promise.all([
        roomApi.getAllRooms(),
        bookingApi.searchBookings({ status: 'CHECKED_IN' }).catch(() => [])
      ]);
      setRooms(roomsData);
      
      const bMap: Record<string, any> = {};
      if (Array.isArray(bookingsData)) {
        bookingsData.forEach((b: any) => {
          if (b.roomNumber) bMap[String(b.roomNumber)] = b;
          if (b.roomId) bMap[String(b.roomId)] = b;
        });
      }
      setActiveBookings(bMap);
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
    } catch {
      try {
        const allUsers = await userApi.getAllUsers();
        const hkList = (Array.isArray(allUsers) ? allUsers : []).filter(
          u => ((u.role as string) === 'HOUSEKEEPER' || (u.role as string) === 'STAFF' || u.role === 'OWNER' || u.role === 'ADMIN') && u.active !== false
        );
        setHousekeepers(hkList);
      } catch {
        // Ignore if cannot fetch
      }
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchRoomTypes();
    fetchHousekeepers();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

  const openEditModal = (room: RoomResponse) => {
    setFormData({
      id: room.id,
      roomNumber: room.roomNumber,
      roomTypeId: (room as any).roomTypeId || (room as any).roomType?.id || '',
      floor: room.floor || '',
      status: room.status,
      notes: room.notes || ''
    });
    setIsEditing(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const { success: toastSuccess, error: toastError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const payload = {
        ...formData,
        roomTypeId: parseInt(String(formData.roomTypeId))
      };
      if (isEditing && payload.id) {
        await roomApi.updateRoom(payload.id, payload as any);
        toastSuccess(`Đã cập nhật Phòng ${formData.roomNumber} thành công!`);
      } else {
        await roomApi.createRoom(payload as any);
        toastSuccess(`Đã thêm mới Phòng ${formData.roomNumber} thành công!`);
      }
      setIsModalOpen(false);
      fetchRooms();
    } catch (error: any) {
      console.error("Form submit error", error);
      setFormError(error.response?.data?.message || "Có lỗi xảy ra khi lưu dữ liệu.");
    }
  };

  const openDeleteModal = (room: RoomResponse) => {
    setItemToDelete(room);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await roomApi.deleteRoom(itemToDelete.id);
      toastSuccess(`Đã xóa Phòng ${itemToDelete.roomNumber} thành công!`);
      setIsDeleteModalOpen(false);
      fetchRooms();
    } catch (error: any) {
      console.error("Delete error", error);
      toastError(error.response?.data?.message || "Lỗi khi xóa phòng.");
    }
  };

  const handleMarkClean = async (id: number) => {
    try {
      await roomApi.markRoomClean(id);
      toastSuccess("Đã cập nhật phòng sang trạng thái Sạch sẽ!");
      fetchRooms();
    } catch (error: any) {
      toastError(error.response?.data?.message || "Lỗi thao tác.");
    }
  };

  const handleApproveClean = async (id: number) => {
    try {
      await roomApi.approveClean(id);
      toastSuccess("Đã duyệt phòng sạch sẽ thành công!");
      fetchRooms();
    } catch (error: any) {
      toastError(error.response?.data?.message || "Lỗi thao tác.");
    }
  };

  const handleMarkMaintenance = async (id: number) => {
    try {
      await roomApi.markRoomMaintenance(id);
      toastSuccess("Đã chuyển phòng sang trạng thái Bảo trì!");
      fetchRooms();
    } catch (error: any) {
      toastError(error.response?.data?.message || "Lỗi thao tác.");
    }
  };

  // NCL-06-CN-004: Mở modal chỉ định người dọn
  const openAssignModal = (room: RoomResponse) => {
    setSelectedRoomForAssign(room);
    setSelectedHousekeeperId(room.assignedHousekeeperId ? String(room.assignedHousekeeperId) : '');
    setIsAssignModalOpen(true);
  };

  // Lưu phân công dọn phòng
  const handleSaveAssignment = async (e: React.FormEvent) => {
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
    } catch (error: any) {
      toastError(error.response?.data?.message || "Lỗi khi phân công nhân viên.");
    } finally {
      setAssignLoading(false);
    }
  };

  const STATUS_MAP: Record<RoomStatus, StatusConfig> = {
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

  // Tính số lượng theo trạng thái dựa trên toàn bộ danh sách phòng
  const counts = rooms.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const displayedRooms: RoomResponse[] = rooms.filter(r => {
    if (filterStatus && r.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNumber = r.roomNumber?.toLowerCase().includes(q);
      const matchType = r.roomTypeName?.toLowerCase().includes(q);
      const booking = activeBookings[r.roomNumber] || activeBookings[String(r.id)];
      const matchGuest = booking?.guestName?.toLowerCase().includes(q);
      return Boolean(matchNumber || matchType || matchGuest);
    }
    return true;
  });

  const roomsByFloor = displayedRooms.reduce<Record<string, RoomResponse[]>>((acc, r) => {
    const floorKey = r.floor ? (r.floor.startsWith('Tầng') ? r.floor : `Tầng ${r.floor}`) : 'Chưa phân tầng';
    if (!acc[floorKey]) acc[floorKey] = [];
    acc[floorKey].push(r);
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-2xl shadow-2xs border border-border-grey overflow-hidden mb-8">
      {/* Header Bar */}
      <div className="px-5 py-4 border-b border-border-grey flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#F2F6ED] text-[#4F5E37] flex items-center justify-center">
            <IoBedOutline size={20} />
          </div>
          <div>
            <h2 className="font-bold text-base sm:text-lg text-[#1A2411]">
              Sơ đồ Phòng
            </h2>
            <p className="text-xs text-[#606D56]">Quản lý danh sách phòng, trạng thái lưu trú và buồng phòng theo tầng</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={() => setIsBookingModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#D4F63D] hover:bg-[#C2E232] text-[#1A2411] font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <IoAddOutline size={16} />
            <span>Tạo đặt phòng</span>
          </button>
          {isOwner && (
            <Button variant="primary" onClick={openAddModal} icon={IoAddOutline} className="shrink-0">
              Thêm Phòng
            </Button>
          )}
        </div>
      </div>

      {/* Quick Status Filter & Search Bar */}
      <div className="px-5 py-3 bg-[#F7F9F5] border-b border-border-grey flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterStatus('')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              filterStatus === ''
                ? 'bg-primary text-white shadow-xs'
                : 'bg-white text-[#606D56] border border-border-grey hover:bg-[#F2F6ED] hover:text-[#1A2411]'
            }`}
          >
            <span>Tất cả</span>
            <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${filterStatus === '' ? 'bg-white/25 text-white' : 'bg-[#EBF0E3] text-[#4F5E37]'}`}>
              {rooms.length}
            </span>
          </button>

          {(Object.entries(STATUS_MAP) as [RoomStatus, StatusConfig][]).map(([statusKey, cfg]) => {
            const count = counts[statusKey] || 0;
            const isActive = filterStatus === statusKey;
            const Icon = cfg.icon;

            return (
              <button
                key={statusKey}
                onClick={() => setFilterStatus(filterStatus === statusKey ? '' : statusKey)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-white text-[#606D56] border border-border-grey hover:bg-[#F2F6ED] hover:text-[#1A2411]'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-white' : cfg.accentBg.replace('bg-', 'text-')} />
                <span>{cfg.label}</span>
                <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${isActive ? 'bg-white/25 text-white' : 'bg-[#EBF0E3] text-[#4F5E37]'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search by room number, guest, room type */}
        <div className="relative shrink-0 min-w-[220px]">
          <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E9B86]" size={15} />
          <input
            type="text"
            placeholder="Tìm số phòng, loại phòng, khách..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-border-grey rounded-xl text-xs text-[#1A2411] placeholder:text-[#8E9B86] focus:outline-none focus:border-primary shadow-xs"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="p-5 sm:p-6 bg-white space-y-7">
        {loading ? (
          <LoadingScreen message="Đang tải sơ đồ phòng..." />
        ) : Object.keys(roomsByFloor).length === 0 ? (
          <div className="p-12 text-center text-[#606D56] bg-[#F7F9F5] rounded-2xl border border-border-grey">
            Không tìm thấy phòng nào phù hợp với bộ lọc hoặc tìm kiếm.
          </div>
        ) : (
          Object.entries(roomsByFloor).map(([floorName, floorRooms]) => {
            const occCount = floorRooms.filter(r => r.status === 'OCCUPIED').length;
            const availCount = floorRooms.filter(r => r.status === 'AVAILABLE').length;
            const dirtyCount = floorRooms.filter(r => r.status === 'DIRTY').length;
            const occRate = Math.round((occCount / floorRooms.length) * 100) || 0;

            return (
              <div key={floorName} className="space-y-3.5">
                {/* Floor Header with operational stats */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border-grey">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                    <span className="font-extrabold text-sm text-[#1A2411] tracking-tight uppercase">
                      {floorName}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F4F6F0] text-[#606D56] border border-border-grey">
                      {floorRooms.length} phòng
                    </span>
                  </div>

                  {/* Floor Metrics Pill */}
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span className="text-emerald-700 font-bold">{availCount} trống</span>
                    <span className="text-[#8E9B86]">•</span>
                    <span className="text-blue-700 font-bold">{occCount} đang ở</span>
                    {dirtyCount > 0 && (
                      <>
                        <span className="text-[#8E9B86]">•</span>
                        <span className="text-amber-700 font-bold">{dirtyCount} cần dọn</span>
                      </>
                    )}
                    <span className="text-[#8E9B86] hidden sm:inline">•</span>
                    <span className="text-[#606D56] hidden sm:inline">Công suất: <strong>{occRate}%</strong></span>
                    <div className="w-16 bg-[#EAEFE5] rounded-full h-1.5 overflow-hidden hidden sm:block">
                      <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${occRate}%` }} />
                    </div>
                  </div>
                </div>

                {/* Floor Rooms Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {floorRooms.map(room => {
                    const cfg = STATUS_MAP[room.status] || STATUS_MAP.AVAILABLE;
                    const Icon = cfg.icon;
                    const roomType = roomTypes.find(rt => rt.id === room.roomTypeId);
                    const activeBooking = activeBookings[room.roomNumber] || activeBookings[String(room.id)];

                    return (
                      <div
                        key={room.id}
                        className={`bg-white rounded-2xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between relative group overflow-hidden ${cfg.cardBorder}`}
                      >
                        {/* Top Accent Strip */}
                        <div className={`h-1.5 w-full ${cfg.accentBg}`} />

                        {/* Card Body */}
                        <div className="p-4 space-y-3 flex-1 flex flex-col">
                          {/* Room Number & Status Badge */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-black text-2xl text-[#1A2411] tracking-tight">
                              {room.roomNumber}
                            </div>
                            <span className={`px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-full border flex items-center gap-1 shrink-0 ${cfg.badge}`}>
                              <Icon size={12} />
                              {cfg.label}
                            </span>
                          </div>

                          {/* Room Type & Capacity */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs text-[#606D56] flex items-center gap-1.5 truncate font-medium" title={room.roomTypeName || 'Chưa xác định'}>
                              <IoBedOutline size={14} className="text-primary shrink-0" />
                              <span className="text-[#1A2411] truncate font-semibold">
                                {room.roomTypeName || 'Tiêu chuẩn'}
                              </span>
                            </div>
                            {room.maxCapacity && (
                              <div className="text-xs font-bold text-[#4F5E37] flex items-center gap-1 shrink-0 bg-[#F2F6ED] px-2 py-0.5 rounded-md border border-border-grey" title={`Sức chứa tối đa: ${room.maxCapacity} người`}>
                                <IoPersonOutline size={12} className="text-primary" />
                                <span>{room.maxCapacity}</span>
                              </div>
                            )}
                          </div>

                          {/* RICH OPERATIONAL CONTEXT SECTION */}

                          {/* 1. OCCUPIED: Show guest name, dates, booking info */}
                          {room.status === 'OCCUPIED' && (
                            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-2.5 space-y-1.5 mt-auto">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-blue-950 flex items-center gap-1.5 truncate">
                                  <IoPersonOutline size={13} className="text-blue-600 shrink-0" />
                                  <span className="truncate">{activeBooking?.guestName || room.nextGuestName || 'Khách lưu trú'}</span>
                                </span>
                                {activeBooking?.bookingCode && (
                                  <span className="text-[10px] font-mono text-blue-800 bg-blue-100/70 px-1.5 py-0.2 rounded">
                                    #{activeBooking.bookingCode}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-blue-900/80 pt-1 border-t border-blue-100">
                                <span className="flex items-center gap-1">
                                  <IoCalendarOutline size={12} />
                                  <span>
                                    {activeBooking?.checkInDate 
                                      ? `${activeBooking.checkInDate.slice(5)} → ${activeBooking.checkOutDate ? activeBooking.checkOutDate.slice(5) : ''}`
                                      : 'Đang lưu trú'}
                                  </span>
                                </span>
                                {activeBooking?.totalAmount ? (
                                  <span className="font-bold text-blue-950">
                                    {new Intl.NumberFormat('vi-VN').format(activeBooking.totalAmount)}đ
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          )}

                          {/* 2. AVAILABLE: Show price, ready indicator, and quick CTA */}
                          {room.status === 'AVAILABLE' && (
                            <div className="bg-[#FBFDF9] border border-[#E4EAE0] rounded-xl p-2.5 space-y-2 mt-auto">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-[#606D56]">Giá tiêu chuẩn</span>
                                <span className="text-xs font-bold text-[#626F47]">
                                  {new Intl.NumberFormat('vi-VN').format(roomType?.basePrice || 500000)} ₫
                                  <span className="text-[10px] font-normal text-[#606D56]">/đêm</span>
                                </span>
                              </div>
                              <div className="flex items-center justify-between pt-1.5 border-t border-[#EAEFE5]">
                                <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Sẵn sàng nhận khách
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setIsBookingModalOpen(true)}
                                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 cursor-pointer transition-colors shadow-2xs"
                                >
                                  + Đặt ngay
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 3. DIRTY / INSPECTING: Show cleaning details */}
                          {(room.status === 'DIRTY' || room.status === 'INSPECTING') && (
                            <div className="space-y-1.5 pt-1 mt-auto">
                              {/* Priority badge */}
                              {room.cleaningReason === 'PERIODIC_VACANT' ? (
                                <div className="flex items-center gap-1 text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                                  <IoSparklesOutline size={12} />
                                  <span>Lau bụi định kỳ</span>
                                </div>
                              ) : room.priorityLevel === 'URGENT' ? (
                                <div className="flex items-center gap-1 text-[11px] font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded-lg border border-red-200 animate-pulse">
                                  <IoFlameOutline size={12} className="text-red-600" />
                                  <span>Khách nhận hôm nay! ({room.nextCheckInDate})</span>
                                </div>
                              ) : room.priorityLevel === 'HIGH' ? (
                                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                                  <IoFlashOutline size={12} className="text-amber-600" />
                                  <span>Khách nhận ngày mai ({room.nextCheckInDate})</span>
                                </div>
                              ) : null}

                              {/* Cleaner Assign Tag */}
                              <div className="flex items-center justify-between text-xs bg-[#F2F6ED] p-2 rounded-xl border border-border-grey">
                                <div className="flex items-center gap-1.5 truncate text-[#1A2411]">
                                  <IoBrushOutline size={13} className="text-primary shrink-0" />
                                  <span className="truncate font-semibold text-[11px]">
                                    {room.assignedHousekeeperName ? `Dọn: ${room.assignedHousekeeperName}` : 'Chưa phân công'}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAssignModal(room);
                                  }}
                                  className="text-[11px] font-bold text-primary hover:underline ml-1 cursor-pointer shrink-0"
                                >
                                  {room.assignedHousekeeperName ? 'Đổi' : 'Gán'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 4. MAINTENANCE */}
                          {room.status === 'MAINTENANCE' && (
                            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-2.5 space-y-1 mt-auto">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                                <IoConstructOutline size={13} className="text-rose-600 shrink-0" />
                                <span>Đang khóa bảo trì</span>
                              </div>
                              <p className="text-[11px] text-rose-800/80 line-clamp-2">
                                {room.notes || 'Đang khắc phục sự cố kỹ thuật.'}
                              </p>
                            </div>
                          )}

                          {/* General Notes if any and not maintenance */}
                          {room.notes && room.status !== 'MAINTENANCE' && (
                            <div className="text-[11px] text-[#606D56] italic p-1.5 bg-[#F7F9F5] rounded-lg border border-border-grey/60 truncate" title={room.notes}>
                              {room.notes}
                            </div>
                          )}
                        </div>

                        {/* Card Bottom Actions Bar */}
                        <div className="px-3 py-2 border-t border-border-grey bg-[#F7F9F5] flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            {room.status === 'DIRTY' && canMarkClean && (
                              <button
                                onClick={() => handleMarkClean(room.id)}
                                className="px-2.5 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
                                title="Chuyển sang sạch sẽ"
                              >
                                <IoBrushOutline size={13} />
                                <span>Đã dọn</span>
                              </button>
                            )}
                            {room.status === 'INSPECTING' && (
                              <button
                                onClick={() => handleApproveClean(room.id)}
                                className="px-2.5 py-1 bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-300 rounded-lg transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
                                title="Duyệt phòng sạch sẽ"
                              >
                                <IoCheckmarkCircleOutline size={13} />
                                <span>Duyệt sạch</span>
                              </button>
                            )}
                            {room.status !== 'MAINTENANCE' && room.status !== 'OCCUPIED' && isOwner && (
                              <button
                                onClick={() => handleMarkMaintenance(room.id)}
                                className="px-2 py-1 bg-white hover:bg-gray-100 text-[#606D56] transition-colors border border-border-grey rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                title="Chuyển sang bảo trì"
                              >
                                <IoConstructOutline size={13} />
                                <span>Bảo trì</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1 ml-auto">
                            {isOwner && (
                              <>
                                <button
                                  onClick={() => openEditModal(room)}
                                  className="w-7 h-7 rounded-lg hover:bg-white text-[#606D56] hover:text-primary transition-colors flex items-center justify-center border border-transparent hover:border-border-grey cursor-pointer"
                                  title="Chỉnh sửa"
                                >
                                  <IoPencilOutline size={14} />
                                </button>
                                <button
                                  onClick={() => openDeleteModal(room)}
                                  className="w-7 h-7 rounded-lg hover:bg-rose-50 text-[#606D56] hover:text-error transition-colors flex items-center justify-center border border-transparent hover:border-rose-200 cursor-pointer"
                                  title="Xóa phòng"
                                >
                                  <IoTrashOutline size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Booking Modal Integration */}
      {isBookingModalOpen && (
        <BookingForm
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          onSuccess={() => {
            setIsBookingModalOpen(false);
            fetchRooms();
          }}
        />
      )}

      {/* Add/Edit Modal */}
      {isOwner && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Cập nhật phòng' : 'Thêm phòng mới'} maxWidth="max-w-md">
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-error rounded-xl text-sm font-medium">
              {formError}
            </div>
          )}
          <form id="roomForm" onSubmit={handleSubmit} className="space-y-4">
            <Input label="Số phòng" name="roomNumber" required value={formData.roomNumber} onChange={handleInputChange} placeholder="Ví dụ: 101, 201..." />

            <Select label="Loại phòng" name="roomTypeId" value={formData.roomTypeId} onChange={handleInputChange} options={roomTypeOptions} required />

            <Input label="Tầng" name="floor" value={formData.floor} onChange={handleInputChange} placeholder="Ví dụ: Tầng 1" />

            <Select label="Trạng thái" name="status" value={formData.status} onChange={handleInputChange} options={statusOptions} required />

            <div>
              <label className="block text-xs font-bold text-[#586650] uppercase tracking-wider mb-1.5">Ghi chú</label>
              <textarea name="notes" rows={3} value={formData.notes} onChange={handleInputChange} className="w-full px-3.5 py-2.5 border border-border-grey rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4F63D] focus:border-[#626F47] transition-all text-sm text-[#1A2411]" placeholder="Ghi chú về phòng..."></textarea>
            </div>
          </form>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-grey mt-6">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit" variant="primary" form="roomForm">Lưu dữ liệu</Button>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {isOwner && (
        <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="max-w-md">
          <div className="flex flex-col items-center text-center pb-2">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-error flex items-center justify-center mb-3">
              <IoWarningOutline size={28} />
            </div>
            <h3 className="font-bold text-lg text-[#1A2411]">Xác nhận xóa phòng</h3>
            <p className="text-xs text-[#606D56] mt-2 max-w-xs">
              Bạn có chắc chắn muốn xóa phòng <strong>{itemToDelete?.roomNumber}</strong>? Hành động này không thể hoàn tác.
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-grey mt-4">
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>Hủy</Button>
            <Button variant="danger" onClick={confirmDelete}>Xác nhận xóa</Button>
          </div>
        </Modal>
      )}

      {/* Modal Chỉ định người dọn phòng (NCL-06-CN-004) */}
      <Modal 
        isOpen={isAssignModalOpen} 
        onClose={() => setIsAssignModalOpen(false)} 
        title={`Chỉ định người dọn - Phòng ${selectedRoomForAssign?.roomNumber || ''}`}
        maxWidth="max-w-lg"
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
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-5 border-t border-border-grey mt-5">
            {selectedRoomForAssign?.assignedHousekeeperId ? (
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setSelectedHousekeeperId('');
                }}
                className="text-red-600 border-red-300 hover:bg-red-50 whitespace-nowrap"
              >
                <IoPersonRemoveOutline size={18} className="mr-1 shrink-0" />
                Gỡ phân công
              </Button>
            ) : <div className="hidden sm:block" />}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <Button variant="secondary" type="button" onClick={() => setIsAssignModalOpen(false)} className="whitespace-nowrap w-full sm:w-auto">
                Hủy
              </Button>
              <Button variant="primary" type="submit" isLoading={assignLoading} className="whitespace-nowrap w-full sm:w-auto">
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
