import React, { useState, useEffect, useMemo } from 'react';
import { roomApi } from '../../services/roomApi';
import { useAuth } from '../../context/AuthContext';
import { useToast, useConfirm } from '../../context/ToastContext';
import { 
  IoBrushOutline, 
  IoCheckmarkCircleOutline, 
  IoConstructOutline, 
  IoFilterOutline, 
  IoPeopleOutline, 
  IoRefreshOutline,
  IoSearchOutline,
  IoLayersOutline,
  IoAlertCircleOutline,
  IoSparklesOutline
} from 'react-icons/io5';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'AVAILABLE', label: 'Trống (Sẵn sàng)' },
  { value: 'OCCUPIED', label: 'Đang có khách' },
  { value: 'DIRTY', label: 'Cần dọn dẹp' },
  { value: 'INSPECTING', label: 'Chờ duyệt sạch' },
  { value: 'MAINTENANCE', label: 'Đang bảo trì' }
];

const STATUS_CONFIG = {
  AVAILABLE: { label: 'Trống', icon: IoCheckmarkCircleOutline, bg: 'bg-green-50/80', border: 'border-green-300', text: 'text-green-700', badge: 'bg-green-100 text-green-800' },
  OCCUPIED: { label: 'Đang ở', icon: IoPeopleOutline, bg: 'bg-blue-50/80', border: 'border-blue-300', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
  DIRTY: { label: 'Cần dọn', icon: IoBrushOutline, bg: 'bg-orange-50/80', border: 'border-orange-300', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' },
  INSPECTING: { label: 'Chờ duyệt', icon: IoSparklesOutline, bg: 'bg-purple-50/80', border: 'border-purple-300', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800' },
  MAINTENANCE: { label: 'Bảo trì', icon: IoConstructOutline, bg: 'bg-red-50/80', border: 'border-red-300', text: 'text-red-700', badge: 'bg-red-100 text-red-800' }
};

/**
 * Tổng quan trạng thái phòng cho nhân viên buồng phòng & lễ tân.
 * Hiển thị tất cả phòng dạng grid, lọc theo trạng thái và tầng.
 * Cho phép chuyển đổi DIRTY <-> AVAILABLE.
 */
const RoomStatusUpdate = () => {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const canManageStatus = ['OWNER', 'HOUSEKEEPER', 'ADMIN'].includes(user?.role);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const data = await roomApi.getAllRooms(filterStatus || null);
      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch rooms error:', err);
      toast.error(err.response?.data?.message || 'Lỗi khi tải danh sách phòng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [filterStatus]);

  const handleMarkClean = async (room) => {
    const isConfirmed = await confirm({
      title: 'Xác nhận hoàn thành dọn phòng',
      message: `Đánh dấu Phòng ${room.roomNumber} đã được dọn sạch và sẵn sàng đón khách?`,
      confirmText: 'Xác nhận dọn xong',
      type: 'info'
    });
    if (!isConfirmed) return;

    setProcessingId(room.id);
    try {
      await roomApi.markRoomClean(room.id);
      toast.success(`Đã đánh dấu Phòng ${room.roomNumber} sạch sẽ thành công!`);
      fetchRooms();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi cập nhật trạng thái phòng.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkDirty = async (room) => {
    const isConfirmed = await confirm({
      title: 'Yêu cầu dọn dẹp',
      message: `Chuyển trạng thái Phòng ${room.roomNumber} sang "Cần dọn dẹp"?`,
      confirmText: 'Chuyển sang cần dọn',
      type: 'warning'
    });
    if (!isConfirmed) return;

    setProcessingId(room.id);
    try {
      await roomApi.markRoomDirty(room.id);
      toast.success(`Đã chuyển Phòng ${room.roomNumber} sang danh sách cần dọn dẹp!`);
      fetchRooms();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi cập nhật trạng thái phòng.');
    } finally {
      setProcessingId(null);
    }
  };

  // Tính stats
  const stats = useMemo(() => {
    return rooms.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});
  }, [rooms]);

  // Danh sách các tầng
  const floors = useMemo(() => {
    const floorSet = new Set(rooms.map(r => r.floor).filter(Boolean));
    return Array.from(floorSet).sort((a, b) => a - b);
  }, [rooms]);

  // Danh sách phòng sau khi áp dụng tìm kiếm & lọc tầng
  const displayedRooms = useMemo(() => {
    return rooms.filter(room => {
      const matchSearch = !searchTerm ||
        room.roomNumber?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.roomTypeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.notes?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchFloor = !selectedFloor || room.floor?.toString() === selectedFloor.toString();

      return matchSearch && matchFloor;
    });
  }, [rooms, searchTerm, selectedFloor]);

  return (
    <div className="space-y-5">
      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          const Icon = cfg.icon;
          const isActive = filterStatus === status;
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(isActive ? '' : status)}
              className={`flex items-center gap-3.5 p-4 rounded-2xl border transition-all duration-150 text-left shadow-sm ${
                isActive 
                  ? `ring-2 ring-primary ${cfg.bg} ${cfg.border}` 
                  : `bg-white hover:bg-surface-container-low border-border-grey`
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.bg} ${cfg.text}`}>
                <Icon size={22} />
              </div>
              <div>
                <p className={`font-headline-md font-bold text-2xl leading-none text-on-surface`}>
                  {stats[status] || 0}
                </p>
                <p className="text-xs text-on-surface-variant font-medium mt-1">{cfg.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-border-grey shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70" size={16} />
            <input
              type="text"
              placeholder="Tìm theo số phòng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-surface-container-low/50 border border-border-grey rounded-xl text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <IoFilterOutline size={15} className="text-on-surface-variant" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-xs bg-surface-container-low/50 border border-border-grey rounded-xl text-on-surface focus:outline-none focus:border-primary"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {floors.length > 0 && (
            <div className="flex items-center gap-2">
              <IoLayersOutline size={15} className="text-on-surface-variant" />
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                className="px-3 py-2 text-xs bg-surface-container-low/50 border border-border-grey rounded-xl text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="">Tất cả tầng</option>
                {floors.map(floor => (
                  <option key={floor} value={floor}>Tầng {floor}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button
          onClick={fetchRooms}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border-grey bg-white hover:bg-surface-container-low transition-colors text-xs font-medium text-on-surface shadow-sm"
        >
          <IoRefreshOutline size={14} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {/* Room grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-36 bg-white rounded-2xl animate-pulse border border-border-grey" />
          ))}
        </div>
      ) : displayedRooms.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border-grey rounded-2xl bg-white shadow-sm">
          <IoAlertCircleOutline size={36} className="text-on-surface-variant/40 mx-auto mb-3" />
          <p className="font-title-md text-on-surface font-semibold">Không tìm thấy phòng nào</p>
          <p className="font-body-md text-on-surface-variant text-xs mt-1">
            Vui lòng thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {displayedRooms.map((room) => {
            const cfg = STATUS_CONFIG[room.status] || STATUS_CONFIG.AVAILABLE;
            const isProcessing = processingId === room.id;
            return (
              <div
                key={room.id}
                className={`flex flex-col rounded-2xl border ${cfg.border} bg-white overflow-hidden hover:shadow-md transition-all duration-200`}
              >
                <div className={`px-3.5 py-2.5 ${cfg.bg} border-b ${cfg.border} flex items-center justify-between`}>
                  <span className="font-title-lg text-on-surface font-bold text-base">P. {room.roomNumber}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </div>

                <div className="p-3.5 flex-1 space-y-1 text-xs">
                  <p className="text-on-surface font-medium truncate">{room.roomTypeName || 'Tiêu chuẩn'}</p>
                  <p className="text-on-surface-variant">Tầng {room.floor || '—'}</p>
                  {room.notes && (
                    <p className="text-[11px] text-on-surface-variant/80 italic line-clamp-2 mt-1" title={room.notes}>
                      {room.notes}
                    </p>
                  )}
                </div>

                {/* Tab tổng quan: chỉ xem, không có nút thao tác */}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RoomStatusUpdate;

