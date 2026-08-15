import React, { useState, useEffect } from 'react';
import { roomApi } from '../../services/roomApi';
import { useAuth } from '../../context/AuthContext';
import { IoBrushOutline, IoCheckmarkCircleOutline, IoConstructOutline, IoFilterOutline, IoLogOutOutline, IoPeopleOutline, IoRefreshOutline } from 'react-icons/io5';
import Select from '../../components/ui/Select';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'AVAILABLE', label: 'Trống' },
  { value: 'OCCUPIED', label: 'Đang có khách' },
  { value: 'DIRTY', label: 'Cần dọn dẹp' },
  { value: 'MAINTENANCE', label: 'Bảo trì' }
];

const STATUS_CONFIG = {
  AVAILABLE: { label: 'Trống', icon: IoCheckmarkCircleOutline, bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', badge: 'bg-green-100 text-green-800' },
  OCCUPIED: { label: 'Đang ở', icon: IoPeopleOutline, bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
  DIRTY: { label: 'Cần dọn', icon: IoBrushOutline, bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' },
  MAINTENANCE: { label: 'Bảo trì', icon: IoConstructOutline, bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', badge: 'bg-red-100 text-red-800' }
};

/**
 * Tổng quan trạng thái phòng cho nhân viên buồng phòng.
 * Hiển thị tất cả phòng dạng grid, lọc theo trạng thái.
 * Cho phép đánh dấu phòng DIRTY → AVAILABLE.
 */
const RoomStatusUpdate = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('DIRTY');
  const [processingId, setProcessingId] = useState(null);

  const canMarkClean = ['OWNER', 'HOUSEKEEPER', 'RECEPTIONIST'].includes(user?.role);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const data = await roomApi.getAllRooms(filterStatus || null);
      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch rooms error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [filterStatus]);

  const handleMarkClean = async (room) => {
    if (!window.confirm(`Đánh dấu Phòng ${room.roomNumber} đã được dọn sạch?`)) return;
    setProcessingId(room.id);
    try {
      await roomApi.markRoomClean(room.id);
      fetchRooms();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi cập nhật.');
    } finally {
      setProcessingId(null);
    }
  };

  // Tính stats
  const stats = rooms.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Stats summary */}
      {!filterStatus && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
            const Icon = cfg.icon;
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`flex items-center gap-3 p-3 rounded-lg border ${cfg.border} ${cfg.bg} hover:opacity-90 transition-opacity text-left`}
              >
                <Icon size={20} className={cfg.text} />
                <div>
                  <p className={`font-headline-md leading-none ${cfg.text}`}>{stats[status] || 0}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{cfg.label}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <IoFilterOutline size={16} className="text-on-surface-variant" />
        <Select
          options={STATUS_OPTIONS}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          containerClassName="w-52"
          className="bg-white"
        />
        <button
          onClick={fetchRooms}
          className="flex items-center gap-2 px-3 py-2 rounded border border-border-grey text-on-surface-variant hover:bg-surface-container-low transition-colors text-sm"
        >
          <IoRefreshOutline size={14} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {/* Room grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-surface-container-low rounded-lg animate-pulse border border-border-grey" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-border-grey rounded-lg bg-surface-container-lowest">
          <IoLogOutOutline size={36} className="text-on-surface-variant/30 mx-auto mb-3" />
          <p className="font-body-md text-on-surface-variant">
            {filterStatus ? `Không có phòng nào ở trạng thái "${STATUS_CONFIG[filterStatus]?.label}".` : 'Không có phòng nào.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {rooms.map((room) => {
            const cfg = STATUS_CONFIG[room.status] || STATUS_CONFIG.AVAILABLE;
            const Icon = cfg.icon;
            return (
              <div
                key={room.id}
                className={`flex flex-col rounded-lg border-2 ${cfg.border} overflow-hidden hover:shadow-sm transition-shadow`}
              >
                <div className={`px-3 py-2 ${cfg.bg} border-b ${cfg.border} flex items-center justify-between`}>
                  <span className="font-title-lg text-on-surface">P. {room.roomNumber}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </div>
                <div className="px-3 py-2 flex-1">
                  <p className="text-xs text-on-surface-variant truncate">{room.roomTypeName}</p>
                  <p className="text-xs text-on-surface-variant">Tầng {room.floor || '—'}</p>
                </div>
                {room.status === 'DIRTY' && canMarkClean && (
                  <div className="px-3 pb-3">
                    <button
                      onClick={() => handleMarkClean(room)}
                      disabled={processingId === room.id}
                      className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded text-xs font-medium transition-colors"
                    >
                      {processingId === room.id ? (
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <IoCheckmarkCircleOutline size={13} />
                      )}
                      Đã dọn xong
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RoomStatusUpdate;
